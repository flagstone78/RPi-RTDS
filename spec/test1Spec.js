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
	//console.log("ttt",tgame);

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
	xdescribe("adds to 15",()=>{
		it("counts 7,8 as 2",()=>{

		})
	})

});
describe('handTally',()=>{
	let players = [defaultUserData(), defaultUserData()];
	var tgame = new game(players, {message, updateUsers,updateGameplayers, sendCards,  all: []})
	//console.log(tgame.cards.getProperties(0))
	describe('knobbs',()=>{
		it("counts Jack of spades(Js) in hand and Ace of spades(As) in center as 1 point",()=>{
			tgame.centerCard=0
			let hand=[10]
			expect(tgame.knobbs(tgame.centerCard,hand)).toBe(1)
		})

		it("counts Js spades(s) as 1",()=>{
			for (let i=0;i<13;i++){
				tgame.centerCard=i
				let hand=[10]
				expect(tgame.knobbs(tgame.centerCard,hand)).toBe(1)
			}
		})

		it("counts JJJJ card(c) as 1",()=>{
			for (let i=0;i<52;i++){
				tgame.centerCard=i
				let hand=[10,23,36,49]
				expect(tgame.knobbs(tgame.centerCard,hand)).toBe(1)
			}
		})

		let noJ=Array.from(Array(52).keys())//array of cards without Jacks
		for (let j=10;j<52;j+=12){
				noJ.splice(j,1)
			}
		//console.log(noJ)
		it("counts noJnoJnoJnoJ c as 0",()=>{
			for (let j=3;j<noJ.length;j++){
				for (let i=0;i<52;i++){
					tgame.centerCard=i
					let hand=[noJ[j],noJ[j-1],noJ[j-2],noJ[j-3]]
					if(tgame.knobbs(tgame.centerCard,hand)){
						console.log('i=',i)
						console.log('hand=',hand)
						//console.log(tgame.knobbs(tgame.centerCard,hand))
					}
					expect(tgame.knobbs(tgame.centerCard,hand)).toBe(0)
				}
			}
		})
		it("counts msJnoJnoJnoJ msC as 1",()=>{
			for (let i=2;i<noJ.length;i++){
				for (let j=0;j<13;j++){
					for (let k=0;k<4;k++){
						tgame.centerCard=j+k*13
						let hand=[k*13+10,noJ[i-1],noJ[i-2],noJ[i]]
						if(tgame.knobbs(tgame.centerCard,hand)==0){
							console.log('jack',10+k*13)
							console.log('centerCard',j+k*13)
							console.log('hand=',hand)
							//console.log(tgame.knobbs(tgame.centerCard,hand))
						}
						expect(tgame.knobbs(tgame.centerCard,hand)).toBe(1)
					}
				}
			}
		})
	})

});