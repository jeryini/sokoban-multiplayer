var express = require('express');
var router = express.Router();

/**
 * GET home page section.
 */
router.get('/', function(req, res) {
    // get all current rooms on the server
    var gameRooms = require('../logic/gameRoom').gameRooms;

    // some test data
    var rooms = [{
        roomId: "Game room 1",
        description: "This is a game room 1",
        levelId: 2,
        playersIn: 1,
        allPlayers: 2
    }, {
        roomId: "Game room 2",
        description: "This is a game room 1",
        levelId: 1,
        playersIn: 2,
        allPlayers: 3
    }, {
        roomId: "Game room 3",
        description: "This is a game room 1",
        levelId: 2,
        playersIn: 0,
        allPlayers: 3
    }];

    // add all current game rooms on the server
    for (var roomId in gameRooms) {
        rooms.push({
            roomId: gameRooms[roomId].roomId,
            description: gameRooms[roomId].description,
            levelId: gameRooms[roomId].levelId,
            playersIn: Object.keys(gameRooms[roomId].clients).length,
            allPlayers: gameRooms[roomId].gameServer.freePlayers.length +
                Object.keys(gameRooms[roomId].clients).length
        });
    }
    res.render('index', {title: "Test", gameRooms: rooms });
});

/**
 * GET about section.
 */
router.get('/about', function(req, res) {
    res.render('about', {title: "About"});
});

/**
 * GET contact section.
 */
router.get('/contact', function(req, res) {
    res.render('contact', {title: "Contact"});
});

module.exports = router;
