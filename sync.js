const Rmoo = require('./index')
const Library = require('./library')
const config = require('./config')
const Promise = require('bluebird')

console.log('Connecting to rclone remote storage')
library = new Library(config)
library.init()
console.log('Initializing rmoo client')
rmoo = new Rmoo(config)
rmoo.init().then(function () {
  console.log('Getting rmoo book list')
  return rmoo.getLibrary()
}).then(function (response) {
  response.included.forEach(function (element, index) {
    if (element.type == 'book') library.pushMeta(element)
  })
  var incomingIds = library.getIncomingIds()
  if (incomingIds == 0) {
    console.log('No new books available')
    process.exit(0)
  }
  console.log('Downloading', incomingIds.length, 'new books')
  return Promise.map(incomingIds, function (id) {
    return rmoo.getBookEpub(id)
  }, {
    concurrency: 2
  })
}).then(function () {
  library.uploadIncoming()
  library.cleanLocal()
})