const express = require('express');
const { ExpressPeerServer } = require('peer');
var cribbageServer=require('./cribbage/cribbageServer.js')
const app = express();

//app.get('/', (req, res, next) => res.send('Hello world!'));

const http = require('http');

const server = http.createServer(app);
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/myapp',
});

app.use('/peerjs', peerServer);
//app.use('/cribbage',express.static("../IPconfiguration"))
app.use(app.use(express.static("./IPconfiguration")))
//app.use(express.static("./cribbage"));
app.use(express.static("./cribbage/htmlCribbage"));

server.listen(8081);
console.log('server started')

var stdin = process.openStdin();
stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that  
    // with toString() and then trim() 
	var input = d.toString().trim();
    console.log('you entered: [' + input + ']');
	try{
		eval("console.log("+input+")");
	} catch (err) {
		console.log("invalid command");
	}
  });