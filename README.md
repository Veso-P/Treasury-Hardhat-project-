# A smart contract named "Treasury"
A Solidity smart contract that implements a Treasury. It can be used by different organizations to store their funds. The owner of the treasury can initiate withdrawals of funds from the treasury. Organization stakeholders can vote on the initiated withdrawals of funds (They vote on do they agree the funds to be withdrawn and later spend for the specified use case). The voting happens through the ERC-20 token that represents a user is part of the organization (stakeholder). The voting system should lock the tokens when a user vote and allow users to unlock their tokens after the voting period is finished.


## Contract deployment and verification
The contract is deployed to the Sepolia Test Network and verified via Hardhat at:
https://sepolia.etherscan.io/address/0xEEB41498B8e749eD03B648A33DBCE6A96c7B0673

### Contract sepcifications: 
- Only the Treasury contract deployer can initiate requests for withdrawal. 
- If another users contributes to the projects (sends funds), then he receives the amount of token in the following ration 1WEI = 1TOKEN. 
The user can vote with these tokens in the subsequent requests. 
- There is no pre-mint tokens. So, initial supply is 0.

VERY IMPORTANT: If user1 contributes 100 WEI he receives 100 Tokens. If he votes with 60 tokens for a given request (created by the deployer), then, his 60 tokens are locked. 
In this case, he has only 40 tokens available for voting in any OTHER request. 
If he tries to vote in another request created by the deployer, the user can vote with a maximum of 40 tokens.

*for the voting function in the contract "1" is for "yes", all else is "no".

## TASKS for Deployment and Store Funds interaction
    Do the following in the terminal:  
    Step 1) To check the "Deployment" task write: 
    npx hardhat deploy
    Step 2) To check the "Store Funds interaction" task write: 
    npx hardhat store-funds
