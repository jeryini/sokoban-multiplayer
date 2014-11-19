var User = require('./user');
var GameServer = require('./gameServer');
var uuid = require('node-uuid');

// a hash array that will hold games
// in progress for each room. Key is the id of the room.
// TODO: We should use in memory database store for current games,
// TODO: such as Redis.
var gameRooms = {};

/**
 * A main class for game room.
 *
 * @param roomName
 * @param levelId
 * @param description
 * @param userId
 * @param socketId
 * @constructor
 */
var GameRoom = function(roomName, levelId, description, userId, socketId) {
    // id of the room, generated from a standard UUID v1
    // for generating identifiers
    this.roomId = uuid.v1();

    // name of the room
    this.roomName = roomName;

    // create a game for specified level
    this.gameServer = Object.create(GameServer.prototype);
    GameServer.call(this.gameServer, levelId);

    // description of the room
    this.description = description;

    // all users that are currently connected to this room
    this.users = {};

    // id of the creator
    this.owner = this.joinGameRoom(userId, socketId);

    // add game room to current game rooms
    // TODO: Use Redis to store it into in memory cache
    gameRooms[this.roomId] = this;
};

/**
 * Create a new player, save it and return it
 */
GameRoom.prototype.joinGameRoom = function(userId, socketId) {
    // pop the first available player. If the player is not
    // available, then it will get undefined, which is fine
    var freePlayerId = this.gameServer.freePlayers.pop();
    var player = this.gameServer.players[freePlayerId];
    var user = Object.create(User.prototype);
    User.call(user, userId, socketId, player);
    this.users[socketId] = user;
    // also check if there is no owner. If it is missing,
    // then set it to the current user
    if (this.owner === undefined) {
        this.owner = user;
    }
    return user;
};

/**
 * Check if all slots are taken for current game.
 *
 */
GameRoom.prototype.checkAllPlayersJoined = function() {
    // once the game is enabled do not check if all players are in
    if (this.gameServer.enabled) {
        return true;
    }

    // otherwise check for number of free players
    this.gameServer.enabled = (this.gameServer.freePlayers.length == 0);
    return this.gameServer.enabled;
};

/**
 * Create game server state object for client. We do not want to send
 * full game server state to the user.
 */
GameRoom.prototype.gameServerState = function(user) {
    // we do not want to sent to the user the socket id
    // of other users, so we will create object, that will
    // contain userId as a key and player as a value
    var users = {};
    for (var socketId in this.users) {
        users[this.users[socketId].id] = this.users[socketId].player;
    }
    return {
        roomId: this.roomId,
        player: user.player,
        users: users,
        stones: this.gameServer.stones,
        blocks: this.gameServer.blocks,
        placeholders: this.gameServer.placeholders,
        players: this.gameServer.players
    };
};

/**
 * Transfer ownership if the passed id is the owner of the game.
 */
GameRoom.prototype.transferOwnership = function(disconnectedSocketId) {
    // then check if disconnected user is owner of the room
    if (this.owner.socketId == disconnectedSocketId) {
        // set it to undefined
        this.owner = undefined;

        // transfer ownership of the room to the next user
        for (var socketId in this.users) {
            if (this.users[socketId].socketId != disconnectedSocketId) {
                this.owner = this.users[socketId];
                break;
            }
        }
    }
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