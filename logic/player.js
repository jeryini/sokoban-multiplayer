/**
 * Each user that actively participates in the game
 * has a player with a unique id, position and color.
 *
 * @param id
 * @param position
 * @param color
 * @constructor
 */
var Player = function(id, position, color) {
    this.id = id;
    this.position = position;
    this.color = color;
};

module.exports = Player;