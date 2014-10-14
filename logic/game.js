/**
 * Created by Jernej on 14.10.2014.
 */
// object that represents game state
var Game = function() {
    // this properties will be filled on game creation
    this.stones = {};
    this.blocks = {};
    this.placeholders = {};
    this.players = {};
};

// define a possible actions for all game objects
// this is common for every created game
Game.prototype.actions = {
    "up": [0, 1],
    "down": [0, -1],
    "left": [1, 0],
    "right": [0, 1]
};

// check in game is solved
Game.prototype.solved = function() {
    for (var key in this.blocks) {
        if (!(key in this.placeholders))
            return false;
    }
    return true;
};

// execute given action
Game.prototype.execute = function(action) {
    // first select action from possible actions
    if (action in this.actions) {
        action = this.actions[action];
        // TODO: execute action
    } else {
        // TODO: return false to user
    }
};

// for given action check again game rules
Game.prototype.checkAction = function(action) {
    // TODO: Implement logic for checking
}