

var gameID=0
var currentGames=['rage:1','cribbage:2']
function loadgames(){
	//let ul = document.getElementById("ulMessages");
	//while(ul.firstChild) ul.removeChild(ul.firstChild);
	if(currentGames.length==0){
		$("ul").append("<li> No games are currently avalible </li>")
	}else{
		for(game of currentGames){
			let gameInfo = game.split(':')
			let type=gameInfo[0]
			let appendString='<li>'+
								`<div id="title" onclick="send2game('`+game+`')">`+type+'</div>'+
								'<div id="subtitle">Click to Start</div>'+
							'</li>'
			$("ul").append(appendString)
		}
	}
}
function createNewGame(type){
	if(type!='Cancel'){
		//let clickfnct='send2game('type')'
		let gameID=createServer(type)
		let appendString='<li>'+
							`<div id="title" onclick="send2game('`+gameID+`')">`+type+'</div>'+
							'<div id="subtitle">Click to Start</div>'+
						'</li>'
		$("ul").append(appendString)
		document.getElementById("new_game").value = "Cancel";
		currentGames.push(gameID)
		send2game(gameID)
	}
}
function send2game(gameID){
	//console.log('send player to a '+type+' game')
	console.log('send player to game with id: '+gameID)
}
function createServer(type){
	gameID++
	console.log('created server with ID: '+gameID)

	return type+':'+gameID
}
loadgames()
