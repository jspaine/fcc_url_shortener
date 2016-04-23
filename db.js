var Mongo = require('mongodb').MongoClient;

function Db(url) {
  this.url = url;
}

Db.prototype.open = function(cb) {
  Mongo.connect(this.url, (err, db) => {
    if (err) return cb(err);
    this.db = db;
    cb(err, this);
  });
};

Db.prototype.close = function() {
  if (this.db) this.db.close();
};

Db.prototype.nextIndex = function(cb) {
  if (!this.db) return cb('no db');
  this.find({'_id': -1}, {}, function(err, doc) {
    if (err || !doc)
      return this.db.collection('urls')
        .insertOne({'_id': -1, count: 0}, function(err, res) {
          if (err) return cb(err);
          cb(err, 0);
        });
    cb(err, doc.count);
  }.bind(this));
};

Db.prototype.updateCount = function(newCount, cb) {
  this.db.collection('urls')
    .findOneAndUpdate({
      '_id': -1
    }, {
      $set: {'count': newCount}
    }, cb);
};

Db.prototype.find = function(query, proj, cb) {
  if (!this.db) return cb('no db');
  this.db.collection('urls')
    .findOne(query, proj, function(err, doc) {
      if (err) return cb(err);
      cb(err, doc);
    });
};

Db.prototype.insert = function(query, cb) {
  if (!this.db) return cb('no db');
  this.db.collection('urls')
    .insertOne(query, function(err, doc) {
      if (err) return cb(err);
      cb(err, doc);
    });
};

module.exports = Db;
