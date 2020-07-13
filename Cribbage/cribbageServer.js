//server on
//path to files
var Addresses=require('../IPconfiguration/IPconfiguration.js')
var express = require("express");
var http = require("http");
var io = require("socket.io");
//var Qengine = require('./MooseServer1/js/questionEngine.js')

var game = require("./Game.js");
var GLOBALS = require("./Globals.js");


var app = express();
app.use(express.static("../IPconfiguration"))
app.use(express.static("./htmlCribbage")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = Addresses.socket;
//var server = http.createServer(app).listen(8080); //Server listens on the port 8124
var server = http.createServer(app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */
var uncrib = undefined;
var minPlayers = 2;
var maxPlayers = 4;

var allClients = [];
//var players = [];
//var plength = 0;
var spectators = [];



var playerStatus = {
	PLAYER: 0,
	SPECTATOR: 1
}
//
var lobbyStatus = GLOBALS.gameMode.LOBBY;


var cards = undefined
var card=undefined
var i=undefined

var userList=[]
var countedCrib=false

console.log("Server Started!");

function defaultUserData(){
	return {
		userName: "Unknown",
		hand: [],
		tableCards:[],
		color: GLOBALS.notReadyColor,
		ready: false,
		score: 0
	}
}

io.sockets.on("connection", function(socket) {
    socket.userData = defaultUserData();
    
    allClients.push(socket);
    if (lobbyStatus === GLOBALS.gameMode.LOBBY) {
        socket.userData.color = GLOBALS.notReadyColor;
    } else {
		spectators.push(socket);
        socket.userData.color = GLOBALS.spectatorColor;
        updateBoard(socket, GLOBALS.notReadyTitleColor, true);
		updateUsers(socket);
    }

	message(socket, "Connection established!", GLOBALS.serverColor)

    console.log(__line, "Socket.io Connection with client " + socket.id +" established");

    socket.on("disconnect",function() {
		message( io.sockets, "" + socket.userData.userName + " has left.", GLOBALS.serverColor);
		message( io.sockets, "Type 'kick' to kick disconnected players", GLOBALS.serverColor);
        console.log(__line,"disconnected: " + socket.userData.userName + ": " + socket.id);
        let i = allClients.indexOf(socket);
        if(i >= 0){ allClients.splice(i, 1); }
		i = spectators.indexOf(socket);
        if(i >= 0){ spectators.splice(i, 1); }
        if(lobbyStatus!=GLOBALS.gameMode.LOBBY){
        	let i = uncrib.players.indexOf(socket)
        	if(i >= 0){uncrib.players.disconnected=true}
        }
		updateUsers();
        //players are only removed if kicked
    });
	
	socket.on('oldId', function(id){
		console.log(__line, "oldID:", id);
		for(let i = 0; i < allClients.length; i++){
			if(lobbyStatus!=GLOBALS.gameMode.LOBBY){
				if(uncrib.players[i].id == id){
					console.log(__line, "found old player!", uncrib.players[i].userData.username, socket.userData.userName);
					let j = uncrib.spectators.indexOf(socket);
					if (j >= 0){
						uncrib.spectators.splice(j, 1)
					}else {
						console.log(__line, "new player");
					};
					socket.userData = uncrib.players[i].userData;
					uncrib.players[i] = socket;
				} 
			} else {
				console.log(__line, "game not started");
			}
		}
		updateUsers()
	});

    socket.on("message",function(data) {
        /*This event is triggered at the server side when client sends the data using socket.send() method */
        data = JSON.parse(data);

        console.log(__line, "data: ", data);
        /*Printing the data */
		message( socket, "You: " + data.message, GLOBALS.chatColor);
		message( socket.broadcast, "" + socket.userData.userName + ": " + data.message, GLOBALS.chatColor);

        if(data.message === "end") {
            console.log(__line,"forced end");
            closeLobby();
        } else if(data.message === "start") {
            console.log(__line,"forced start");
            gameStart();
        } else if(data.message.toLowerCase() === "kick"){
			console.log(__line, "clearing players");
			uncrib.kickPlayers()
		}
        /*Sending the Acknowledgement back to the client , this will trigger "message" event on the clients side*/
    });

    socket.on("userName", function(userName) {
        socket.userData.userName = userName;
        console.log(__line,"added new user: " + socket.userData.userName);
		message(io.sockets, "" + socket.userData.userName + " has joined!", GLOBALS.serverColor);
        updateUsers();
    });

    socket.on("ready", function(ready) {
        if (lobbyStatus === GLOBALS.gameMode.LOBBY){
            socket.userData.ready = ready.ready;
			if (socket.userData.ready === true) {
				socket.userData.color = GLOBALS.readyColor;
				updateBoard(socket, GLOBALS.readyTitleColor , false);
			} else {
				socket.userData.color = GLOBALS.notReadyColor;
				updateBoard(socket, GLOBALS.notReadyTitleColor , false);
			}
            checkStart();
			console.log(__line,"" + socket.userData.userName + " is ready: " + ready.ready);
            updateUsers();
        }
    });
    socket.on("echo",function(data){
    	let call=data.call
    	let dataOut=data.dataOut
    	if(call=="echo"){
    		call='message'
    		dataOut={
				data: "break loop",
				color: GLOBALS.gameErrorColor
			};
    	}
    	socket.emit(call,dataOut)
    });
    socket.on("toss",function(cards){
    	console.log(__line,socket.userData.userName+' tossed')
    	console.log(__line,uncrib.gameStatus)
    	if(uncrib.gameStatus===GLOBALS.gameMode.THROW){
    		let tossValid=uncrib.validToss(cards,socket)
    		console.log(tossValid)
    		if(tossValid){
    			console.log('valid')
    			uncrib.toss(cards,socket)
    		}
    		sendCards([socket]);
    	}
    });
    socket.on("play",function(card){
    	if(uncrib.gameStatus===GLOBALS.gameMode.TABLE){
    		if(uncrib.players[uncrib.currentTurn].id==socket.id){
	    		if(uncrib.tableCount+uncrib.cards.values[card]<32){
	    			let cardInHand=socket.userData.hand.indexOf(card)
					if(cardInHand==-1){
						console.log(__line,'not in hand')
					}else{
						socket.userData.tableCards.push(socket.userData.hand.splice(cardInHand,1).pop())
						socket.userData.score+=uncrib.playCard(card)
						console.log(__line,card+' was played')
						uncrib.nextTurn()
					};
	    		}
	    	}else{message(socket,'not your turn', GLOBALS.notYourTurnColor)}
    	}
    });
    socket.on("counted",function(){
    	if(uncrib.gameStatus===GLOBALS.gameMode.COUNT){
			if(socket.id==uncrib.players[uncrib.currentTurn].id){
				if(uncrib.currentTurn==uncrib.dealer){
					if(uncrib.crib.length){
						uncrib.countHand(uncrib.dealer,uncrib.crib)
						uncrib.cards.returnCards(uncrib.crib)
						uncrib.cards.returncard(uncrib.centerCard.pop())
						uncrib.crib=[]
						uncrib.centerCard=[]
					}else{
						uncrib.startToss()
					}
				}else{
					uncrib.currentTurn++;
		    		uncrib.currentTurn%=uncrib.players.length;
		    		uncrib.countHand(uncrib.currentTurn,uncrib.players[uncrib.currentTurn].userData.tableCards)
		    		uncrib.cards.returnCards(uncrib.players[uncrib.currentTurn].userData.tableCards)
		    		uncrib.players[uncrib.currentTurn].userData.tableCards=[]
		    		updateUsers()
				}
			}
    	}

    })
});


function checkStart() {	
    if( lobbyStatus === GLOBALS.gameMode.LOBBY) {
        var readyCount = 0;
        allClients.forEach(function(client) {
            if( client.userData.ready ) {
                readyCount++;
            }
        });
        if((readyCount == allClients.length||readyCount==maxPlayers) && readyCount >= minPlayers) {
            gameStart();
        }
    }
}


function gameStart() {
	console.log(__line,"gameStart");
	message(io.sockets, "THE GAME HAS STARTED", GLOBALS.gameColor);
	updateBoard(io.sockets, GLOBALS.readyTitleColor, true)//changes board to play state
	lobbyStatus=GLOBALS.gameMode.PLAY

	let players = [];
	for( let client of allClients){
		if(client.userData.ready){
			players.push(client);
			//console.log(players[this.players.length-1].userData);
		} else {
			client.userData.color = GLOBALS.spectatorColor;
		}
	}



	//---------------------------------------!!!!!!!!!!!!!!!!!
	uncrib = new game(players, {message, updateUsers,updateGameplayers, sendCards,  all: io.sockets})
	uncrib.startToss();//start game
	updateUsers(); // update ui state on table to allow submit button
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	socket.emit('message',JSON.stringify(messageObj));
}

function updateUsers(target = io.sockets){
	console.log(__line,"--------------Sending New User List--------------");
    userList = [];
	if(uncrib == undefined){
		allClients.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	} else {
		updateGameplayers()
	}
    console.log(__line,"----------------Done Sending List----------------");
	
	io.sockets.emit('userList', userList);
}

function getUserSendData(client){
	console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.color, "|score:", client.userData.score);
	let a = {
		id: client.id,
		userName: client.userData.userName,
		color: client.userData.color,
		table: client.userData.tableCards,
		score: client.userData.score
	}

	if(uncrib != undefined){
		a.gameState = uncrib.gameStatus;
	}

	return a;
}

function sendCards(clients){
	if(uncrib != undefined){
		for(let client of clients){
			let cardsOut={
				center: uncrib.centerCard,
				hand:   client.userData.hand,
				table:  uncrib.cardsOnTable
			} 
			console.log(__line, cardsOut)
			client.emit("cards",cardsOut);
		}
	}
	updateUsers();
}

function updateGameplayers(){
	//userList=[]
	for(let client of uncrib.players){
		if(!client.disconnected){
			if(client.id==uncrib.players[uncrib.currentTurn].id){
				client.userData.color=GLOBALS.yourTurnColor
			}else{
				client.userData.color=GLOBALS.notYourTurnColor
			}
			let data=getUserSendData(client)
			userList.push(data);
		}
	};
	
	spectators.forEach(function(client){
		userList.push(getUserSendData(client));
	});
}

function updateBoard(socketSend, titleColor, showBoard) { //switches between title and game screen
    var showBoardMessage = {
        titleColor: GLOBALS.titleColor,
        displayTitle: (showBoard === true) ? "none" : "flex",
        displayGame: (showBoard === true) ? "flex" : "none"
    };
    socketSend.emit("showBoard", showBoardMessage);
}


function updateTurnColor(){
	if(uncrib.players.length > 0){
		uncrib.players.forEach(function(player){
			player.userData.color = GLOBALS.notYourTurnColor;
		});
		uncrib.players[currentTurn%uncrib.players.length].userData.color = GLOBALS.yourTurnColor;
		console.log(__line,'update turn color');
		updateUsers();
	}
}



function closeLobby() {
    console.log(__line,"lobbyEnd");
    //updateBoard(io.sockets, notReadyTitleColor, false);
	message(io.sockets, "THE GAME HAS been removed from server", GLOBALS.gameColor);
	uncrib = undefined;
}



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

//allows input from the console
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