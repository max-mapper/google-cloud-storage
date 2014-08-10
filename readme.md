# google-cloud-storage

a blob store backend for [Google Cloud Storage](https://developers.google.com/storage/docs/json_api/v1/)

compatible with the [abstract-blob-store](https://github.com/maxogden/abstract-blob-store) API

use from Node or on the CLI

[![NPM](https://nodei.co/npm/google-cloud-storage.png)](https://nodei.co/npm/google-cloud-storage/)

## cli usage

the cli tool is currently only useful for getting metadata out of existing buckets

first you have to get an access token. the easiest way is probably to use [googleauth](https://github.com/maxogden/googleauth) with `--scope="https://www.googleapis.com/auth/devstorage.full_control"`

then you pass the token into `google-cloud-storage` on the cli

```
google-cloud-storage --token="MYTOKEN" <bucketname>
```

if your token is stored in `~/.config/googleauth.json` (the `googleauth` default) then it will automatically be used by `google-cloud-storage` on the CLI

output will be a newline delimited JSON stream (1 per line) of all items in the bucket

example:

```
$ google-cloud-storage maxomusic
{"kind":"storage#object","id":"2562/Unbalance/03 Lost.mp3/9","name":"2562/Unbalance/03 Lost.mp3","bucket":"maxomusic","generation":"9","metageneration":"2","contentType":"audio/mpeg","updated":"2010-08-28T04:45:06.130Z","size":"6765847","md5Hash":"9QsV+OSWyz+kY+Y3riPOlQ==","entityId":"00b4903a97fd7a62057b813acc58e8a9af1e5abe4220ef130cd88239a3aa39fd"},"crc32c":"NREp3A==","etag":"CAkQAg=="}
{"kind":"storage#object","id":"2562/Unbalance/04 Like A Dream.mp3/9","name":"2562/Unbalance/04 Like A Dream.mp3","bucket":"maxomusic","generation":"9","metageneration":"2","contentType":"audio/mpeg","updated":"2010-08-28T04:45:14.632Z","size":"6784006","md5Hash":"VGcsBxesZ5ADYOt5v9kOzg==","entityId":"00b4903a97fd7a62057b813acc58e8a9af1e5abe4220ef130cd88239a3aa39fd"},"crc32c":"FFar9g==","etag":"CAkQAg=="}
... etc
```
