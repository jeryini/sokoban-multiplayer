/** @module game */

/**
 * Creates a new instance of class that represents game state.
 *
 * @class This class is inherited by the server side game and by the
 * client side game. Each of defined property can contain one or multiple properties.
 *
 * @property {Object} stones Contains stones position.
 * @property {Object} blocks Contains blocks position.
 * @property {Object} placeholders Contains placeholder positions for blocks.
 * @property {Object} players Contains players and their position.
 * @property {boolean} enabled Specifies if game is enabled, i.e. it responds to actions from outside.
 */
var Game = function(stones, blocks, placeholders, players) {
    this.stones = stones;
    this.blocks = blocks;
    this.placeholders = placeholders;
    this.players = players;
    this.enabled = false;
};

/**
 * Enum for possible player actions. This object is immutable.
 * @readonly
 * @enum {number[]}
 */
Game.prototype.actions = Object.freeze({
    UP: [0, -1],
    DOWN: [0, 1],
    LEFT: [-1, 0],
    RIGHT: [1, 0]
});

/**
 * Check if game is solved. When the game is solved, it means
 * that all blocks are positioned on the placeholders.
 *
 * @returns {boolean}
 */
Game.prototype.solved = function() {
    for (var block in this.blocks) {
        if (!(block in this.placeholders))
            return false;
    }
    return true;
};

/**
 * For given action check against game rules and try to execute it.
 * We use Guard Clauses to avoid nested conditional statements.
 *
 * @param {number[]} action The action to execute.
 * @param {number} playerId Id of the player for whom we want to execute action.
 * @returns {boolean} If the action was successfully executed for a given player.
 */
Game.prototype.executeAction = function(action, playerId) {
    // first make a player move and get his new position
    var playerPosition = this.players[playerId].position;
    var newPlayerPosition = this.newPosition(playerPosition, action);

    // check if new position is in stones
    if (newPlayerPosition in this.stones) {
        return false;
    }

    // check for new position in blocks
    if (newPlayerPosition in this.blocks) {
        // as the block can be moved we need to get new position of the block
        var newBlockPosition = this.newPosition(newPlayerPosition, action);

        // check that after moving the block we avoid the following states
        // of new block position:
        // * inside some other block
        // * inside stone
        // * inside player
        if (newBlockPosition in this.blocks ||
            newBlockPosition in this.stones ||
            this.inPlayer(newBlockPosition)) {
            return false;
        }

        // everything ok, save the new block position
        this.blocks[newBlockPosition] = newBlockPosition;

        // and delete previous block position
        delete this.blocks[newPlayerPosition];
    }

    // check for new position in opposite players
    else if (this.inPlayer(newPlayerPosition)) {
        // as the player can be moved we need to get new position of the player
        var newOppositePlayerPosition = this.newPosition(newPlayerPosition, action);

        // check that after moving the player we avoid the following states
        // of new player position:
        // * inside some other block
        // * inside stone
        // * inside player
        if (newOppositePlayerPosition in this.blocks ||
            newOppositePlayerPosition in this.stones ||
            this.inPlayer(newOppositePlayerPosition)) {
            return false;
        }

        // everything ok, save the new opposite player position
        var oppositePlayerId = this.getPlayerId(newPlayerPosition);
        this.players[oppositePlayerId].position = newOppositePlayerPosition;
    }

    // action is possible, set the new player position
    this.players[playerId].position = newPlayerPosition;

    return true;
};

/**
 * Check if game state on client side matches game state on server side and vice versa.
 * The function accepts only block and player position, because position of
 * stones and placeholders does not change.
 *
 * @param {} blocks The blocks position from either the client or server side.
 * @param {} players The players position from either the client or server side.
 * @returns {boolean} Returns true if game state is synchronized, otherwise false.
 */
Game.prototype.synchronized = function(blocks, players) {
    for (var block in this.blocks) {
        if (!(block in blocks)) {
            return false;
        }
    }

    for (var player in this.players) {
        if (!(this.players[player].position[0] === players[player].position[0] &&
            this.players[player].position[1] === players[player].position[1])) {
            return false;
        }
    }

    return true;
};

/**
 * Check if position matches any current player position.
 *
 * @param {number[]} position Position to match for.
 * @returns {boolean}
 */
Game.prototype.inPlayer = function(position) {
    for (var player in this.players) {
        if (this.players[player].position[0] === position[0] &&
                this.players[player].position[1] === position[1]) {
            return true;
        }
    }
    return false;
};

/**
 * Get the player id given the position.
 *
 * @param {number[]} position Position of the player.
 * @returns {number|undefined}
 */
Game.prototype.getPlayerId = function(position) {
    for (var player in this.players) {
        if (this.players[player].position[0] === position[0] &&
                this.players[player].position[1] === position[1]) {
            return this.players[player].id;
        }
    }
    return undefined;
};

/**
 * Compute new position for passed position and action.
 *
 * @param position
 * @param action
 * @returns {number[]}
 */
Game.prototype.newPosition = function(position, action) {
    return [position[0] + action[0], position[1] + action[1]];
};

// do not export if in browser
if (typeof module !== "undefined" && module.exports) {
    /** Game class to export. */
    module.exports = Game;
}