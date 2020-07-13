
function fetchlobbies(){
	fetch('/lobbies')
		.then((response)=>{
			return response.json()
		}).then((data)=>{
			loadgames(data)
		})
	}
var dummyID=0
function loadgames(currentGames){
	//let ul = document.getElementById("ulMessages");
	while($("ul")[0].firstChild) $("ul")[0].firstChild.remove();
	if(currentGames.length==0){
		$("ul").append("<li> No games are currently avalible </li>")
	}else{
		for(let i = currentGames.length-1;i>=0; i--){
			let game = currentGames[i];
			//let gameInfo = game.split(':')
			game.url=''+game.type+''+game.ID
			let appendString='<li>'+
								`<div id="title" onclick="send2game('${game.url}')"> ${game.type}</div>`+
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
function send2game(game){
	//console.log('send player to a '+type+' game')
	console.log('send player to: /'+game)
	location.href = '/'+game
}
function createServer(type){
	dummyID++
	console.log('created server with ID: '+type)

	return type+':'+dummyID
}
fetchlobbies()
setInterval(fetchlobbies,9000)