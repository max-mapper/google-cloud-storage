var fs = require('fs')
var path = require('path')
var test = require('tape')
var abstractBlobTests = require('abstract-blob-store/tests')
var gcs = require('./')

// assumes you are using npm install googleauth -g
var tokens = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config', 'googleauth.json')))
var bucket = process.env['GOOGLE_CLOUD_STORAGE_TEST_BUCKET']

var common = {
  setup: function(t, cb) {
    var store = gcs({token: tokens.access_token, bucket: bucket})
    cb(null, store)
  },
  teardown: function(t, store, blob, cb) {
    if (blob) store.remove(blob, cb)
    else cb()
  }
}

abstractBlobTests(test, common)
