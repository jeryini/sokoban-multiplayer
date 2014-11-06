var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    // get all current rooms on the server
    var rooms = require('../logic/gameRoom');

    // some test data
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

router.get('/about', function(req, res) {

});

module.exports = router;
