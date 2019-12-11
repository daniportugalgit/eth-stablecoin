pragma solidity 0.5.3;

import "./RBAC.sol";

contract StableStore is RBAC {
	uint public totalSupply;
	mapping(address => uint) public balances;
	mapping(address => mapping (address => uint)) public allowed;
	
    address public tokenAddress;

    modifier onlyImpl {
        require(msg.sender == tokenAddress);
        _;
    }

    constructor(address tokenImplementation) public {
        tokenAddress = tokenImplementation;
    }

	function setTotalSupply(uint newTotalSupply) external onlyImpl {
        totalSupply = newTotalSupply;
    }

    function setAllowance(address from, address spender, uint tokens) external onlyImpl {
        allowed[from][spender] = tokens;
    }

    function setBalance(address account, uint newBalance) external onlyImpl {
        balances[account] = newBalance;
    }

    //IMPORTANT: caller is responsible for avoiding overflow!
    function addBalance(address account, uint balanceIncrease) external onlyImpl {
        balances[account] += balanceIncrease;
    }

    function upgradeToken(address newTokenAddress) external onlyImpl {
        tokenAddress = newTokenAddress;
    }

    function setMaster(address account) external onlyImpl {
        master = account;
    }
}