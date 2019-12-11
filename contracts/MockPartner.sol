pragma solidity 0.5.3;

contract MockPartner {
	address sbrlImpl;
	uint private _itemCostInSBRLWei = 12;

	event ItemBought(address indexed buyer, uint tokens, bytes data);

	modifier onlySBRL {
		require(msg.sender == sbrlImpl, "Only SBRL Implementation");
		_;
	}

	constructor(address tokenAddress) public {
		sbrlImpl = tokenAddress;
	}

	function onTokenTransfer(address sender, uint tokens, bytes calldata data) external onlySBRL returns(bool) {
		//The product has been sold and MockPartner received SBRL.
		//If MockPartner cannot conclude the sell, it must revert this transaction (to be implemented by each partner).
		//Reverting this transaction will also revert the token transfer.

		emit ItemBought(sender, tokens, data);

		return true;
	}
}