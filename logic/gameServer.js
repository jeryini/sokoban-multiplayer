var levels = require('../levels/levels');

// we need the game client class as it will be
// a prototype for our GameServer class
var Game = require('../public/javascripts/game');

// server side game object with additional fields
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
// TODO: Huge problem, ass all properties of Game are retained!
// TODO: The objects are shared!
GameServer.prototype = Object.create(Game.prototype);

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
GameServer.prototype.setGameStateFromImage = function(gameImage) {
    var gameState = {
        stones: {},
        blocks: {},
        placeholders: {},
        players: {},
        freePlayers: []
    };

    // set appropriate functions for given character
    var setFunction = {
        '.': function(position) {
            gameState.placeholders[position] = position;
        },
        '#': function(game, position) {
            gameState.stones[position] = position;
        },
        '$': function(game, position) {
            gameState.blocks[position] = position;
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
            gameState.players[playerId] = position;

            // to each position assign a player id
            gameState.players[position] = playerId;

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

// TODO: Check for wrapping in closure for hiding information!
module.exports = GameServer;
