var fs = require('fs')
var request = require('request')
var rp = require('request-promise')
var Promise = require('bluebird')
var path = require('path')
var exec = require('child_process').execSync
var FileCookieStore = require('file-cookie-store');
var https = require('https')

var urls = {
  readerHome: 'https://reader.readmoo.com/reader/index.html',
  readerHost: 'https://reader.readmoo.com',
  loginPage: 'https://member.readmoo.com/login',
  library: 'https://new-read.readmoo.com/api/me/library/books?count=100&sort=buy'
}

var cookieFile = 'cookies.txt'

var headers = {
  'Referer': urls.readerHome,
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0',
  'Accept-Language': 'zh-TW,zh;q=0.5',
  'Origin': urls.readerHost
}

var Rmoo = function (params) {
  _this = this;
  ['username', 'password'].forEach(function (key) {
    if(typeof(params[key]) == 'undefined') throw 'Too few arguments'
    _this[key] = params[key]
  })
  _this.httpAgent = new https.Agent()
  _this.httpAgent.maxSockets = params.maxSockets || 5
  if (!fs.existsSync(cookieFile)) fs.writeFileSync(cookieFile, '')
  _this.jar = new FileCookieStore(cookieFile, {lockfile : true})
}

Rmoo.prototype.init = function () {
  var _this = this
  return new Promise(function (resolve, reject) {
    _this.getLibrary().then(function () {
      resolve()
    }).catch(function (err) {
      _this.login().then(function () {
        resolve()
      }).catch(function (err) {
        reject(err)
      })
    })
  })
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
    console.log('Login success')
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
  }).then(function (response) {
    if (typeof(response['data']) == 'undefined' || response['status'] == 'error_login') throw 'Not logged in'
    return response
  }).catch(function (err) {
    throw err
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

Rmoo.prototype.getBookEpub = function (id, verbose) {
  var _this = this
  var opf = ''
  var base = ''
  var navDir = ''
  return this.getBookMeta(id).then(function (meta) {
    console.log('Downloading', id)
    base = meta.base
    navDir = meta.nav_dir.replace(meta.base, '')
    opf = meta.opf
    exec('rm -rf ' + id)
    return new Promise.all([
      'mimetype',
      'META-INF/container.xml',
      'META-INF/encryption.xml',
      'META-INF/manifest.xml',
      'META-INF/metadata.xml',
      'META-INF/rights.xml',
      'META-INF/signatures.xml',
      navDir + opf
    ].map(function (fn) {
      return _this.downloadFile(base, id, fn, verbose)
    }))
  }).then(function () {
    var rootFile = fs.readFileSync(id + '/' + navDir + opf, 'utf-8')
    var p = []
    rootFile.split('href="').forEach(function (element) {
      var fn = element.split('"')
      if (fn.length == 1) return;
      p.push(_this.downloadFile(base, id, navDir + fn[0], verbose))
    })
    return new Promise.all(p)
  }).then(function () {
    exec('zip -r ../' + id + '.epub *', {cwd: id})
    exec('rm -rf ' + id)
    console.log('Done', id)
  })
}

Rmoo.prototype.downloadFile = function (base, wd, fn, verbose, tries) {
  var _this = this
  return rp({
    headers: headers,
    uri: urls.readerHost + base + fn,
    jar: _this.jar,
    encoding: 'binary',
    pool: _this.httpAgent
  }).then(function (response) {
    if (verbose) console.log('Downloaded', fn)
    exec('mkdir -p ' + path.dirname(wd + '/' + fn))
    return fs.writeFileSync(wd + '/' + fn, response, 'binary')
  }).catch(function (e) {
    if (typeof(e.response) == 'undefined' || !e.response.complete) {
      var toTry = typeof(tries) == 'number' ? tries++ : 1
      console.log('Error', fn, ', retrying for', toTry)
      return _this.downloadFile(base, wd, fn, verbose, toTry)
    }
  })
}

module.exports = Rmoo