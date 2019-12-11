pragma solidity 0.5.3;

import "./SafeMath.sol";

contract ERC677Receiver {
  function onTokenTransfer(address from, uint256 amount, bytes calldata data) external returns (bool success);
}

contract ProxyInterface {
  function emitTransfer(address from, address to, uint256 tokens) external;
  function emitSmartTransfer(address from, address to, uint256 tokens, bytes calldata data) external;
  function emitApproval(address tokenOwner, address spender, uint tokens) external;
  function emitMint(address agent, address account, uint tokens) external;
  function emitSmartMint(address agent, address account, uint tokens, bytes calldata data) external;
  function emitBurn(address agent, address account, uint tokens) external;
  function emitSmartBurn(address agent, address account, uint tokens, bytes calldata data) external;
  function emitAddRole(address agent, uint8 role, address account) external;
  function emitRemoveRole(address agent, uint8 role, address account) external;
  function emitFreezeAccount(address agent, address account) external;
  function emitUnfreezeAccount(address agent, address account) external;
  function emitWipeAccount(address agent, address account, uint balance) external;
  function emitPause(address agent) external;
  function emitUnpause(address agent) external;
  function emitSetMaster(address agent, address account) external;
}

contract StoreInterface {
  function totalSupply() public view returns(uint);
  function balances(address account) public view returns(uint);
  function allowed(address tokenOwner, address spender) public view returns(uint);
  function setTotalSupply(uint newTotalSupply) external;
  function setAllowance(address from, address spender, uint tokens) external;
  function setBalance(address account, uint newBalance) external;
  function addBalance(address account, uint balanceIncrease) external;
  function upgradeToken(address newTokenAddress) external;
  
  //RBAC:
  function hasRole(uint8 role, address account) public view returns (bool);
  function addRole(address sender, uint8 role, address account) external;
  function removeRole(address sender, uint8 role, address account) external;
  function freezeAccount(address sender, address account) external;
  function unfreezeAccount(address sender, address account) external;
  function isFrozen(address account) public view returns(bool);
  function setMaster(address account) external;
  function master() public view returns(address);
}

contract ImplementationBase {
  ProxyInterface public proxy; // the facade       (proxy)
  StoreInterface public store; // the ERC20+ store (state)

  bool private _paused;

  modifier onlyProxy {
    require(msg.sender == address(proxy), "Only Proxy");
    _;
  }

  modifier onlyAdmin {
    require(store.hasRole(1, msg.sender), "Only Admin");
    _;
  }

  modifier whenNotPaused() { 
    require (!_paused, "Contract is paused"); 
    _; 
  }

  function upgradeToken(address newTokenAddress) external onlyProxy {
    store.upgradeToken(newTokenAddress);
  }

  function paused() public view returns (bool) {
    return _paused;
  }

  function pause() external onlyAdmin whenNotPaused {
    _paused = true;

    proxy.emitPause(msg.sender);
  }

  function unpause() external onlyAdmin {
    require(_paused, "Already unpaused"); 

    _paused = false;

    proxy.emitUnpause(msg.sender);
  }
}

contract BasicToken is ImplementationBase {
  using SafeMath for uint;

  bool private _initialized;

  function init(address proxyAddress, address storeAddress) external returns(bool) {
    require(!_initialized, "Already initialized");
    
    _initialized = true;
    proxy = ProxyInterface(proxyAddress);
    store = StoreInterface(storeAddress);

    return true;
  }

  function totalSupply() public view returns (uint) {
    return store.totalSupply();
  }

  function balanceOf(address account) view public returns (uint balance) {
    return store.balances(account);
  }

  function allowance(address tokenOwner, address spender) view public returns (uint remaining) {
    return store.allowed(tokenOwner, spender);
  }

  function transferAllArgs(address sender, address to, uint tokens) external onlyProxy whenNotPaused {
    require(to != address(0), "Zero address not allowed");
    require(!store.isFrozen(sender), "Sender account is frozen");

   _makeTransfer(sender, to, tokens);
    proxy.emitTransfer(sender, to, tokens);
  }

  function approveAllArgs(address sender, address spender, uint tokens) external onlyProxy whenNotPaused {
    require(spender != address(0), "Zero address not allowed");
    require(!store.isFrozen(sender), "Sender account is frozen");

    store.setAllowance(sender, spender, tokens);
    proxy.emitApproval(sender, spender, tokens);
  }

  function increaseAllowanceAllArgs(address sender, address spender, uint addedValue) external onlyProxy whenNotPaused {
    require(spender != address(0), "Cannot approve zero address");
    require(!store.isFrozen(sender), "Sender account is frozen");

    uint currentAllowance = store.allowed(sender, spender);
    uint newAllowance = currentAllowance.add(addedValue);

    require(newAllowance >= currentAllowance);

    store.setAllowance(sender, spender, newAllowance);
    proxy.emitApproval(sender, spender, newAllowance);
  }

  function decreaseAllowanceAllArgs(address sender, address spender, uint subtractedValue) external onlyProxy whenNotPaused {
    require(spender != address(0), "Cannot approve zero address");
    require(!store.isFrozen(sender), "Sender account is frozen");

    uint currentAllowance = store.allowed(sender, spender);
    uint newAllowance = currentAllowance.sub(subtractedValue);

    require(newAllowance <= currentAllowance);

    store.setAllowance(sender, spender, newAllowance);
    proxy.emitApproval(sender, spender, newAllowance);
  }

  function transferFromAllArgs(address sender, address from, address to, uint tokens) external onlyProxy whenNotPaused {
    require(to != address(0), "Cannot transfer to zero address");
    require(!store.isFrozen(sender), "Sender account is frozen");
    require(!store.isFrozen(from), "TokenOwner is frozen");

    uint senderAllowance = store.allowed(from, sender);
    
    store.setAllowance(from, sender, senderAllowance.sub(tokens, "Insufficient funds in allowance"));
    _makeTransfer(from, to, tokens);
    proxy.emitTransfer(from, to, tokens);
  }

  function _makeTransfer(address from, address to, uint tokens) internal {
    uint balanceOfFrom = store.balances(from);
    store.setBalance(from, balanceOfFrom.sub(tokens, "Insufficient funds"));
    store.addBalance(to, tokens);
  }
}

contract StableToken is BasicToken {
  function mint(address account, uint tokens) external whenNotPaused returns(bool) {
    require(account != address(0), "Zero address not allowed");
    require(store.hasRole(2, msg.sender), "Only Minter");

    _makeMint(account, tokens);
    proxy.emitMint(msg.sender, account, tokens);

    return true;
  }

  function mint(address account, uint tokens, bytes calldata data) external whenNotPaused returns(bool) {
    require(account != address(0), "Zero address not allowed");
    require(store.hasRole(2, msg.sender), "Only Minter");

    _makeMint(account, tokens);
    proxy.emitSmartMint(msg.sender, account, tokens, data);

    return true;
  }

  function burn(address account, uint tokens) external whenNotPaused returns(bool) {
    require(store.hasRole(3, msg.sender), "Only Burner");

    _makeBurn(account, tokens);
    proxy.emitBurn(msg.sender, account, tokens);

    return true;
  }

  function burn(address account, uint tokens, bytes calldata data) external whenNotPaused returns(bool) {
    require(store.hasRole(3, msg.sender), "Only Burner");

    _makeBurn(account, tokens);
    proxy.emitSmartBurn(msg.sender, account, tokens, data);

    return true;
  }

  function addRole(uint8 role, address account) external onlyAdmin returns(bool) {
    store.addRole(msg.sender, role, account);

    proxy.emitAddRole(msg.sender, role, account);

    return true;
  }

  function removeRole(uint8 role, address account) external onlyAdmin returns(bool) {
    store.removeRole(msg.sender, role, account);

    proxy.emitRemoveRole(msg.sender, role, account);

    return true;
  }

  function freezeAccount(address account) external returns(bool) {
    store.freezeAccount(msg.sender, account);

    proxy.emitFreezeAccount(msg.sender, account);

    return true;
  }

  function unfreezeAccount(address account) external returns(bool) {
    store.unfreezeAccount(msg.sender, account);

    proxy.emitUnfreezeAccount(msg.sender, account);

    return true;
  }

  function wipeAccount(address account) external onlyAdmin returns(bool) {
    require(store.isFrozen(account), "Account must be frozen by Law");

    uint tokens = store.balances(account);
    uint supply = store.totalSupply();

    store.setBalance(account, 0);
    store.setTotalSupply(supply.sub(tokens));

    proxy.emitWipeAccount(msg.sender, account, tokens);

    return true;
  }

  function setMaster(address account) external returns(bool) {
    address master = store.master();
    require(msg.sender == master, "Only Master");
    require(store.hasRole(1, account), "New Master must have the Admin role");
    require(account != master, "Account is already Master");
    require(account != address(0), "Account is the zero address");

    store.setMaster(account);

    proxy.emitSetMaster(msg.sender, account);

    return true;
  }

  function transferAndCallAllArgs(address sender, address to, uint tokens, bytes calldata data) external onlyProxy whenNotPaused {
    require(store.hasRole(5, to), "Partner is not registered");
    require(!store.isFrozen(sender), "Sender account is frozen");

    _makeTransfer(sender, to, tokens);
    proxy.emitSmartTransfer(sender, to, tokens, data);

    ERC677Receiver receiver = ERC677Receiver(to);
    require(receiver.onTokenTransfer(sender, tokens, data), "Failed onTokenTransfer");
  }

  function _makeMint(address account, uint tokens) internal {
    uint supply = store.totalSupply();
    
    store.setTotalSupply(supply.add(tokens));
    store.addBalance(account, tokens);
  }

  function _makeBurn(address account, uint tokens) internal {
    uint supply = store.totalSupply();
    uint balanceOfAcc = store.balances(account);
    
    store.setBalance(account, balanceOfAcc.sub(tokens, "Insufficient funds"));
    store.setTotalSupply(supply.sub(tokens));
  }
}

