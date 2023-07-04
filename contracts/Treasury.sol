// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Treasury is ERC20, Ownable {

    struct Request {
        uint256 id;

        uint256 amount;
        string description;
        uint256 duration;
        uint256 end;

        uint256 yesVotes;  
        uint256 noVotes;            
        mapping(address => uint) lockedTokens;  
    } 
    
    mapping(uint256 => Request) public requests;
    uint256 _counter = 0;

    /// Events:
    /**
     * @dev This emits when a new request is created.    
     * @param requestId The request id
     * @param amount The amount of money requested
     */
    event NewRequest(
        uint256 indexed requestId,
        uint256 amount       
    );

    /**
     * @dev This emits when a new contribution (store funds) is done.
     * @param contributor The contributor of the funds     
     * @param amount The contribution amount
     */
    event NewContribution(
        address indexed contributor,
        uint256 amount            
    );

    /**
     * @dev This emits when a new vote is casted
     * @param requestId The request id voting for
     * @param voter The voter  
     * @param amount The amount of tokens voting with
     */
    event NewVote(
        uint256 indexed requestId,
        address indexed voter,
        uint256 amount           
    );

    /**
     * @dev This emits when a new withdrawal is executed
     * @param requestId The request id withdrawing the funds for
     * @param fundsToSend The amount of the funds in WEI 
     * @param sendToAddress The beneficiary
     */
    event NewWithdrawal(
        uint256 indexed requestId,
        uint256 fundsToSend,
        address sendToAddress           
    );

    /**
     * @dev This emits when funds for a certain request are unlocked
     * @param requestId The request id unlocking the funds for
     * @param tokensToUnlock The amount of the tokens to unlock
     * @param sendToAddress The beneficiary of the tokens
     */
    event NewUnlock(
        uint256 indexed requestId,
        uint256 tokensToUnlock,
        address sendToAddress           
    );

    constructor (
        string memory _name,
        string memory _symbol) 
        ERC20(_name, _symbol) {
            
    }

    /**
     * @notice The contributors sends the funds to the treasury in WEI
     * @dev Emits the NewContribution event.
     *  Throws if the amount is not higher than 0     
     */
    function storeFunds() external payable  {
        require(msg.value != 0, "Amount should be > 0!");
        _mint(msg.sender, msg.value);

        emit NewContribution(msg.sender, msg.value);
    }

    /**
     * @notice The treasury creator initiate a new request
     * @dev Emits the NewRequest event.
     *  Throws if not the owner (campaign creator).
     *  Throws if the requested amount is not higher than 0
     *  Throws if the contract has less funds than the requested amount
     *  Throws if the duration is not appropriate
     * @param amount The requested amount of funds
     * @param description The description of the request 
     * @param duration The request duration      
     */
    function initiateWithdrawal(uint256 amount, string memory description, uint256 duration) external onlyOwner {
        require(amount > 0 , "Amount shold be > 0");
        require(amount < (address(this).balance), "Not enough funds");
        require(duration > 120, "Duration shold be > 120");
        
        Request storage request = requests[_counter];
        
        request.id = _counter;
        request.amount = amount;
        request.description = description;
        request.duration = duration;
        request.end = block.timestamp + duration;

        emit NewRequest(_counter, amount);

        _counter++;
    }

    /**
     * @notice The contributors vote for a request
     * @dev Emits the NewVote event.
     *  Throws if the request ended
     *  Throws if the voter has no tokens
     *  Throws if the voter has less tokens than the specified amount of tokens in the amount param
     * @param id The request id
     * @param amount The amount of tokens voting with 
     * @param myVote "Yes" or "no" vote. "Yes" is myVote == 1, all else is "false"
     */

    function vote (uint id, uint amount, uint myVote) external isActive (id) {
        Request storage request = requests[id];
        address voter = msg.sender;
        uint tokenBalance = balanceOf(voter);
        require(tokenBalance > 0, "No available tokens!");
        require(tokenBalance >= amount, "Insufficient tokens");        
               
        request.lockedTokens[voter] += amount;      
        _transfer(voter, address(this), amount);

        if (myVote == 1) {
            request.yesVotes += amount;
        } else {
             request.noVotes += amount;
        }

        emit NewVote(id, voter, amount);

    }

    /**
     * @notice The treasury creator executes a withdrawal for a request
     * @dev Emits the NewWithdrawal event.
     *  Throws if not the owner (campaign creator).
     *  Throws if the request has not ended
     *  Throws if the request was not successfull
     *  Throws if there is no funds to withdraw     
     * @param id The request id
     * @param sendToAddress The beneficiary address
     * @return success If the withdrawal was successfully. 
     */

    function executeWithdrawal (uint id, address sendToAddress) external payable onlyOwner notActive(id) returns (bool success) {
        Request storage request = requests[id];
        require((request.yesVotes > request.noVotes) || (request.yesVotes == 0 && request.noVotes ==0), "Unsuccessful campaign");

        uint fundsToSend = request.amount;
        require(fundsToSend > 0, "There is no funds");
        
        request.amount = 0;
        
        (bool sent, ) = payable(sendToAddress).call{value: fundsToSend}("");

        if (sent) {
            emit NewWithdrawal(id, fundsToSend, sendToAddress);
        }

        return sent;
    }

    /**
     * @notice The contributors unlock their locked tokens for a request
     * @dev Emits the NewUnlock event.
     *  Throws if the request has not ended
     *  Throws if the initiator has no locked tokens    
     * @param id The request id
     * @param sendToAddress The beneficiary address     
     */

    function unlock(uint id, address sendToAddress) public notActive(id) {
        Request storage request = requests[id];
        address voter = msg.sender;
        uint tokensToUnlock = request.lockedTokens[voter];
        require(tokensToUnlock > 0, "No tokens to unlock");
        request.lockedTokens[voter] = 0;

        _transfer(address(this), sendToAddress, tokensToUnlock);

        emit NewUnlock(id, tokensToUnlock, sendToAddress);
    }
    

    /// Modifiers:
    
    /// A modifier to check if the request is still active
    modifier isActive(uint id) {
        require(block.timestamp < requests[id].end, "Request has ended!");
        _;
    }

    /// A modifier to check if the request is not active
    modifier notActive(uint id) {
        require(block.timestamp >= requests[id].end, "Request is still active!");
        _;
    }
}