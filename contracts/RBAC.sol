pragma solidity 0.5.3;

/*
DEFAULT ROLES:
1) Admin: manages the RBAC, can pause contracts, can wipe frozen accounts and can upgrade token
2) Minter: can mint
3) Burner: can burn
4) Law Enforcer: can freeze/unfreeze accounts
5) Partner: can use transferAndCall()
6) PaySys: can use smartBuy()
*/

contract RBAC {
    address public master; //cannot be removed from the admin role
	mapping(uint8 => mapping(address => bool)) public roles;
    mapping(address => bool) public frozenAccounts;

	constructor () public {
        master = msg.sender;
		roles[1][msg.sender] = true;
		roles[2][msg.sender] = true;
		roles[3][msg.sender] = true;
		roles[4][msg.sender] = true;
        roles[6][msg.sender] = true;
    }

    function addRole(address sender, uint8 role, address account) external {
        require(hasRole(1, sender), "Only Admin");
        require(!hasRole(role, account), "Account already has role");
        
        roles[role][account] = true;
    }

    function removeRole(address sender, uint8 role, address account) external {
        if(account == master) {
            require(role != 1, "Cannot remove Master from admin role");
        }

        require(hasRole(1, sender), "Only Admin");
        require(hasRole(role, account), "Account does not have role");
        
        roles[role][account] = false;
    }

    function hasRole(uint8 role, address account) public view returns (bool) {
        require(account != address(0), "Account is the zero address");
        return roles[role][account];
    }

    function freezeAccount(address sender, address account) external {
        require(hasRole(4, sender), "Only Law Enforcement");
        require(!isFrozen(account), "Account is already frozen");
        
        frozenAccounts[account] = true;
    }

    function unfreezeAccount(address sender, address account) external {
        require(hasRole(4, sender), "Only Law Enforcement");
        require(isFrozen(account), "Account is not frozen");
        
        frozenAccounts[account] = false;
    }

    function isFrozen(address account) public view returns(bool) {
        return frozenAccounts[account];
    }
}