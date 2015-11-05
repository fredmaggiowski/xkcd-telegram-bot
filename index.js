/*
 *	xkcd telegram bot
 *	Federico Maggi
 *	05/11/2015
 *
 *	Thanks to Randall Munroe for all the fun!
 */
var debug = require('debug')('debug'),
		ctx		= require('/config/config.json');

var TelegramBot = require('node-telegram-bot-api');


var token  = ctx.token,
		tghook = "https://api.telegram.org/bot"+token;

var bot = new TelegramBot(token, {webHook: {port: ctx.port, host: ctx.host}});

bot.on('message', function msgReceived(msg){

	debug(msg);

	var chatId = msg.chat.id;
	var msgarr = msg.split(" ");

	switch(msgarr[0]){
		case "/random": 
			cmddebug("Random comic required");
			break;

		case "/getxkcd":
			cmddebug("Required comic #",msgarr[1]);
			break;

		case "/latest":
			cmddebug("Required latest comic");
			break;

		case "/test":
			cmddebug("Test command fired");

			bot.sendMessage(chatId, "Fuck @AlexLanGame");
			break;

		default:
			cmddebug("Default case");
			break;
	}

});