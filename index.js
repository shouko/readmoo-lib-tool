var fs = require('fs')
var request = require('request')
var rp = require('request-promise')
var Promise = require('bluebird')
var exec = require('child_process').execSync

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
  'Origin': urls.readerHost
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
  var _this = this
  var opf = ''
  var base = ''
  var navDir = ''
  this.getBookMeta(id).then(function (meta) {
    base = meta.base
    navDir = meta.nav_dir.replace(meta.base, '')
    opf = meta.opf
    exec('rm -rf ' + id);
    [
      id,
      id + '/META-INF',
      id + '/' + navDir,
      id + '/' + navDir + 'Text',
      id + '/' + navDir + 'Styles',
      id + '/' + navDir + 'Images'
    ].forEach(function (fn) {
      exec('mkdir -p ' + fn)
    })
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
      return _this.downloadFile(base, id, fn)
    }))
  }).then(function () {
    var rootFile = fs.readFileSync(id + '/' + navDir + opf, 'utf-8')
    var p = []
    rootFile.split('manifest>')[1].split('href="').forEach(function (element) {
      var fn = element.split('"')
      if (fn.length == 1) return;
      p.push(_this.downloadFile(base, id, navDir + fn[0]))
    })
    return new Promise.all(p)
  }).then(function () {
    exec('cd ' + id + ' && zip -r ../' + id + '.epub *')
    console.log('done')
  })
}

Rmoo.prototype.downloadFile = function (base, wd, fn) {
  var _this = this
  return rp({
    headers: headers,
    uri: urls.readerHost + base + fn,
    jar: _this.jar,
    encoding: 'binary'
  }).then(function (response) {
    console.log('Downloaded', fn)
    return fs.writeFileSync(wd + '/' + fn, response, 'binary')
  }).catch(function (e) {
  })
}

module.exports = Rmoo