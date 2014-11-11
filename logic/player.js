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
    // TODO: Do we need socket id here? We already store it
    // TODO: as a key!
    this.socketId = socketId;
    this.playerId = playerId;
};

module.exports = Player;