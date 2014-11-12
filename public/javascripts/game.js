/**
 * A class that represents game state. This class is inherited
 * by the server side game.
 */
var Game = function(stones, blocks, placeholders, players) {
    // each object contains one or multiple keys that represent
    // position of the given object
    this.stones = stones;
    this.blocks = blocks;
    this.placeholders = placeholders;
    this.players = players;
};

// define a possible actions for all game objects
// this is common for every created game
Game.prototype.actions = {
    // TODO: Use Object.freeze to set the adding and changing of actions to false.
    // TODO: This way we get the immutable object.
    "up": [0, -1],
    "down": [0, 1],
    "left": [-1, 0],
    "right": [1, 0]
};

// check in game is solved
Game.prototype.solved = function() {
    // TODO: Use Object.keys to get the keys! This will only get the own properties
    // TODO: of the object, without inherited properties!
    for (var key in this.blocks) {
        if (!(key in this.placeholders))
            return false;
    }
    return true;
};

// for given action check against game rules and try to
// execute it
Game.prototype.executeAction = function(action, playerId) {
    // first make a move
    var playerPosition = this.players[playerId].position;
    var newPlayerPosition = this.newPosition(playerPosition, action);

    // check if new position is in stones
    if (newPlayerPosition in this.stones) {
        return false;
    }

    // check for new position in blocks
    if (newPlayerPosition in this.blocks) {
        var newBlockPosition = this.newPosition(newPlayerPosition, action);

        // check that move of the block does not move
        // some other block, end up in stone or move opposite
        // player
        if (newBlockPosition in this.blocks ||
            newBlockPosition in this.stones ||
            this.inPlayers(newBlockPosition)) {
            return false;
        }

        // everything ok, save the new block position
        this.blocks[newBlockPosition] = newBlockPosition;

        // and delete previous position
        delete this.blocks[newPlayerPosition];
    }

    // check for new position in opposite players
    if (this.inPlayers(newPlayerPosition)) {
        var newOppositePlayerPosition = this.newPosition(newPlayerPosition, action);

        // check that move of the player does not move
        // some other block, end up in stone or in some
        // other player
        if (newOppositePlayerPosition in this.blocks ||
            newOppositePlayerPosition in this.stones ||
            this.inPlayers(newOppositePlayerPosition)) {
            return false;
        }

        // everything ok, save the new opposite player position
        var oppositePlayerId = this.getPlayerId(newPlayerPosition);
        this.players[oppositePlayerId].position = newOppositePlayerPosition;
    }

    // action is possible and does not move
    // any of the block
    this.players[playerId].position = newPlayerPosition;

    return true;
};

/**
 * Check if position is in any of the players.
 *
 * @param position
 * @returns {boolean}
 */
Game.prototype.inPlayers = function(position) {
    for (var player in this.players) {
        if (this.players[player].position == position) {
            return true;
        }
    }
    return false;
};

/**
 * Get the player id given the position.
 *
 * @param position
 * @returns {*}
 */
Game.prototype.getPlayerId = function(position) {
    for (var player in this.players) {
        if (this.players[player].position == position) {
            return this.players[player].id;
        }
    }
    return undefined;
};

// get new position for selected player and action
Game.prototype.newPosition = function(position, action) {
    return [position[0] + action[0], position[1] + action[1]];
};

// do not export if in browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game;
}