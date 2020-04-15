var Addresses={
	localAddress : "localhost:8081",
	publicAddress : "alanisboard.ddns.net:8081",
	socket : 8081,
}
try {
	module.exports = Addresses;
} catch (err){
	console.log("IP Addresses validated");
}