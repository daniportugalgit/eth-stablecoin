const config = require("./config/setupData");
const txUtils = require("./utils/txUtils");
const chalk = require('chalk');

const truffleAssert = require('truffle-assertions');
const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");
const CarlosCoinABI = artifacts.require("CarlosCoin.sol");
const MockPartnerABI = artifacts.require("MockPartner.sol");

contract("Gas for", accounts => {
	const [adminAcc, requesterAcc, minterAcc, burnerAcc, lawAcc, pauserAcc, frozenAcc, partnerAcc, buyerAcc, otherAcc] = accounts;
	let StableToken;
	let StableStore;
	let StableProxy;
	let amountToMint = web3.utils.toWei('10', 'ether');
	let amountToBurn = web3.utils.toWei('3', 'ether');
	let amountToTransfer = web3.utils.toWei('3', 'ether');
	let amountToTransfer2 = web3.utils.toWei('1', 'ether');
	let amountToApprove = web3.utils.toWei('3', 'ether');
	let amountToTransferFrom = web3.utils.toWei('1', 'ether');
	let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
	let encodedData = web3.eth.abi.encodeParameter('string', decodedData); //0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000317b226964223a2239394335222c22636f6c6f72223a22626c7565222c2273697a65223a332c2267696674223a747275657d000000000000000000000000000000

	it("...", async () => {
		StableToken = await StableTokenABI.new({from:adminAcc});
        StableStore = await StableStoreABI.new(StableToken.address, {from:adminAcc});
        StableProxy = await StableProxyABI.new(StableToken.address, StableStore.address, {from:adminAcc});
		await txUtils.printGasUsed(StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc}), "Initialize Token", true);
		
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_ADMIN, otherAcc, {from:adminAcc}), "Add Admin");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc}), "Add Minter");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc}), "Add Burner");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc}), "Add Law Enforcement");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_PARTNER, partnerAcc, {from:adminAcc}), "Add Partner");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_PAYSYS, otherAcc, {from:adminAcc}), "Add PaySys");
		await txUtils.printGasUsed(StableToken.addRole(config.ROLE_SELLER, otherAcc, {from:adminAcc}), "Add Seller");
				
		await StableToken.addRole(config.ROLE_MINTER, otherAcc, {from:adminAcc});
		await StableToken.addRole(config.ROLE_BURNER, otherAcc, {from:adminAcc});
		await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, otherAcc, {from:adminAcc});
		await StableToken.addRole(config.ROLE_PARTNER, otherAcc, {from:adminAcc});

		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_ADMIN, otherAcc, {from:adminAcc}), "Remove Admin");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_MINTER, otherAcc, {from:adminAcc}), "Remove Minter");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_BURNER, otherAcc, {from:adminAcc}), "Remove Burner");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_LAW_ENFORCEMENT, otherAcc, {from:adminAcc}), "Remove Law Enforcement");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_PARTNER, otherAcc, {from:adminAcc}), "Remove Partner");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_PAYSYS, otherAcc, {from:adminAcc}), "Remove PaySys");
		await txUtils.printGasUsed(StableToken.removeRole(config.ROLE_SELLER, otherAcc, {from:adminAcc}), "Remove Seller");
		
		await txUtils.printGasUsed(StableToken.freezeAccount(frozenAcc, {from:lawAcc}), "Freeze Account");		
		await StableToken.freezeAccount(otherAcc, {from:lawAcc});
		await txUtils.printGasUsed(StableToken.unfreezeAccount(otherAcc, {from:lawAcc}), "Unfreeze Account");		
		await txUtils.printGasUsed(StableToken.wipeAccount(frozenAcc, {from:adminAcc}), "Wipe Account");

		await txUtils.printGasUsed(StableToken.mint(requesterAcc, amountToMint, {from:minterAcc}), "First Mint");
		await txUtils.printGasUsed(StableToken.mint(requesterAcc, amountToMint, {from:minterAcc}), "Mint");
		
		await txUtils.printGasUsed(StableToken.methods['burn(address,uint256)'](requesterAcc, amountToBurn, {from:burnerAcc}), "Burn Some");

		await StableToken.mint(otherAcc, amountToMint, {from:minterAcc});
		await txUtils.printGasUsed(StableToken.methods['burn(address,uint256)'](otherAcc, amountToMint, {from:burnerAcc}), "Burn All");
		
		await txUtils.printGasUsed(StableProxy.transfer(minterAcc, amountToTransfer, {from:requesterAcc}), "First Transfer");
		await txUtils.printGasUsed(StableProxy.transfer(minterAcc, amountToTransfer, {from:requesterAcc}), "Transfer");
		await txUtils.printGasUsed(StableProxy.approve(minterAcc, amountToApprove, {from:requesterAcc}), "Approve");		
		await txUtils.printGasUsed(StableProxy.transferFrom(requesterAcc, otherAcc, amountToTransferFrom, {from:minterAcc}), "First TransferFrom (amount < allowance)");
		await txUtils.printGasUsed(StableProxy.transferFrom(requesterAcc, otherAcc, amountToTransferFrom, {from:minterAcc}), "TransferFrom (amount < allowance)");
		await txUtils.printGasUsed(StableProxy.transferFrom(requesterAcc, otherAcc, amountToTransferFrom, {from:minterAcc}), "TransferFrom (amount == allowance)");
		
		await txUtils.printGasUsed(StableProxy.increaseAllowance(requesterAcc, amountToApprove, {from:minterAcc}), "IncreaseAllowance (allowance == 0)");
		await txUtils.printGasUsed(StableProxy.increaseAllowance(requesterAcc, amountToApprove, {from:minterAcc}), "IncreaseAllowance (allowance! = 0)");	
		await txUtils.printGasUsed(StableProxy.decreaseAllowance(requesterAcc, amountToApprove, {from:minterAcc}), "DecreaseAllowance (final val! = 0)");	
		await txUtils.printGasUsed(StableProxy.decreaseAllowance(requesterAcc, amountToApprove, {from:minterAcc}), "DecreaseAllowance (final val == 0)");	

		await txUtils.printGasUsed(StableToken.pause({from:adminAcc}), "Pause");
		await txUtils.printGasUsed(StableToken.unpause({from:adminAcc}), "Unpause");

		let NewStableToken = await StableTokenABI.new({from:adminAcc});
		await NewStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await txUtils.printGasUsed(StableProxy.upgradeToken(NewStableToken.address, {from:adminAcc}), "Upgrade");

		let CarlosCoin = await CarlosCoinABI.new({from:adminAcc});
		await CarlosCoin.mint(otherAcc, amountToMint, {from:adminAcc});
		await CarlosCoin.transfer(StableProxy.address, amountToMint, {from:otherAcc});
		await txUtils.printGasUsed(StableProxy.reclaimToken(CarlosCoin.address, adminAcc, {from:adminAcc}), "Reclaim Token");

		let MockPartner = await MockPartnerABI.new(NewStableToken.address, {from:adminAcc});
		await NewStableToken.addRole(config.ROLE_PARTNER, MockPartner.address, {from:adminAcc});
		await NewStableToken.mint(buyerAcc, amountToMint, {from:minterAcc});

		let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
		let encodedData = web3.eth.abi.encodeParameter('string', decodedData);
		await txUtils.printGasUsed(StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:buyerAcc}), "Mock Partner: buy item");

		await NewStableToken.addRole(1, otherAcc, {from:adminAcc});
		await txUtils.printGasUsed(NewStableToken.setMaster(otherAcc, {from:adminAcc}), "Set Master");

		await txUtils.printGasUsed(NewStableToken.methods['mint(address,uint256,bytes)'](burnerAcc, amountToMint, encodedData, {from:minterAcc}), "Mint overloaded");
	});
});