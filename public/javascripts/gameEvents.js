// when DOM is fully loaded define socket events
$(function() {
    /**
     * Socket event for creation of new game room
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
     */
    socket.on('gameServerState', function (gameState) {
        // create a new game client
        // TODO: Use Object.create instead of new!
        // TODO: IE9 and less does not support this!
        gameClient = new GameClient(gameState);

        // TODO: disable join for returned room
        //$("#" + gameState.roomId + " a")
        // display game information
        $('#game').removeClass('hidden');

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
        var swipe = new Hammer.Swipe();
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

        // event handler for keyboard events
        // TODO: Disable if typing message!!!
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
     */
    socket.on('updatePlayersIn', function (data) {
        $("#" + data.roomId + " #players-in").text(data.playersIn);
        if (data.playersIn == data.allPlayers) {
            $('#' + data.roomId + ' button').prop('disabled', true);
        }
    });

    socket.on('userJoined', function (userId, player) {
        $('#messages').append($('<li>').append('User <span style="color: ' + player.color + '; font-weight: bold;">' + userId + '</span> has joined the game.'));
        gameClient.userJoin(userId, player);
        gameClient.listPlayers();
    });

    socket.on('userLeft', function (userId) {
        $('#messages').append($('<li>').append('User <span style="color: ' + gameClient.users[userId].color + '; font-weight: bold;">' + userId + '</span> has left the game.'));
        gameClient.userLeft(userId);
        gameClient.listPlayers();
    });

    socket.on('restart', function (blocks, players) {
        gameClient.blocks = blocks;
        gameClient.players = players;

        // redraw game
        gameClient.drawGame();
    });

    socket.on('newMove', function (action, blocks, players, playerId) {
        // TODO: First try to execute given action and compare game states
        // TODO: If they do not match with state sent from server, then
        // TODO: completely redraw the game state, otherwise draw only the
        // TODO: selected move
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

    socket.on('chatMessage', function (data) {
        $('#messages').append($('<li>').append('<span style="color: ' + gameClient.users[data.userId].color + '; font-weight: bold;">' + data.userId + ':</span> ' + data.message));
    });

    // handle submit of new game room
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

// restart the game
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

    $('#form-message').submit(function () {
        socket.emit('chatMessage', $('#message').val());
        $('#message').val('');
        return false;
    });
});

