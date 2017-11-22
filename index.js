var fs = require('fs')
var rp = require('request-promise')
var Promise = require('bluebird')

var host = 'https://reader.readmoo.com'
var headers = {
  'Referer': host + '/reader/index.html',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0'
}

var rmoo = function (params) {
  ['username', 'password'].forEach(function (key) {
    if(typeof(params[key]) == 'undefined') throw 'Too few arguments'
    this[key] = params[key]
  })
  this.jar = rp.jar()
}

rmoo.prototype.login = function () {
  
}

rmoo.prototype.getLibrary = function () {
  // https://new-read.readmoo.com/api/me/library/books?count=100
}

rmoo.prototype.getBook = function (id) {
  return rp({
    headers: headers,
    uri: host + '/api/book/' + id + '/nav',
    json: true
  }).then(function (response) {
    if (typeof(response['message']) == 'undefined' || response['message'] !== 'success') throw 'Invalid book ID'

  }).catch(function (err) {
    throw err
  })
}

module.exports = rmoo