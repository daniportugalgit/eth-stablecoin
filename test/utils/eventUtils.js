async function getPastOverloadedEvents(contractInstance, eventName) {
	let events = await contractInstance.getPastEvents('allEvents', {fromBlock:'latest'});

	let eventList = [];
	for(let i = 0; i < events.length; i++) {
		if(events[0].event == eventName)
			eventList.push(events[0]);
	}

	return eventList;
}

module.exports = {
	getPastOverloadedEvents
}