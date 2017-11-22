var fs = require('fs')
var rp = require('request-promise')
var Promise = require('bluebird')

var urls = {
  readerHome: 'https://reader.readmoo.com/reader/index.html',
  readerHost: 'https://reader.readmoo.com',
  loginPage: 'https://member.readmoo.com/login',
  library: 'https://new-read.readmoo.com/api/me/library/books?count=100'
}

var headers = {
  'Referer': urls.readerHome,
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0',
  'Accept-Language': 'zh-TW,zh;q=0.5',
  'Origin': 'https://reader.readmoo.com'
}

var Rmoo = function (params) {
  ['username', 'password'].forEach(function (key) {
    if(typeof(params[key]) == 'undefined') throw 'Too few arguments'
    this[key] = params[key]
  }.bind(this))
  this.jar = rp.jar()
}

Rmoo.prototype.login = function () {
  var _this = this
  return rp({
    uri: urls.loginPage,
    headers: headers,
    jar: _this.jar
  }).then(function () {
    return rp({
      method: 'POST',
      uri: urls.loginPage,
      form: {
        email: _this.username,
        password: _this.password
      },
      json: true,
      jar: _this.jar,
      headers: {
        'Referer': urls.loginPage,
        'User-Agent': headers['User-Agent'],
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
  }).then(function (response) {
    if (response['status'] !== 'ok') throw ''
  }).error(function (err) {
    throw 'Login failed'
  })
}

Rmoo.prototype.getLibrary = function () {
  var _this = this
  return rp({
    uri: urls.library,
    jar: _this.jar,
    json: true
  })
}

Rmoo.prototype.getBookMeta = function (id) {
  var _this = this
  return rp({
    headers: headers,
    uri: urls.readerHost + '/api/book/' + id + '/nav',
    jar: _this.jar,
    json: true
  }).then(function (response) {
    if (typeof(response['message']) == 'undefined' || response['message'] !== 'success') throw 'Invalid book ID'
    return response
  }).catch(function (err) {
    throw err
  })
}

Rmoo.prototype.getBookEpub = function (id) {
  this.getBookMeta(id).then(function (meta) {
    
  })
}

module.exports = Rmoo