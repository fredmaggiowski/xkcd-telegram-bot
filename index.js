/*
 *	xkcd telegram bot
 *	Federico Maggi
 *	05/11/2015
 *
 *	Thanks to Randall Munroe for all the fun!
 */
"use strict";
// Load configuration
var	ctx		= require('./config/config.json');

// Require debug and logging modules
var debug  = require('debug')('debug'),
		reqdbg = require('debug')('request'),
		cmddbg = require('debug')('cmd');

var bunyan = require('bunyan'),
		log		 = bunyan.createLogger(
			{
				name: "xkcdbot",
				streams: [
					{
						level: 'info',
						path: ctx.logpath.info
					},
					{
						level: 'warn',
						path: ctx.logpath.warn
					},
					{
						level: 'error',
						path: ctx.logpath.err
					}	
				]
			}
		);

// Require useful modules
var http 	= require('http'); 
var request = require('request');

// Require node.js telegram Bot API
var TelegramBot = require('node-telegram-bot-api');

var token  = ctx.token,
    tghook = "https://"+ctx.hook.address+":"+ctx.hook.port+"/"+token;//+"/setWebhook";

//		tghook = "https://api.telegram.org/"+token;

debug(ctx);
debug(tghook);

var theLatest = 0; // Should put this in REDIS (when I'll install it)

var bot = new TelegramBot(token, {webHook: {port: ctx.hook.port, host: ctx.hook.address, cert:ctx.cert.crt, key:ctx.cert.key}})
bot.setWebHook(tghook, require('fs').readFileSync(ctx.cert.crt, "utf-8"));

// bot.sendMessage(23700853,"ciao");
bot.on('message', function msgReceived(msg){
	
	log.info(msg);

	debug("messaggio:", msg);

	var chatId = msg.chat.id;
	var msgarr = msg.text.split(" ");

	//	redis.set(ctx.redis.lbl.chatid,chatId);

	handleCommand( msgarr[0], function ( err, comic ){

		if( err )
			return bot.sendMessage(chatId, JSON.parse(err).error);

		// Do something with the comic.. like sending it via bot.sendMessage
		comic = JSON.parse(comic);
		debug(comic);
		bot.sendMessage(chatId, comic.title+"\n"+comic.img+"\n"+comic.alt);

	}, msgarr); 
});

function handleCommand( cmd, cb, pars ){
	var comic = {};
	cmddbg(cmd);

	switch(cmd.split("@")[0]){
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

		case "/help":
			cmddbg("Help command");
			return cb(JSON.stringify({error: "Help:\n\t- /getxkcd NUMBER -> get chosen comic\n\t- /random -> get a random comic\n\t- /latest -> get latest comic"}),null);

		default:
			cmddbg("Default case");
			log.error("Command not found %s",cmd);
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
