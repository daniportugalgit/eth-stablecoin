const config = require("./config/setupData");
const txUtils = require("./utils/txUtils");
const BN = require('bn.js');

const truffleAssert = require('truffle-assertions');
const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");
const CarlosCoinABI = artifacts.require("CarlosCoin.sol");
const MockPartnerABI = artifacts.require("MockPartner.sol");

contract("Stable Proxy", accounts => {
	const [adminAcc, minterAcc, burnerAcc, lawAcc, pauserAcc, frozenAcc, otherAcc, user1Acc, user2Acc] = accounts;
	let StableToken;
	let StableStore;
	let StableProxy;
	let NewStableToken;
	let CarlosCoin;
	let MockPartner;
	let amountToMint = web3.utils.toWei('10', 'ether');
	let amountToTransfer = web3.utils.toWei('1', 'ether');
	let amountToApprove = web3.utils.toWei('3', 'ether');
	let amountToTransferFrom = web3.utils.toWei('1', 'ether');
	let moreThanICanTransferFrom = web3.utils.toWei('4', 'ether');
	let amountToIncreaseAllowance = web3.utils.toWei('1', 'ether');
	let amountToDecreaseAllowance = web3.utils.toWei('1', 'ether');
	let moreThanIHave = web3.utils.toWei('20', 'ether');
	let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
	let encodedData = web3.eth.abi.encodeParameter('string', decodedData);

	beforeEach('setup system for each test', async function () {
		StableToken = await StableTokenABI.new({from:adminAcc});
        StableStore = await StableStoreABI.new(StableToken.address, {from:adminAcc});
        StableProxy = await StableProxyABI.new(StableToken.address, StableStore.address);
    });

    //@SOL function upgradeToken(address newTokenAddress) external onlyAdmin returns(bool)
	describe('\n   upgradeToken()', function () {
		beforeEach(async function () {
			NewStableToken = await StableTokenABI.new({from:adminAcc});
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

		describe('when is Admin', function () {
			describe('when input is valid', function () {
				it('returns true', async function () {
					let callResult = await StableProxy.upgradeToken.call(NewStableToken.address, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('upgrades', async function () {
					await StableProxy.upgradeToken(NewStableToken.address, {from:adminAcc});
				});

				it('emits event', async function () {
					let result = await StableProxy.upgradeToken(NewStableToken.address, {from:adminAcc});

					//@SOL: event UpgradeToken(address agent, address newERC20Implementation);
					await truffleAssert.eventEmitted(result, 'UpgradeToken', (ev) => {
					    return ev.agent == adminAcc && ev.newERC20Implementation == NewStableToken.address;
					});
				});
			});

			describe('when input is invalid', function () {
				it('reverts if newTokenAddress == address(0)', async function () {
					await truffleAssert.reverts(
						StableProxy.upgradeToken(config.ZERO_ADDRESS, {from:adminAcc}),
						"zero address not allowed"
					);
				});		

				it('reverts if newTokenAddress == current address', async function () {
					await truffleAssert.reverts(
						StableProxy.upgradeToken(StableToken.address, {from:adminAcc}),
						"both addresses are the same"
					);
				});	

				it('reverts if newTokenAddress is invalid', async function () {
					await truffleAssert.fails(
						StableProxy.upgradeToken(config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});	
			});
		});
		
		describe('when is not Admin', function () {
			it('reverts', async function () {
				await truffleAssert.reverts(
					StableProxy.upgradeToken(NewStableToken.address, {from:minterAcc}),
					"Only Admin"
				);
			});
		});
	});

	//@SOL function totalSupply() public view returns (uint)
	describe('\n   [call] totalSupply()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

		describe('when totalSupply == 0', function () {
			it('returns 0', async function () {
				let callResult = await StableProxy.totalSupply.call({from:adminAcc});
				assert.strictEqual(callResult.toString(10), "0");
			});
		});

		describe('when totalSupply > 0', function () {
			it('returns correct value', async function () {
				await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
				await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});

				let callResult = await StableProxy.totalSupply.call({from:adminAcc});
				assert.strictEqual(callResult.toString(10), amountToMint);
			});
		});
	});

	//@SOL function balanceOf(address account) public view returns (uint balance)
	describe('\n   [call] balanceOf()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

		describe('when balance == 0', function () {
			it('returns 0', async function () {
				let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
				assert.strictEqual(callResult.toString(10), "0");
			});
		});

		describe('when balance > 0', function () {
			it('returns correct value', async function () {
				await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
				await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});

				let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
				assert.strictEqual(callResult.toString(10), amountToMint);
			});
		});
	});

	//@SOL function allowance(address tokenOwner, address spender) public view returns (uint remaining)
	describe('\n   [call] allowance()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

		describe('when balance == 0', function () {
			it('returns 0', async function () {
				let callResult = await StableProxy.allowance.call(user1Acc, user2Acc, {from:adminAcc});
				assert.strictEqual(callResult.toString(10), "0");
			});
		});

		describe('when balance > 0', function () {
			it('returns correct value', async function () {
				await StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc});		

				let callResult = await StableProxy.allowance.call(user1Acc, user2Acc, {from:adminAcc});
				assert.strictEqual(callResult.toString(10), amountToApprove);
			});
		});
	});

	//@SOL function transfer(address to, uint256 tokens) public returns (bool success) 
	describe('\n   transfer()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

		describe('when has enough funds', function () {
			describe('when input is valid', function () {
				it('returns true', async function () {
					let callResult = await StableProxy.transfer.call(user2Acc, amountToTransfer, {from:user1Acc});
					assert.strictEqual(callResult, true);
				});

				it('transfers', async function () {
					await StableProxy.transfer(user2Acc, amountToTransfer, {from:user1Acc});
				});

				it('emits event', async function () {
					let result = await StableProxy.transfer(user2Acc, amountToTransfer, {from:user1Acc});

					//@SOL: event Transfer(from, to, tokens);
					await truffleAssert.eventEmitted(result, 'Transfer', (ev) => {
					    return ev.from == user1Acc && ev.to == user2Acc && ev.tokens.toString(10) == amountToTransfer;
					});
				});

				it('has correct balances after', async function () {
					await StableProxy.transfer(user2Acc, amountToTransfer, {from:user1Acc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), (amountToMint - amountToTransfer).toString(10), "Fail: balance1");

					let callResult2 = await StableProxy.balanceOf.call(user2Acc, {from:adminAcc});
					assert.strictEqual(callResult2.toString(10), amountToTransfer, "Fail: balance2");
				});

				it('reverts if user is frozen', async function () {
					await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					await StableToken.freezeAccount(user1Acc, {from:lawAcc});
					await truffleAssert.reverts(
						StableProxy.transfer(user2Acc, amountToTransfer, {from:user1Acc}),
						"Sender account is frozen"
					);
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});
					await truffleAssert.reverts(
						StableProxy.transfer(user2Acc, amountToTransfer, {from:user1Acc}),
						"Contract is paused"
					);
				});
			});

			describe('when input is invalid', function () {
				it('reverts if address == 0x0', async function () {
					await truffleAssert.reverts(
						StableProxy.transfer(config.ZERO_ADDRESS, amountToTransfer, {from:user1Acc}),
						"Zero address not allowed"
					);
				});

				it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableProxy.transfer(config.SHORT_ADDRESS, amountToTransfer, {from:user1Acc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid', async function () {
					await truffleAssert.fails(
						StableProxy.transfer(user2Acc, "abcd", {from:user1Acc}),
						"invalid number value"
					);
				});
			});
		});

		describe('when has not enough funds', function () {
			it('reverts', async function () {
				await truffleAssert.reverts(
					StableProxy.transfer(user1Acc, amountToTransfer, {from:user2Acc}),
					"Insufficient funds"
				);
			});
		});
	});

	//@SOL function transferFrom(address from, address to, uint tokens) public returns (bool success) {
	describe('\n  transferFrom()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
			await StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc});
		});

		describe('when has enough funds and allowance', function () {
			describe('when input is valid', function () {
				it('returns true', async function () {
					let callResult = await StableProxy.transferFrom.call(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc});
					assert.strictEqual(callResult, true);
				});

				it('transfers', async function () {
					await StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc});
				});

				it('emits event', async function () {
					let result = await StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc});

					//@SOL: event Transfer(from, to, tokens);
					await truffleAssert.eventEmitted(result, 'Transfer', (ev) => {
					    return ev.from == user1Acc && ev.to == otherAcc && ev.tokens.toString(10) == amountToTransferFrom;
					});
				});

				it('has correct balances after', async function () {
					await StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), (amountToMint - amountToTransferFrom).toString(10), "Fail: balance1");

					let callResult2 = await StableProxy.balanceOf.call(user2Acc, {from:adminAcc});
					assert.strictEqual(callResult2.toString(10), "0", "Fail: balance2");

					let callResult3 = await StableProxy.balanceOf.call(otherAcc, {from:adminAcc});
					assert.strictEqual(callResult3.toString(10), amountToTransferFrom, "Fail: balance3");
				});

				it('reverts if sender is frozen', async function () {
					await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					await StableToken.freezeAccount(user2Acc, {from:lawAcc});

					await truffleAssert.reverts(
						StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc}),
						"Sender account is frozen"
					);
				});

				it('reverts if tokenOwner is frozen', async function () {
					await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					await StableToken.freezeAccount(user1Acc, {from:lawAcc});

					await truffleAssert.reverts(
						StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc}),
						"TokenOwner is frozen"
					);
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});

					await truffleAssert.reverts(
						StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc}),
						"Contract is paused"
					);
				});
			});

			describe('when input is invalid', function () {
				it('reverts if to == 0x0', async function () {
					await truffleAssert.reverts(
						StableProxy.transferFrom(user1Acc, config.ZERO_ADDRESS, amountToTransferFrom, {from:user2Acc}),
						"Cannot transfer to zero address"
					);
				});

				it('reverts if from == 0x0', async function () {
					await truffleAssert.reverts(
						StableProxy.transferFrom(config.ZERO_ADDRESS, otherAcc, amountToTransferFrom, {from:user2Acc}),
						"Insufficient funds in allowance"
					);
				});

				it('reverts if from is invalid address', async function () {
					await truffleAssert.fails(
						StableProxy.transferFrom(config.SHORT_ADDRESS, otherAcc, amountToTransferFrom, {from:user2Acc}),
						"invalid address"
					);
				});

				it('reverts if to is invalid address', async function () {
					await truffleAssert.fails(
						StableProxy.transferFrom(user1Acc, config.SHORT_ADDRESS, amountToTransferFrom, {from:user2Acc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid number', async function () {
					await truffleAssert.fails(
						StableProxy.transferFrom(user1Acc, otherAcc, "abcd", {from:user2Acc}),
						"invalid number value"
					);
				});
			});
		});

		describe('when has not met basic conditions', function () {
			it('reverts if tokenOwner has not enough funds', async function () {
				await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
				await StableToken.burn(user1Acc, amountToMint);

				await truffleAssert.reverts(
					StableProxy.transferFrom(user1Acc, otherAcc, amountToTransferFrom, {from:user2Acc}),
					"Insufficient funds"
				);
			});

			it('reverts if there is not enough allowance', async function () {
				await truffleAssert.reverts(
					StableProxy.transferFrom(user1Acc, otherAcc, moreThanICanTransferFrom, {from:user2Acc}),
					"Insufficient funds in allowance"
				);
			});
		});
	});

	//@SOL function approve(address spender, uint tokens) public returns (bool success)
	describe('\n  approve()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

		
		describe('when input is valid', function () {
			it('returns true', async function () {
				let callResult = await StableProxy.approve.call(user2Acc, amountToApprove, {from:user1Acc});
				assert.strictEqual(callResult, true);
			});

			it('approves', async function () {
				await StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc});
			});

			it('emits event', async function () {
				let result = await StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc});

				//@SOL: event Approval(tokenOwner, spender, tokens);
				await truffleAssert.eventEmitted(result, 'Approval', (ev) => {
				    return ev.tokenOwner == user1Acc && ev.spender == user2Acc && ev.tokens.toString(10) == amountToApprove;
				});
			});

			it('has correct allowance after', async function () {
				await StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc});
				let callResult = await StableProxy.allowance.call(user1Acc, user2Acc, {from:user1Acc});
				assert.strictEqual(callResult.toString(10), amountToApprove.toString(10));
			});

			it('reverts if sender is frozen', async function () {
				await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
				await StableToken.freezeAccount(user1Acc, {from:lawAcc});

				await truffleAssert.reverts(
					StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc}),
					"Sender account is frozen"
				);
			});

			it('reverts if contract is paused', async function () {
				await StableToken.pause({from:adminAcc});

				await truffleAssert.reverts(
					StableProxy.approve(user2Acc, amountToApprove, {from:user1Acc}),
					"Contract is paused"
				);
			});
		});

		describe('when input is invalid', function () {
			it('reverts if spender == 0x0', async function () {
				await truffleAssert.reverts(
					StableProxy.approve(config.ZERO_ADDRESS, amountToApprove, {from:user1Acc}),
					"Zero address not allowed"
				);
			});

			it('reverts if spender is invalid address', async function () {
				await truffleAssert.fails(
					StableProxy.approve(config.SHORT_ADDRESS, amountToApprove, {from:user1Acc}),
					"invalid address"
				);
			});

			it('reverts if amount is invalid number', async function () {
				await truffleAssert.fails(
					StableProxy.approve(user2Acc, "abcd", {from:user1Acc}),
					"invalid number value"
				);
			});
		});
	});

	//@SOL function increaseAllowance(address spender, uint addedValue) public returns (bool success) 
	describe('\n  increaseAllowance()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

		describe('when input is valid', function () {
			it('returns true', async function () {
				let callResult = await StableProxy.increaseAllowance.call(user2Acc, amountToApprove, {from:user1Acc});
				assert.strictEqual(callResult, true);
			});

			it('increases allowance', async function () {
				await StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc});
			});

			it('emits event', async function () {
				let result = await StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc});

				//@SOL: event Approval(tokenOwner, spender, tokens);
				await truffleAssert.eventEmitted(result, 'Approval', (ev) => {
				    return ev.tokenOwner == user1Acc && ev.spender == user2Acc && ev.tokens.toString(10) == amountToApprove;
				});
			});

			it('has correct allowance after', async function () {
				await StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc});
				let callResult = await StableProxy.allowance.call(user1Acc, user2Acc, {from:user1Acc});
				assert.strictEqual(callResult.toString(10), amountToApprove.toString(10));
			});

			it('reverts if sender is frozen', async function () {
				await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
				await StableToken.freezeAccount(user1Acc, {from:lawAcc});

				await truffleAssert.reverts(
					StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc}),
					"Sender account is frozen"
				);
			});

			it('reverts if contract is paused', async function () {
				await StableToken.pause({from:adminAcc});

				await truffleAssert.reverts(
					StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc}),
					"Contract is paused"
				);
			});
		});

		describe('when input is invalid', function () {
			it('reverts if spender == 0x0', async function () {
				await truffleAssert.reverts(
					StableProxy.increaseAllowance(config.ZERO_ADDRESS, amountToApprove, {from:user1Acc}),
					"Cannot approve zero address"
				);
			});

			it('reverts if spender is invalid address', async function () {
				await truffleAssert.fails(
					StableProxy.increaseAllowance(config.SHORT_ADDRESS, amountToApprove, {from:user1Acc}),
					"invalid address"
				);
			});

			it('reverts if amount is invalid number', async function () {
				await truffleAssert.fails(
					StableProxy.increaseAllowance(user2Acc, "abcd", {from:user1Acc}),
					"invalid number value"
				);
			});
		});
	});

	//@SOL function decreaseAllowance(address spender, uint addedValue) public returns (bool success) 
	describe('\n  decreaseAllowance()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
			await StableProxy.increaseAllowance(user2Acc, amountToApprove, {from:user1Acc});
		});

		describe('when input is valid', function () {
			it('returns true', async function () {
				let callResult = await StableProxy.decreaseAllowance.call(user2Acc, amountToDecreaseAllowance, {from:user1Acc});
				assert.strictEqual(callResult, true);
			});

			it('decreases allowance', async function () {
				await StableProxy.decreaseAllowance(user2Acc, amountToDecreaseAllowance, {from:user1Acc});
			});

			it('emits event', async function () {
				let result = await StableProxy.decreaseAllowance(user2Acc, amountToDecreaseAllowance, {from:user1Acc});

				//@SOL: event Approval(tokenOwner, spender, tokens);
				await truffleAssert.eventEmitted(result, 'Approval', (ev) => {
				    return ev.tokenOwner == user1Acc && ev.spender == user2Acc && ev.tokens.toString(10) == (amountToApprove - amountToDecreaseAllowance).toString(10);
				});
			});

			it('has correct allowance after', async function () {
				await StableProxy.decreaseAllowance(user2Acc, amountToDecreaseAllowance, {from:user1Acc});
				let callResult = await StableProxy.allowance.call(user1Acc, user2Acc, {from:user1Acc});
				assert.strictEqual(callResult.toString(10), (amountToApprove - amountToDecreaseAllowance).toString(10));
			});

			it('reverts if sender is frozen', async function () {
				await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
				await StableToken.freezeAccount(user1Acc, {from:lawAcc});

				await truffleAssert.reverts(
					StableProxy.decreaseAllowance(user2Acc, amountToDecreaseAllowance, {from:user1Acc}),
					"Sender account is frozen"
				);
			});

			it('reverts if contract is paused', async function () {
				await StableToken.pause({from:adminAcc});

				await truffleAssert.reverts(
					StableProxy.decreaseAllowance(user2Acc, amountToDecreaseAllowance, {from:user1Acc}),
					"Contract is paused"
				);
			});

			it('reverts if decreasing by more than it has', async function () {
				await truffleAssert.reverts(
					StableProxy.decreaseAllowance(user2Acc, moreThanIHave, {from:user1Acc}),
					"SafeMath: subtraction overflow"
				);
			});
		});

		describe('when input is invalid', function () {
			it('reverts if spender == 0x0', async function () {
				await truffleAssert.reverts(
					StableProxy.decreaseAllowance(config.ZERO_ADDRESS, amountToDecreaseAllowance, {from:user1Acc}),
					"Cannot approve zero address"
				);
			});

			it('reverts if spender is invalid address', async function () {
				await truffleAssert.fails(
					StableProxy.decreaseAllowance(config.SHORT_ADDRESS, amountToDecreaseAllowance, {from:user1Acc}),
					"invalid address"
				);
			});

			it('reverts if amount is invalid number', async function () {
				await truffleAssert.fails(
					StableProxy.decreaseAllowance(user2Acc, "abcd", {from:user1Acc}),
					"invalid number value"
				);
			});
		});
	});

	//@SOL function reclaimToken(address otherTokenAddress, address payable to) external onlyAdmin returns (bool)
	describe('\n  reclaimToken()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			CarlosCoin = await CarlosCoinABI.new({from:adminAcc});
			await CarlosCoin.mint(user1Acc, amountToMint, {from:adminAcc});
			await CarlosCoin.transfer(StableProxy.address, amountToMint, {from:user1Acc});
		});

		
		it('returns true', async function () {
			let callResult = await StableProxy.reclaimToken.call(CarlosCoin.address, otherAcc, {from:adminAcc});
			assert.strictEqual(callResult, true);
		});

		it('reclaims the token', async function () {
			await StableProxy.reclaimToken(CarlosCoin.address, otherAcc, {from:adminAcc});
		});

		it('has correct balance after', async function () {
			let callResult = await CarlosCoin.balanceOf.call(StableProxy.address, {from:user1Acc});
			assert.strictEqual(callResult.toString(10), amountToMint.toString(10), "Fail: balance before");

			await StableProxy.reclaimToken(CarlosCoin.address, otherAcc, {from:adminAcc});
			
			let callResult1 = await CarlosCoin.balanceOf.call(StableProxy.address, {from:user1Acc});
			assert.strictEqual(callResult1.toString(10), "0", "Fail: balance1");

			let callResult2 = await CarlosCoin.balanceOf.call(otherAcc, {from:user1Acc});
			assert.strictEqual(callResult2.toString(10), amountToMint.toString(10), "Fail: balance2");
		});
	});

	//@SOL function transferAndCall(address to, uint tokens, bytes calldata data) external returns(bool)
	describe('\n  transferAndCall()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
			MockPartner = await MockPartnerABI.new(StableToken.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_PARTNER, MockPartner.address, {from:adminAcc});	
		});

		describe('when input is valid', function () {
			it('returns true', async function () {
				let callResult = await StableProxy.transferAndCall.call(MockPartner.address, 12, encodedData, {from:user1Acc});
				assert.strictEqual(callResult, true);
			});

			it('concludes the transaction', async function () {
				await StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc});
			});

			it('emits event', async function () {
				let result = await StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc});

				//@SOL: TransferAndCall(address indexed from, address indexed to, uint tokens, bytes data);
				await truffleAssert.eventEmitted(result, 'SmartTransfer', (ev) => {
				    return ev.from == user1Acc && ev.to == MockPartner.address && ev.tokens.toString(10) == "12" && ev.data == encodedData;
				});
			});

			it('data field is correctly encoded/decoded', async function () {
				let result = await StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc});

				/* Snippet for testing encode/decode:
				let originalData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
				let encodedData = web3.eth.abi.encodeParameter('string', originalData);
				let decodedData = web3.eth.abi.decodeParameter('string', encodedData);
				console.log("original: " + originalData);
				console.log("encoded:  " + encodedData);
				console.log("decoded:  " + decodedData);
				*/

				//@SOL: TransferAndCall(address indexed from, address indexed to, uint tokens, bytes data);
				await truffleAssert.eventEmitted(result, 'SmartTransfer', (ev) => {
				    return web3.eth.abi.decodeParameter('string', ev.data) == decodedData;
				});
			});

			it('has correct balances after', async function () {
				await StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc});
				let userBalance = await StableProxy.balanceOf.call(user1Acc, {from:user1Acc});
				assert.strictEqual(userBalance.toString(10), (new BN(amountToMint).sub(new BN(12))).toString(10));

				let partnerBalance = await StableProxy.balanceOf.call(MockPartner.address, {from:user1Acc});
				assert.strictEqual(partnerBalance.toString(10), "12");
			});

			it('reverts if sender is frozen', async function () {
				await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
				await StableToken.freezeAccount(user1Acc, {from:lawAcc});

				await truffleAssert.reverts(
					StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc}),
					"Sender account is frozen"
				);
			});

			it('reverts if partner is no longer a partner', async function () {
				await StableToken.removeRole(config.ROLE_PARTNER, MockPartner.address, {from:adminAcc});
				
				await truffleAssert.reverts(
					StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc}),
					"Partner is not registered"
				);
			});

			it('reverts if contract is paused', async function () {
				await StableToken.pause({from:adminAcc});

				await truffleAssert.reverts(
					StableProxy.transferAndCall(MockPartner.address, 12, encodedData, {from:user1Acc}),
					"Contract is paused"
				);
			});

			it('reverts if not enough funds', async function () {
				await truffleAssert.reverts(
					StableProxy.transferAndCall(MockPartner.address, moreThanIHave, encodedData, {from:user1Acc}),
					"Insufficient funds"
				);
			});
		});

		describe('when input is invalid', function () {
			it('reverts if partner == 0x0', async function () {
				await truffleAssert.reverts(
					StableProxy.transferAndCall(config.ZERO_ADDRESS, 12, encodedData, {from:user1Acc}),
					"Account is the zero address"
				);
			});

			it('reverts if tokens is invalid number', async function () {
				await truffleAssert.fails(
					StableProxy.transferAndCall(MockPartner.address, "abcd", encodedData, {from:user1Acc}),
					"invalid number value"
				);
			});

			it('reverts if encoded data is invalid', async function () {
				await truffleAssert.fails(
					StableProxy.transferAndCall(MockPartner.address, 12, decodedData, {from:user1Acc}),
					"invalid bytes value"
				);
			});
		});
	});

	//@SOL function() external payable
	describe('\n  fallback function', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

		it('reverts', async function () {
			await truffleAssert.reverts(
				StableProxy.sendTransaction({from:adminAcc, value: amountToTransfer}),
				truffleAssert.ErrorType.REVERT
			);
		});
	});
});