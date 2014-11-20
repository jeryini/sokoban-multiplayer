/** @module user */

/**
 * Creates a new instance of class that represents single user.
 *
 * @class This class is an abstraction of the connected user and a bridge
 * between user and the in game player.
 *
 * @property {string} id User id/name.
 * @property {string} socketId Unique socket identification of the connected user.
 * @property {Object} player In game player. If user is a spectator, then this value is null.
 */
var User = function(id, socketId, player) {
    this.id = id;
    this.socketId = socketId;
    this.player = player;
};

/** Export User class.  */
module.exports = User;