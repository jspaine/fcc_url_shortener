var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var Db = require('./db')

var db = new Db(process.env.MONGODB_URI || 'mongodb://localhost:27017/urls');
var host = process.env.NODE_ENV === 'production' ? 'https://short-url-23.herokuapp.com' : 'http://localhost:8000';

http.createServer(function(req, res) {
  var urlPath = decodeURIComponent(url.parse(req.url).pathname.substr(1));

  db.open(function(err, nextId) {
    if (err) return showError(err, 500);  
    if (urlPath.match(/^[0-9]{1,14}$/)) {
      db.find({'_id': parseInt(urlPath, 10)}, redirect);
    } else if (urlPath.match(/^http[s]?\:\/\//)) {
      db.find({'long_url': urlPath}, function(err, result) {
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
            db.find({'_id': nextId}, function(err, result) {
              if (err) return showError(err, 500);
              showJson(result);
            });
          });
        });
      });
    } else if (urlPath === '') {
      showHtml(path.join(__dirname, 'index.html'));
    } else {
      showJson({error: 'invalid url'});
    }
  });

  function redirect(err, doc) {
    db.close();
    if (err) return showError(err, 500);
    if (!doc) return showError('Not Found', 404)
    res.writeHead(302, {'Location': doc['long_url']});
    res.end();
  }

  function showError(err, code) {
    db.close();
    res.writeHead(code);
    res.write(code + ' Error: ' + err);
    res.end();
  }

  function showJson(data) {
    db.close();
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.write(JSON.stringify(data));
    res.end();
  }

  function showHtml(file) {
    db.close();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(fs.readFileSync(file));
    res.end();
  }
}).listen(process.env.PORT || 8000);
