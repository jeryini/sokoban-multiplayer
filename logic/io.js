var GameRoom = require('./gameRoom').GameRoom;
var getGameRoom = require('./gameRoom').getGameRoom;
var deleteGameRoom = require('./gameRoom').deleteGameRoom;

// initialize socket without server arg!
var io = require('socket.io')();

/**
 * Represents a connection events for incoming socket.
 * It fires every time a new client connects.
 *
 * @event SocketIO#connection
 * @param socket
 */
io.on('connection', function(socket){
    /**************** Events from users ****************/
    // socket.io already assigns unique id to every socket
    console.log('a user connected with id: ' + socket.id);

    /**
     * Event from client for creating a room.
     *
     * @event SocketIO#createRoom
     * @param roomId, levelId, description, playerId
     */
    socket.on('createGameRoom', function(roomName, description, levelId, userId) {
        // create a new game room
        // also pass in socket id of the creator
        // TODO: Should this be asynchronous so that it does not block main
        // TODO: thread?
        var gameRoom = Object.create(GameRoom.prototype);
        GameRoom.call(gameRoom, roomName, levelId, description, userId, socket.id);

        // join the room on socket level
        socket.join(gameRoom.roomId);
        socket.roomId = gameRoom.roomId;

        // send starting state to the creator
        socket.emit('gameServerState', gameRoom.gameServerState(gameRoom.owner));

        // check if all players have joined, this is in case a game
        // is a 1 player game
        if (gameRoom.checkAllPlayersJoined()) {
            // send it to all players in given room, even to the sender
            io.sockets.in(socket.roomId).emit('gameEnabled', true);
        }

        // show the new room to all players, even the one
        // who created it
        io.sockets.emit('newGameRoom', {
            roomId: gameRoom.roomId,
            roomName: gameRoom.roomName,
            description: gameRoom.description,
            levelId: gameRoom.gameServer.levelId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length,
            allPlayers: Object.keys(gameRoom.gameServer.players).length
        });
    });

    /**
     * Event for joining a game room.
     */
    socket.on('joinGameRoom', function(roomId, userId) {
        // TODO: Check that game room was not deleted in mean time
        // first we need to get the game room from the passed id
        var gameRoom = getGameRoom(roomId);

        // join the game room, which also returns a new user
        var user = gameRoom.joinGameRoom(userId, socket.id);

        // join the room on socket level
        socket.join(roomId);
        socket.roomId = roomId;

        /**
         * Send starting state to user.
         */
        socket.emit('gameServerState', gameRoom.gameServerState(user));

        // check if all players have joined
        if (gameRoom.checkAllPlayersJoined()) {
            io.sockets.in(socket.roomId).emit('gameEnabled', true);
        }

        /**
         * Update the number of players in game.
         */
        io.sockets.emit('updatePlayersIn', {
            roomId: roomId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length
        });
    });

    /**
     * Event for executing a action, where action can be:
     * - up
     * - down
     * - left
     * - right
     *
     * We also get passed in a callback function from client.
     */
    socket.on('executeAction', function(action, blocks, players, fn) {
        console.log('action executed:', action, 'from user', socket.id);

        // first we need to get game room of the socket
        var gameRoom = getGameRoom(socket.roomId);

        // execute given action on server. If the action is
        // not executable it immediately returns current game state
        // on the server. It does not even go checking if game state
        // is synchronized as the action should be executable if client
        // send it to the server (it implicitly means that the state
        // does not match).
        var isExecuted = gameRoom.gameServer.checkExecuteAction(action, gameRoom.users[socket.id].player.id);
        if (!isExecuted) {
            fn({
                'synchronized': false,
                'blocks': gameRoom.gameServer.blocks,
                'players': gameRoom.gameServer.players
            });
            return false;
        }

        // now check if game state is synchronized
        if (gameRoom.gameServer.synchronized(blocks, players)) {
            fn({'synchronized': true});
        } else {
            fn({
                'synchronized': false,
                'blocks': gameRoom.gameServer.blocks,
                'players': gameRoom.gameServer.players
            });
        }
        // emit new move to all other players (broadcast)
        // for given room
        // we need to send player id and action to execute
        // for given player id
        socket.broadcast.to(socket.roomId).emit('newMove', action, gameRoom.gameServer.blocks,
            gameRoom.gameServer.players, gameRoom.users[socket.id].player.id);
    });

    // event when user disconnects
    socket.on('disconnect', function() {
        //if (socket.roomId != undefined) {
            // first we need to get game room of the socket
            var gameRoom = getGameRoom(socket.roomId);

            // transfer ownership of the game room if the disconnected
            // user is the owner of the game
            gameRoom.transferOwnership(socket.id);

            // if owner is still undefined, then there is no player left,
            // delete the room
            if (gameRoom.owner === undefined) {
                // TODO: On refresh it first gets the game rooms then the
                // TODO: disconnect event happens
                setTimeout(function() {
                    // TODO: Check if someone else took the ownership of the room
                    /*
                     The problem is, that when user is the only player in the game,
                     the transfer of ownership is not possible. So the game room has to be
                     destroyed on disconnect event, which can also happen on page refresh.
                     This means that the GET for index will be triggered, which will in turn
                     load the current game rooms. The problem is that this happens before the
                     disconnect event! I can see only two solutions. The first is delayed delete,
                     where other players can in the mean time take ownership of the game room with
                     joining the game. The second is better. Create a session (cookie) which will
                     store game rooms for the client. On reconnect take back the ownership of the
                     room, but before that check if somebody else got it there before. The timeout
                     before destroying the game room should be a few seconds.
                     */
                    deleteGameRoom(socket.roomId);
                    io.sockets.emit('deleteRoom', socket.roomId);
                }, 4000);

            } else {
                // free player from game
                gameRoom.gameServer.freePlayers.push(gameRoom.users[socket.id].player.playerId);

                // remove user from game room
                delete gameRoom.users[socket.id];

                // TODO: Broadcast user disconnect event.

                io.sockets.emit('updatePlayersIn', {
                    roomId: socket.roomId,
                    playersIn: Object.keys(gameRoom.gameServer.players).length -
                        gameRoom.gameServer.freePlayers.length
                });
            }
        //}
        console.log('user disconnected');
    });

    // event for restarting a game
    socket.on('restart', function(msg){
        // TODO: Fix restart!
        gameServer.blocks = {};
        gameServer.players = {};
        gameServer.setGameStateFromImage();

        // send message to everyone, including the sender
        io.emit('restart', gameServer.blocks, gameServer.players);
    });

    /**
     * A event handler for incoming message.We distinguish two
     * types of incoming messages, the first is to all users and
     * the second is to the users in current room.
     */
    socket.on('chatMessage', function(message) {
        // TODO: Implement logic for sending messages
        // TODO: only to the users in the same room.
        io.emit('chatMessage', message);
    });
});

module.exports = io;

