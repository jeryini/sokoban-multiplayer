var Game = require('../public/javascripts/game');
var Player = require('./player');
var levels = require('../levels/levels');

/**
 * Server side game class with additional fields.
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

    // save the chosen level
    this.levelId = levelId;
};

// set the prototype to the main class
// this way we can inherit properties from Game
GameServer.prototype = Object.create(Game.prototype);

/**
 * Execute action differs from the implementation on the client side.
 *
 * @param action
 * @param playerId
 * @returns {*}
 */
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


/**
 * Check if game state matches
 */
GameServer.prototype.synchronized = function(blocks, players) {
    for (var key in this.blocks) {
        if (!(key in blocks))
            return false;
    }

    // TODO: Test this! We broke the synchronization!
    for (var key in this.players) {
        if (!(players[key].position == this.players[key].position)) {
            return false;
        }
    }
    return true;
};

//
//
// numbers from 0 to n are player positions

/**
 * Set the game state from image is only defined for server side.
 * The following rules apply:
 * . are placeholders
 * # are stones
 * $ are blocks
 * * are blocks on placeholder position
 *
 * @param gameImage
 * @returns {{stones: {}, blocks: {}, placeholders: {}, players: {}, freePlayers: Array}}
 */
GameServer.prototype.setGameStateFromImage = function(gameImage) {
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
            var playerId = gameImage[position[1]][position[0]];

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
    for (var y = 0; y < gameImage.length; y++) {
        // then over columns
        for (var x = 0; x < gameImage[y].length; x++) {
            // check if the function is defined for
            // given character
            if (gameImage[y][x] in setFunction) {
                setFunction[gameImage[y][x]]([x, y]);
            }
        }
    }

    // return the game state read from image
    return gameState;
};

module.exports = GameServer;
