/**
 * User class.
 *
 * @param userId
 * @param socketId
 * @param player
 * @constructor
 */
var User = function(id, socketId, player) {
    this.id = id;
    this.socketId = socketId;
    this.player = player;
};

module.exports = User;