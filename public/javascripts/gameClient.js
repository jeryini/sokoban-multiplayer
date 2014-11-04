// create socket for bidirectional communication
var socket = io();
var game;

// object that represents game state
var GameClient = function() {};

// set parent class to Game
GameClient.prototype = new Game();

GameClient.prototype.drawGame = function() {
    $("#sokoban").empty();
    for (var i in game.stones) {
        $("#sokoban").append('<div class = "stone" style = "top:' + game.stones[i][1] * 32 + 'px;left:' + game.stones[i][0] * 32 + 'px"></div>');
    }
    for (var i in game.blocks) {
        $("#sokoban").append('<div id = "b' + game.blocks[i][0] + '_' + game.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + game.blocks[i][1] * 32 + 'px;left:' + game.blocks[i][0] * 32 + 'px"></div>');
    }
    for (var i in game.placeholders) {
        $("#sokoban").append('<div class = "placeholder" style = "top:' + game.placeholders[i][1] * 32 + 'px;left:' + game.placeholders[i][0] * 32 + 'px"></div>');
    }
    for (var i in game.players) {
        if (typeof game.players[i][1] !== "undefined")
            $("#sokoban").append('<div id ="p' + game.players[i][0] + '_' + game.players[i][1] + '" class = "player" style = "z-index:1000;top:' + game.players[i][1] * 32 + 'px;left:' + game.players[i][0] * 32 + 'px"></div>');
    }
};

GameClient.prototype.redrawGame = function() {
    // first delete all blocks and players
    $(".block").remove();
    $(".player").remove();

    // then redraw those two
    for (var i in game.blocks) {
        $("#sokoban").append('<div id = "b' + game.blocks[i][0] + '_' + game.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + game.blocks[i][1] * 32 + 'px;left:' + game.blocks[i][0] * 32 + 'px"></div>');
    }
    for (var i in game.players) {
        if (typeof game.players[i][1] !== "undefined")
            $("#sokoban").append('<div id ="p' + game.players[i][0] + '_' + game.players[i][1] + '" class = "player" style = "z-index:1000;top:' + game.players[i][1] * 32 + 'px;left:' + game.players[i][0] * 32 + 'px"></div>');
    }
};

GameClient.prototype.drawMove = function(action, playerId) {
    // first check for movement of other player
    // (if pushed by our player)
    $("#p" + game.players[playerId][0] + "_" +
        game.players[playerId][1]).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","p"+(game.players[playerId][0] + action[0]) +
        "_" + (game.players[playerId][1] + action[1]));

    // movement of our player
    $("#p" + (game.players[playerId][0] - action[0]) + "_" +
        (game.players[playerId][1] - action[1])).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","p"+game.players[playerId][0] +
        "_" + game.players[playerId][1]);

    // movement of block (if pushed by our player)
    $("#b" + game.players[playerId][0] + "_" +
        game.players[playerId][1]).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","b"+(game.players[playerId][0] + action[0]) +
        "_" + (game.players[playerId][1] + action[1]));
};

// execute given action from the given player id
GameClient.prototype.checkExecuteAction = function(action) {
    var actionName = action;

    // first check if action is even possible
    if (!(action in this.actions)) {
        return false;
    }
    // get action from dictionary
    action = this.actions[action];

    // execute action on client side. If the passed action
    // is possible then it executes the action (changes
    // game state) and returns true. Only if action is executable
    // go check on server for acknowledgment.
    if (!(this.executeAction(action, this.playerId))) {
        return false;
    }

    // first draw our move on client
    game.drawMove(action, game.playerId);

    // emit action to server for a current room and register a callback
    // on message acknowledge with server replaying
    // if this action is possible. Server replies with true
    // or false. When false it also returns the new state.
    socket.emit('execute action', actionName, this.blocks, this.players, function(response) {
        // check if state is synchronized (client state matches server state)
        if (!response.synchronized) {
            // set current state from the server state
            game.blocks = response.blocks;
            game.players = response.players;

            // redraw game state because state is not synchronized
            game.redrawGame();
        }
    });

    // check if solved
    if (game.solved()) {
        $('#messages').append($('<li>').text("SOLVED!"));
    }
};


