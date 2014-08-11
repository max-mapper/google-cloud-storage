var url = require('url')
var request = require('request').defaults({json: true})
var extend = require('xtend')
var through = require('through2')
var duplex = require('duplexify')
var mime = require('mime')
var concat = require('concat-stream')
var debug = require('debug')('google-cloud-storage')

module.exports = Client

function Client(opts) {
  if (!(this instanceof Client)) return new Client(opts)
  if (!opts) opts = {}
  if (!opts.token) throw new Error('Must specify token')
  this.baseURL = opts.baseURL || "https://www.googleapis.com/storage/v1"
  this.uploadBaseURL = opts.uploadBaseURL || "https://www.googleapis.com/upload/storage/v1"
  this.defaults = {
   'Authorization': "Bearer " + opts.token
  }
  this.bucket = opts.bucket
}

Client.prototype.request = function(opts, cb) {
  var reqOpts = extend({}, opts)
  reqOpts.headers = extend({}, this.defaults, opts.headers)
  if (process.env['DEBUG']) debug('request', JSON.stringify(reqOpts))
  if (!cb) return request(reqOpts)
  return request(reqOpts, function(err, resp, body) {
    if (process.env['DEBUG']) debug('response', err, resp.statusCode, body)
    cb(err, resp, body)
  })
}

Client.prototype.exists = function(options, cb) {
  var self = this
  var bucket = options.bucket || this.bucket
  if (!bucket) return cb(new Error('must specify bucket'))
  if (!options.name) return cb(new Error('must specify object name'))
  
  var url = this.baseURL + '/b/' + bucket + '/o/' + encodeURIComponent(options.name)
  
  self.request({url: url, json: true}, function(err, resp, data) {
    if (err) return cb(err)
    if (resp.statusCode === 404) return cb(null, false)
    cb(null, !!data)
  })
}

Client.prototype.remove = function(options, cb) {
  var self = this
  var bucket = options.bucket || this.bucket
  if (!bucket) return cb(new Error('must specify bucket'))
  if (!options.name) return cb(new Error('must specify object name'))
  
  var url = this.baseURL + '/b/' + bucket + '/o/' + encodeURIComponent(options.name)
  
  self.request({url: url, json: true, method: 'DELETE'}, function(err, resp, data) {
    if (err) return cb(err)
    if (resp.statusCode > 299) return cb(new Error(data))
    cb(null)
  })
}

Client.prototype.createReadStream = function(options) {
  var self = this
  var proxy = duplex()
  var bucket = options.bucket || this.bucket
  if (!bucket) return proxy.destroy(new Error('must specify bucket'))
  if (!options.name) return proxy.destroy(new Error('must specify object name'))
  
  // alt=media makes it stream the file instead of the metadata
  var url = this.baseURL + '/b/' + bucket + '/o/' + encodeURIComponent(options.name) + '?alt=media'
  
  var read = self.request({url: url})
  proxy.setReadable(read)
  
  read.on('response', function(resp) {
    if (resp.statusCode > 299) proxy.destroy(new Error(resp.statusCode))
  })
  
  read.on('error', function(err) {
    proxy.destroy(err)
  })
  
  return proxy
}

Client.prototype.createWriteStream = function(options, cb) {
  var self = this
  var proxy = duplex()
  
  var bucket = options.bucket || this.bucket
  if (!bucket) {
    var err = new Error('must specify bucket')
    cb(err)
    proxy.destroy(err)
    return proxy
  }
  
  var objectURL = this.uploadBaseURL + '/b/' + encodeURIComponent(bucket) + '/o'
  
  var newSession = {
    method: "POST",
    url: objectURL + '?uploadType=resumable',
    json: {
      name: options.name
    },
    headers: {
      'X-Upload-Content-Type': mime.lookup(options.name)
    }
  }
  
  self.request(newSession, function(err, resp, session) {
    if (err) {
      proxy.destroy(err)
      return cb(err)
    }
    if (resp.statusCode > 299) {
      var error = new Error(JSON.stringify({code: resp.statusCode, error: session}))
      proxy.destroy(error)
      return cb(error)
    }
    var parsed = url.parse(resp.headers.location, true)
    var session = parsed.query.upload_id
    var uploadURL = objectURL + '?uploadType=resumable&upload_id=' + session
    var upload = self.request({url: uploadURL, method: 'PUT'})
    proxy.setWritable(upload)
    upload.on('response', function(resp) {
      resp.pipe(concat(function(body) {
        var meta = JSON.parse(body)
        cb(null, self.normalizeMetadata(meta))
      }))
    })
    upload.on('error', function(err) {
      proxy.destroy(err)
      cb(err)
    })
  })
  
  return proxy
}

// normalize googles return metadata with what abstract-blob store expects
Client.prototype.normalizeMetadata = function(object) {
  object.hash = new Buffer(object.md5Hash, 'base64').toString('hex')
  object.size = +object.size
  return object
}

Client.prototype.createBucketReadStream = function(bucket) {
  var self = this
  
  if (!bucket) bucket = this.bucket
  importBucket()
  var stream = through.obj()
  
  return stream
  
  function importBucket(next) {
    debug('importing', next ? next : '')
    var url = self.baseURL + '/b/' + encodeURIComponent(bucket) + '/o'
    if (next) url += '?pageToken=' + next
    self.request({url: url}, function(err, resp, body) {
      if (err || (body && body.error) ) {
        return console.error(JSON.stringify(err || body))
        stream.end()
      }
      body.items.map(function(i) {
        stream.push(self.normalizeMetadata(i))
      })
      if (body.nextPageToken) {
        importBucket(body.nextPageToken)
      } else {
        if (resp.statusCode < 299) debug('finished import')
        else debug(resp.statusCode, body)
        stream.end()
      }
    })
  }
  
}
