// create socket for bidirectional communication
var socket = io();

// represents our current game
var gameClient;

// computed multiplier according to user screen
var multiplier;

/**
 * Creates a new instance of class that represents game state on client side.
 * Calls the parent constructor of Game class to set the game state.
 *
 * @class This class inherits from the Game class.
 *
 * @property {} gameState The state of the game.
 */
var GameClient = function(gameState) {
    // call the parent constructor game, to set the game state
    Game.call(this, gameState.stones, gameState.blocks,
        gameState.placeholders, gameState.players);

    // set the game room
    this.roomId = gameState.roomId;

    // our player which the server assigned to us
    this.player = gameState.player;

    // users
    this.users = gameState.users;
};

// set parent class to Game
GameClient.prototype = Object.create(Game.prototype);

// set the "constructor" property to refer to the GameClient
GameClient.prototype.constructor = GameClient;

/**
 * Draw game on user screen.
 */
GameClient.prototype.drawGame = function() {
    // in order to find correct multiplier we need the max user screen size in height and width
    var size = $("#game-display").width() > $(window).height() ? $(window).height() : $("#game-display").width();

    // and the max number of rows or columns of stones
    var max = 0;
    for (var i in this.stones) {
        if (this.stones[i][0] > max) {
            max = this.stones[i][0];
        }
        if (this.stones[i][1] > max) {
            max = this.stones[i][1];
        }
    }

    // set the multiplier of size based on user screen size
    multiplier = (size / max) * 0.9;

    // empty current game state
    $("#sokoban").empty();

    // set new height and width
    $('#sokoban').css({
        height: size + 'px',
        width: size + 'px',
        'max-height':'100%'
    });

    // draw stones
    for (var i in this.stones) {
        $("#sokoban").append('<div class = "stone" style = "top:' + this.stones[i][1] * multiplier + 'px;left:' + this.stones[i][0] * multiplier + 'px"></div>');
    }

    // draw blocks
    for (var i in this.blocks) {
        $("#sokoban").append('<div id = "b' + this.blocks[i][0] + '_' + this.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + this.blocks[i][1] * multiplier + 'px;left:' + this.blocks[i][0] * multiplier + 'px"></div>');
    }

    // draw placeholders
    for (var i in this.placeholders) {
        $("#sokoban").append('<div class = "placeholder" style = "top:' + this.placeholders[i][1] * multiplier + 'px;left:' + this.placeholders[i][0] * multiplier + 'px"></div>');
    }

    // draw players
    for (var player in this.players) {
        $("#sokoban").append('<div id ="p' + this.players[player].position[0] + '_' + this.players[player].position[1] + '" class = "player" style = "z-index:1000;border-color: ' + this.players[player].color + ';top:' + this.players[player].position[1] * multiplier + 'px;left:' + this.players[player].position[0] * multiplier + 'px"></div>');
    }

    // set sizes of each element according to multiplier
    $('.stone, .placeholder, .block, .player').css({
        height: multiplier + 'px',
        width: multiplier + 'px'
    });
};

/**
 * Redraw game state. We only need to draw blocks and players again.
 */
GameClient.prototype.redrawGame = function() {
    // first delete all blocks and players
    $(".block").remove();
    $(".player").remove();

    // then redraw those two
    for (var i in this.blocks) {
        console.log('<div id = "b' + this.blocks[i][0] + '_' + this.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + this.blocks[i][1] * multiplier + 'px;left:' + this.blocks[i][0] * multiplier + 'px"></div>');
        $("#sokoban").append('<div id = "b' + this.blocks[i][0] + '_' + this.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + this.blocks[i][1] * multiplier + 'px;left:' + this.blocks[i][0] * multiplier + 'px"></div>');

    }
    for (var player in this.players) {
        $("#sokoban").append('<div id ="p' + this.players[player].position[0] + '_' + this.players[player].position[1] + '" class = "player" style = "z-index:1000;border-color: ' + this.players[player].color + ';top:' + this.players[player].position[1] * multiplier + 'px;left:' + this.players[player].position[0] * multiplier + 'px"></div>');
    }

    // set sizes of each element according to multiplier
    $('.block, .player').css({
        height: multiplier + 'px',
        width: multiplier + 'px'
    });
};

/**
 * Draw move of the player. Some of this code is based one:
 * http://www.emanueleferonato.com/2010/06/14/creation-of-a-sokoban-game-with-jquery/
 *
 * @param {string} action Action to draw
 * @param {number} playerId For which player to draw the action
 */
GameClient.prototype.drawMove = function(action, playerId) {
    // first check for movement of other player
    // (if pushed by our player)
    $("#p" + this.players[playerId].position[0] + "_" +
        this.players[playerId].position[1]).animate({
        left: "+=" + (action[0] * multiplier),
        top: "+=" + (action[1] * multiplier)
    }, 100).attr("id","p"+(this.players[playerId].position[0] + action[0]) +
        "_" + (this.players[playerId].position[1] + action[1]));

    // movement of our player
    $("#p" + (this.players[playerId].position[0] - action[0]) + "_" +
        (this.players[playerId].position[1] - action[1])).animate({
        left: "+=" + (action[0] * multiplier),
        top: "+=" + (action[1] * multiplier)
    }, 100).attr("id","p"+this.players[playerId].position[0] +
        "_" + this.players[playerId].position[1]);

    // movement of block (if pushed by our player)
    $("#b" + this.players[playerId].position[0] + "_" +
        this.players[playerId].position[1]).animate({
        left: "+=" + (action[0] * multiplier),
        top: "+=" + (action[1] * multiplier)
    }, 100).attr("id","b"+(this.players[playerId].position[0] + action[0]) +
        "_" + (this.players[playerId].position[1] + action[1]));
};

/**
 * List all players and their player colors.
 */
GameClient.prototype.listPlayers = function() {
    // first remove current listing
    $("#players").empty();
    $("#players").append('<ul class="list-unstyled">');

    // draw all users
    for (var userId in this.users) {
        $("#players ul").append('<li><span class="glyphicon glyphicon-user btn-lg" aria-hidden="true" style="color: ' + this.users[userId].color + '"> ' + userId + '</span></li>');
    }
};

/**
 * Add user to the game state.
 *
 * @param {string} userId The user id/name.
 * @param {Player} player The player which is assigned to the user.
 */
GameClient.prototype.userJoin = function(userId, player) {
    this.users[userId] = player;
};

/**
 * Remove user from the game state.
 *
 * @param {string} userId The user id/name.
 */
GameClient.prototype.userLeft = function(userId) {
    delete this.users[userId];
};

/**
 * Execute given action.
 *
 * @param {string} actionName Name of the action
 */
GameClient.prototype.checkExecuteAction = function(actionName) {
    // check if playing is enabled
    if (!this.enabled) {
        $('#messages').append($('<li>').append('<span style="font-weight: bold;">SERVER:</span> Please wait for all players to join!'));
        return false;
    }

    // execute action on client side. If the passed action
    // is possible then it executes the action (changes
    // game state) and returns true. Only if action is executable
    // go check on server for acknowledgment.
    if (!(this.executeAction(this.actions[actionName], this.player.id))) {
        return false;
    }

    // first draw our move on client
    this.drawMove(this.actions[actionName], this.player.id);
    var gameClient = this;
    /**
     * Emit action to server for a current room and register a callback
     * on message acknowledge with server replaying if this action is possible.
     * Server replies with true or false. When false it also returns the new state as
     * this implicitly means that the state between client and server is synchronized.
     */
    socket.emit('executeAction', actionName, this.blocks, this.players, function(response) {
        // check if state is synchronized (client state matches server state)
        if (!response.synchronized) {
            // set current state from the server state
            gameClient.blocks = response.blocks;
            gameClient.players = response.players;

            // redraw game state because state is not synchronized
            gameClient.redrawGame();
        }
    });
};