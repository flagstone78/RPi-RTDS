//var rewire = require("rewire");
//var app = rewire("../cribbageServer.js");

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

var game = require('../Cribbage/Game.js');

var spectators = [];

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

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	//socket.emit('message',JSON.stringify(messageObj));
	console.log('message',JSON.stringify(messageObj));
}

function updateUsers(target = io.sockets){
	//console.log(__line,"--------------Sending New User List--------------");
    userList = [];
	if(uncrib == undefined){
		allClients.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	} else {
		updateGameplayers()
	}
    //console.log(__line,"----------------Done Sending List----------------");
	
	//io.sockets.emit('userList', userList);
	console.log('userList', userList);
}

function sendCards(clients){
	if(uncrib != undefined){
		for(let client of clients){
			let cardsOut={
				center: uncrib.centerCard,
				hand:   client.userData.hand,
				table:  uncrib.cardsOnTable
			} 
			
			//client.emit("cards",cardsOut);
			console.log("cards",cardsOut);
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





describe("tableTally",()=>{
	let players = [defaultUserData(), defaultUserData()];
	var tgame = new game(players, {message, updateUsers,updateGameplayers, sendCards,  all: []})
	console.log("ttt",tgame);
	

	describe("matching",()=>{
		it("counts single", ()=>{
			expect(tgame.checkPair(0,[])).toBe(0);
		});

		it("counts double", ()=>{
			expect(tgame.checkPair(0,[13])).toBe(2);
		});

		it("counts triples", ()=>{
			expect(tgame.checkPair(0,[13,26])).toBe(6);
		});

		it("counts quadruples", ()=>{
			expect(tgame.checkPair(0,[13,26,39])).toBe(12);
		});

		it("counts all nyyyy as 12", ()=>{
			for(let i=0; i<13; i++){
				for(let j=0; j<4; j++){
					for(let k=0; k<4; k++){
						for(let w=0; w<4; w++){
							for(let u=0; u<4; u++){
								for(let z = 1; z<13; z++){
									expect(tgame.checkPair(i+j*13,[(i+j*13+z)%52,i+k*13, i+w*13, i+u*13])).toBe(12);
								}
								//console.log(i+j*13,[i+k*13]);
							}
						}
					}
				}
			}
		})

		it("counts all ynyyy as 6", ()=>{
			for(let i=0; i<13; i++){
				for(let j=0; j<4; j++){
					for(let k=0; k<4; k++){
						for(let w=0; w<4; w++){
							for(let z = 1; z<13; z++){
								expect(tgame.checkPair(i+j*13,[(i+j*13+z)%52,i+k*13, i+w*13])).toBe(6);
							}
							//console.log(i+j*13,[i+k*13]);
						}
					}
				}
			}
		})



		it("counts yynyy as 2", ()=>{
			for(let i=0; i<13; i++){
				for(let j=0; j<4; j++){
					for(let k=0; k<4; k++){
						for(let w=0; w<4; w++){
							for(let z = 1; z<13; z++){
								expect(tgame.checkPair(i+j*13,[i+k*13, (i+j*13+z)%52, i+w*13])).toBe(2);
							}
							//console.log(i+j*13,[i+k*13]);
						}
					}
				}
			}
		})

		it("counts yyyny as 0", ()=>{
			for(let i=0; i<13; i++){
				for(let j=0; j<4; j++){
					for(let k=0; k<4; k++){
						for(let w=0; w<4; w++){
							for(let z = 1; z<13; z++){
								expect(tgame.checkPair(i+j*13,[i+k*13, i+w*13, (i+j*13+z)%52])).toBe(0);
							}
							//console.log(i+j*13,[i+k*13]);
						}
					}
				}
			}
		})
	})

});