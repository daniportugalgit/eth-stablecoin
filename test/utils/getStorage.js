const leftPad = require('left-pad');

//@param block is optional
async function at(contractAddress, slotIndex, block) {
	if(block)
		return await web3.eth.getStorageAt(contractAddress, slotIndex, block);
	else
		return await web3.eth.getStorageAt(contractAddress, slotIndex);
};

async function atMapping(address, mappingSlot, key) {
  const mappingKeySlot = getMappingSlot(mappingSlot.toString(), key);
  const complexStorage = await web3.eth.getStorageAt(address, mappingKeySlot);
  return complexStorage;
}

const getMappingSlot = (mappingSlot, key) => {
  const mappingSlotPadded = standardizeInput(mappingSlot);
  const keyPadded = standardizeInput(key);
  const slot1 = web3.utils.soliditySha3({t:'bytes', v: keyPadded.concat(mappingSlotPadded)});
  console.log("type1: " + slot1);
  const slot2 = web3.utils.soliditySha3({ t: "bytes", v: "0x000000000000000000000000" }, { t: "address", v: key }, { t: "uint", v: mappingSlot })
  console.log("type2: " + slot2);



  return slot2;
}

const standardizeInput = input =>
  leftPad(web3.utils.toHex(input).replace('0x', ''), 64, '0');

const findMappingStorage = async (address, key, startSlot, endSlot) => {
  const bigStart = startSlot.add ? startSlot : web3.utils.toBN(startSlot);
  const bigEnd = endSlot.add ? endSlot : new web3.utils.toBN(endSlot);

  for (
    let mappingSlot = bigStart;
    mappingSlot.lt(bigEnd);
    mappingSlot = mappingSlot.add(web3.utils.toBN(1))
  ) {
    const mappingValueSlot = getMappingSlot(mappingSlot.toString(), key);
    const mappingValueStorage = await web3.eth.getStorageAt(
      address,
      mappingValueSlot
    )
    if (mappingValueStorage != '0x0') {
      return {
        mappingValueStorage,
        mappingValueSlot,
        mappingSlot
      }
    }
  }

  return null
}

module.exports = {
  at,
  atMapping,
  findMappingStorage
};

/*
Xavier said:
web3.eth.getStorageAt(ownableAddress, 0, 123000)
should give you the owner of `ownableAddress` at block `123000`.
Because `owner` is the first declared storage element.

also, sha3(1, aliceAddress) would be used to get the mapping in slot 1 (0-based) and search for aliceAddress
*/

/*
index = '0000000000000000000000000000000000000000000000000000000000000005'
key =   '00000000000000000000000xbccc714d56bc0da0fd33d96d2a87b680dd6d0df6'
let newKey =  web3.sha3(key + index, {"encoding":"hex"})
console.log(web3.eth.getStorageAt(contractAddress, newKey))
console.log('DEC: ' + web3.toDecimal(web3.eth.getStorageAt(contractAddress, newKey)))
result:
0x0000000000000000000000000000000000000000000000000000000000000058
DEC: 88
*/

