require("@nomicfoundation/hardhat-toolbox");
require("./tasks");

require("dotenv").config();
const { ALCHEMY_API_KEY, SEPOLIA_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [
        // SEPOLIA_PRIVATE_KEY,
      ],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};