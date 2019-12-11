const config = require("./config/setupData");
const txUtils = require("./utils/txUtils");
const eventUtils = require("./utils/eventUtils");

const truffleAssert = require('truffle-assertions');
const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");
const CarlosCoinABI = artifacts.require("CarlosCoin.sol");

contract("Stable Token", accounts => {
	const [adminAcc, minterAcc, burnerAcc, lawAcc, pauserAcc, frozenAccount, otherAcc, user1Acc, user2Acc] = accounts;
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
	let decodedData = '{\"id\":\"99C5\",\"color\":\"blue\",\"size\":3,\"gift\":true}';	
	let encodedData = web3.eth.abi.encodeParameter('string', decodedData);

	beforeEach('setup system for each test', async function () {
		StableToken = await StableTokenABI.new({from:adminAcc});
        StableStore = await StableStoreABI.new(StableToken.address, {from:adminAcc});
        StableProxy = await StableProxyABI.new(StableToken.address, StableStore.address, {from:adminAcc});
    });

	//@SOL: function init(address proxyAddress, address storeAddress) external returns(bool)
    describe('\n   init()', function () {
    	describe('when not initialized', function () {
			describe('when the input is valid', function () {
				it('returns true', async function () {
					let callResult = await StableToken.init.call(StableProxy.address, StableStore.address, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('initializes', async function () {
					await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
				});
			});

			describe('when the input is invalid', function () {
				it('reverts if proxyAddress is invalid', async function () {
					await truffleAssert.fails(
						StableToken.init(config.SHORT_ADDRESS, StableStore.address, {from:adminAcc}),
						"invalid address"
					);
				});

				it('reverts if storeAddress is invalid', async function () {
					await truffleAssert.fails(
						StableToken.init(StableProxy.address, config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});
			});
		});

		describe('when already initialized', function () {
			it('reverts', async function () {
				await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
				await truffleAssert.reverts(
					StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc}),
					"Already initialized"
				);
			});
		});
	});

    //@SOL: function mint(address account, uint tokens) external whenNotPaused returns(bool)
    describe('\n   mint()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
		});

    	describe('when is minter', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.mint.call(user1Acc, amountToMint, {from:minterAcc});
					assert.strictEqual(callResult, true);
				});

				it('mints', async function () {
					await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
				});

				it('emits event', async function () {
					await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
					let events = await StableProxy.getPastEvents('Mint', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, minterAcc, "Failed: agent != minterAcc");
					assert.strictEqual(returnValues.account, user1Acc, "Failed: account != user1Acc");
					assert.strictEqual(returnValues.tokens.toString(10), amountToMint, "Failed: tokens != amountToMint");
				});

				it('has correct balances after', async function () {
					await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), amountToMint.toString(10), "Fail: balance1");
				});

				it('has correct total supply after', async function () {
					await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});

					let callResult = await StableProxy.totalSupply.call({from:adminAcc});
					assert.strictEqual(callResult.toString(10), amountToMint.toString(10), "Fail: total supply");
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});
					await truffleAssert.reverts(
						StableToken.mint(user1Acc, amountToMint, {from:minterAcc}),
						"Contract is paused"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if account == 0x0', async function () {
					await truffleAssert.reverts(
						StableToken.mint(config.ZERO_ADDRESS, amountToMint, {from:minterAcc}),
						"Zero address not allowed"
					);
				});

				it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.mint(config.SHORT_ADDRESS, amountToMint, {from:minterAcc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid', async function () {
					await truffleAssert.fails(
						StableToken.mint(user1Acc, "abcd", {from:minterAcc}),
						"invalid number value"
					);
				});
	    	});
	    });

	    describe('when is not minter', function () {
	    	it('reverts', async function () {
				await truffleAssert.fails(
					StableToken.mint(user1Acc, amountToMint, {from:otherAcc}),
					"Only Minter"
				);
			});
	    });
	});

    //@SOL: function mint(address account, uint tokens, bytes calldata data) external whenNotPaused returns(bool)
    describe('\n   mint() overload', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
		});

    	describe('when is minter', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.methods['mint(address,uint256,bytes)'].call(user1Acc, amountToMint, encodedData, {from:minterAcc});
					assert.strictEqual(callResult, true);
				});

				it('mints', async function () {
					await StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc});
				});

				it('emits event', async function () {
					await StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc});
					
					let events = await eventUtils.getPastOverloadedEvents(StableProxy, "SmartMint");
					let returnValues = events[0].returnValues;
					
					assert.strictEqual(returnValues.agent, minterAcc, "Failed: agent != minterAcc");
					assert.strictEqual(returnValues.account, user1Acc, "Failed: account != user1Acc");
					assert.strictEqual(returnValues.tokens.toString(10), amountToMint, "Failed: tokens != amountToMint");
					assert.strictEqual(returnValues.data, encodedData, "Failed: data != encodedData");
				});

				it('data field is correctly encoded/decoded', async function () {
					let result = await StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc});
					
					let events = await eventUtils.getPastOverloadedEvents(StableProxy, "SmartMint");
					let returnValues = events[0].returnValues;

					assert.strictEqual(web3.eth.abi.decodeParameter('string', returnValues.data), decodedData, "Failed: data != decodedData");
				});

				it('has correct balances after', async function () {
					await StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), amountToMint.toString(10), "Fail: balance1");
				});

				it('has correct total supply after', async function () {
					await StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc});

					let callResult = await StableProxy.totalSupply.call({from:adminAcc});
					assert.strictEqual(callResult.toString(10), amountToMint.toString(10), "Fail: total supply");
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});
					await truffleAssert.reverts(
						StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:minterAcc}),
						"Contract is paused"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if account == 0x0', async function () {
					await truffleAssert.reverts(
						StableToken.methods['mint(address,uint256,bytes)'](config.ZERO_ADDRESS, amountToMint, encodedData, {from:minterAcc}),
						"Zero address not allowed"
					);
				});

				it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['mint(address,uint256,bytes)'](config.SHORT_ADDRESS, amountToMint, encodedData, {from:minterAcc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['mint(address,uint256,bytes)'](user1Acc, "abcd", encodedData, {from:minterAcc}),
						"invalid number value"
					);
				});

				it('reverts if encoded data is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, decodedData, {from:minterAcc}),
						"invalid bytes value"
					);
				});
	    	});
	    });

	    describe('when is not minter', function () {
	    	it('reverts', async function () {
				await truffleAssert.fails(
					StableToken.methods['mint(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:otherAcc}),
					"Only Minter"
				);
			});
	    });
	});

    //@SOL: function burn(address account, uint tokens) external whenNotPaused returns(bool)
    describe('\n   burn()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
    		await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

    	describe('when is burner', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.methods['burn(address,uint256)'].call(user1Acc, amountToMint, {from:burnerAcc});
					assert.strictEqual(callResult, true);
				});

				it('burns', async function () {
					await StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:burnerAcc})
				});

				it('emits event', async function () {
					await StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:burnerAcc});
					let events = await StableProxy.getPastEvents('Burn', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, burnerAcc, "Failed: agent != burnerAcc");
					assert.strictEqual(returnValues.account, user1Acc, "Failed: account != user1Acc");
					assert.strictEqual(returnValues.tokens.toString(10), amountToMint, "Failed: tokens != amountToMint");
				});

				it('has correct balances after', async function () {
					await StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:burnerAcc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), "0", "Fail: balance1");
				});

				it('has correct total supply after', async function () {
					await StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:burnerAcc});

					let callResult = await StableProxy.totalSupply.call({from:adminAcc});
					assert.strictEqual(callResult.toString(10), "0", "Fail: total supply");
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});
					await truffleAssert.reverts(
						StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:burnerAcc}),
						"Contract is paused"
					);
				});

				it('reverts if trying to burn more than it has', async function () {
					await truffleAssert.reverts(
						StableToken.methods['burn(address,uint256)'](user1Acc, moreThanIHave, {from:burnerAcc}),
						"Insufficient funds"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['burn(address,uint256)'](config.SHORT_ADDRESS, amountToMint, {from:burnerAcc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['burn(address,uint256)'](user1Acc, "abcd", {from:burnerAcc}),
						"invalid number value"
					);
				});
	    	});
	    });

	    describe('when is not burner', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.methods['burn(address,uint256)'](user1Acc, amountToMint, {from:otherAcc}),
					"Only Burner"
				);
			});
	    });
	});



    //@SOL: function burn(address account, uint tokens, bytes data) external whenNotPaused returns(bool)
    describe('\n   burn() overloaded', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
    		await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
    		await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

    	describe('when is burner', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.methods['burn(address,uint256,bytes)'].call(user1Acc, amountToMint, encodedData, {from:burnerAcc});
					assert.strictEqual(callResult, true);
				});

				it('burns', async function () {
					await StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc})
				});

				it('emits event', async function () {
					await StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc});
					let events = await StableProxy.getPastEvents('SmartBurn', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, burnerAcc, "Failed: agent != burnerAcc");
					assert.strictEqual(returnValues.account, user1Acc, "Failed: account != user1Acc");
					assert.strictEqual(returnValues.tokens.toString(10), amountToMint, "Failed: tokens != amountToMint");
					assert.strictEqual(returnValues.data, encodedData, "Failed: data != encodedData");
				});

				it('data field is correctly encoded/decoded', async function () {
					let result = await StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc});
					
					let events = await eventUtils.getPastOverloadedEvents(StableProxy, "SmartBurn");
					let returnValues = events[0].returnValues;

					assert.strictEqual(web3.eth.abi.decodeParameter('string', returnValues.data), decodedData, "Failed: data != decodedData");
				});

				it('has correct balances after', async function () {
					await StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc});

					let callResult = await StableProxy.balanceOf.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), "0", "Fail: balance1");
				});

				it('has correct total supply after', async function () {
					await StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc});

					let callResult = await StableProxy.totalSupply.call({from:adminAcc});
					assert.strictEqual(callResult.toString(10), "0", "Fail: total supply");
				});

				it('reverts if contract is paused', async function () {
					await StableToken.pause({from:adminAcc});
					await truffleAssert.reverts(
						StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:burnerAcc}),
						"Contract is paused"
					);
				});

				it('reverts if trying to burn more than it has', async function () {
					await truffleAssert.reverts(
						StableToken.methods['burn(address,uint256,bytes)'](user1Acc, moreThanIHave, encodedData, {from:burnerAcc}),
						"Insufficient funds"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['burn(address,uint256,bytes)'](config.SHORT_ADDRESS, amountToMint, encodedData, {from:burnerAcc}),
						"invalid address"
					);
				});

				it('reverts if amount is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['burn(address,uint256,bytes)'](user1Acc, "abcd", encodedData, {from:burnerAcc}),
						"invalid number value"
					);
				});

				it('reverts if encoded data is invalid', async function () {
					await truffleAssert.fails(
						StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, decodedData, {from:burnerAcc}),
						"invalid bytes value"
					);
				});
	    	});
	    });

	    describe('when is not burner', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.methods['burn(address,uint256,bytes)'](user1Acc, amountToMint, encodedData, {from:otherAcc}),
					"Only Burner"
				);
			});
	    });
	});



    //@SOL: function addRole(uint8 role, address account) external onlyAdmin returns(bool)
	describe('\n   addRole()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
		});

    	describe('when is admin', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.addRole.call(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('adds role', async function () {
					await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
					await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					await StableToken.addRole(config.ROLE_ADMIN, otherAcc, {from:adminAcc});

					let callResult = await StableStore.hasRole.call(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					assert.strictEqual(callResult.toString(), "true", "Fail: Minter not added");

					let callResult2 = await StableStore.hasRole.call(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
					assert.strictEqual(callResult2.toString(), "true", "Fail: Burner not added");

					let callResult3 = await StableStore.hasRole.call(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					assert.strictEqual(callResult3.toString(), "true", "Fail: Law Enforcement not added");

					let callResult4 = await StableStore.hasRole.call(config.ROLE_ADMIN, otherAcc, {from:adminAcc});
					assert.strictEqual(callResult4.toString(), "true", "Fail: Admin not added");
				});

				it('emits event', async function () {
					await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					let events = await StableProxy.getPastEvents('AddRole', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, adminAcc, "Failed: agent != adminAcc");
					assert.strictEqual(returnValues.account, minterAcc, "Failed: account != minterAcc");
					assert.strictEqual(returnValues.role.toString(10), config.ROLE_MINTER.toString(), "Failed: role != ROLE_MINTER");
				});

				it('reverts if user already has role', async function () {
					await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					await truffleAssert.reverts(
						StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc}),
						"Account already has role"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.addRole(config.ROLE_MINTER, config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});

				it('reverts if role is invalid', async function () {
					await truffleAssert.fails(
						StableToken.addRole("abcd", minterAcc, {from:adminAcc}),
						"invalid number value"
					);
				});
	    	});
	    });

	    describe('when is not admin', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:otherAcc}),
					"Only Admin"
				);
			});
	    });
	});

	//@SOL: function removeRole(uint8 role, address account) external onlyAdmin returns(bool)
	describe('\n   removeRole()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
			await StableToken.addRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
			await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
			await StableToken.addRole(config.ROLE_ADMIN, otherAcc, {from:adminAcc});
		});

    	describe('when is admin', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.removeRole.call(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('removes role', async function () {
					await StableToken.removeRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					await StableToken.removeRole(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
					await StableToken.removeRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					await StableToken.removeRole(config.ROLE_ADMIN, otherAcc, {from:adminAcc});

					let callResult = await StableStore.hasRole.call(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					assert.strictEqual(callResult.toString(), "false", "Fail: Minter not removed");

					let callResult2 = await StableStore.hasRole.call(config.ROLE_BURNER, burnerAcc, {from:adminAcc});
					assert.strictEqual(callResult2.toString(), "false", "Fail: Burner not removed");

					let callResult3 = await StableStore.hasRole.call(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
					assert.strictEqual(callResult3.toString(), "false", "Fail: Law Enforcement not removed");

					let callResult4 = await StableStore.hasRole.call(config.ROLE_ADMIN, otherAcc, {from:adminAcc});
					assert.strictEqual(callResult4.toString(), "false", "Fail: Admin not removed");
				});

				it('emits event', async function () {
					await StableToken.removeRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					let events = await StableProxy.getPastEvents('RemoveRole', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, adminAcc, "Failed: agent != adminAcc");
					assert.strictEqual(returnValues.account, minterAcc, "Failed: account != minterAcc");
					assert.strictEqual(returnValues.role.toString(10), config.ROLE_MINTER.toString(), "Failed: role != ROLE_MINTER");
				});

				it('reverts if user does not have role', async function () {
					await StableToken.removeRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
					await truffleAssert.reverts(
						StableToken.removeRole(config.ROLE_MINTER, minterAcc, {from:adminAcc}),
						"Account does not have role"
					);
				});

				it('reverts if admin tries to remove master account', async function () {
					await truffleAssert.reverts(
						StableToken.removeRole(config.ROLE_ADMIN, adminAcc, {from:adminAcc}),
						"Cannot remove Master from admin role"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.removeRole(config.ROLE_MINTER, config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});

				it('reverts if role is invalid', async function () {
					await truffleAssert.fails(
						StableToken.removeRole("abcd", minterAcc, {from:adminAcc}),
						"invalid number value"
					);
				});
	    	});
	    });

	    describe('when is not admin', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.removeRole(config.ROLE_MINTER, minterAcc, {from:minterAcc}),
					"Only Admin"
				);
			});
	    });
	});

	//@SOL: function freezeAccount(address account) external returns(bool)
	describe('\n   freezeAccount()', function () {
		beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
		});

    	describe('when is law enforcement', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.freezeAccount.call(frozenAccount, {from:lawAcc});
					assert.strictEqual(callResult, true);
				});

				it('freezes account', async function () {
					await StableToken.freezeAccount(frozenAccount, {from:lawAcc});

					let callResult = await StableStore.isFrozen.call(frozenAccount, {from:adminAcc});
					assert.strictEqual(callResult, true, "Fail: user not added to frozen list");
				});

				it('emits event', async function () {
					await StableToken.freezeAccount(frozenAccount, {from:lawAcc});
					let events = await StableProxy.getPastEvents('FreezeAccount', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, lawAcc, "Failed: agent != lawAcc");
					assert.strictEqual(returnValues.account, frozenAccount, "Failed: account != frozenAccount");
				});

				it('reverts if user is already frozen', async function () {
					await StableToken.freezeAccount(frozenAccount, {from:lawAcc});

					await truffleAssert.reverts(
						StableToken.freezeAccount(frozenAccount, {from:lawAcc}),
						"Account is already frozen"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.freezeAccount(config.SHORT_ADDRESS, {from:lawAcc}),
						"invalid address"
					);
				});
	    	});
	    });

	    describe('when is not law enforcement', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.freezeAccount(frozenAccount, {from:otherAcc}),
					"Only Law Enforcement"
				);
			});
	    });
	});

	//@SOL: function unfreezeAccount(address account) external returns(bool)
	describe('\n   unfreezeAccount()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
			await StableToken.freezeAccount(frozenAccount, {from:lawAcc});
		});

    	describe('when is law enforcement', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.unfreezeAccount.call(frozenAccount, {from:lawAcc});
					assert.strictEqual(callResult, true);
				});

				it('unfreezes account', async function () {
					await StableToken.unfreezeAccount(frozenAccount, {from:lawAcc});

					let callResult = await StableStore.isFrozen.call(frozenAccount, {from:adminAcc});
					assert.strictEqual(callResult, false, "Fail: user not removed from frozen list");
				});

				it('emits event', async function () {
					await StableToken.unfreezeAccount(frozenAccount, {from:lawAcc});
					let events = await StableProxy.getPastEvents('UnfreezeAccount', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, lawAcc, "Failed: agent != lawAcc");
					assert.strictEqual(returnValues.account, frozenAccount, "Failed: account != frozenAccount");
				});

				it('reverts if user is not frozen', async function () {
					await StableToken.unfreezeAccount(frozenAccount, {from:lawAcc});

					await truffleAssert.reverts(
						StableToken.unfreezeAccount(frozenAccount, {from:lawAcc}),
						"Account is not frozen"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.unfreezeAccount(config.SHORT_ADDRESS, {from:lawAcc}),
						"invalid address"
					);
				});
	    	});
	    });

	    describe('when is not law enforcement', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.unfreezeAccount(frozenAccount, {from:otherAcc}),
					"Only Law Enforcement"
				);
			});
	    });
	});

	//@SOL: function wipeBlacklistedAccount(address account) external onlyAdmin returns(bool)
	describe('\n   wipeAccount()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
    		await StableToken.mint(frozenAccount, amountToMint, {from:minterAcc});
			await StableToken.addRole(config.ROLE_LAW_ENFORCEMENT, lawAcc, {from:adminAcc});
			await StableToken.freezeAccount(frozenAccount, {from:lawAcc});
		});

    	describe('when is admin', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.wipeAccount.call(frozenAccount, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('wipes account', async function () {
					await StableToken.wipeAccount(frozenAccount, {from:adminAcc});

					let callResult = await StableToken.balanceOf.call(frozenAccount, {from:adminAcc});
					assert.strictEqual(callResult.toString(10), "0", "Fail: user balance not wiped");

					let callResult2 = await StableToken.totalSupply.call({from:adminAcc});
					assert.strictEqual(callResult2.toString(10), "0", "Fail: total supply not affected");
				});

				it('emits event', async function () {
					await StableToken.wipeAccount(frozenAccount, {from:adminAcc});
					let events = await StableProxy.getPastEvents('WipeAccount', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, adminAcc, "Failed: agent != lawAcc");
					assert.strictEqual(returnValues.account, frozenAccount, "Failed: account != frozenAccount");
				});

				it('reverts if target account is not frozen', async function () {
					await truffleAssert.reverts(
						StableToken.wipeAccount(otherAcc, {from:adminAcc}),
						"Account must be frozen by Law"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.wipeAccount(config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});
	    	});
	    });

	    describe('when is not admin', function () {
	    	it('reverts', async function () {
				await truffleAssert.reverts(
					StableToken.wipeAccount(frozenAccount, {from:otherAcc}),
					"Only Admin"
				);
			});
	    });
	});

	//@SOL: function setMaster(address account) external returns(bool)
    describe('\n   setMaster()', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(1, user1Acc, {from:adminAcc});
		});

    	describe('when is Master', function () {
	    	describe('when the input is valid', function () {
	    		it('returns true', async function () {
					let callResult = await StableToken.setMaster.call(user1Acc, {from:adminAcc});
					assert.strictEqual(callResult, true);
				});

				it('sets the Master', async function () {
					await StableToken.setMaster(user1Acc, {from:adminAcc});
				});

				it('emits event', async function () {
					await StableToken.setMaster(user1Acc, {from:adminAcc});
					let events = await StableProxy.getPastEvents('SetMaster', {fromBlock:'latest'});
					let returnValues = events[0].returnValues;

					assert.strictEqual(returnValues.agent, adminAcc, "Failed: agent != adminAcc");
					assert.strictEqual(returnValues.account, user1Acc, "Failed: account != user1Acc");
				});

				it('cannot be removed from admin role', async function () {
					await truffleAssert.reverts(
						StableToken.removeRole(1, adminAcc, {from:user1Acc}),
						"Cannot remove Master from admin role"
					);
				});

				it('has lost master privileges afterwards', async function () {
					await StableToken.setMaster(user1Acc, {from:adminAcc});

					await truffleAssert.reverts(
						StableToken.removeRole(1, user1Acc, {from:adminAcc}),
						"Cannot remove Master from admin role"
					);

					await StableToken.removeRole(1, adminAcc, {from:user1Acc});

					let hasRole = await StableStore.hasRole.call(1, adminAcc, {from:adminAcc});
					assert.strictEqual(hasRole, false, "Failed: master has not lost privileges");
				});

				it('reverts if new Master is not admin', async function () {
					await StableToken.removeRole(1, user1Acc, {from:adminAcc});

					await truffleAssert.reverts(
						StableToken.setMaster(user1Acc, {from:adminAcc}),
						"New Master must have the Admin role"
					);
				});
	    	});

	    	describe('when the input is invalid', function () {
	    		it('reverts if account == 0x0', async function () {
					await truffleAssert.reverts(
						StableToken.setMaster(config.ZERO_ADDRESS, {from:adminAcc}),
						"Account is the zero address"
					);
				});

				it('reverts if address is invalid', async function () {
					await truffleAssert.fails(
						StableToken.setMaster(config.SHORT_ADDRESS, {from:adminAcc}),
						"invalid address"
					);
				});
	    	});
	    });

	    describe('when is not master', function () {
	    	it('reverts', async function () {
				await truffleAssert.fails(
					StableToken.setMaster(user1Acc, {from:user1Acc}),
					"Only Master"
				);
			});
	    });
	});

    

	//@SOL: function transferAllArgs(address sender, address to, uint tokens) external onlyProxy whenNotPaused
	//@SOL: function approveAllArgs(address sender, address spender, uint tokens) external onlyProxy whenNotPaused
	//@SOL: function increaseAllowanceAllArgs(address sender, address spender, uint addedValue) external onlyProxy whenNotPaused
	//@SOL: function decreaseAllowanceAllArgs(address sender, address spender, uint subtractedValue) external onlyProxy whenNotPaused
	//@SOL: function transferFromAllArgs(address sender, address from, address to, uint tokens) external onlyProxy whenNotPaused
	describe('\n   *Only Proxy*', function () {
    	beforeEach(async function () {
			await StableToken.init(StableProxy.address, StableStore.address, {from:adminAcc});
			await StableToken.addRole(config.ROLE_MINTER, minterAcc, {from:adminAcc});
    		await StableToken.mint(user1Acc, amountToMint, {from:minterAcc});
		});

    	describe('when is not proxy', function () {
    		it('transferAllArgs reverts', async function () {
				await truffleAssert.reverts(
					StableToken.transferAllArgs(user1Acc, user2Acc, amountToTransfer, {from:user1Acc}),
					"Only Proxy"
				);
			});

			it('approveAllArgs reverts', async function () {
				await truffleAssert.reverts(
					StableToken.approveAllArgs(user1Acc, user2Acc, amountToTransfer, {from:user1Acc}),
					"Only Proxy"
				);
			});

			it('increaseAllowanceAllArgs reverts', async function () {
				await truffleAssert.reverts(
					StableToken.increaseAllowanceAllArgs(user1Acc, user2Acc, amountToTransfer, {from:user1Acc}),
					"Only Proxy"
				);
			});

			it('decreaseAllowanceAllArgs reverts', async function () {
				await truffleAssert.reverts(
					StableToken.decreaseAllowanceAllArgs(user1Acc, user2Acc, amountToTransfer, {from:user1Acc}),
					"Only Proxy"
				);
			});

			it('transferFromAllArgs reverts', async function () {
				await StableProxy.approve(user2Acc, amountToTransfer, {from:user1Acc});

				await truffleAssert.reverts(
					StableToken.transferFromAllArgs(user2Acc, user1Acc, user2Acc, amountToTransfer, {from:user2Acc}),
					"Only Proxy"
				);
			});

			it('transferAndCall reverts', async function () {
				await StableToken.addRole(config.ROLE_PARTNER, otherAcc, {from:adminAcc});
				await StableToken.mint(burnerAcc, amountToMint, {from:minterAcc});

				await truffleAssert.reverts(
					StableToken.transferAndCallAllArgs(burnerAcc, otherAcc, 12, encodedData, {from:burnerAcc}),
					"Only Proxy"
				);
			});
	    });
	});
});