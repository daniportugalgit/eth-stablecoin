const truffleAssert = require('truffle-assertions');

const chalk = require('chalk');
const color = chalk.yellow;

async function printTx(solFunction, prettyName) {
	let tx = await solFunction;
	console.log(">>>>>>>>> " + prettyName + " Tx: \n", JSON.parse(JSON.stringify(tx)));
};

async function printReceipt(solFunction, prettyName) {
	let tx = await solFunction;
	console.log(">>>>>>>>> " + prettyName + " Receipt: \n", JSON.parse(JSON.stringify(tx.receipt)));
};

async function printPostTx(solFunction, prettyName) {
	let tx = await solFunction;
	let postTx = await web3.eth.getTransaction(tx.receipt.transactionHash);
	console.log(">>>>>>>>> " + prettyName + " Post-Tx: \n", JSON.parse(JSON.stringify(postTx)));
};

async function printGasUsed(solFunction, prettyName) {
	let tx = await solFunction;
	console.log(color("         " + formatNumber(tx.receipt.gasUsed) + "  " + prettyName));
};

async function printTxFee(solFunction, prettyName) {
	let tx = await solFunction;
	let postTx = await web3.eth.getTransaction(tx.receipt.transactionHash); //we can get the 100% correct gasPrice from this guy
	let txFee = web3.utils.toBN(postTx.gasPrice * tx.receipt.gasUsed);
	console.log(color("   TxFee: " + txFee + "  " + prettyName));
};

//@param inEth should txFee be expressed in Eth? If false, it will be in Wei.
async function printGasAndFee(solFunction, prettyName, inEth) {
	let txFee;
	let finalGasPrice;
	let tx = await solFunction;
	let postTx = await web3.eth.getTransaction(tx.receipt.transactionHash); //we can get the 100% correct gasPrice from this guy
	
	txFee = web3.utils.toBN(postTx.gasPrice * tx.receipt.gasUsed);
	if(inEth)
		txFee = web3.utils.fromWei(txFee, 'ether')

	finalGasPrice = postTx.gasPrice;
	if(inEth)
		finalGasPrice = web3.utils.fromWei(finalGasPrice, 'ether');

	console.log(color("      Gas: " + formatNumber(tx.receipt.gasUsed) + " | " + prettyName + " | TxFee: " + txFee + " | gasPrice: " + finalGasPrice));
};

async function printEvents(solFunction) {
	let tx = await solFunction;
	console.log("_____________________\n");
	tx.receipt.logs.forEach(printLog);
};

function printLog(item) {
	console.log(color(item.event));
	console.log(JSON.parse(JSON.stringify(item.args)));
	console.log("_____________________\n");
}

async function getBlockNumber(solFunction) {
	let tx = await solFunction;
	return tx.receipt.blockNumber;
};

function formatNumber(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function greenOrRed(varToPrint, condition, description) {
	if(condition) {
		console.log(chalk.green(description + ": " + varToPrint));
	} else {
		console.log(chalk.red(description + ": " + varToPrint));
	}
}

function printVar(varToPrint, description) {
	console.log(chalk.yellow("    " + description + ": " + varToPrint));
}

module.exports = {
  printTx,
  printReceipt,
  printPostTx,
  printGasUsed,
  printTxFee,
  printGasAndFee,
  printEvents,
  getBlockNumber,
  greenOrRed,
  printVar
};