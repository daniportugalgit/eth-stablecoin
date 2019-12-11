const StableTokenABI = artifacts.require("StableToken.sol");
const StableStoreABI = artifacts.require("StableStore.sol");
const StableProxyABI = artifacts.require("StableProxy.sol");

module.exports = async function(deployer) {
  await deployer.deploy(StableTokenABI);
  let StableToken = await StableTokenABI.deployed();

  await deployer.deploy(StableStoreABI, StableToken.address);
  let StableStore = await StableStoreABI.deployed();

  await deployer.deploy(StableProxyABI, StableToken.address, StableStore.address);
  let StableProxy = await StableProxyABI.deployed();

  await StableToken.init(StableProxy.address, StableStore.address);
};
