var request = require('request').defaults({json: true})
var extend = require('xtend')
var through = require('through2')
var debug = require('debug')('google-cloud-storage')

module.exports = Client

function Client(opts) {
  if (!(this instanceof Client)) return new Client(opts)
  if (!opts) opts = {}
  if (!opts.token) throw new Error('Must specify token')
  this.baseURL = opts.baseURL || "https://www.googleapis.com/storage/v1"
  this.defaults = {
   'Content-Type': opts.contentType || 'text/plain',
   'Authorization': "Bearer " + opts.token
  }
}

Client.prototype.request = function(opts, cb) {
  var reqOpts = extend({}, opts)
  reqOpts.url = this.baseURL + reqOpts.url
  reqOpts.headers = extend({}, this.defaults, opts.headers)
  if (process.env['DEBUG']) debug(JSON.stringify(reqOpts))
  return request(reqOpts, cb)
}

Client.prototype.createBucketReadStream = function(bucket) {
  var self = this
  importBucket()
  var stream = through.obj()
  
  return stream
  
  function importBucket(next) {
    debug('importing', next ? next : '')
    var url = '/b/' + bucket + '/o'
    if (next) url += '?pageToken=' + next
    self.request({url: url}, function(err, resp, body) {
      if (err || (body && body.error) ) {
        return console.error(JSON.stringify(err || body))
        stream.end()
      }
      body.items.map(function(i) {
        stream.push(i)
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
