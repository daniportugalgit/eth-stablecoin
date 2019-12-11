//A little helper to avoid calculating gas costs whenever you want to verify a withdrawal
//It executes a function in the contract and afterwards checks if there's a balance difference
//in the same account that called the function;
//It effectively removes gas costs from the equation.
async function balanceDiff(solFunction, account, expectedDiff, errorMsg) {
	let balanceBefore = await web3.eth.getBalance(account);
  let tx = await solFunction;
  let receipt = tx.receipt;   
  let gasPrice = await web3.eth.getGasPrice();
  let gasCost = gasPrice * receipt.gasUsed;
  let expected = web3.utils.toBN(balanceBefore).add(web3.utils.toBN(expectedDiff)).sub(web3.utils.toBN(gasCost));
  let balanceAfter = await web3.eth.getBalance(account);
  assert.strictEqual(balanceAfter.toString(10), expected.toString(10), errorMsg);
};


module.exports = {
  balanceDiff
};
    
