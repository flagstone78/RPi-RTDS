//server on
//path to files
var express = require("express");
var http = require("http");
var io = require("socket.io");
//var Qengine = require('./MooseServer1/js/questionEngine.js')

var app = express();
app.use(express.static("./clientSide")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = 8080;
//var server = http.createServer(app).listen(8080); //Server listens on the port 8124
var server = http.createServer(app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */
var nameOfGame = undefined;
var minPlayers = 2;
var maxPlayers = 20;

var allClients = [];
var players = [];
var spectators = [];




var gameMode = {
    LOBBY: 0,
    PLAY: 1,
	MOVEORQUESTION: 2,
    END: 3
};

var playerStatus = {
	PLAYER: 0,
	SPECTATOR: 1
}
//
var gameStatus = gameMode.LOBBY;

// colors
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


var cards = undefined
var userList=[]

console.log("Server Started!");

function defaultUserData(){
	return {
		userName: "Unknown",
		tiles: [],
		color: notReadyColor,
		ready: false,
	}
}

io.sockets.on("connection", function(socket) {
    socket.userData = defaultUserData();
    
    allClients.push(socket);
    if (gameStatus === gameMode.LOBBY) {
        socket.userData.color = notReadyColor;
    } else {
		spectators.push(socket);
        socket.userData.color = spectatorColor;
        updateBoard(socket, notReadyTitleColor, true);
		updateUsers(socket);
    }

	message(socket, "Connection established!", serverColor)

    console.log(__line, "Socket.io Connection with client " + socket.id +" established");

    socket.on("disconnect",function() {
		message( io.sockets, "" + socket.userData.userName + " has left.", serverColor);
		message( io.sockets, "Type 'kick' to kick disconnected players", serverColor);
        console.log(__line,"disconnected: " + socket.userData.userName + ": " + socket.id);
        let i = allClients.indexOf(socket);
        if(i >= 0){ allClients.splice(i, 1); }
		i = spectators.indexOf(socket);
        if(i >= 0){ spectators.splice(i, 1); }
        if(gameStatus!=gameMode.LOBBY){
        	let i = nameOfGame.players.indexOf(socket)
        	if(i >= 0){nameOfGame.players.disconnected=true}
        }
		updateUsers();
        //players are only removed if kicked
    });
	
	socket.on('oldId', function(id){
		console.log(__line, "oldID:", id);
		for(var i = 0; i < allClients.length; i++){
			if(gameStatus!=gameMode.LOBBY){
				if(nameOfGame.players[i].id == id){
					console.log(__line, "found old player!", nameOfGame.players[i].userData.username, socket.userData.userName);
					let j = nameOfGame.spectators.indexOf(socket);
					if (j >= 0){
						nameOfGame.spectators.splice(j, 1)
					}else {
						console.log(__line, "new player");
					};
					socket.userData = nameOfGame.players[i].userData;
					nameOfGame.players[i] = socket;
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
		message( socket, "You: " + data.message, chatColor);
		message( socket.broadcast, "" + socket.userData.userName + ": " + data.message, chatColor);

        if(data.message === "end") {
            console.log(__line,"forced end");
            closeGame();//????
        } else if(data.message === "start") {
            console.log(__line,"forced start");
            gameStart();
        } else if(data.message.toLowerCase() === "kick"){
			console.log(__line, "clearing players");
			nameOfGame.kickPlayers()
		}
        /*Sending the Acknowledgement back to the client , this will trigger "message" event on the clients side*/
    });

    socket.on("userName", function(userName) {
        socket.userData.userName = userName;
        console.log(__line,"added new user: " + socket.userData.userName);
		message(io.sockets, "" + socket.userData.userName + " has joined!", serverColor);
        updateUsers();
    });

    socket.on("ready", function(ready) {
        if (gameStatus === gameMode.LOBBY){
            socket.userData.ready = ready.ready;
			if (socket.userData.ready === true) {
				socket.userData.color = readyColor;
				updateBoard(socket, readyTitleColor , false);
			} else {
				socket.userData.color = notReadyColor;
				updateBoard(socket, notReadyTitleColor , false);
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
				color: gameErrorColor
			};
    	}
    	socket.emit(call,dataOut)
    })
});


function checkStart() {	
    if( gameStatus === gameMode.LOBBY) {
        var readyCount = 0;
        allClients.forEach(function(client) {
            if( client.userData.ready ) {
                readyCount++;
            }
        });
        if((readyCount == allClients.length||readyCount == maxPlayers) && readyCount >= minPlayers) {
            gameStart();
        }
    }
}
class game{
	constructor(allClients){
		this.cards = new Deck({number:[1,2]})
		this.spectators=[]
		this.currentTurn=0
		this.numberOfTilesForHand=1
		//console.log(__line,'deck',this.cards)
		this.createplayers(allClients,this.cards)
		this.updateGameplayers()
		this.nextTurn()
	}
	createplayers(allClients,cards){
		let numberOfTiles=this.numberOfTilesForHand
		let currentplayers=[]
		allClients.forEach(function(client){ 
			if(client.userData.ready){
				//deal cards
				let player=client;
				player.userData.tiles=cards.deal(numberOfTiles)
				currentplayers.push(player);
			} else {
				client.userData.color = spectatorColor;
			}
		});
		this.players=currentplayers
	}
	sendPersonalData(){
		this.players.forEach(function(player) {
			let tiles=player.userData.tiles
			console.log(__line,tiles)
			player.emit("tiles", tiles)
		})
	}
	nextTurn(){
		if(this.checkEnd()){
			this.gameEnd();
		} else {
			this.currentTurn +=1 
		}
	}
	updateGameplayers(){
		//userList=[]
		this.players.forEach(function(client){
			if(!client.disconnected){
				let data=getUserSendData(client)
				userList.push(data);
			}
		});
		this.spectators.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	}
	kickPlayers(){
		for(var i = this.players.length-1; i >= 0; i--){
			if(this.players[i].disconnected){
				message( io.sockets, "" + players[i].userData.userName + " has been kicked!", chatColor);
				this.players.splice(i, 1);
			}
		}
		if( this.players.length < minPlayers) {
			closeGame();
		} else {
			updateTurnColor();
		}
	}
	checkEnd(){
		return (false);
	}
	gameEnd(){
		message(io.sockets, "THE GAME HAS ENDED", gameColor);
		closeGame()
	}
}
function gameStart() {
	console.log(__line,"gameStart");
	message(io.sockets, "THE GAME HAS STARTED", gameColor);
	updateBoard(io.sockets, readyTitleColor, true)//changes board to play state
	nameOfGame=new game(allClients)
	gameStatus=gameMode.PLAY
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
	if(nameOfGame == undefined){
		allClients.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	} else {
		nameOfGame.updateGameplayers()
	}
    console.log(__line,"----------------Done Sending List----------------");
	
	io.sockets.emit('userList', userList);
}

function getUserSendData(client){
	console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.color, "|score:", client.userData.score);
	return{
		id: client.id,
		userName: client.userData.userName,
		color: client.userData.color,
		score: client.userData.score
	};
}

function updateBoard(socketSend, titleColor, showBoard) { //switches between title and game screen
    var showBoardMessage = {
        titleColor: titleColor,
        displayTitle: (showBoard === true) ? "none" : "flex",
        displayGame: (showBoard === true) ? "flex" : "none"
    };
    socketSend.emit("showBoard", showBoardMessage);
}


function sendBoardState(emitChoice){
	io.sockets.emit("boardState", Qengine.players);
	
}


function updateTurnColor(){
	if(players.length > 0){
		players.forEach(function(player){
			player.userData.color = notYourTurnColor;
		});
		players[currentTurn%players.length].userData.color = yourTurnColor;
		console.log(__line,'update turn color');
		updateUsers();
	}
}



function closeGame() {
    console.log(__line,"gameEnd");
    //updateBoard(io.sockets, notReadyTitleColor, false);
	message(io.sockets, "THE GAME HAS been removed from server", gameColor);
	nameOfGame=[]
}

class Deck{
	constructor(cardDesc){
		this.cardDesc = cardDesc //CONST
		this.propKeys = Object.keys(this.cardDesc) //CONST
		
		let constants = [1]
		let constant = 1
		for(let propIndex = this.propKeys.length-1; propIndex >= 0; propIndex--){
			constant *= this.cardDesc[this.propKeys[propIndex]].length
			constants.unshift(constant)
		}
		
		this.totalCards = constants.shift() //first number is the total number of cards
			
		this.divConstants = constants //CONST
		this.pile =[]
		for( let i = 0;i<this.totalCards;i++){this.pile.push(i);}
		this.shuffle(5)
	}
	
	getProperties(cardNum){
		if(cardNum > this.totalCards) return undefined
		
		let cardProp = {}
		
		for(let propIndex = 0; propIndex < this.propKeys.length; propIndex++){
			let currentPropertyKey = this.propKeys[propIndex]  //'color'
			let currentPropertyList = this.cardDesc[currentPropertyKey] //['green','red','blue']
			
			//integer divide to get value
			let valueIndex = Math.floor(cardNum / this.divConstants[propIndex])
			cardProp[currentPropertyKey] = currentPropertyList[valueIndex]
			
			//subtract
			cardNum -= this.divConstants[propIndex]*valueIndex
		}
		
		return cardProp
	}

	getWholeDeck(){
		var wholeDeck=[]
		for(let cardNum = 0; cardNum < this.totalCards; cardNum++){
			wholeDeck.push(this.getProperties(cardNum))
		}
		return wholeDeck
	}

	shuffle(n=1){
		while(n){
			let m = this.pile.length, i;
			while(m){
				i = Math.floor(Math.random() * m--);
				[this.pile[m],this.pile[i]]=[this.pile[i],this.pile[m]]
			}
			n--
		}
	}
	
	deal(n=1){
		let hand=[]
		while(n){
			if(this.pile.length>0){
				hand.push(this.pile.pop());n--;
			}else{
				//send -1 on end of pile
				hand.push(-1);n--;
			}
		}
		return hand
	}

	returncard(cardID){
		let index=0
		if(this.pile.length>0){
			index = Math.floor(Math.random()*this.pile.length)
			this.pile.spice(index,0,cardID)
		}else{
			this.pile.push(cardID)
		}
	}

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