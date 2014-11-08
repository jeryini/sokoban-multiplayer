// create socket for bidirectional communication
var socket = io();

// represents our current game
//var gameClient;

// object that represents game state
var GameClient = function(gameState) {
    // call the parent constructor game, to set the game state
    Game.call(this, gameState.stones, gameState.blocks,
        gameState.placeholders, gameState.players);

    // set other properties
    // set the game room
    this.roomId = gameState.roomId;

    // our player which the server assigned to us
    this.playerId = gameState.playerId;
};

// set parent class to Game
// TODO: problem with older browsers because of Object create
GameClient.prototype = Object.create(Game.prototype);

GameClient.prototype.drawGame = function() {
    $("#sokoban").empty();
    for (var i in this.stones) {
        $("#sokoban").append('<div class = "stone" style = "top:' + this.stones[i][1] * 32 + 'px;left:' + this.stones[i][0] * 32 + 'px"></div>');
    }
    for (var i in this.blocks) {
        $("#sokoban").append('<div id = "b' + this.blocks[i][0] + '_' + this.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + this.blocks[i][1] * 32 + 'px;left:' + this.blocks[i][0] * 32 + 'px"></div>');
    }
    for (var i in this.placeholders) {
        $("#sokoban").append('<div class = "placeholder" style = "top:' + this.placeholders[i][1] * 32 + 'px;left:' + this.placeholders[i][0] * 32 + 'px"></div>');
    }
    for (var i in this.players) {
        if (typeof this.players[i][1] !== "undefined")
            $("#sokoban").append('<div id ="p' + this.players[i][0] + '_' + this.players[i][1] + '" class = "player" style = "z-index:1000;top:' + this.players[i][1] * 32 + 'px;left:' + this.players[i][0] * 32 + 'px"></div>');
    }
};

GameClient.prototype.redrawGame = function() {
    // first delete all blocks and players
    $(".block").remove();
    $(".player").remove();

    // then redraw those two
    for (var i in this.blocks) {
        $("#sokoban").append('<div id = "b' + this.blocks[i][0] + '_' + this.blocks[i][1] + '" class = "block" style = "z-index:1000;top:' + this.blocks[i][1] * 32 + 'px;left:' + this.blocks[i][0] * 32 + 'px"></div>');
    }
    for (var i in this.players) {
        if (typeof this.players[i][1] !== "undefined")
            $("#sokoban").append('<div id ="p' + this.players[i][0] + '_' + this.players[i][1] + '" class = "player" style = "z-index:1000;top:' + this.players[i][1] * 32 + 'px;left:' + this.players[i][0] * 32 + 'px"></div>');
    }
};

GameClient.prototype.drawMove = function(action, playerId) {
    // first check for movement of other player
    // (if pushed by our player)
    $("#p" + this.players[playerId][0] + "_" +
        this.players[playerId][1]).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","p"+(this.players[playerId][0] + action[0]) +
        "_" + (this.players[playerId][1] + action[1]));

    // movement of our player
    $("#p" + (this.players[playerId][0] - action[0]) + "_" +
        (this.players[playerId][1] - action[1])).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","p"+this.players[playerId][0] +
        "_" + this.players[playerId][1]);

    // movement of block (if pushed by our player)
    $("#b" + this.players[playerId][0] + "_" +
        this.players[playerId][1]).animate({
        left: "+=" + (action[0] * 32),
        top: "+=" + (action[1] * 32)
    }, 100).attr("id","b"+(this.players[playerId][0] + action[0]) +
        "_" + (this.players[playerId][1] + action[1]));
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
    this.drawMove(action, this.playerId);

    /**
     * Emit action to server for a current room and register a callback
     * on message acknowledge with server replaying if this action is possible.
     * Server replies with true or false. When false it also returns the new state.
     */
    socket.emit('executeAction', actionName, this.blocks, this.players, function(response) {
        // check if state is synchronized (client state matches server state)
        if (!response.synchronized) {
            // set current state from the server state
            this.blocks = response.blocks;
            this.players = response.players;

            // redraw game state because state is not synchronized
            this.redrawGame();
        }
    });

    // check if solved
    if (this.solved()) {
        $('#messages').append($('<li>').text("SOLVED!"));
    }
};


