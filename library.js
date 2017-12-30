const exec = require('child_process').execSync
const shellescape = require('shell-escape')
const fs = require('fs')
const assert = require('assert')

var Library = function (params) {
  ['rcloneBin', 'rcloneConfig', 'rcloneRemoteName', 'rcloneRemotePath'].forEach(function (key) {
    if(typeof(params[key]) == 'undefined') throw 'Too few arguments'
    this[key] = params[key]
  }.bind(this))
  this.cachedMeta = []
  this.cachedMetaTable = {}
  this.incomingMeta = {}
}

Library.prototype.init = function () {
  this.fetchRemoteMeta()
}

Library.prototype.rcloneExec = function (params) {
  return exec(shellescape([this.rcloneBin, '--config', this.rcloneConfig].concat(params)))
}

Library.prototype.getFullRemotePath = function (path) {
  return [this.rcloneRemoteName, ":", this.rcloneRemotePath, path].join('')
}

Library.prototype.download = function (path) {
  this.rcloneExec(['copy', this.getFullRemotePath(path), './'])
}

Library.prototype.upload = function (path) {
  this.rcloneExec(['copy', path, this.getFullRemotePath('')])
}

Library.prototype.fetchRemoteMeta = function () {
  _this = this
  exec('rm -f meta.json')
  try {
    _this.download('meta.json')
  } catch (e) {
    console.log('Remote meta does not exist, initializing')
    fs.writeFileSync('meta.json', JSON.stringify([]))
  }
  _this.cachedMeta = JSON.parse(fs.readFileSync('meta.json', 'utf8'))
  _this.cachedMeta.forEach(function (element, index) {
    _this.cachedMetaTable[element.id] = index
  })
}

Library.prototype.filenamify = function (str) {
  table = [
    [/\\/g, '＼'],
    [/\//g, '／']
  ]
  table.forEach(function (rule) {
    str = str.replace(...rule)
  })
  return str
}

Library.prototype.pushMeta = function (element) {
  if (typeof(this.cachedMetaTable[element.id]) == 'undefined') {
    this.incomingMeta[element.id] = element
    console.log('New', element.id, element.title)
  }
}

Library.prototype.getIncomingIds = function () {
  return Object.keys(this.incomingMeta)  
}

Library.prototype.uploadIncoming = function () {
  _this = this
  Object.keys(_this.incomingMeta).forEach(function (id) {
    try {
      var title = _this.filenamify(_this.incomingMeta[id].title)
      assert(title.length > 0)
      var filename_src = id + '.epub'
      var filename = title + '.epub'
      assert(fs.existsSync(filename_src))
      exec(shellescape(['mv', filename_src, filename]))
      console.log('Uploading', id, title)
      _this.upload(filename)
      _this.incomingMeta[id].filename = filename
      _this.cachedMeta.unshift(_this.incomingMeta[id])
    } catch (e) {
      console.error('Failed to store', id)
    }
  })
  fs.writeFileSync('meta.json', JSON.stringify(_this.cachedMeta))
  console.log('Uploading', 'meta.json')
  _this.upload('meta.json')
}

Library.prototype.cleanLocal = function() {
  exec('rm *.epub')
  exec('rm meta.json')
}

module.exports = Library