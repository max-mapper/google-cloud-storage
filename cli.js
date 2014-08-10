#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var gcs = require('./')
var args = require('minimist')(process.argv.slice(2))
var ldj = require('ldjson-stream')

var bucket = args._[0]
if (!bucket) throw new Error("must specify bucket")

if (!args.token) {
  try {
    var authPath = path.join(process.env.HOME, '.config', 'googleauth.json')
    var auth = JSON.parse(fs.readFileSync(authPath))
    args.token = auth.access_token
  } catch(e) {
    throw new Error('Must specify token')
  }
}

args.bucket = bucket
var client = gcs(args)

client.createBucketReadStream().pipe(ldj.serialize()).pipe(process.stdout)
