var Addresses={
	localAddress : "alanisboard.ddns.net:8081",
	publicAddress : "alanisboard.ddns.net:8082",
	socket : '8082',
}
try {
	module.exports = Addresses;
} catch (err){
	console.log("IP Addresses validated");
}