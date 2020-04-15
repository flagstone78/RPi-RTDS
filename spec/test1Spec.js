var rewire = require("rewire");
var app = rewire("../cribbageServer.js");
var game = app.__get__('game');
var du = app.__get__('defaultUserData');

beforeEach(()=>{
	var tgame = new game([{userData: du()},{userData: du()}]);
	console.log("ttt",tgame);
})



describe("tableTally",()=>{
	describe("Pairs",()=>{
		it("Counts a single pair as 2",()=>{
			//game.allClients[0].hand.push(0);
			//game.allClients[0].hand.push(0);

			expect(tgame.checkPair(0,[0])).toBe(2);
		});
	});
});