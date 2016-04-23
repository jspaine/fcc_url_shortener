var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var Db = require('./db')
var db = new Db(process.env.MONGO_URL || 'mongodb://localhost:27017/urls');

http.createServer(function(req, res) {
  var urlPath = decodeURIComponent(url.parse(req.url).pathname.substr(1));
  var host = url.parse(req.url).host || 'localhost:8000';

  initDb(function(err, nextId) {
    if (err) return showError(err, 500);  
    if (urlPath.match(/^[0-9]{1,14}$/)) {
      db.find({'_id': parseInt(urlPath, 10)}, {}, redirect);
    } else if (urlPath.match(/^http[s]?\:\/\//)) {
      db.find({'long_url': urlPath}, {'_id': 0}, function(err, result) {
        if (err) return showError(err, 500);
        if (result) return showJson(result);
        db.insert({
          'long_url': urlPath,
          'short_url': host + '/' + nextId,
          '_id': nextId,
        }, function(err, result) {
          if (err) return showError(err, 500);
          db.updateCount(nextId+1, function(err) {
            if (err) return showError(err, 500);
            db.find({'_id': nextId}, {'_id': 0}, function(err, result) {
              if (err) return showError(err, 500);
              showJson(result);
              db.close();
            });
          });
        });
      });
    } else {
      db.close();
      showHtml(path.join(__dirname, 'index.html'));
    }
  });

  function initDb(cb) {
    db.open(function(err, db) {
      if (err) return showError(err, 500);
      db.nextIndex(function(err, index) {
        cb(err, index);
      });
    });
  }

  function redirect(err, doc) {
    db.close();
    if (err || !doc) return showError(err, 500);
    res.writeHead(302, {'Location': doc['long_url']});
    res.end();
  }

  function showError(err, code) {
    console.log(code, err);
    db.close();
    res.writeHead(code);
    res.write(code + ' Error: ' + err);
    res.end();
  }

  function showJson(data) {
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.write(JSON.stringify(data));
    res.end();
  }

  function showHtml(file) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(fs.readFileSync(file));
  }

}).listen(process.env.PORT || 8000);
