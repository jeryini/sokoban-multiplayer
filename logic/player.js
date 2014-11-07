// TODO: should the player extend the user?
/**
 * This maps user id and his socket id with a given player
 * in the game.
 *
 * @param userId
 * @param socketId
 * @param playerId
 * @constructor
 */
var Player = function(userId, socketId, playerId) {
    this.userId = userId;
    this.socketID = socketId;
    this.playerId = playerId;
};

module.exports = Player;