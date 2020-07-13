// button to get new tiles
// print new points to the cht log or make a grid showing all turn scores and total
// put chat log behind a button for mobile; only show the last message for a second

//events

//network definitions
const localAddress = 'localhost'//'192.168.1.124'
const localPort = '8080'
const publicAddress = '184.167.236.159'


window.addEventListener('load', function() {
	var lastTouch = {x:0, y:0};
	
	var touchstartHandler = function(e) {
		lastTouch.x = e.touches[0].clientX;
		lastTouch.y = e.touches[0].clientY;
	}

	var touchmoveHandler = function(e) {
		var touchX = e.touches[0].clientX;
		var touchY = e.touches[0].clientY;
		var dx = touchX - lastTouch.x;
		var dy = touchY - lastTouch.y;
		lastTouch.x = touchX;
		lastTouch.y = touchY;

		e.preventDefault(); //prevent scrolling, scroll shade, and refresh
		board.updateSize(board.x + dx,board.y + dy,Qengine.boardRow, Qengine.boardCol, tileHeight + 2*tilePadding, tileWidth + 2*tilePadding,board.clickAreas)
		return;
	}

  document.addEventListener('touchstart', touchstartHandler, {passive: false });
  document.addEventListener('touchmove', touchmoveHandler, {passive: false });
  console.log('added');
  document.getElementById('gameBoard').addEventListener('click', checkClick);
  document.getElementById('title').addEventListener('click', titleFunction);
  document.getElementById('middle').addEventListener('click', allowAudio);
});
var clickable=[]
var nameOfGame=undefined
// colors
var spectatorColor = "#444444";
var notYourTurnColor = "#ffffff";
var yourTurnColor = "#0000ff";

$('#submit').click(function(){
	var data = {
		message:$('#message').val()         
	}
	socket.send(JSON.stringify(data)); 
	$('#message').val('');
	return false;
});

document.getElementById('title').style.color = '#ff0000'
function titleFunction(){
	let title = document.getElementById('title')
	if ( title.style.color == 'rgb(255, 0, 0)' ){
		title.style.color = '#00ff00';
		socket.emit('ready', {ready: true});
	} else {
		title.style.color = '#ff0000';
		socket.emit('ready', {ready: false});
	}
	return false;
}

var soundsAllowed = false;
var ding = new Audio('../sounds/echoed-ding.mp3');
function allowAudio(){
	if (!soundsAllowed){
		ding.load();
		soundsAllowed = true;
	}
}

var canvas = document.getElementById("gameBoard");
var ctx = canvas.getContext("2d");
class game {
	constructor(ctx,socket){
		//constants
		this.ctx=ctx
		//let a = new Deck({suit:['♥','♦','♣','♠'], number:['A',2,3,4,5,6,7,8,9,10,'J','Q','K']}) 
		this.cards=new Deck({number:[1,2]})
	}
	resizeCanvas(){
		canvas.width = window.innerWidth - $('#sidebar').width() - 50;
		canvas.height = window.innerHeight - 2;
		console.log('canvas resized to: ', canvas.width, canvas.height);
		this.resizeDrawings();
	}
	resizeDrawings(){
		this.tileWidth = 80; //* window.devicePixelRatio;
		this.tileHeight = 80; //* window.devicePixelRatio;
		this.tilePadding = this.tileWidth/20;
		this.tileFontSize = 30; //* window.devicePixelRatio;
		//board.updateSize(canvas.width/2,canvas.height/2,Qengine.boardRow, Qengine.boardCol, tileHeight + 2*tilePadding, tileWidth + 2*tilePadding,board.clickAreas)
		//for(var i = 0; i < myTiles.length; i++){
		//	myTiles[i].updateSize((canvas.width/2) + (tileWidth + 20) * (i-2) , canvas.height - (tileHeight + 20), tileHeight, tileWidth);
		//}
	}
	gameDraw(){
		clickable = [[],[]]; //first object is top layer, second is middle, last is bottom layer
		this.ctx.textAlign="center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = "50px Comic Sans MS"
		//console.log('draw: ', clickable );
		this.ctx.clearRect(0,0,canvas.width, canvas.height);


		setTimeout(this.gamedraw, 100); //repeat
	}
}

class Button {
	constructor(x, y, width, height, text = "button", fillColor, outlineColor, textColor, textOutlineColor, fontSize = 50, textSlant = false){
		this.updateSize(x,y,width,height);
		this.fillColor = fillColor;
		this.outlineColor = outlineColor;
		this.textColor = textColor;
		this.textOutlinecolor = textOutlineColor;
		this.fontSize = fontSize;
		this.text = text;
		this.textSlant = textSlant;
		this.visible = true;
	}
	
	updateSize(x,y,width,height){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.clickArea = {minX: x - width/2, minY: y - height/2, maxX: x + width/2, maxY: y + height/2};
	}
	
	draw(ctx){
		if(this.visible){
			ctx.save();
			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.outlineColor;
			roundRect(ctx, this.clickArea.minX, this.clickArea.minY, this.width, this.height, this.width/8, this.fillColor != undefined, this.outlineColor != undefined);

			//draw number
			ctx.font = '' + this.fontSize + "px Arimo" //Arial Black, Gadget, Arial, sans-serif";
			ctx.fillStyle = this.textColor;
			ctx.strokeStyle = this.textOutlineColor;
			ctx.translate(this.x, this.y);
			if(this.textSlant){
				ctx.rotate(Math.atan(this.height/this.width));
			}
			if(this.textColor != undefined){
				ctx.fillText(this.text,0,0);
			}
			if(this.textOutline != undefined){
				ctx.strokeText(this.text, 0, 0);
			}
			ctx.restore();
		}
	}
	
	click(){
		//TODO: show the posible move locations
		let validselect=false
		validselect=validselect||validMove(addcord(getcord(reBoardState,myUserlistIndex),this.cord,-1))
		validselect=validselect||reBoardState[this.cord.y][this.cord.x]!=-1
		if(validselect){
			selected=this
			selected.visible=true
		}else{
			console.log("This button has not been overloaded yet!");
		}
	}
} 

class Tile extends Button{
	constructor(tileData, x,y,width,height,fontSize,cord){
		var text = -1;
		if(tileData != undefined){
			text = tileData.number
		}
		super(x,y,width,height,text,defaultTileColor,'#000000','#000000',undefined,fontSize,false);
		this.tileData = tileData;
		this.visible = (text >= 0);
		this.highlightColor = "";
		this.cord=cord
	}
	
	drawOutline(color){
		this.highlightColor = color;
	}
	
	updateData(tileData){
		this.tileData = tileData;
		if(tileData != undefined){
			this.text = this.tileData
			this.visible = (this.tileData >= 0);
		}
	}
	
	draw(ctx){
		if(this.highlightColor != ""){
			//console.log(this.highlightColor);
			ctx.save();
			ctx.fillStyle = this.highlightColor;
			roundRect(ctx, this.x-(this.width/2 + tilePadding), this.y-(this.height/2 + tilePadding), this.width+2*tilePadding, this.height+2*tilePadding, this.width/8,true, false);
			ctx.restore();
			this.highlightColor = "";
		}
		//super.draw(ctx);
		if(this.visible){
			if(userList){
				for( let i = 0; i<userList.length; i++){
					if(userList[i].boardID == this.tileData){
						drawPerson(ctx,this.x,this.y,90,90, userList[i].color);
						//if (i==myUserlistIndex) {selected=this}
					}
				}
			}
			
		}
		console.log('let moosecord={x:yesno.moosecord(yesno.moose).x,y:yesno.moosecord(yesno.moose).y}')
		let moosecord=Qengine.moose.cord
		moosecord.x=(board.columns+moosecord.x%board.columns)%board.columns
		moosecord.y=(board.rows+moosecord.y%board.rows)%board.rows
		if(this.cord.x==moosecord.x&&this.cord.y==moosecord.y){
			drawPerson(ctx,this.x,this.y,10,10,'#000000')
		}
		
	}
}

class Board {
	constructor(x, y, rows, columns, rowThickness, columnThickness){
		this.x = x;
		this.y = y;

		this.borderColor = '#ffebcd';
		this.backgroundColor = '#8B4513';
		this.lineColor = '#ffebcd';
		this.lineWidth = 2;
		this.clickAreas={
			"N":{name:'"N"',cord:{x:0,y:-1}},
			"North":{name:'"North"',cord:{x:0,y:-1}},
			"E":{name:'"E"',cord:{x:1,y:0}},
			"East":{name:'"East"',cord:{x:1,y:0}},
			"S":{name:'"S"',cord:{x:0,y:1}},
			"South":{name:'"South"',cord:{x:0,y:1}},
			"W":{name:'"W"',cord:{x:-1,y:0}},
			"West":{name:'"West"',cord:{x:-1,y:0}}
		}
		this.highlightClickable=false
		this.updateSize(x,y,rows, columns, rowThickness, columnThickness,this.clickAreas)
	}
	
	updateFromServer(recievedBoardState){
		console.log('update from server is not definined')	
	}
	updateSize(x,y,rows, columns, rowThickness, columnThickness,clickAreas){
		this.x = x;
		this.y = y;
		this.rows = rows;
		this.columns = columns;
		this.rowThickness = rowThickness;
		this.columnThickness = columnThickness;
		this.width = columns*columnThickness;
		this.height = rows*rowThickness;
		this.border = Math.min(this.rowThickness, this.columnThickness);

		for(let sideclickArea in this.clickAreas){
			this.clickAreas[sideclickArea].x=this.x+(this.width+this.border)/2*this.clickAreas[sideclickArea].cord.x
			this.clickAreas[sideclickArea].y=this.y+(this.height+this.border)/2*this.clickAreas[sideclickArea].cord.y
			if(this.clickAreas[sideclickArea].name.length>3){
				this.clickAreas[sideclickArea].width=Math.abs(this.clickAreas[sideclickArea].cord.y*(this.width-this.border))+this.border
				this.clickAreas[sideclickArea].height=Math.abs(this.clickAreas[sideclickArea].cord.x*(this.height-this.border))+this.border
			}else{
				this.clickAreas[sideclickArea].width=this.border
				this.clickAreas[sideclickArea].height=this.border
			}
			this.clickAreas[sideclickArea].xMin= this.clickAreas[sideclickArea].x-this.clickAreas[sideclickArea].width/2
			this.clickAreas[sideclickArea].xMax= this.clickAreas[sideclickArea].x+this.clickAreas[sideclickArea].width/2
			this.clickAreas[sideclickArea].yMin= this.clickAreas[sideclickArea].y-this.clickAreas[sideclickArea].height/2
			this.clickAreas[sideclickArea].yMax= this.clickAreas[sideclickArea].y+this.clickAreas[sideclickArea].height/2
		}
	}
	
	
	draw(ctx){
		if (this.rows > 0 && this.columns >0){

			ctx.save()
			//console.log(xPos, yPos, rows, columns, rowThickness, columnThickness)
			//console.log(xPos, yPos,this.width, this.height);
			var xMin = this.x - this.width/2;
			var xMax = this.x + this.width/2;
			var yMin = this.y - this.height/2;
			var yMax = this.y + this.height/2;

			
			//border
			ctx.fillStyle = this.borderColor;
			//var border = Math.min(this.rowThickness, this.columnThickness);
			ctx.fillRect(xMin - this.border, yMin - this.border, this.width + 2*this.border, this.height + 2*this.border);
			if (this.highlightClickable){
				for(let sideclickArea in this.clickAreas){
					if (this.clickAreas[sideclickArea].name.length>3) {
						roundRect(ctx, this.clickAreas[sideclickArea].xMin, this.clickAreas[sideclickArea].yMin,this.clickAreas[sideclickArea].width, this.clickAreas[sideclickArea].height,this.border/10, "#ffffff","#000000")
					}
				}
				for(let sideclickArea in this.clickAreas){
					if (this.clickAreas[sideclickArea].name.length<4) {
						roundRect(ctx, this.clickAreas[sideclickArea].xMin, this.clickAreas[sideclickArea].yMin,this.clickAreas[sideclickArea].width, this.clickAreas[sideclickArea].height,this.border/10, "#ffffff","#000000")
					}
				}
				ctx.beginPath()
			}
			ctx.font = '' + this.rowThickness*0.9 +"px Comic Sans MS";
			ctx.fillStyle = this.backgroundColor;
			ctx.textAlign = "center";
			ctx.fillText('N',this.x,this.y-this.width/2-(this.rowThickness)/2*.8)
			ctx.fillText('S',this.x,this.y+this.width/2+(this.rowThickness)/2)
			ctx.fillText('W',this.x-this.height/2-this.columnThickness/2,this.y)
			ctx.fillText('E',this.x+this.height/2+this.columnThickness/2,this.y)
			
			//background
			ctx.fillStyle = this.backgroundColor;
			ctx.fillRect(xMin,yMin,this.width, this.height);
			//center marker
			ctx.fillStyle = this.lineColor;
			ctx.fillRect(this.x - 0.5*this.rowThickness, this.y - 0.5*this.columnThickness, this.columnThickness, this.rowThickness);
			//lines
			ctx.strokeStyle = this.lineColor;
			ctx.lineWidth = this.lineWidth;
			for (var x = xMin; x <= xMax; x += this.columnThickness) {
				ctx.moveTo(0.5 + x, 0.5 + yMin);
				ctx.lineTo(0.5 + x, 0.5 + yMax);
			}

			for (var y = yMin; y <= yMax; y += this.rowThickness) {
				ctx.moveTo(0.5 + xMin, 0.5 + y);
				ctx.lineTo(0.5 + xMax, 0.5 + y);
			}
			ctx.stroke();
			var y = yMin;
			
			ctx.restore();
		}
	}
	click(name){
		console.log(name)
		if(selected.type=='distance'){
			socket.emit("recieveDistanceQuestion",name)
		}
	}
}

//socket stuff
var socket = io(publicAddress); //try public address //"24.42.206.240" for alabama
var trylocal = 0;
var currentTurn=-1
socket.on('connect_error',function(error){
	console.log("I got an error!", error);
	console.log("socket to:", socket.disconnect().io.uri, "has been closed.");
	if(!trylocal){ //prevent loops
		var internalShortAddress = ''+localAddress+':'+localPort;
		var internalAddress = 'http://'+internalShortAddress+'/';
		if(window.location.href != internalAddress){
			window.location.replace(internalAddress);
		}
		socket.io.uri = internalShortAddress;
		console.log("Switching to local url:", socket.io.uri);
		console.log("Connecting to:",socket.connect().io.uri);
		trylocal = 1;
	}
});

socket.on('reconnect', function(attempt){
	console.log("reconnect attempt number:", attempt);
});

socket.on('connect', function(){
	//get userName
	console.log("Connection successful!");
	if(localStorage.userName === undefined){
		changeName(socket.id);
	} else {
		socket.emit('userName', localStorage.userName);
	}
	
	if(localStorage.id !== undefined){
		socket.emit('oldId', localStorage.id);
	}
	localStorage.id = socket.id;
});

function changeName(userId){
	if(userId == socket.id){
		var userName = null;
		do{
			userName = prompt('Enter username: ');
			//console.log(userName);
			if ((userName == null || userName == "") && localStorage.userName !== undefined){
				userName = localStorage.userName;
			}
		} while (userName === null);
		localStorage.userName = userName;
		socket.emit("userName", localStorage.userName);
	}
}

socket.on("message",function(message){  
	/*
		When server sends data to the client it will trigger "message" event on the client side , by 
		using socket.on("message") , one cna listen for the ,message event and associate a callback to 
		be executed . The Callback function gets the dat sent from the server 
	*/
	//console.log("Message from the server arrived")
	message = JSON.parse(message);
	//console.log(message); /*converting the data into JS object */
	
	$('#chatlog').append('<div style="color:'+message.color+'">'+message.data+'</div>'); /*appending the data on the page using Jquery */
	$('#response').text(message.data);
	//$('#chatlog').scroll();
	$('#chatlog').animate({scrollTop: 1000000});
});

socket.on('userList',function(data){
	var userListString = '';
	userList = data;
	//console.log('userList')
	
	for( var i = 0; i < data.length; i++ ){
		var header = 'div id="userListDiv'+ i + '"';
		var click = 'onclick="changeName(' + "'" + data[i].id + "'" + ')"';
		var color = ' style="color: ' + data[i].color + ';"'
		var string = '' + data[i].userName;
		var ender = '</div>';
		if(data[i].score!= undefined){
			if(data[i].color != spectatorColor){
				string = string + " " + data[i].score; 
				
				if(data[i].id == socket.id){
					if(soundsAllowed && !myTurn && data[i].color == yourTurnColor){
						ding.play(); //play ding when it becomes your turn
					} 
					myTurn = data[i].color == yourTurnColor; //update old status
					
					myUserlistIndex = i;
					myUserlistString = string;
				}
			}
		}
		userListString = userListString + '<' + header + click + color + '>' + string + ender;
		//console.log( "player", data[i].userName, "myTurn", myTurn, "id", data[i].id, socket.id, "color", data[i].color, yourTurnColor);
	}
	document.getElementById('userlist').innerHTML = userListString;
	console.table(data);
});

socket.on('showBoard',function(data){
	showboard(data)
});

function showboard(data){
	$('#title').css('color', data.titleColor);
	$('#content').css('display', data.displayTitle);
	$('#gameBoard').css('display', data.displayGame);
	nameOfGame = new game(ctx,socket)
	nameOfGame.resizeCanvas();
}

function checkClick(event){
	let foundClick = false;
	let i;
	let area;
	let offset = $('#gameBoard').position();
	let scale = {x: canvas.width / $('#gameBoard').width(), y: canvas.height/ $('#gameBoard').height()};
	//console.log('click', {x: event.clientX, y: event.clientY});
	//console.log('scale:', scale)
	var click = {x: event.clientX*scale.x - offset.left, y: event.clientY*scale.y - offset.top};
	console.log('adjusted click: ', click);
	if (!foundClick) {
		for( i = 0; i < clickable.length; i += 1){
			for(var j = 0; j < clickable[i].length; j++){
				if( clickable[i][j].clickArea ){
					area = clickable[i][j].clickArea;
					//console.log(area);
					if( click.x  < area.maxX){
						if( click.x > area.minX){
							if( click.y < area.maxY){
								if( click.y > area.minY){
									clickable[i][j].click()
									foundClick = true;
								}
							}
						}
					}
				} else {
					console.log('no click area');
				}
			}
			if(foundClick){break;}
		}
	}
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.save()
  if (typeof radius === 'undefined') {
	radius = 5;
  }
  if (typeof radius === 'number') {
	radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
	var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
	for (var side in defaultRadius) {
	  radius[side] = radius[side] || defaultRadius[side];
	}
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
  	ctx.fillStyle=fill
	ctx.fill();
  }
  if (stroke) {
  	ctx.strokeStyle=stroke
	ctx.stroke();
  }
  ctx.restore()
}
function polygon(ctx, x, y, radius, sides, startAngle, anticlockwise) {
	if (sides < 3) return;
	var a = (Math.PI * 2)/sides;
	a = anticlockwise?-a:a;
	ctx.save();
	ctx.translate(x,y);
	ctx.rotate(startAngle);
	ctx.moveTo(radius,0);
	for (var i = 1; i < sides; i++) {
		ctx.lineTo(radius*Math.cos(a*i),radius*Math.sin(a*i));
	}
	ctx.closePath();
	ctx.restore();
}

