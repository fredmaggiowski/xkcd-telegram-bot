/*
 *	xkcd telegram bot
 *	Federico Maggi
 *	05/11/2015
 *
 *	Thanks to Randall Munroe for all the fun!
 */
var debug  = require('debug')('debug'),
		reqdbg = require('debug')('request'),
		cmddbg = require('debug')('cmd');

var	ctx		= require('./config/config.json');

var http 	= require('http'); 
var request = require('request');


var TelegramBot = require('node-telegram-bot-api');

var token  = ctx.token,
    tghook = "https://"+ctx.hook.address+":"+ctx.hook.port+"/bot"+token;//+"/setWebhook";

//		tghook = "https://api.telegram.org/bot"+token+"/setWebhook";

debug(ctx);
debug(tghook);

var theLatest = 0; // Should put this in REDIS (when I'll install it)

var bot = new TelegramBot(token, {webHook: {port: ctx.hook.port, host: ctx.hook.address}})
bot.setWebHook(tghook, ctx.cert.crt);

bot.on('message', function msgReceived(msg){

	debug("messaggio:", msg);

	var chatId = msg.chat.id;
	var msgarr = msg.split(" ");

	//	redis.set(ctx.redis.lbl.chatid,chatId);

	bot.sendMessage(msg.chat.id, "ciao");

	handlCommand( msgarr[0], function ( err, comic ){

		if( err )
			return bot.sendMessage(chatId, JSON.parse(err).error);

		// Do something with the comic.. like sending it via bot.sendMessage

	}, msgarr); 
});

function handleCommand( cmd, cb, pars ){
	var comic = {};
	cmddbg(cmd);

	switch(cmd){
		case "/random": 
			cmddbg("Random comic required");
			var number = Math.floor(Math.random() * (theLatest + 1));
			cmddbg("random number picked: %d", number);
			return retrieveComic(number, cb);

		case "/getxkcd":
			if( pars === undefined )
				return cb(JSON.stringify({error: "No comic number provided"}), null);

			cmddbg("Required comic #",pars[0]);
			return retrieveComic(pars[1], cb);

		case "/latest":
			cmddbg("Required latest comic");
			return retrieveComic(0, cb);

		case "/test":
			cmddbg("Test command fired");
			bot.sendMessage(chatId, "Fuck @AlexLanGame");
			break;

		case "/now":
			cmddbg("Now command fired");
			//xkcd.com/now : 1335
			return retrieveComic(1335, cb);

		default:
			cmddbg("Default case");
			return cb(JSON.stringify({error: "command not found"}), null);
	}
}

function retrieveComic( number, cb ){
	
	if( number > theLatest )
		cb(JSON.stringify({error: "this comic does not exists, yet!"}),null);
	
	var info = "";
	number = number==0?"":number;
	var url = "http://xkcd.com/"+number+"/info.0.json";
	reqdbg("url: %s",url);
	
	request(url, function (error, response, body) {
  	if (!error && response.statusCode == 200) {
   		console.log(body);
			cb(null, body);
  	}
	});
} 

setTimeout( function getLatestComicPolling( ){
	
	request("http://xkcd.com/info.0.json", function (error, response, body){
		if( !error && response.statusCode === 200 ){
			
			if( theLatest < JSON.parse(body).num ){
				// Hey! We've got a new comic!!
				reqdbg("YAY! NEW COMIC!");
			}

			theLatest = JSON.parse(body).num;
		} 
	})
}, ctx.polling);

http.createServer( function (req,res){
	
		var jsonString = "";
		req.on('data', function (data) {
    	jsonString += data;
    });

    req.on('end', function () {
      console.log(JSON.parse(jsonString));

			handleCommand( JSON.parse(jsonString).command, function (err, comic){

				if( err )
					return res.end(JSON.stringify(err)); 	
				
				res.end(JSON.stringify(comic));
			},JSON.parse(jsonString).pars);	
    });
	})
	.listen(8444);
