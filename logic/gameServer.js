/** @module gameServer */
var Game = require('../public/javascripts/game');
var Player = require('./player');
var levels = require('../levels/levels');

/**
 * Creates a new instance of class that represents game state on server side.
 * Calls the parent constructor of Game class to set the game state.
 *
 * @class This class inherits from the Game class.
 *
 * @property {number} levelId Level of the game.
 */
var GameServer = function(levelId) {
    this.createdAt = Date.now();

    // set the game state from image
    var gameState = this.setGameStateFromImage(levels[levelId]);

    // call the parent constructor game, to set the game state
    Game.call(this, gameState.stones, gameState.blocks,
        gameState.placeholders, gameState.players);

    // free players
    this.freePlayers = gameState.freePlayers;
    this.levelId = levelId;
};

// create a GameServer.prototype that inherits from Game.prototype
GameServer.prototype = Object.create(Game.prototype);

// set the "constructor" property to refer to the GameServer
GameServer.prototype.constructor = GameServer;

/**
 * Check for execution of given action.
 *
 * @param {string} actionName The name of the action to execute.
 * @param {number} playerId The id of the player.
 * @returns {boolean} If the action was successfully executed for a given player.
 */
GameServer.prototype.checkExecuteAction = function(actionName, playerId) {
    // first check if action is even possible as we cannot trust the user :)
    if (!(actionName in this.actions)) {
        return false;
    }

    // execute action for given user
    return this.executeAction(this.actions[actionName], playerId);
};

/**
 * Set the game state from image.
 * The following rules apply:
 * . are placeholders
 * # are stones
 * $ are blocks
 * * are blocks on placeholder position
 * numbers from 0 to n are player positions
 *
 * @param {string[]} levelImage Level represented as image.
 * @returns {{stones: {}, blocks: {}, placeholders: {}, players: {}, freePlayers: Array}}
 */
GameServer.prototype.setGameStateFromImage = function(levelImage) {
    var gameState = {
        stones: {},
        blocks: {},
        placeholders: {},
        players: {},
        freePlayers: []
    };

    // 10 different colors for players
    var colors = ["#00008B", "#8B0000", "#006400", "#000000", "#FF8C00", "#9400D3",
        "#00CED1", "#556B2F", "#B8860B", "#A9A9A9"];

    // set appropriate functions for given character
    var setFunction = {
        '.': function(position) {
            gameState.placeholders[position] = position;
        },
        '#': function(position) {
            gameState.stones[position] = position;
        },
        '$': function(position) {
            gameState.blocks[position] = position;
        },
        '*': function(position) {
            this['.'](position);
            this['$'](position);
        }
    };

    // game currently enables up to 9 different players
    for (var i = 0; i <= 9; i++) {
        setFunction[i] = function(position) {
            var playerId = levelImage[position[1]][position[0]];

            // create a new player
            var player = Object.create(Player.prototype);

            // call a constructor on the new player
            Player.call(player, playerId, position, colors[playerId]);

            // assign a player to id
            gameState.players[playerId] = player;

            // hold a list of available players
            gameState.freePlayers.push(playerId);
        }
    }

    // read image, first iterate over rows
    for (var y = 0; y < levelImage.length; y++) {
        // then over columns
        for (var x = 0; x < levelImage[y].length; x++) {
            // check if the function is defined for
            // given character
            if (levelImage[y][x] in setFunction) {
                setFunction[levelImage[y][x]]([x, y]);
            }
        }
    }

    // return the game state read from image
    return gameState;
};

/** GameServer class to export. */
module.exports = GameServer;
