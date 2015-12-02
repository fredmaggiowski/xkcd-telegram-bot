/*
 *  xkcd telegram bot
 *  Federico Maggi
 *  05/11/2015
 *
 *  Thanks to Randall Munroe for all the fun!
 */
'use strict';
// Load configuration
var ctx = require('./config/config.json');

// We're moving on OpenShift RHCloud
var port = process.env.OPENSHIFT_NODEJS_PORT;
var host = process.env.OPENSHIFT_NODEJS_IP;

// Require debug and logging modules
var debug  = require('debug')('debug'),
    reqdbg = require('debug')('request'),
    cmddbg = require('debug')('cmd');

var bunyan = require('bunyan'),
    log    = bunyan.createLogger(
      {
        name: 'xkcdbot',
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
var http    = require('http'),
    request = require('request');
    // redis   = require('redis').createClient();//ctx.redis.port, ctx.redis.host);

// Require node.js telegram Bot API
var TelegramBot = require('node-telegram-bot-api');

var token  = ctx.token,
    tghook = ctx.hook.address+':'+ctx.hook.port+'/'+token;//+'/setWebhook';

debug(ctx);
debug(tghook);
log.info(tghook);

var theLatest = 0; // Should put this in REDIS (when I'll install it)

var bot = new TelegramBot(token, {webHook: {port: port, host: host}});
bot.setWebHook(tghook);

log.info(bot);

bot.on('message', function msgReceived(msg){
  
  log.info(msg);

  debug('messaggio:', msg);

  var chatId = msg.chat.id;
  var msgarr = msg.text.split(' ');

  //  redis.set(ctx.redis.lbl.chatid,chatId); // We'll store chatid.. later

  handleCommand( msgarr[0], function ( err, comic ){

    if( err ){
      log.error(err);
      return bot.sendMessage(chatId, JSON.parse(err).error);
    }

    // Do something with the comic.. like sending it via bot.sendMessage
    comic = JSON.parse(comic);
    log.info(comic);
    debug(comic);

    bot.sendMessage(chatId, comic.title+'\n'+comic.img+'\n'+comic.alt);

  }, msgarr); 
});

/*
 *  Handle given command
 *  @param {String} cmd: Command to execute
 *  @param {function} cb: callback function (err, reply)
 *  @param {String Array} pars: Optional extra paramethers
 */
function handleCommand( cmd, cb, pars ){
  var comic = {};
  cmddbg(cmd);
  log.info(cmd);

  switch(cmd.split('@')[0]){
    case '/random': 
      cmddbg('Random comic required');
      var number = Math.floor(Math.random() * (theLatest + 1));
      cmddbg('random number picked: %d', number);
      return retrieveComic(number, cb);

    case '/getxkcd':
      if( pars === undefined ){
        var err = {error: 'No comic number provided'};
        log.error(err);
        return cb(JSON.stringify(), null);
      }

      cmddbg('Required comic #',pars[0]);
      return retrieveComic(pars[1], cb);

    case '/latest':
      cmddbg('Required latest comic');
      return retrieveComic(0, cb);

    case '/test':
      cmddbg('Test command fired');
      bot.sendMessage(chatId, 'Fuck @AlexLanGame');
      break;

    case '/now':
      cmddbg('Now command fired');
      return retrieveComic(1335, cb); //xkcd.com/now : 1335

    case '/help':
      cmddbg('Help command');
      return cb(JSON.stringify({error: 'Help:\n\t- /getxkcd NUMBER -> get chosen comic\n\t- /random -> get a random comic\n\t- /latest -> get latest comic'}),null);

    default:
      cmddbg('Default case');
      log.error('Command not found %s',cmd);
      return cb(JSON.stringify({error: 'command not found'}), null);
  }
}

/*
 *  Retrieve comic data from xkcd.com/number/info.0.json
 *  @param {Number} number: Comic number (if 0 it takes the latest)
 *  @param {Function} cb: callback function 
 */
function retrieveComic( number, cb ){
  
  log.info(number);

  if( number > theLatest )
    cb(JSON.stringify({error: 'this comic does not exists, yet!'}),null);
  
  number = number === 0 ? '' : number;
  
  var url = 'http://xkcd.com/'+number+'/info.0.json';
  reqdbg('url: %s',url);
  log.info(reqdbg);

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
      return cb(null, body);
    }
 
    log.error(error);
  });
}

/*
 *  Get latest comic with configured polling rate
 */
setTimeout( function getLatestComicPolling( ){
  
  request('http://xkcd.com/info.0.json', function (error, response, body){
    if( !error && response.statusCode === 200 ){
      
      if( theLatest < JSON.parse(body).num ){
        // Hey! We've got a new comic!!

        // Let's do somenthig amazing, like:
        // redis.get('all the chat id', function () { bot.sendMessage() } );

        reqdbg('YAY! NEW COMIC!');
        log.info('YAY! NEW COMIC!');
      }

      theLatest = JSON.parse(body).num;
		/*	redis.set("latestcomic", JSON.parse(body).num, function (err, reply){ 
				reqdbg(err);
				reqdbg(reply);
			});	
*/
    } 
  })
}, ctx.polling);

/*
// This HTTP server is for testing purposes! In future updates it will be started only when required!
http.createServer( function (req,res){
  
    var jsonString = '';
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
*/