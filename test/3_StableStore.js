const config = require("./config/setupData");
const txUtils = require("./utils/txUtils");

const truffleAssert = require('truffle-assertions');
const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");

contract("Stable Store", accounts => {
	const [adminAcc, minterAcc, burnerAcc, lawAcc, pauserAcc, blacklistedAcc, otherAcc, user1Acc, user2Acc] = accounts;
	let StableToken;
	let StableStore;
	let StableProxy;
	let NewStableToken;
	let CarlosCoin;
	let amountToMint = web3.utils.toWei('10', 'ether');
	let amountToTransfer = web3.utils.toWei('1', 'ether');
	let amountToApprove = web3.utils.toWei('3', 'ether');
	let amountToTransferFrom = web3.utils.toWei('1', 'ether');
	let moreThanICanTransferFrom = web3.utils.toWei('4', 'ether');
	let amountToIncreaseAllowance = web3.utils.toWei('1', 'ether');
	let amountToDecreaseAllowance = web3.utils.toWei('1', 'ether');
	let moreThanIHave = web3.utils.toWei('20', 'ether');

	beforeEach('setup system for each test', async function () {
		StableToken = await StableTokenABI.new({from:adminAcc});
        StableStore = await StableStoreABI.new(StableToken.address, {from:adminAcc});
        StableProxy = await StableProxyABI.new(StableToken.address, StableStore.address, {from:adminAcc});
        await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
    });

	//@SOL: function setTotalSupply(uint newTotalSupply) external onlyImpl
	//@SOL: function setAllowance(address from, address spender, uint tokens) external onlyImpl
	//@SOL: function setBalance(address account, uint newBalance) external onlyImpl
	//@SOL: function addBalance(address account, uint balanceIncrease) external onlyImpl
	//@SOL: function upgradeToken(address newTokenAddress) external onlyImpl
	describe('\n   *Only Impl*', function () {
    	describe('when is not implementation', function () {
    		it('setTotalSupply reverts', async function () {
				await truffleAssert.reverts(StableStore.setTotalSupply(amountToMint, {from:adminAcc}));
			});

    		it('setAllowance reverts', async function () {
				await truffleAssert.reverts(StableStore.setAllowance(adminAcc, user1Acc, amountToApprove, {from:adminAcc}));
			});

			it('setBalance reverts', async function () {
				await truffleAssert.reverts(StableStore.setBalance(adminAcc, amountToMint, {from:adminAcc}));
			});

			it('addBalance reverts', async function () {
				await truffleAssert.reverts(StableStore.addBalance(adminAcc, amountToMint, {from:adminAcc}));
			});

			it('upgradeToken reverts', async function () {
				NewStableToken = await StableTokenABI.new({from:adminAcc});
				await truffleAssert.reverts(StableStore.upgradeToken(NewStableToken.address, {from:adminAcc}));
			});

			it('setMaster reverts', async function () {
				await truffleAssert.reverts(StableStore.setMaster(user1Acc, {from:adminAcc}));
			});
	    });
	});
});