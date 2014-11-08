/**
 * Socket event for creation of new game room
 */
socket.on('newGameRoom', function (data) {
    // TODO: How to replace hard coded HTML code?
    $("#gameRooms").append('<div id="' + data.roomId + '" class="list-group-item"><h4 class="list-group-item-heading">' + data.roomId
        + '</h4><p class="list-group-item-text">' + data.description + '</p><p class="list-group-item-text">Chosen level: ' + data.levelId + '</p><p class="list-group-item-text">Players: <span id="playersIn">' + data.playersIn + '</span>/' + data.allPlayers + '</p><a id="' + data.roomId + '" class="btn btn-sm btn-info room">Join</a></div>');
});

/**
 * On starting state receive current game state.
 */
socket.on('gameServerState', function(gameState) {
    // create a new game client
    var gameClient = new GameClient(gameState);

    // when DOM is fully loaded draw the game state
    $(document).ready(function() {
        // draw game from game state
        gameClient.drawGame();

        // event handler for keyboard events
        $(document).keydown(function (event) {
            switch (event.keyCode) {
                // key press a
                case 65:
                    gameClient.checkExecuteAction("left");
                    break;
                // key press w
                case 87:
                    gameClient.checkExecuteAction("up");
                    break;
                // key press d
                case 68:
                    gameClient.checkExecuteAction("right");
                    break;
                // key press s
                case 83:
                    gameClient.checkExecuteAction("down");
                    break;
            }
        });
    });
});

/**
 * Update the number of players in game.
 */
socket.on('updatePlayersIn', function (data) {
    $("#" + data.roomId + " #playersIn").text(data.playersIn);
});

socket.on('restart', function (blocks, players) { // TIP: you can avoid listening on `connect` and listen on events directly too!
    gameClient.blocks = blocks;
    gameClient.players = players;

    // redraw game
    gameClient.drawGame();
});

socket.on('newMove', function (action, blocks, players, playerId) {
    gameClient.blocks = blocks;
    gameClient.players = players;
    action = gameClient.actions[action];

    // animate player movement for given action
    // and player id
    gameClient.drawMove(action, playerId);
});

// handle button click for creating game room
$('#create-game-room').click(function() {
    // send a event to create new game room
    socket.emit('createGameRoom',
        $("#game-room-name").val(),
        $("#game-room-description").val(),
        $("#game-server-level").val(),
        $("#player-name").val()
    );
});

// restart the game
$('#restart').click(function(){
    socket.emit('restart');
});

// handle button click for joining game room
$('#gameRooms').on("click", "a", function() {
    // join the selected room
    socket.emit('joinGameRoom', this.id);
});

