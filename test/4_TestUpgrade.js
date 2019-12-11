const config = require("./config/setupData");
const txUtils = require("./utils/txUtils");
const chalk = require('chalk');

const truffleAssert = require('truffle-assertions');
const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");

/** Tests
 * 1) should upgrade successfully
 * 2) should maintain the correct balances after upgrade
 * 3) should maintain the blacklist after an upgrade

 // Não pode mais aceitar chamadas do token antigo (apenas calls)
*/

contract("Upgrade", accounts => {
	const [adminAcc, minterAcc, burnerAcc, senderAcc, recipientAcc, lawEnforcementAcc] = accounts;
	let StableToken;
	let StableStore;
	let StableProxy;
	let UpgradedStableToken;
	let amountToMint = web3.utils.toWei('10', 'ether');
	let amountToTransfer = web3.utils.toWei('4', 'ether');
	let amountToBurn = web3.utils.toWei('1', 'ether');
	
	let balance1;
	let balance2;

	let upgradedBalance1 = amountToMint - amountToTransfer - amountToBurn;
	let upgradedBalance2 = amountToTransfer;

	beforeEach('setup system for each test', async function () {
		StableToken = await StableTokenABI.new({from:adminAcc});
        StableStore = await StableStoreABI.new(StableToken.address, {from:adminAcc});
        StableProxy = await StableProxyABI.new(StableToken.address, StableStore.address, {from:adminAcc});
        await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
        
		await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
		await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
		await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawEnforcementAcc, {from:adminAcc});
		
		await StableToken.mint(senderAcc, amountToMint, {from:minterAcc});
		await StableProxy.transfer(recipientAcc, amountToTransfer, {from:senderAcc});
		await StableToken.methods['burn(address,uint256)'](senderAcc, amountToBurn, {from:burnerAcc});
		
		balance1 = await StableProxy.balanceOf(senderAcc, {from:adminAcc});
		balance2 = await StableProxy.balanceOf(recipientAcc, {from:adminAcc});

		UpgradedStableToken = await StableTokenABI.new({from:adminAcc});
    });

	it("should upgrade successfully", async () => {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		let result = await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		//@SOL: event UpgradeToken(address agent, address newERC20Implementation);
		await truffleAssert.eventEmitted(result, 'UpgradeToken', (ev) => {
		    return ev.agent == adminAcc && ev.newERC20Implementation == UpgradedStableToken.address;
		});
	});

	it("should maintain the correct balances after upgrade", async () => {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let newBalance1 = await StableProxy.balanceOf(senderAcc, {from:minterAcc});
		let newBalance2 = await StableProxy.balanceOf(recipientAcc, {from:minterAcc});

		assert.strictEqual(newBalance1.toString(10), upgradedBalance1.toString(10), "FAIL: balance1");
		assert.strictEqual(newBalance2.toString(10), upgradedBalance2.toString(10), "FAIL: balance2");
	});

	it("should maintain the frozen accounts frozen after an upgrade", async () => {
		await StableToken.freezeAccount(senderAcc, {from:lawEnforcementAcc});
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let hasRole = await StableStore.isFrozen(senderAcc, {from:adminAcc});
		
		assert.strictEqual(hasRole, true);
	});

	it("should maintain allowances after an upgrade", async () => {
		await StableProxy.approve(burnerAcc, amountToMint, {from:minterAcc});

		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let allowance = await StableStore.allowed.call(minterAcc, burnerAcc, {from:adminAcc});
		
		assert.strictEqual(allowance.toString(10), amountToMint);
	});

	it("should maintain the totalSupply after an upgrade", async () => {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let totalSupply = await StableStore.totalSupply.call({from:adminAcc});
		
		assert.strictEqual(totalSupply.toString(10), (amountToMint-amountToBurn).toString(10));
	});

	it("should maintain roles after an upgrade", async () => {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let hasRole1 = await StableStore.hasRole.call(config.ROLE_ADMIN, adminAcc, {from:adminAcc});
		let hasRole2 = await StableStore.hasRole.call(config.ROLE_MINTER, minterAcc, {from:adminAcc});
		let hasRole3 = await StableStore.hasRole.call(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
		
		assert.strictEqual(hasRole1, true, "Fail: admin role");
		assert.strictEqual(hasRole2, true, "Fail: minter role");
		assert.strictEqual(hasRole3, true, "Fail: burner role");
	});

	it('reverts Mint from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.reverts(StableToken.mint(recipientAcc, amountToMint, {from:minterAcc}));
	});

	it('reverts Burn from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.reverts(StableToken.methods['burn(address,uint256)'](recipientAcc, 1, {from:burnerAcc}));
	});

	it('reverts addRole from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.reverts(StableToken.addRole(config.ROLE_BURNER, minterAcc, {from:adminAcc}));
	});

	it('reverts removeRole from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await truffleAssert.reverts(StableToken.removeRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc}));
	});

	it('reverts freezeAccount from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await truffleAssert.reverts(StableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc}));
	});

	it('reverts unfreezeAccount from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await UpgradedStableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc})
		await truffleAssert.reverts(StableToken.unfreezeAccount(minterAcc, {from:lawEnforcementAcc}));
	});

	it('reverts wipeAccount from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await UpgradedStableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc})
		await truffleAssert.reverts(StableToken.wipeAccount(minterAcc, {from:adminAcc}));
	});

	it('reverts Mint overloaded from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
		let encodedData = web3.eth.abi.encodeParameter('string', decodedData);
		await truffleAssert.reverts(StableToken.methods['mint(address,uint256,bytes)'](recipientAcc, amountToMint, encodedData, {from:minterAcc}));
	});

	it('reverts Burn overloaded from old contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
		let encodedData = web3.eth.abi.encodeParameter('string', decodedData);
		await truffleAssert.reverts(StableToken.methods['burn(address,uint256,bytes)'](recipientAcc, amountToMint, encodedData, {from:burnerAcc}));
	});

	it('should Mint from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.passes(UpgradedStableToken.mint(recipientAcc, amountToMint, {from:minterAcc}));
	});

	it('should Burn from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.passes(UpgradedStableToken.methods['burn(address,uint256)'](recipientAcc, 1, {from:burnerAcc}));
	});

	it('should addRole from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		await truffleAssert.passes(UpgradedStableToken.addRole(config.ROLE_BURNER, minterAcc, {from:adminAcc}));
	});

	it('should removeRole from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await truffleAssert.passes(UpgradedStableToken.removeRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc}));
	});

	it('should freezeAccount from new contract', async function () {
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		
		await truffleAssert.passes(UpgradedStableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc}));
	});

	it('should unfreezeAccount from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await UpgradedStableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc})
		await truffleAssert.passes(UpgradedStableToken.unfreezeAccount(minterAcc, {from:lawEnforcementAcc}));
	});

	it('should wipeAccount from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		
		await UpgradedStableToken.freezeAccount(minterAcc, {from:lawEnforcementAcc})
		await truffleAssert.passes(UpgradedStableToken.wipeAccount(minterAcc, {from:adminAcc}));
	});

	it('should Smart Mint from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});

		let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
		let encodedData = web3.eth.abi.encodeParameter('string', decodedData);
		await truffleAssert.passes(UpgradedStableToken.methods['mint(address,uint256,bytes)'](recipientAcc, amountToMint, encodedData, {from:minterAcc}));
	});

	it('should Smart Burn from new contract', async function () {
		await UpgradedStableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		await StableProxy.upgradeToken(UpgradedStableToken.address, {from:adminAcc});
		await UpgradedStableToken.mint(recipientAcc, amountToMint, {from:minterAcc});

		let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
		let encodedData = web3.eth.abi.encodeParameter('string', decodedData);
		await truffleAssert.passes(UpgradedStableToken.methods['burn(address,uint256,bytes)'](recipientAcc, amountToMint, encodedData, {from:burnerAcc}));
	});

});
