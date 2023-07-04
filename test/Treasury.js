const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

// uncomment console.logs if necessary to check the logic of the tests

describe("Treasury contract", function () {
  async function deployTreasuryFixture() {
    const [deployer, firstUser, secondUser, thirdUser] =
      await hre.ethers.getSigners();

    const treasury = await ethers.deployContract(
      "Treasury",
      ["My Treasury", "MT"],
      deployer
    );
    await treasury.waitForDeployment();

    const treasuryDeployer = treasury.connect(deployer);
    const treasuryFirstUser = treasury.connect(firstUser);
    const treasurySecondUser = treasury.connect(secondUser);
    const treasuryThirdUser = treasury.connect(thirdUser);

    await treasuryFirstUser.storeFunds({ value: 10000 });
    await treasurySecondUser.storeFunds({ value: 20000 });

    return {
      deployer,
      firstUser,
      secondUser,
      thirdUser,
      treasury,
      treasuryDeployer,
      treasuryFirstUser,
      treasurySecondUser,
      treasuryThirdUser,
    };
  }

  describe("Initiate withdrawal", function () {
    it("reverts when not an owner", async () => {
      const { treasuryFirstUser } = await loadFixture(deployTreasuryFixture);

      await expect(
        treasuryFirstUser.initiateWithdrawal(0, "For investing", 150)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the amount is not higher than 0", async () => {
      const { treasuryDeployer } = await loadFixture(deployTreasuryFixture);

      await expect(
        treasuryDeployer.initiateWithdrawal(0, "For investing", 150)
      ).to.be.revertedWith("Amount shold be > 0");
    });

    it("reverts when the amount is higher than the contract's balance", async () => {
      const { treasuryDeployer } = await loadFixture(deployTreasuryFixture);

      await expect(
        treasuryDeployer.initiateWithdrawal(50000, "For investing", 150)
      ).to.be.revertedWith("Not enough funds");
    });

    it("reverts when the duration is not appropriate", async () => {
      const { treasuryDeployer, treasuryFirstUser } = await loadFixture(
        deployTreasuryFixture
      );

      await expect(
        treasuryDeployer.initiateWithdrawal(10000, "For investing", 100)
      ).to.be.revertedWith("Duration shold be > 120");
    });

    it("should create the request", async () => {
      const { treasuryDeployer, treasuryFirstUser } = await loadFixture(
        deployTreasuryFixture
      );

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);

      const request = await treasuryFirstUser.requests(0);
      const requestAmount = request[1];

      await expect(requestAmount).to.be.equal(20000);
    });

    it("should create a request with the proper description", async () => {
      const { treasuryDeployer, treasuryFirstUser } = await loadFixture(
        deployTreasuryFixture
      );

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);

      const request = await treasuryFirstUser.requests(0);
      const requestDescription = request[2];

      await expect(requestDescription).to.be.equal("For investing");
    });

    it("should emit the NewRequest event", async () => {
      const { treasuryDeployer, treasury } = await loadFixture(
        deployTreasuryFixture
      );

      await expect(
        treasuryDeployer.initiateWithdrawal(20000, "For investing", 300)
      )
        .to.emit(treasury, "NewRequest")
        .withArgs(0, 20000);
    });
  });

  describe("Voting", function () {
    it("reverts when the request  ended", async () => {
      const { treasuryDeployer, treasuryFirstUser } = await loadFixture(
        deployTreasuryFixture
      );

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);

      await time.increase(500);

      await expect(treasuryFirstUser.vote(0, 5000, 1)).to.be.revertedWith(
        "Request has ended!"
      );
    });

    it("reverts when the voter has not tokens", async () => {
      const { treasuryDeployer, treasuryThirdUser } = await loadFixture(
        deployTreasuryFixture
      );

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);

      await expect(treasuryThirdUser.vote(0, 1000, 1)).to.be.revertedWith(
        "No available tokens!"
      );
    });

    it("reverts when the voter has insufficient tokens", async () => {
      const { treasuryDeployer, treasuryFirstUser } = await loadFixture(
        deployTreasuryFixture
      );

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);

      await expect(treasuryFirstUser.vote(0, 15000, 1)).to.be.revertedWith(
        "Insufficient tokens"
      );
    });

    it("reverts when the voter transfers the tokens and votes", async () => {
      const {
        treasuryDeployer,
        treasuryFirstUser,
        treasuryThirdUser,
        thirdUser,
      } = await loadFixture(deployTreasuryFixture);

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);
      await treasuryFirstUser.transfer(thirdUser, 10000);

      await expect(treasuryFirstUser.vote(0, 1000, 1)).to.be.revertedWith(
        "No available tokens!"
      );
    });

    it("looks the voter's tokens if `yes`", async () => {
      const { treasuryDeployer, treasuryFirstUser, firstUser } =
        await loadFixture(deployTreasuryFixture);

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);
      await treasuryFirstUser.vote(0, 8000, 1);

      expect(await treasuryFirstUser.balanceOf(firstUser)).to.be.equal(2000);
    });

    it("looks the voter's tokens if `no`", async () => {
      const { treasuryDeployer, treasurySecondUser, secondUser } =
        await loadFixture(deployTreasuryFixture);

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);
      await treasurySecondUser.vote(0, 5000, 0);

      expect(await treasurySecondUser.balanceOf(secondUser)).to.be.equal(15000);
    });

    it("looks the proper amount of tokens", async () => {
      const { treasuryDeployer, treasurySecondUser, treasury } =
        await loadFixture(deployTreasuryFixture);

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);
      await treasurySecondUser.vote(0, 15000, 1);
      const balance = await treasuryDeployer.balanceOf(treasury.target);

      expect(balance).to.be.equal(15000);
    });

    it("records the votes correctly", async () => {
      const { treasuryDeployer, treasurySecondUser, treasury } =
        await loadFixture(deployTreasuryFixture);

      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);
      await treasurySecondUser.vote(0, 15000, 1);
      const request = await treasuryDeployer.requests(0);

      const yesVotes = request[5];

      expect(yesVotes).to.be.equal(15000);
    });

    it("should emit the NewVote event", async () => {
      const { treasuryDeployer, treasuryFirstUser, treasury, firstUser } = await loadFixture(
        deployTreasuryFixture
      );


      await treasuryDeployer.initiateWithdrawal(20000, "For investing", 300);     

      await expect(
        treasuryFirstUser.vote(0, 8000, 1)
      )
        .to.emit(treasury, "NewVote")
        .withArgs(0, firstUser.address, 8000);
    });
  });
});
