/** @module player */

/**
 * Creates a new instance of class that represents single player.
 *
 * @class This class represents in game player.
 *
 * @param {number} id The id of the player.
 * @param {number[]} position The current 2D position in game.
 * @param {string} color The color of the player.
 */
var Player = function(id, position, color) {
    this.id = id;
    this.position = position;
    this.color = color;
};

/** Export Player class.  */
module.exports = Player;