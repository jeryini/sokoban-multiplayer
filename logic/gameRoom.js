var User = require('./user');
var Player = require('./player');
var GameServer = require('./gameServer');

// a hash array that will hold games
// in progress for each room. Key is the id of the room.
var gameRooms = {};

var GameRoom = function(roomId, levelId, description, socketId) {
    // id of the room
    this.roomId = roomId;

    // create a game for specified level
    this.gameServer = new GameServer(levelId);

    // description of the room
    this.description = description;

    this.clients = {};

    // id of the creator
    this.owner = this.join(socketId);
};

// create a new player, save it and return it
GameRoom.prototype.join = function(socketId) {
    // pop the first available player. If the player is not
    // available, then it will get undefined, which is fine
    // the player is connected to the client via socket id and
    // with the in game player via player id
    var player = new Player(socketId, this.gameServer.freePlayers.pop());
    this.clients[socketId] = player;
    return player;
};

// export the game rooms currently underway on server
module.exports = {
    gameRooms: gameRooms,
    GameRoom: GameRoom
};