/*
 *  xkcd telegram bot
 *  Federico Maggi
 *  05/11/2015
 *
 *  Thanks to Randall Munroe for all the fun!
 */
'use strict'

// Load configuration
var ctx = require('./config/config.json')

// Require debug and logging modules
var debug  = require('debug')('debug'),
    reqdbg = require('debug')('request'),
    cmddbg = require('debug')('cmd')

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
    )

// Require useful modules
var request = require('request')

// Require node.js telegram Bot API
var TelegramBot = require('node-telegram-bot-api')

var token  = ctx.token,
    tghook = 'https://'+ctx.hook.address+':'+ctx.hook.port+'/'+token

debug(ctx)
debug(tghook)

var theLatest = 0

var bot = new TelegramBot(token, {webHook: {port: ctx.hook.port, host: ctx.hook.address, cert:ctx.cert.crt, key:ctx.cert.key}})
bot.setWebHook(tghook, ctx.cert.crt) 

bot.on('message', function msgReceived(msg){
  
  log.info(msg)

  debug('message:', msg)

  var chatId = msg.chat.id
  var msgarr = msg.text.split(' ')

  handleCommand( msgarr[0], function ( err, comic ){

    if( err )
      return

    // Do something with the comic.. like sending it via bot.sendMessage
    comic = JSON.parse(comic)
    debug(comic)

		if (comic.title === 'help') // It's not the comic, it's the help page :)
			return bot.sendMessage(chatId, comic.help)

    return bot.sendMessage(chatId, comic.title+'\n'+comic.img+'\n'+comic.alt)

  }, msgarr) 
})

/*
 *  Handle given command
 *  @param {String} cmd: Command to execute
 *  @param {function} cb: callback function (err, reply)
 *  @param {String Array} pars: Optional extra paramethers
 */
function handleCommand( cmd, cb, pars ){
  var comic = {}
  cmddbg(cmd)

  switch(cmd.split('@')[0]){
    case '/random': 
      cmddbg('Random comic required')
      var number = Math.floor(Math.random() * (theLatest + 1))
      cmddbg('random number picked: %d', number)
      return retrieveComic(number, cb)

    case '/getxkcd':
      if( pars === undefined )
        return cb(JSON.stringify({error: 'No comic number provided'}), null)

      cmddbg('Required comic #',pars[0])
      return retrieveComic(pars[1], cb)

    case '/latest':
      cmddbg('Required latest comic')
      return retrieveComic(0, cb)

    case '/test':
      cmddbg('Test command fired')
      bot.sendMessage(chatId, 'Fuck @AlexLanGame')
      break

    case '/now':
      cmddbg('Now command fired')
      return retrieveComic(1335, cb) // http://xkcd.com/now : 1335

    case '/help':
      cmddbg('Help command')
      return cb(null, JSON.stringify({title: 'help', help:'Help:\n\t- /getxkcd NUMBER -> get chosen comic\n\t- /random -> get a random comic\n\t- /latest -> get latest comic\n\t- /now'}))

    default:
      cmddbg('Default case')
      log.error('Command not found %s',cmd)
      return cb(JSON.stringify({error: 'command not found'}), null)
  }
}

/*
 *  Retrieve comic data from xkcd.com/number/info.0.json
 *  @param {Number} number: Comic number (if 0 it takes the latest)
 *  @param {Function} cb: callback function 
 */
function retrieveComic( number, cb ){
  
  if( number > theLatest )
    cb(JSON.stringify({error: 'this comic does not exists, yet!'}),null)
  
  number = number === 0 ? '' : number
  
  var url = 'http://xkcd.com/'+number+'/info.0.json'
  reqdbg('url: %s',url)
  
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body)
      cb(null, body)
    }
  })
}

/*
 *  Get latest comic with configured polling rate
 */
setTimeout( function getLatestComicPolling( ){
  
  request('http://xkcd.com/info.0.json', function (error, response, body){
    if( !error && response.statusCode === 200 ){
      
      if( theLatest < JSON.parse(body).num ){
        // Hey! We've got a new comic!

        // Let's do somenthig amazing!
        reqdbg('New comic found')
      }

      theLatest = JSON.parse(body).num
    } 
  })
}, ctx.polling)
