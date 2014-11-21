/** @module gameRoom */
var User = require('./user');
var GameServer = require('./gameServer');
var uuid = require('node-uuid');

/** A hash array that will hold games in progress for each room. Key is the id of the room. */
// TODO: We should use in memory database store for current games, such as Redis.
var gameRooms = {};

/**
 * Creates a new instance of class that represents game room on server side.
 *
 * @class This class does not inherit from any class.
 *
 * @param {string} roomName The name of the room.
 * @param {number} levelId The id of the game level.
 * @param {string} description The description of the room.
 * @param {number} userId The id/name of the user.
 * @param {string} socketId The id of the user connection.
 */
var GameRoom = function(roomName, levelId, description, userId, socketId) {
    /** id of the room, generated from a standard UUID v1 for generating identifiers */
    this.roomId = uuid.v1();

    this.roomName = roomName;

    /** create a game on server side for specified level */
    this.gameServer = Object.create(GameServer.prototype);
    GameServer.call(this.gameServer, levelId);

    this.description = description;

    /** all users that are currently connected to this room */
    this.users = {};

    /** join game room for the room creator and save it as a owner */
    this.owner = this.joinGameRoom(userId, socketId);

    // add game room to current game rooms
    // TODO: Use Redis to store it into in memory cache
    gameRooms[this.roomId] = this;
};

/**
 * Create a new player, then user and save it to current users in
 * game room.
 *
 * @param {string} userId The user id/name.
 * @param {number} socketId The user connection id.
 * @returns {User} New user.
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
    // then set it to the current user.
    if (this.owner === undefined) {
        this.owner = user;
    }
    return user;
};

/**
 * Check if all players are taken for current game. It also sets if
 * the game server is enabled. This is only checked before game begins.
 * If the user leaves the game in the mean time, this will not be called!
 *
 * @returns {boolean}
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
 *
 * @param {Player} user The Player object that is assigned for the user.
 * @returns {{roomId: *, player: (*|User.player|GameClient.player), users: {}, stones: (*|gameState.stones|{}|Object|Game.stones), blocks: *, placeholders: (*|gameState.placeholders|{}|Object|Game.placeholders), players: (*|gameState.players|players|{}|Object|Game.players)}}
 */
GameRoom.prototype.gameServerState = function(user) {
    // we do not want to sent to the user the socket id
    // of other users, so we will create object, that will
    // contain userId as a key and player as a value
    var users = {};
    for (var socketId in this.users) {
        users[this.users[socketId].id] = this.users[socketId].player;
    }
    this.gameServer.game
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
 * Remove the user from game room. There are three possible sources, when
 * this needs to happen:
 * 1. User disconnects, i.e. closes tab/browser
 * 2. User joins another room.
 * 3. User creates a new room.
 * We need to first transfer ownership of the game. Of course this only happens
 * if the user is the owner of the game room. Then we need to free player from
 * the game and remove the current user. Also we need a check if there is owner left.
 * If it is not, the game room should eventually be removed.
 *
 * @param {} socket Socket of the user.
 * @param {} io Socket.io
 */
GameRoom.prototype.removeUserFromGame = function(socket, io) {
    var user = this.users[socket.id];

    // transfer ownership of the game room
    this.transferOwnership(socket.id);

    // if owner is still undefined, then there is no player left,
    // delete the game room
    if (this.owner === undefined) {
        var roomId = socket.roomId;
        // delete it after 5s
        setTimeout(function() {
            // we need to check if in the meantime the ownership of the game
            // room was taken by some other user
            if (this.owner === undefined) {
                delete gameRooms[roomId];
                io.sockets.emit('deleteRoom', roomId);
            }
        }, 5000);
    }

    // free player from game
    this.gameServer.freePlayers.push(this.users[socket.id].player.id);

    // remove user from game room
    delete this.users[socket.id];

    io.sockets.emit('updatePlayersIn', {
        roomId: this.roomId,
        playersIn: Object.keys(this.gameServer.players).length -
            this.gameServer.freePlayers.length
    });

    // broadcast to other users in the same room that the user has left
    // the game room
    socket.broadcast.to(this.roomId).emit('userLeft', user.id);
};

/**
 * Transfer ownership to the next player if the passed id is the owner of the game.
 *
 * @param {string} disconnectedSocketId The socket id of the user, that has disconnected from the room.
 */
GameRoom.prototype.transferOwnership = function(disconnectedSocketId) {
    // check if disconnected user is owner of the room
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
 * @param {string} roomId The UUID room id.
 * @returns {GameRoom}
 */
var getGameRoom = function(roomId) {
    return gameRooms[roomId];
};

/**
 * Delete the game room from the current games on the server.
 *
 * @param {string} roomId The id of the room to delete.
 */
var deleteGameRoom = function(roomId) {
    delete gameRooms[roomId];
};

/** Export the game rooms currently underway on server */
module.exports = {
    gameRooms: gameRooms,
    GameRoom: GameRoom,
    getGameRoom: getGameRoom,
    deleteGameRoom: deleteGameRoom
};