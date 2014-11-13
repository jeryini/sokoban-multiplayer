/**
 * Socket event for creation of new game room
 */
socket.on('newGameRoom', function (data) {
    // TODO: How to replace hard coded HTML code?
    $("#gameRooms").append('<div id="' + data.roomId + '" class="list-group-item"><h2 class="list-group-item-heading">' + data.roomName
        + '</h4><p class="list-group-item-text">' + data.description + '</p><p class="list-group-item-text">Chosen level: ' + data.levelId + '</p><p class="list-group-item-text">Players: <span id="playersIn">' + data.playersIn + '</span>/' + data.allPlayers + '</p><a id="' + data.roomId + '" class="btn btn-sm btn-info room">Join</a></div>');
});

/**
 * On starting state receive current game state.
 */
socket.on('gameServerState', function(gameState) {
    // create a new game client
    // TODO: Use Object.create instead of new!
    // TODO: IE9 and less does not support this!
    gameClient = new GameClient(gameState);

    // when DOM is fully loaded draw the game state
    $(document).ready(function() {
        // TODO: disable join for returned room
        //$("#" + gameState.roomId + " a")

        // draw game from game state
        gameClient.drawGame();

        // list players and their colors
        gameClient.listPlayers(gameState.users, gameState.players);

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
    $("#" + data.roomId + " #players-in").text(data.playersIn);
});

socket.on('restart', function (blocks, players) {
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

socket.on('deleteRoom', function (roomId) {
    $("#" + roomId).empty();
});

/**
 *
 */
socket.on('gameEnabled', function (enabled) {
    gameClient.enabled = enabled;
});

socket.on('chatMessage', function(message){
    $('#messages').append($('<li>').text(message));
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

/**
 * On modal show set the game room id from the clicked input.
 */
$('#modal-join-game-room').on('show.bs.modal', function(e) {
    var gameRoomId = $(e.relatedTarget).attr("id");
    $(e.currentTarget).find('input[id="game-room-id"]').val(gameRoomId);
});

/**
 * Handle button click for joining game room.
 */
//$('#gameRooms').on("click", "a", function() {
$('#confirm-join-game-room').on("click", function() {
    // join the selected room
    socket.emit('joinGameRoom', $("#game-room-id").val(), $("#player-name").val());
    $('#modal-join-game-room').modal('hide')
});

$('#form-message').submit(function(){
    socket.emit('chatMessage', $('#message').val());
    $('#message').val('');
    return false;
});

