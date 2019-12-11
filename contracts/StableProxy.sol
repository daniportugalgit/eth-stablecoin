pragma solidity 0.5.3;

import "./ERC20.sol";

contract StoreInterface {
  function hasRole(uint8 role, address account) public view returns (bool);
}

contract StableTokenInterface {
	function upgradeToken(address newTokenAddress) public;
	function totalSupply() public view returns (uint);
	function balanceOf(address account) view public returns (uint balance);
	function allowance(address tokenOwner, address spender) view public returns (uint remaining);
	function transferAllArgs(address sender, address to, uint tokens) public;
	function approveAllArgs(address sender, address spender, uint tokens) public;
	function increaseAllowanceAllArgs(address sender, address spender, uint addedValue) public;
	function decreaseAllowanceAllArgs(address sender, address spender, uint subtractedValue) public;
	function transferFromAllArgs(address sender, address from, address to, uint tokens) public;
    function transferAndCallAllArgs(address sender, address to, uint tokens, bytes calldata data) external;
}

contract ProxyBase {
	StableTokenInterface public token; // the ERC20+ token (logic)
	StoreInterface public store; // the ERC20+ store (state)

	event UpgradeToken(address indexed agent, address indexed newERC20Implementation);

	modifier onlyImpl {
        require(msg.sender == address(token));
        _;
    }

    modifier onlyAdmin {
    	require(store.hasRole(1, msg.sender), "Only Admin");
    	_;
  	}

    constructor(address tokenAddress, address storeAddress) internal {
        token = StableTokenInterface(tokenAddress);
        store = StoreInterface(storeAddress);
    }

    function upgradeToken(address newTokenAddress) external onlyAdmin returns(bool) {
    	require(newTokenAddress != address(0), "zero address not allowed");
    	require(newTokenAddress != address(token), "both addresses are the same");

    	token.upgradeToken(newTokenAddress); //tells the token to update the Store and mark itself as deprecated
    	token = StableTokenInterface(newTokenAddress);
    	
    	emit UpgradeToken(msg.sender, newTokenAddress);

    	return true;
    }
}

contract EventEmitter is ProxyBase {
    //ERC-20:
	event Transfer(address indexed from, address indexed to, uint tokens);
	event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
	
  	function emitTransfer(address from, address to, uint256 tokens) external onlyImpl {
        emit Transfer(from, to, tokens);
    }

    function emitApproval(address tokenOwner, address spender, uint tokens) external onlyImpl {
        emit Approval(tokenOwner, spender, tokens);
    }

    //StableToken events:
    event SmartTransfer(address indexed from, address indexed to, uint tokens, bytes data); //overloading won't work for monitoring events efficiently
    event Mint(address indexed agent, address indexed account, uint tokens);
    event SmartMint(address indexed agent, address indexed account, uint tokens, bytes data); //overloading won't work for monitoring events efficiently
    event Burn(address indexed agent, address indexed account, uint tokens);
    event SmartBurn(address indexed agent, address indexed account, uint tokens, bytes data); //overloading won't work for monitoring events efficiently
    event AddRole(address indexed agent, uint8 indexed role, address indexed account);
    event RemoveRole(address indexed agent, uint8 indexed role, address indexed account);
    event FreezeAccount(address indexed agent, address indexed account);
    event UnfreezeAccount(address indexed agent, address indexed account);
    event WipeAccount(address agent, address indexed account, uint balance);
    event Pause(address indexed agent);
    event Unpause(address indexed agent);
    event SetMaster(address indexed agent, address indexed account);
    
    function emitSmartTransfer(address from, address to, uint256 tokens, bytes calldata data) external onlyImpl {
        emit SmartTransfer(from, to, tokens, data);
    }

    function emitMint(address agent, address account, uint tokens) external onlyImpl {
        emit Mint(agent, account, tokens);
    }

    function emitSmartMint(address agent, address account, uint tokens, bytes calldata data) external onlyImpl {
        emit SmartMint(agent, account, tokens, data);
    }

    function emitBurn(address agent, address account, uint tokens) external onlyImpl {
        emit Burn(agent, account, tokens);
    }

    function emitSmartBurn(address agent, address account, uint tokens, bytes calldata data) external onlyImpl {
        emit SmartBurn(agent, account, tokens, data);
    }

    function emitAddRole(address agent, uint8 role, address account) external onlyImpl {
        emit AddRole(agent, role, account);
    }

    function emitRemoveRole(address agent, uint8 role, address account) external onlyImpl {
        emit RemoveRole(agent, role, account);
    }

    function emitFreezeAccount(address agent, address account) external onlyImpl {
        emit FreezeAccount(agent, account);
    }

    function emitUnfreezeAccount(address agent, address account) external onlyImpl {
        emit UnfreezeAccount(agent, account);
    }

    function emitWipeAccount(address agent, address account, uint balance) external onlyImpl {
        emit WipeAccount(agent, account, balance);
    }

    function emitPause(address agent) external onlyImpl {
        emit Pause(agent);
    }

    function emitUnpause(address agent) external onlyImpl {
        emit Unpause(agent);
    }

    function emitSetMaster(address agent, address account) external onlyImpl {
        emit SetMaster(agent, account);
    }
}

contract ERC20Proxy is ERC20, EventEmitter {
	function totalSupply() public view returns (uint) {
        return token.totalSupply();
    }

    function balanceOf(address account) public view returns (uint balance) {
        return token.balanceOf(account);
    }

    function allowance(address tokenOwner, address spender) public view returns (uint remaining) {
        return token.allowance(tokenOwner, spender);
    }

    function transfer(address to, uint256 tokens) public returns (bool success) {
    	token.transferAllArgs(msg.sender, to, tokens);

        return true;
    }

    function transferFrom(address from, address to, uint tokens) public returns (bool success) {
        token.transferFromAllArgs(msg.sender, from, to, tokens);

        return true;
    }

    function approve(address spender, uint tokens) public returns (bool success) {
        token.approveAllArgs(msg.sender, spender, tokens);

        return true;
    }

    function increaseAllowance(address spender, uint addedValue) public returns (bool success) {
        token.increaseAllowanceAllArgs(msg.sender, spender, addedValue);

        return true;
    }

    function decreaseAllowance(address spender, uint subtractedValue) public returns (bool success) {
    	token.decreaseAllowanceAllArgs(msg.sender, spender, subtractedValue);

        return true;
    }
}

contract ERC20Reclaimer is ERC20Proxy {
    function reclaimToken(address tokenAddress, address payable to) external onlyAdmin returns (bool) {
        ERC20 otherToken = ERC20(tokenAddress);
        uint otherBalance = otherToken.balanceOf(address(this));
        otherToken.transfer(to, otherBalance);

        return true;
    }
}

contract StableProxy is ERC20Reclaimer {
	string public constant name = "Smart Real";
	string public constant symbol = "SBRL";
	uint8 public constant decimals = 18;

    constructor(address tokenAddress, address storeAddress) ProxyBase(tokenAddress, storeAddress) public {

    }

	function() external payable {
		revert();
	}

    //ERC-677:
    function transferAndCall(address to, uint tokens, bytes calldata data) external returns(bool) {
        token.transferAndCallAllArgs(msg.sender, to, tokens, data);

        return true;
    }
}