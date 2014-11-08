var User = require('./user');
var Player = require('./player');
var GameServer = require('./gameServer');
var uuid = require('node-uuid');

// a hash array that will hold games
// in progress for each room. Key is the id of the room.
var gameRooms = {};

var GameRoom = function(roomName, levelId, description, userId, socketId) {
    // id of the room, generated from a standard UUID v1
    // for generating identifiers
    this.roomId = uuid.v1();

    // name of the room
    this.roomName = roomName;

    // create a game for specified level
    this.gameServer = new GameServer(levelId);

    // description of the room
    this.description = description;

    this.clients = {};

    // id of the creator
    this.owner = this.joinGameRoom(userId, socketId);

    // add game room to current game rooms
    gameRooms[this.roomId] = this;
};

/**
 * Create a new player, save it and return it
 */
GameRoom.prototype.joinGameRoom = function(userId, socketId) {
    // pop the first available player. If the player is not
    // available, then it will get undefined, which is fine
    // the player is connected to the client via socket id and
    // with the in game player via player id
    var player = new Player(userId, socketId, this.gameServer.freePlayers.pop());
    this.clients[socketId] = player;
    return player;
};

/**
 * Get the game room from the current games on the server.
 *
 * @param roomId
 */
var getGameRoom = function(roomId) {
    return gameRooms[roomId];
};

var deleteGameRoom = function(roomId) {
    delete gameRooms[roomId];
};

// export the game rooms currently underway on server
module.exports = {
    gameRooms: gameRooms,
    GameRoom: GameRoom,
    getGameRoom: getGameRoom,
    deleteGameRoom: deleteGameRoom
};