//subtract tiles at end
//TODO: be able to turn in tiles and get new ones
//TODO: send current board state to new connections
//subtract remaining tiles

/*var express = require("express");
var http = require("http");
var io = require("socket.io");*/

import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import ios from 'socket.io';

//import {setSyncedSocket,syncedRegisterHandler,synced} from './htmlSettlers/js/syncedObject.mjs';
//setSyncedSocket(io);
//var shared = require('./htmlSettlers/js/shared.js'); //get shared functions

//const spawn = require("child_process").spawn;

const app = express();
app.use(express.static("./htmlSettlers")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = 443;

//to create a self signed ssl files enter the following into a terminal with openssl:
//openssl genrsa -out key.pem
//openssl req -new -key key.pem -out csr.pem
//openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
//rm csr.pem
var sslFiles = {
	key: fs.readFileSync('./key.pem'),
	cert: fs.readFileSync('./cert.pem')
};
var server = https.createServer(sslFiles,app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
let io = ios.listen(server);
//setSyncedSocket(io);
/*initializing the websockets communication , server instance has to be sent as the argument */


var allClients = [];
var players = [];
var spectators = [];

/*
var minPlayers = 2;
var maxPlayers = 20;

var currentTurn = 0;

var boardRows = 13;
var boardColumns = 17;
var boardState = [];

var tileDesc = {
    zeros: 7,
	ones: 6,
	twos: 6,
	threes: 7,
	fours: 10,
	fives: 6,
	sixes: 10,
	sevens: 14,
	eights: 12,
	nines: 12
};

var tiles = [];
var allTiles = [];
*/
var gameMode = {
    LOBBY: 0,
    PLAY: 1,
    END: 2
};

var playerStatus = {
	PLAYER: 0,
	SPECTATOR: 1
}

var gameStatus = gameMode.LOBBY;

var serverColor = "#ffff00";
var gameColor = "#00ff00";
var gameErrorColor = "#ff0000";
var chatColor = "#ffffff";
var readyColor = "#ffffff";
var notReadyColor = "#ff0000";
var readyTitleColor = "#00ff00";
var notReadyTitleColor = "#ff0000";
var spectatorColor = "#444444";
var notYourTurnColor = "#ffffff";
var yourTurnColor = "#0000ff";


/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
 * 0<h<1    */
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
	
	return (Math.floor(r*256)<<16) + (Math.floor(g*256)<<8) + Math.floor(b*256);
	/*return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };*/
}

let oldh = 0;
const hInc = 67;

function newColor(){
	oldh = (oldh + hInc)%257;
	return HSVtoRGB(oldh/257,.8,.8);
}

console.log("Server Started!");

let curId = 0;
function defaultUserData(){
	return {
		public:{
			userName: "Unknown",
			userColor: newColor(),
			id: ++curId
		}
	}
}


io.on("connection", function(socket) {
	//syncedRegisterHandler(socket);

    socket.userData = defaultUserData();
	allClients.push(socket);

	//message(socket, "Connection established!", serverColor)

    console.log(__line, "Socket.io Connection with client " + socket.id +" established");
	sendPublicUserdataToAll(); //updates everyone of new player. //should be moved somewhere so it cannot be spammed
	
    socket.on("disconnect",function() {
		//message( io.sockets, "" + socket.userData.public.userName + " has left.", serverColor);
		//message( io.sockets, "Type 'kick' to kick disconnected players", serverColor);
		
		console.log(__line,"disconnected: " + socket.userData.public.userName + ": " + socket.id);
        var i = allClients.indexOf(socket);
        if(i >= 0){ allClients.splice(i, 1); }
		var i = spectators.indexOf(socket);
        if(i >= 0){ spectators.splice(i, 1); }
		sendPublicUserdataToAll();
        //players are only removed if kicked
    });
	
	socket.on('oldId', function(id){
		console.log(__line, "oldID:", id);
		for(var i = 0; i < players.length; i++){
			if(players[i].id == id){
				console.log(__line, "found old player!", players[i].userData.public.username, socket.userData.public.userName);
				var j = spectators.indexOf(socket);
				if(j >= 0){spectators.splice(j, 1)};
				socket.userData = players[i].userData;
				players[i] = socket;
			} else {
				console.log(__line, "new player");
			}
		}
	});

	//send position data to everyone
	socket.on('playerPosition', function(pos){
		pos.id = socket.userData.public.id;
		socket.broadcast.emit('playerPosition', pos);
	});

    /*socket.on("message",function(data) {
        //This event is triggered at the server side when client sends the data using socket.send() method 
        data = JSON.parse(data);

        console.log(__line, "data: ", data);
        //Printing the data 
		message( socket, "You: " + data.message, chatColor);
		message( socket.broadcast, "" + socket.userData.userName + ": " + data.message, chatColor);

        if(data.message === "end") {
            console.log(__line,"forced end");
            gameEnd();
        } else if(data.message === "start") {
            console.log(__line,"forced start");
            gameStart();
        } else if(data.message.toLowerCase() === "kick"){
			console.log(__line, "clearing players");
			for(var i = players.length-1; i >= 0; i--){
				if(players[i].disconnected){
					message( io.sockets, "" + players[i].userData.userName + " has been kicked!", chatColor);
					players.splice(i, 1);
				}
			}
			if( players.length < minPlayers) {
				gameEnd();
			} else {
				updateTurnColor();
			}
		}
        // Sending the Acknowledgement back to the client , this will trigger "message" event on the clients side
    });

    socket.on("userName", function(userName) {
        socket.userData.userName = userName;
        //socket.userData.ready = false;
        console.log(__line,"added new user: " + socket.userData.userName);
		message(io.sockets, "" + socket.userData.userName + " has joined!", serverColor);
        sendPublicUserdataToAll();
    });

    socket.on("ready", function(ready) {
        if (gameStatus === gameMode.LOBBY){
            socket.userData.ready = ready.ready;
			if (socket.userData.ready === true) {
				socket.userData.statusColor = readyColor;
				updateBoard(socket, readyTitleColor , false);
			} else {
				socket.userData.statusColor = notReadyColor;
				updateBoard(socket, notReadyTitleColor , false);
			}
            checkStart();
			console.log(__line,"" + socket.userData.userName + " is ready: " + ready.ready);
            sendPublicUserdataToAll();
        }
    });
	
	socket.on("newBoardState", function(newBoardState){
		if (gameStatus === gameMode.PLAY){
			if( players[currentTurn%players.length].id === socket.id ){
				check = shared.validTilesToPlay(socket.userData.tiles, newBoardState, boardState, allTiles);
				if(check.error.length == 0){
					if(check.skipped){
						socket.userData.skippedTurn = true;
					} else {
						socket.userData.skippedTurn = false;
					}
					socket.userData.score += check.score;
					//console.log(__line, "before remove", socket.userData.tiles);
					for(var i = 0; i < check.changedTiles.length; i++){ //place tiles onto board
						socket.userData.tiles.splice(socket.userData.tiles.indexOf(check.changedTiles[i]), 1);
					}
					//console.log(__line, "after remove", socket.userData.tiles);
					dealTiles(socket, shared.numberOfTilesForHand - socket.userData.tiles.length);
					//console.log(__line, "after pick", socket.userData.tiles);
					boardState = check.boardState;
					sendBoardState();
					nextTurn();
					updateTurnColor();
				} else {
					message(socket, check.error, gameErrorColor);
					console.log(__line, "invalid play:", check.error);
					//message(socket, "Invalid play!", gameErrorColor);
				}
			} else {
				message(socket, "It is not your turn!", gameErrorColor);
			}
		} else {
			message(socket, "Game not in mode to recieve play", gameErrorColor);
		}
	});*/
});

/*
function nextTurn(){
	if(checkEnd()){
		gameEnd();
	} else {
		currentTurn = (currentTurn + 1) % players.length;
		if(players[currentTurn].userData.tiles.length != 0){
			console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
			message(players[currentTurn], "It is your turn!", gameColor);
		} else {
			players[currentTurn].userData.skippedTurn = true;
			nextTurn();
		}
	}
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	socket.emit('message',JSON.stringify(messageObj));
}
*/

//updates all users
function sendPublicUserdataToAll(){
	//console.log(__line,"--------------Sending New User List--------------");
    let userList = [];
	allClients.forEach(function(client){
		userList.push(client.userData.public);
	});
    //console.log(__line,"----------------Done Sending List----------------");
	io.sockets.emit('allPublicUserData', userList);
}

/*

function updateBoard(socketSend, titleColor, showBoard) { //switches between title and game screen
    var showBoardMessage = {
        titleColor: titleColor,
        displayTitle: (showBoard === true) ? "none" : "flex",
        displayGame: (showBoard === true) ? "flex" : "none"
    };
    socketSend.emit("showBoard", showBoardMessage);
}

function checkStart() {	
    if( gameStatus === gameMode.LOBBY) {
        var readyCount = 0;
        allClients.forEach(function(client) {
            if( client.userData.ready ) {
                readyCount++;
            }
        });
        if(readyCount == allClients.length && readyCount >= minPlayers) {
            gameStart();
        }
    }
}

function gameStart() {
	console.log(__line,"gameStart");
	message(io.sockets, "THE GAME HAS STARTED", gameColor);
	gameStatus = gameMode.PLAY;
	//reset players
	players = [];
	spectators = [];
	allClients.forEach(function(client){ 
		if(client.userData.ready){
			client.userData.statusColor = notYourTurnColor;
			client.userData.tiles = [];
			client.userData.score = 0;
			client.userData.skippedTurn = false;
			players.push(client);
		} else {
			client.userData.statusColor = spectatorColor;
		}
	});
	
	setUpBoard();
	updateBoard(io.sockets, readyTitleColor, true);
	currentTurn = Math.floor(Math.random()*players.length); //random starting person

	console.log(__line,players[currentTurn%players.length].userData.userName + " starts the game!");
	message(io.sockets, players[currentTurn%players.length].userData.userName + " starts the game!", gameColor);
	
    tiles = makeTiles(); //deck to deal to players
	//console.log(__line, "cards", tiles);
	allTiles = [];
	for(var i =0; i < tiles.length; i++){
		allTiles.push(tiles[i]); //deck to reference cards
	}
	io.sockets.emit("allTiles", allTiles);
	//console.log(__line, "alltiles", allTiles);
	
	players.forEach(function(player) {
		//player.userData.tiles = [];
		dealTiles(player, shared.numberOfTilesForHand);
		//console.log(__line, "player", player.userData.name,player.userData.tiles);
	});
	
	//console.log(__line, "cards", tiles);
	//console.log(__line, "allTiles", allTiles);

	updateTurnColor();
	//wait for turn plays
}

function setUpBoard(){ //set all positions on the board to -1 to indicate no tile
	var row;
	var column;
	boardState = [];
	var boardRow;
	for (row = 0; row < boardRows; row++){
		boardRow = [];
		for (column = 0; column < boardColumns; column++){
			boardRow.push(shared.blankTile);
		}
		boardState.push(boardRow);
	}
	sendBoardState();
}

function sendBoardState(){
	io.sockets.emit("boardState", boardState);
}

function makeTiles() {
    var cards = [];
	var i;
	var tileId = 0;

	for (i = 0; i < tileDesc.zeros; i+=1) {
        cards.push({owner: "deck", number: 0, id: tileId++});
    }
    for (i = 0; i < tileDesc.ones; i+=1) {
        cards.push({owner: "deck", number: 1, id: tileId++});
    }
	for (i = 0; i < tileDesc.twos; i+=1) {
        cards.push({owner: "deck", number: 2, id: tileId++});
    }
	for (i = 0; i < tileDesc.threes; i+=1) {
        cards.push({owner: "deck", number: 3, id: tileId++});
    }
	for (i = 0; i < tileDesc.fours; i+=1) {
        cards.push({owner: "deck", number: 4, id: tileId++});
    }
	for (i = 0; i < tileDesc.fives; i+=1) {
        cards.push({owner: "deck", number: 5, id: tileId++});
    }
	for (i = 0; i < tileDesc.sixes; i+=1) {
        cards.push({owner: "deck", number: 6, id: tileId++});
    }
	for (i = 0; i < tileDesc.sevens; i+=1) {
        cards.push({owner: "deck", number: 7, id: tileId++});
    }
	for (i = 0; i < tileDesc.eights; i+=1) {
        cards.push({owner: "deck", number: 8, id: tileId++});
    }
	for (i = 0; i < tileDesc.nines; i+=1) {
        cards.push({owner: "deck", number: 9, id: tileId++});
    }
    return cards;
}

function dealTiles(player, amountToBeDelt) {
	var tileToGive;
	var i;
	for( i = 0; i < amountToBeDelt; i+=1) {
		if(tiles.length > 0){
			tileToGive = chooseRandomTile();
			tileToGive.owner = player.id;
			player.userData.tiles.push(tileToGive);
		}
	}
	player.emit("tiles", player.userData.tiles);
	message(io.sockets, tiles.length + " tiles left", gameColor);
}

function chooseRandomTile() {
	if(tiles.length > 0){
		var index = Math.floor(Math.random() * tiles.length);
		var returnTile = tiles[index];
		tiles.splice(index, 1);
		return returnTile;
	}
}


function playersHaveTiles(){ //to check end conditions
	var i;
	var have = false;
	for(i=0; i<players.length; i += 1){
		if(players[i].userData.tiles.length > 0){
			have = true;
		}
	}
	return have;
}

function allSkipped(){
	var allSkipped = true; //check if everyone has skipped
	for(var i = 0; i < players.length; i++){
		if(!players[i].userData.skippedTurn){
			allSkipped = false;
		}
	}
	return allSkipped;
}

function checkEnd(){
	return (!playersHaveTiles() || allSkipped());
}

function gameEnd() {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	message(io.sockets, "Scores: ", gameColor);
	let total = 0;
	for( var i = 0; i < players.length; i += 1){
		for(var tile = 0; tile < players[i].userData.tiles.length; tile++){
			players[i].userData.score -= players[i].userData.tiles[tile].number;
		}
		message(io.sockets, players[i].userData.userName + ": " + players[i].userData.score + "\n", gameColor);
		total += players[i].userData.score;
	}
	message(io.sockets, "Total score: " + total, gameColor);
	
    players = [];
	spectators = [];
    allClients.forEach(function(client) {
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    gameStatus = gameMode.LOBBY;
    updateUsers();
}

function updateTurnColor(){
	if(players.length > 0){
		players.forEach(function(player){
			player.userData.statusColor = notYourTurnColor;
		});
		players[currentTurn%players.length].userData.statusColor = yourTurnColor;
		console.log(__line,'update turn color');
		updateUsers();
	}
}

*/

let __line = '';
/*
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
  */


  //server console input
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