// socket event for creation of new game room
socket.on('newGameRoom', function (data) {
    // TODO: How to replace hard coded HTML code?
    $("#gameRooms").append('<div id="' + data.roomId + '" class="list-group-item"><h4 class="list-group-item-heading">' + data.roomId
        + '</h4><p class="list-group-item-text">' + data.description + '</p><p class="list-group-item-text">Chosen level: ' + data.levelId + '</p><p class="list-group-item-text">Players: <span id="playersIn">' + data.playersIn + '</span>/' + data.allPlayers + '</p><a id="' + data.roomId + '" class="btn btn-sm btn-info room">Join</a></div>');
});

// on starting state receive current game state
socket.on('gameServerState', function(gameState) {
    // create a new game client
    game = new GameClient();

    // set the game room
    game.roomId = gameState.roomId;

    // our player which the server assigned to us
    game.playerId = gameState.playerId;

    // state of the game
    game.stones = gameState.stones;
    game.blocks = gameState.blocks;
    game.placeholders = gameState.placeholders;
    game.players = gameState.players;

    // when DOM is fully loaded draw game state
    $(document).ready(function() {
        // draw game from game state
        game.drawGame();

        // event handler for keyboard events
        $(document).keydown(function (event) {
            switch (event.keyCode) {
                // key press a
                case 65:
                    game.checkExecuteAction("left", game.playerId);
                    break;
                // key press w
                case 87:
                    game.checkExecuteAction("up", game.playerId);
                    break;
                // key press d
                case 68:
                    game.checkExecuteAction("right", game.playerId);
                    break;
                // key press s
                case 83:
                    game.checkExecuteAction("down", game.playerId);
                    break;
            }
        });
    });
});

socket.on('restart', function (blocks, players) { // TIP: you can avoid listening on `connect` and listen on events directly too!
    game.blocks = blocks;
    game.players = players;

    // redraw game
    game.drawGame();
});

socket.on('new move', function (action, blocks, players, playerId) {
    game.blocks = blocks;
    game.players = players;
    action = game.actions[action];

    // animate player movement for given action
    // and player id
    game.drawMove(action, playerId);
});



socket.on('update room', function (room) {
    $("#" + room.roomId + " #playersIn").text(room.playersIn);
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
$('#rooms').on("click", "a", function() {
    // join the selected room
    socket.emit('join', this.id);
});

