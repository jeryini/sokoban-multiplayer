// when DOM is fully loaded define socket events
$(function() {
    /**
     * Socket event for creation of new game room
     *
     * @event SocketIO#newGameRoom
     * @param data Contains information about new game room.
     */
    socket.on('newGameRoom', function (data) {
        // remove the info about the no active game rooms
        $("#no-active-game-rooms").remove();

        $("#gameRooms").append('<div id="' + data.roomId + '" class="list-group-item"><h3 class="list-group-item-heading">' + data.roomName
            + '</h3><p class="list-group-item-text">' + data.description + '</p><p class="list-group-item-text">Chosen level: ' + data.levelId + '</p><p class="list-group-item-text">Players: <span id="players-in">' + data.playersIn + '</span>/' + data.allPlayers + '</p><button id="' + data.roomId + '" href="#modal-join-game-room" data-toggle="modal" class="btn btn-sm btn-info room">Join</button></div>');

        if (data.playersIn == data.allPlayers) {
            $('#' + data.roomId + ' button').prop('disabled', true);
        }
    });

    /**
     * On starting state receive current game state.
     *
     * @event SocketIO#gameServerState
     * @param gameState Contains new game state.
     */
    socket.on('gameServerState', function (gameState) {
        // create a new game client
        gameClient = Object.create(GameClient.prototype);
        GameClient.call(gameClient, gameState);

        // display game
        $('#game').removeClass('hidden');
        $("#messages").empty();

        // draw game from game state
        gameClient.drawGame();

        // add listener to redraw on window resize
        $(window).resize(function () {
            gameClient.drawGame();
        });

        // list players and their colors
        gameClient.listPlayers();

        // event handler for swipe events
        var hammer = new Hammer.Manager(document.getElementById('sokoban'));
        var swipe = new Hammer.Swipe({ velocity: 0.35});
        hammer.add(swipe);

        hammer.on('swipeleft', function () {
            gameClient.checkExecuteAction("LEFT");
        });
        hammer.on('swipeup', function () {
            gameClient.checkExecuteAction("UP");
        });
        hammer.on('swiperight', function () {
            gameClient.checkExecuteAction("RIGHT");
        });
        hammer.on('swipedown', function () {
            gameClient.checkExecuteAction("DOWN");
        });

        // prevent multiple binds
        $(document).unbind("keydown");

        // event handler for keyboard events
        $(document).keydown(function (event) {
            switch (event.keyCode) {
                // key press a
                case 65:
                    gameClient.checkExecuteAction("LEFT");
                    break;
                // key press w
                case 87:
                    gameClient.checkExecuteAction("UP");
                    break;
                // key press d
                case 68:
                    gameClient.checkExecuteAction("RIGHT");
                    break;
                // key press s
                case 83:
                    gameClient.checkExecuteAction("DOWN");
                    break;
            }
        });
    });

    /**
     * Update the number of players in game.
     *
     * @event SocketIO#updatePlayersIn
     * @param data Contains number of players in game.
     */
    socket.on('updatePlayersIn', function (data) {
        $("#" + data.roomId + " #players-in").text(data.playersIn);
        if (data.playersIn == data.allPlayers) {
            $('#' + data.roomId + ' button').prop('disabled', true);
        }
    });

    /**
     * When user joins call appropriate logic and list new players.
     *
     * @event SocketIO#userJoined
     * @param userId Id of the user that joined.
     * @param player Player that belongs to user that joined the game.
     */
    socket.on('userJoined', function (userId, player) {
        $('#messages').append($('<li>').append('User <span style="color: ' + player.color + '; font-weight: bold;">' + userId + '</span> has joined the game.'));
        gameClient.userJoin(userId, player);
        gameClient.listPlayers();
    });

    /**
     * When user lefts call appropriate logic and list players.
     *
     * @event SocketIO#userLeft
     * @param userId Id of the user that left.
     */
    socket.on('userLeft', function (userId) {
        $('#messages').append($('<li>').append('User <span style="color: ' + gameClient.users[userId].color + '; font-weight: bold;">' + userId + '</span> has left the game.'));
        gameClient.userLeft(userId);
        gameClient.listPlayers();
    });

    /**
     * Game restart.
     *
     * @event SocketIO#restart
     * @param blocks The blocks position.
     * @param players The position of the players.
     */
    socket.on('restart', function (blocks, players) {
        gameClient.blocks = blocks;
        gameClient.players = players;

        // redraw game
        gameClient.redrawGame();
    });

    /**
     * New move from the user. Here we need to check if after the execution
     * of the new move, the state on client side matches the state, that was
     * sent from the server.
     *
     * @event SocketIO#newMove
     * @param action Action that was executed.
     * @param blocks The new position of the blocks on server side.
     * @param players The new position of the players on server side.
     * @param playerId The id of the player, who executed the action.
     */
    socket.on('newMove', function (action, blocks, players, playerId) {
        // first we will try to execute given action on client
        var executed = gameClient.executeAction(gameClient.actions[action], playerId);

        // if action was executed successfully, then we also need to compare
        // game states
        if (executed) {
            if (gameClient.synchronized(blocks, players)) {
                // the game is synchronized. We need to only draw move of the player.
                action = gameClient.actions[action];

                // animate player movement for given action
                // and player id
                gameClient.drawMove(action, playerId);
            } else {
                // game is not synchronized, redraw the whole game
                gameClient.blocks = blocks;
                gameClient.players = players;
                gameClient.redrawGame();
            }
        } else {
            // otherwise if the action was not executed, it implicitly means
            // that the game state on client side does not match. we redraw the whole game
            gameClient.blocks = blocks;
            gameClient.players = players;
            gameClient.redrawGame();
        }
    });

    /**
     * Delete room.
     *
     * @event SocketIO#deleteRoom
     * @param roomId The id of the room to delete.
     */
    socket.on('deleteRoom', function (roomId) {
        $("#" + roomId).empty();
    });

    /**
     * Enable game.
     *
     * @event SocketIO#gameEnabled
     * @param {boolean} enabled Is game enabled
     */
    socket.on('gameEnabled', function (enabled) {
        gameClient.enabled = enabled;
    });

    /**
     * New chat message.
     *
     * @event SocketIO#chatMessage
     * @param data Contains message and the id of the user that send the message.
     */
    socket.on('chatMessage', function (data) {
        if (!data.userId) {
            $('#messages').append($('<li>').append('<span style="font-weight: bold;">SERVER:</span> ' + data.message));
        } else {
            $('#messages').append($('<li>').append('<span style="color: ' + gameClient.users[data.userId].color + '; font-weight: bold;">' + data.userId + ':</span> ' + data.message));
        }
    });

    /**
     * Submit new game room.
     *
     * @event submit
     */
    $('#game-room-create').submit(function (evn) {
        evn.preventDefault();

        if ($(this).parsley().isValid()) {
            // send a event to create new game room
            socket.emit('createGameRoom',
                $("#game-room-name").val(),
                $("#game-room-description").val(),
                $("#game-room-level").val(),
                $("#game-room-player-name").val()
            );
        }
    });

    /**
     * Restart the game.
     *
     * @event click
     */
    $('#restart').click(function () {
        socket.emit('restart');
    });

    /**
     * On modal show set the game room id from the clicked input.
     */
    $('#modal-join-game-room').on('show.bs.modal', function (e) {
        var gameRoomId = $(e.relatedTarget).attr("id");
        $(e.currentTarget).find('input[id="game-room-id"]').val(gameRoomId);
    });

    /**
     * Handle the submit for joining game room.
     */
    $('#game-room-join').submit(function (evn) {
        evn.preventDefault();

        if ($(this).parsley().isValid()) {
            // join the selected room
            socket.emit('joinGameRoom', $("#game-room-id").val(), $("#player-name").val());
            $('#modal-join-game-room').modal('hide');
        }
    });

    /**
     * Handle submit of new message.
     */
    $('#form-message').submit(function () {
        socket.emit('chatMessage', $('#message').val());
        $('#message').val('');
        return false;
    });

    /**
     * Handle restart of the game.
     */
    $('#restart-game').click(function() {
        socket.emit('restart');
    });

    /**
     * Prevent key down when writing a message. This prevents
     * player movement, if user presses one of the wasd keys.
     */
    $('#message').keydown(function(e) {
        e.stopPropagation();
    });
});