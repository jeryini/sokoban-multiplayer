var express = require('express');
var router = express.Router();
var gameLevels = require('../levels/levels');

/**
 * GET home page section.
 */
router.get('/', function(req, res) {
    // get all current rooms on the server
    var gameRooms = require('../logic/gameRoom').gameRooms;

    // rooms for display
    var rooms = [], levels = [];

    // add all current game rooms on the server
    for (var roomId in gameRooms) {
        rooms.push({
            roomId: gameRooms[roomId].roomId,
            roomName: gameRooms[roomId].roomName,
            description: gameRooms[roomId].description,
            levelId: gameRooms[roomId].levelId,
            playersIn: Object.keys(gameRooms[roomId].gameServer.players).length -
                gameRooms[roomId].gameServer.freePlayers.length,
            allPlayers: Object.keys(gameRooms[roomId].gameServer.players).length
        });
    }

    // add levels
    for (var levelId in gameLevels) {
       levels.push(levelId);
    }

    res.render('index', {title: "Test", gameRooms: rooms, levels: levels });
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

/**
 * GET help section.
 */
router.get('/help', function(req, res) {
    res.render('help', {title: "Help"});
});

module.exports = router;
