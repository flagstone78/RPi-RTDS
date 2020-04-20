const express = require('express');
const { ExpressPeerServer } = require('peer');
//var mysql = require('mysql');
var Addresses=require('./IPconfiguration/IPconfiguration.js')
var conDB=require('./IPconfiguration/databaseLogin.js')


conDB.connect(function(err) {
  if (err) throw err;
});
function getGameIDCallBack(err, result, fields) {
  console.log(__line,"aaaaaaaaaaaaaaaaa", err, result);
  if (err) throw err;
  if (result.length < 1){
    gameId = 0;
  } else {
    gameId = result[0].game_id+1;
  }
  console.log(__line, "game id result: ", gameId);
}
conDB.query(" SELECT ID, type FROM allGames WHERE Staus = 'ready' ORDER BY id DESC", getGameIDCallBack);
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
app.use(express.static("./IPconfiguration"))
app.use(express.static("./cribbage"));
app.use(express.static("./Lobby"));

server.listen(8081);
console.log('server started')


//captures stack? to find and return line number
Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});
//allows to print line numbers to console
Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});
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