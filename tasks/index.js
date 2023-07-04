subtask("deploy-factory", "Deploys the factory contract")
  .addParam("account")
  .setAction(async (_, hre) => {
    const [deployer, firstUser, secondUser] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await ethers.provider.getBalance(deployer)));    

    const treasury = await ethers.deployContract("Treasury", ["My Treasury", "MT"], deployer);    
    await treasury.waitForDeployment();     

    return {treasury, deployer, firstUser, secondUser};
    
  });

task("deploy", "Deploys the contract")
  .setAction(async (_, hre) => {
    const {treasury, deployer} = await hre.run("deploy-factory", {account: "testaccount"});  

    console.log(
      `Treasury with name ${await treasury.name()} with owner ${deployer.address} deployed to ${await treasury.getAddress()}`
    );
  });

task("store-funds", "Store funds to the treasury")
  .setAction(async (_, hre) => {
    const {treasury, firstUser, secondUser} = await hre.run("deploy-factory", {account: "testaccount"});    

    const treasuryFirstUser = treasury.connect(firstUser);
    const treasurySecondUser = treasury.connect(secondUser);

    await treasuryFirstUser.storeFunds({value: 10000});        
    console.log("This is the amount of money in the contract after the first tx: ", await ethers.provider.getBalance(treasury.target));
    const firstUserTokens = await treasuryFirstUser.balanceOf(firstUser);
    const secondUserTokens = await treasurySecondUser.balanceOf(secondUser);
    console.log(`The first user has ${firstUserTokens} tokens.`);
    console.log(`The second user has ${secondUserTokens} tokens.`);

    await treasurySecondUser.storeFunds({value: 20000});
    const updatedSecondUserTokens = await treasurySecondUser.balanceOf(secondUser);
    console.log("This is the updated amount of money in the contract aftre the second tx: ", await ethers.provider.getBalance(treasury.target));
    console.log(`Now, the second user has ${updatedSecondUserTokens} tokens.`);
   
  });