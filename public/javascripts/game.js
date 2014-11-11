/**
 * A class that represents game state. This class is inherited
 * by the server side game.
 */
var Game = function(stones, blocks, placeholders, players) {
    this.stones = stones;
    this.blocks = blocks;
    this.placeholders = placeholders;

    // we save the playerId(key):playerPosition(value)
    // and also playerPosition(key):playerId(value)
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
    var playerPosition = this.players[playerId];
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
            newBlockPosition in this.players) {
            return false;
        }

        // everything ok, save the new block position
        this.blocks[newBlockPosition] = newBlockPosition;

        // and delete previous position
        delete this.blocks[newPlayerPosition];
    }

    // check for new position in opposite players
    if (newPlayerPosition in this.players) {
        var newOppositePlayerPosition = this.newPosition(newPlayerPosition, action);

        // check that move of the player does not move
        // some other block, end up in stone or in some
        // other player
        if (newOppositePlayerPosition in this.blocks ||
            newOppositePlayerPosition in this.stones ||
            newOppositePlayerPosition in this.players) {
            return false;
        }

        // everything ok, save the new opposite player position
        var oppositePlayerId = this.players[newPlayerPosition];
        this.players[oppositePlayerId] = newOppositePlayerPosition;
        this.players[newOppositePlayerPosition] = oppositePlayerId;
    }

    // action is possible and does not move
    // any of the block
    this.players[playerId] = newPlayerPosition;
    this.players[newPlayerPosition] = playerId;
    delete this.players[playerPosition];

    return true;
};

// get new position for selected player and action
Game.prototype.newPosition = function(position, action) {
    return [position[0] + action[0], position[1] + action[1]];
};

// do not export if in browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game;
}