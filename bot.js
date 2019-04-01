/*
 *  xkcd telegram bot
 *  Federico Maggi
 *  05/11/2015
 *
 *  Thanks to Randall Munroe for all the fun!
 */
'use strict'

let TelegramBot = require('node-telegram-bot-api')
let request = require('request')

// Load configuration
let ctx = require('./config/config.json')

let token  = ctx.token;
let tghook = 'https://'+ctx.hook.address+':'+ctx.hook.port+'/'+token;

let theLatest = 0;
let bot = new TelegramBot(token, {
  webHook: {port: ctx.hook.port, host: ctx.hook.address, cert:ctx.cert.crt, key:ctx.cert.key}
});
bot.setWebHook(tghook, {certificate: ctx.cert.crt});

bot.on('message', (msg) => {
  console.log(msg);

  let chatId = msg.chat.id;
  let msgarr = msg.text.split(' ');
  handleCommand(msgarr[0], (err, comic) => {
    if (err) {
      return;
    }

    // Do something with the comic.. like sending it via bot.sendMessage
    comic = JSON.parse(comic);
		if (comic.title === 'help') {
      // It's not the comic, it's the help page :)
      return bot.sendMessage(chatId, comic.help);
    }

    return bot.sendMessage(chatId, comic.title+'\n'+comic.img+'\n'+comic.alt);
  }, msgarr);
});

/*
 *  Handle given command
 *  @param {String} cmd: Command to execute
 *  @param {function} cb: callback function (err, reply)
 *  @param {String Array} pars: Optional extra paramethers
 */
function handleCommand(cmd, cb, pars) {
  switch (cmd.split('@')[0]) {
    case '/random': 
      let number = Math.floor(Math.random() * (theLatest + 1));
      return retrieveComic(number, cb);

    case '/getxkcd':
      if (pars === undefined) {
        return cb(JSON.stringify({error: 'No comic number provided'}), null);
      }

      return retrieveComic(pars[1], cb);

    case '/latest':
      return retrieveComic(0, cb);

    case '/test':
      bot.sendMessage(chatId, 'F*ck @AlexLanGame');
      break

    case '/now':
      return retrieveComic(1335, cb); // http://xkcd.com/now : 1335

    case '/help':
      return cb(null, JSON.stringify({
        title: 'help',
        help:'Help:\n\t- /getxkcd NUMBER -> get chosen comic\n\t- /random -> get a random comic\n\t- /latest -> get latest comic\n\t- /now',
      }));

    default:
      console.error('Command not found %s',cmd);
      return cb(JSON.stringify({error: 'command not found'}), null);
  }
}

/*
 *  Retrieve comic data from xkcd.com/number/info.0.json
 *  @param {Number} number: Comic number (if 0 it takes the latest)
 *  @param {Function} cb: callback function 
 */
function retrieveComic(number, cb) {
  if (number > theLatest) {
    cb(JSON.stringify({error: 'this comic does not exists, yet!'}),null);
  }
  
  number = number === 0 ? '' : number;  
  let url = 'http://xkcd.com/'+number+'/info.0.json'; 
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
      cb(null, body);
    }
  });
}

/*
 *  Get latest comic with configured polling rate
 */
setTimeout(() => {
  request('http://xkcd.com/info.0.json', (error, response, body) => {
    if (!error && response.statusCode === 200) {
      if (theLatest < JSON.parse(body).num) {
        // Hey! We've got a new comic!

        // Let's do somenthig amazing!
        // reqdbg('New comic found')
      }

      theLatest = JSON.parse(body).num
    }
  });
}, ctx.polling)
