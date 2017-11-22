var Rmoo = require('./index')
var config = require('./config')

if (process.argv.length < 3) {
  console.log('Usage: node download.js book_id')
  process.exit(0)
}  


rmoo = new Rmoo(config)
rmoo.login().then(console.log)