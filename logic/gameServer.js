/**
 * Created by Jernej on 17.10.2014.
 */
var Game = require('../public/javascripts/game');

var GameServer = function() {
    // image of the game state
    this.gameImage = [];

    // available players
    this.freePlayers = [];

    // data for each client
    this.clients = {};
};

// set the prototype to the main class
// this way we can access methods from Game
GameServer.prototype = new Game();

// special methods for GameServer
// execute action differs from the implementation
// on client side
Game.prototype.checkExecuteAction = function(action, playerId) {
    // first check if action is even possible
    if (!(action in this.actions)) {
        return false;
    }

    // get action from dictionary
    action = this.actions[action];

    // try to execute given action for user
    return this.executeAction(action, playerId);
};

// set the game state from image is only defined for server side.
// The following rules apply:
// numbers from 0 to n are player positions
// . are placeholders
// # are stones
// $ are blocks
// * are blocks on placeholder position
Game.prototype.setGameStateFromImage = function() {
    // set appropriate functions for given character
    var setFunction = {
        '.': function(game, position) {
            game.placeholders[position] = position;
        },
        '#': function(game, position) {
            game.stones[position] = position;
        },
        '$': function(game, position) {
            game.blocks[position] = position;
        },
        '*': function(game, position) {
            this['.'](game, position);
            this['$'](game, position);
        }
    };

    // game currently enables up to 9 different players
    for (var i = 0; i <= 9; i++) {
        setFunction[i] = function(game, position) {
            var playerId = game.gameImage[position[1]][position[0]];
            // to each player assign a position
            game.players[playerId] = position;

            // to each position assign a player id
            game.players[position] = playerId;

            // hold a list of available players
            game.freePlayers.push(playerId);
        }
    }

    // read image, first iterate over rows
    for (var y = 0; y < this.gameImage.length; y++) {
        // then over columns
        for (var x = 0; x < this.gameImage[y].length; x++) {
            // check if the function is defined for
            // given character
            if (this.gameImage[y][x] in setFunction) {
                setFunction[this.gameImage[y][x]](this, [x, y]);
            }
        }
    }
};

// TODO: Check for wraping in closure for hiding information!
module.exports = GameServer;
