var Deck = require("./Deck.js");
var GLOBALS = require("./Globals.js");

function getvalues(cards){
	let values=[]
	for(let i=0;i<cards.totalCards;i++){
		let number=cards.getProperties(i).number
		if(typeof number =="number"){
			values.push(number)
		}else if(number=="A"){
			values.push(1)
		}else{values.push(10)}
	}
	return values
}


class game{
	constructor(allClients, communicationInterface){
		this.comms = communicationInterface; //io functions
		this.gameStatus = GLOBALS.gameMode.PLAY;
		this.cards = new Deck({suit:['♠','♥','♦','♣'], number:['A',2,3,4,5,6,7,8,9,10,'J','Q','K']})
		this.cards.values=getvalues(this.cards)
		this.spectators=[]
		this.dealer=0
		this.currentTurn=-1
		this.tableCount=0
		this.number2throw=Math.floor(4/(allClients.length))
		this.numberOfhandForHand=4+this.number2throw
		console.log(__line,'numberOfcardsForHand',this.numberOfhandForHand)
		
		this.players = allClients;

		//players=currentplayers
		
		this.crib=[]
		this.cardsOnTable=[]
		this.centerCard=[]
		//this.startToss()
		//updateUsers()
	}

	sendPersonalData(){
		this.players.forEach(function(player) {
			let Hand=player.userData.hand
			console.log(__line,Hand)
			player.emit("hand", Hand)
		})
	}
	startToss(){
		let i=4
		for(let player of this.players){
			player.userData.color= GLOBALS.notReadyColor
			player.userData.hand=this.cards.deal(this.numberOfhandForHand)
			player.userData.tableCards=[]
			i-=this.number2throw
			//player.userData.score+=30
			if(player.userData.score>120){
				this.gameEnd()
				break
			}
		}
		this.crib=[]
		this.crib=this.cards.deal(i)
		this.cardsOnTable=[]
		this.dealer++
		this.dealer%=this.players.length;
		this.currentTurn=this.dealer
		this.gameStatus=GLOBALS.gameMode.THROW
		this.comms.sendCards(this.players);
		this.comms.message(this.comms.all,' '+this.players[this.dealer].userData.userName+' dealt')
		console.log(' '+this.players[this.currentTurn].userData.userName+' dealt')
	}
	validToss(receivedCards,socket){
		let i=0
		console.log('socket hand',socket.userData.hand)
		for(let card of receivedCards){
			//console.log('receivedCards'+card)
			let cardInHand=socket.userData.hand.indexOf(card)
			if(cardInHand==-1){return false}else{i+=1};
		}
		console.log(__line,i)
		if(i==this.number2throw){
			console.log(__line,'made it to end')
			return true
		}else{
			return false
		}
	}


	toss(receivedCards,socket){
		socket.userData.color= GLOBALS.readyColor
		for(let card of receivedCards){
			let cardInHand=socket.userData.hand.indexOf(card);
			console.log(__line,'tossing '+cardInHand)
			this.crib.push(socket.userData.hand.splice(cardInHand,1).pop())
		}
		this.comms.sendCards([socket])
		if(this.crib.length==4){
			this.startTable()
		}
	}
	startTable(){
		for(let player of this.players){
			player.userData.color= GLOBALS.notYourTurnColor
			player.userData.ready=false
		}
		this.tableCount=0
		this.currentTurn=this.dealer
		this.nextTurn()
		this.comms.updateUsers()
		this.centerCard=this.cards.deal()
		this.gameStatus=GLOBALS.gameMode.TABLE
	}
	nextTurn(){
		console.log('currentTurn',this.currentTurn)
		console.log(__line,this.currentTurn,'nextTurn started')
		this.currentTurn +=1
		this.currentTurn%=this.players.length;
		if(this.nocards()){
			this.startCount()
		}else{
			let passed=this.players[this.currentTurn].userData.ready
			console.log(__line,'passed previously=',passed)
			if(!passed){
				let currentCards=this.players[this.currentTurn].userData.hand
				let under31=false
				for(let card in currentCards){
					console.log(__line,currentCards[card])
					console.log(__line,this.cards.values[currentCards[card]])
					under31|=(this.tableCount+this.cards.values[currentCards[card]])<32
					if(under31){
						break;
					};
				}
				if(!under31){
					this.players[this.currentTurn].userData.ready=true
					passed=true
				}
			}
			if(!passed){
				console.log(__line,'player '+this.currentTurn+' has card under 31')
				this.comms.message(this.comms.all,"It is "+this.players[this.currentTurn].userData.userName+"'s turn",GLOBALS.gameColor)
				this.comms.sendCards(this.players);
			}else{
				if(this.allpassed(this.currentTurn)){
					console.log(__line,'prior score:'+this.players[this.currentTurn].userData.score)
					this.players[this.currentTurn].userData.score-=1
					console.log(__line,'decrament by one: '+this.players[this.currentTurn].userData.score)
					for(let player of this.players){
						player.userData.ready=false
					}
					this.tableCount=0
					this.cardsOnTable=[]
					this.comms.message(this.comms.all,'current tableCount is'+this.tableCount,GLOBALS.gameColor)
				}else{
					console.log(__line,'not allpassed')
				}
				this.nextTurn()
			}
		}
	}
	allpassed(cTurn){
		let pass=true
		for(let i=1;i<this.players.length;i++){
			let userData=this.players[(cTurn+i)%this.players.length].userData
			pass&=userData.ready
			if(!pass){break};
		}
		return pass
	}
	nocards(){
		for(let player of this.players){
			if(player.userData.hand.length>0){return false}
		}
		return true
	}
	playCard(card){
		let score=0
		if(this.cardsOnTable.length>1){
			//pairs
			score+=this.checkPair(card,this.cardsOnTable)
			//runs
			score+=this.checkRuns(card,this.cardsOnTable)
			//31 or 15
		}
		score+=this.checkTableCount(card)
		console.log(__line,'score out from tableCards: '+score)
		return score
	}
	checkRuns(card,tableCards){
		let newList=tableCards.slice()
		newList.push(card)
		newList=newList.map(x=>x%this.cards.cardDesc.number.length)
		let currentCheck=newList.splice(newList.length-2,2)
		let score=0
		while(newList.length){
			currentCheck.push(newList.pop())
			let len=currentCheck.length
			let minCard=Math.min(...currentCheck)
			if(len-Math.max(...currentCheck)+minCard==1){
				let currentCheckZeroed=currentCheck.map(x=>x-minCard)
				let reducedValue=(len-1)*(len%2)+(len%4>>1)
				if(currentCheckZeroed.reduce((sum, next) => sum ^ next)==reducedValue){
					score=len
				}else{
					return score
				}
			}
		}
		return score
	}
	checkPair(card,tableCards,iterations=0){
		let check1=this.cards.getProperties(card).number
		let newList=tableCards.slice()
		let newCard=newList.pop()
		let check2=this.cards.getProperties(newCard).number
		if(check1==check2){
			return iterations*2+this.checkPair(newCard,newList,iterations+1)
		}else{
			return iterations*2
		}
	}
	checkTableCount(card){
		this.tableCount+=this.cards.values[card]
		this.comms.message(this.comms.all,'current tableCount is'+this.tableCount,GLOBALS.gameColor)
		if(this.tableCount==31){
			for(let player of this.players){
				player.userData.ready=false
			}
			this.tableCount=0
			this.cardsOnTable=[]
			this.comms.message(this.comms.all,'current tableCount is'+this.tableCount,GLOBALS.gameColor)
			return 2
		}else{
			this.cardsOnTable.push(card)
			if(this.tableCount==15){return 2}else{return 0}
		}
	}
	startCount(){
		this.gameStatus=GLOBALS.gameMode.COUNT
		this.comms.updateUsers()
		this.currentTurn=(this.dealer+1)%this.players.length;
		this.countHand(this.currentTurn,this.players[this.currentTurn].userData.tableCards)
	}
	countHand(player,cards){
		console.log(__line,'_________________'+this.players[player].userData.userName+'_________________')
		let hand=cards.slice()
		let score=this.knobbs(this.centerCard,hand)
		console.log('knobbs:'+score)
		hand.push(this.centerCard.slice().pop())
		hand.sort((a, b) => a - b)
		score+=this.countSuit(hand)
		console.log('suit:'+score)
		hand=hand.map(x=>x%this.cards.cardDesc.number.length)
		hand.sort((a, b) => a - b)
		score+=this.count15(hand.map(x=>this.cards.values[x]))
		console.log('15s:'+score)
		let pairs=this.countPair(hand)
		score+=pairs.score
		console.log('pairs:'+score)
		score+=this.countRuns(pairs)
		console.log('runs:'+score)
		this.players[player].userData.score+=score
		this.comms.message(this.comms.all,''+this.players[player].userData.userName+' got '+score+' points')
		
		this.cardsOnTable=hand;
		this.comms.sendCards(this.players);
		
		
		//send counts to players
		//update team scores
	}
	knobbs(centerCard,hand){
		let mod=this.cards.cardDesc.number.length
		let suit=Math.trunc(centerCard/mod)
		let score=0
		for(let i in hand){
			if(hand[i]%mod==10){
				score+=Math.trunc(hand[i]/mod)==suit
			};
		}
		return score
	}
	countSuit(hand){
		let score=0
		let j=1
		let holdScore=0
		let tempSuit=this.cards.getProperties(hand[0]).suit
		for(let i=1;i<hand.length;i++){
			if(tempSuit==this.cards.getProperties(hand[i]).suit){
				j++
				if(j>3){score=j+holdScore};
			}else{
				tempSuit=this.cards.getProperties(hand[i]).suit
				holdScore=score
				j=1
			}
		}
		return score
	}
	countPair(hand){
		let currentHand=hand.slice()
		let card=0
		let pairs={no:[],cards:{},score:0}
		let tempScore=0
		let i=1
		while(currentHand.length){
			card=currentHand.pop()
			tempScore=this.checkPair(card,currentHand)
			i=1
			if(tempScore==0){
				pairs.no.push(card)
			}else{
				pairs.score+=tempScore
				pairs.no.push(card)
				tempScore/=2
				while(tempScore&&i<20){
					tempScore-=i++
					currentHand.pop()
				}
				pairs.cards[card]=i
			}
		}return pairs
	}
	countRuns(pairs){
		let run=pairs.no
		let card=-1
		let score=0
		let tempScore=0
		let temprun=[]
		while(run.length){
			card=run.pop()
			temprun=[]
			tempScore=this.checkRuns(card,run)
			if(tempScore!=0){
				temprun=run.splice(run.length-tempScore+1,tempScore+1)
				temprun.push(card)
				for(let card in pairs.cards){
					if(temprun.indexOf(card*1)!=-1){
						tempScore*=pairs.cards[card]
					}
				}
				score+=tempScore
			}
		}return score
	}
	count15(handValues,total=0){
		handValues.sort((a, b) => a - b)
		console.log(__line,handValues)
		let score=0
		let sum=handValues.reduce((sum,val)=>sum+val,0)
		if(total+sum>15){
			if (handValues.length>1){
				for(let i=handValues.length-1; i>=0;i-- ){
					let subtotal=total+handValues[i]
					console.log(handValues[i])
					if(subtotal==15){
						score+=2
						continue
					}else{
						let index=handValues.findIndex(x=>x+subtotal>15)
						if(index==0){
							return score
						}else{
							score+=this.count15(handValues.slice(0,index),subtotal)
							handValues.pop()
						}
					}
				}
				return score
			}
		}else if (total+sum==15){
			return 2
		}else{return 0}
	}
	kickPlayers(){
		for(let i = this.players.length-1; i >= 0; i--){
			if(this.players[i].disconnected){
				this.comms.message( this.comms.all, "" + this.players[i].userData.userName + " has been kicked!", GLOBALS.chatColor);
				this.players.splice(i, 1);
			}
		}
		if( this.players.length < minPlayers) {
			closeGame();
		} else {
			updateTurnColor();
		}
	}
	gameEnd(){
		this.comms.message(this.comms.all, "THE GAME HAS ENDED", GLOBALS.gameColor);
	}
}

module.exports = game;