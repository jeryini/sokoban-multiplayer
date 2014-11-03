var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  // TODO: we can access games object from here!
  // TODO: better store it inside the DB and then access it!
  var games = require('../bin/www');
  res.render('index', { title: 'Express' });
});

module.exports = router;
