var fs = require('fs')
var rp = require('request-promise')
var Promise = require('bluebird')

var urls = {
  readerHome: 'https://reader.readmoo.com/reader/index.html',
  readerHost: 'https://reader.readmoo.com',
  login: 'https://member.readmoo.com/login',
  library: 'https://new-read.readmoo.com/api/me/library/books?count=100'
}

var headers = {
  'Referer': urls.readerHome,
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0'
}

var Rmoo = function (params) {
  ['username', 'password'].forEach(function (key) {
    if(typeof(params[key]) == 'undefined') throw 'Too few arguments'
    this[key] = params[key]
  })
  this.jar = rp.jar()
}

Rmoo.prototype.login = function () {
  return rp({
    method: 'POST',
    uri: urls.login,
    form: {
      email: this.username,
      password: this.password
    },
    jar: this.jar,
    headers: {
      'Referer': urls.login,
      'User-Agent': headers['User-Agent']
    }
  }).then(function (response) {
    return [response, this.jar]
  }).error(function (err) {
    throw 'Login failed'
  })
}

Rmoo.prototype.getLibrary = function () {
  return rp({
    uri: urls.library,
    jar: this.jar
  })
}

Rmoo.prototype.getBook = function (id) {
  return rp({
    headers: headers,
    uri: urls.readerHost + '/api/book/' + id + '/nav',
    json: true
  }).then(function (response) {
    if (typeof(response['message']) == 'undefined' || response['message'] !== 'success') throw 'Invalid book ID'
    return response
  }).catch(function (err) {
    throw err
  })
}

module.exports = Rmoo