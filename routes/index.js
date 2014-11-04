var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    // TODO: we can access games object from here!
    // TODO: better store it inside the DB and then access it!
    var games = require('../bin/www');
//    var rooms = new Array({a: 1}, {a: 2}, {a: 3}, {a    : 4});
//    var rooms = new Array(1, 2, 3, 4);
    var rooms = new Array({
        roomId: "Test",
        levelId: 2,
        playersIn: 1,
        players: 2
    });

    for (var roomId in games) {
        rooms.push({
            roomId: roomId,
            levelId: games[roomId].levelId,
            playersIn: Object.keys(games[roomId].clients).length,
            players: games[roomId].freePlayers.length +
                Object.keys(games[roomId].clients).length
        });
    }
    res.render('index', {title: "Test", rooms: rooms });
});

module.exports = router;
