var Rmoo = require('./index')
var config = require('./config')

if (process.argv.length < 3) {
  console.log('Usage: node download.js book_id')
  process.exit(0)
}  


rmoo = new Rmoo(config)
rmoo.login().then(function () {
  return rmoo.getLibrary()
}).then(function () {
  return rmoo.getBookEpub(process.argv.pop())
}).then(console.log)