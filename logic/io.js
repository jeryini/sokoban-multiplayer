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

        // check that game room exists
        if (!gameRoom) {
            // inform user that the game room does not exist
            io.to(socket.id).emit('chatMessage', "The selected game room does not exist anymore!");
            return false;
        }

        // check if game room is already full
        if (gameRoom.gameServer.freePlayers.length == 0) {
            return false;
        }

        // join the game room, which also returns a new user
        var user = gameRoom.joinGameRoom(userId, socket.id);

        // join the room on socket level
        socket.join(roomId);
        socket.roomId = roomId;

        /**
         * Send starting state to user.
         */
        socket.emit('gameServerState', gameRoom.gameServerState(user));

        // broadcast to other users the new user
        socket.broadcast.to(socket.roomId).emit('userJoined', user.id, user.player);

        // check if all players have joined
        if (gameRoom.checkAllPlayersJoined()) {
            // broadcast that game is enabled to all players
            io.sockets.in(socket.roomId).emit('gameEnabled', true);
        }

        /**
         * Update the number of players in game.
         */
        io.sockets.emit('updatePlayersIn', {
            roomId: roomId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length,
            allPlayers: Object.keys(gameRoom.gameServer.players).length
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
        // TODO: Check why is it sometimes executed twice?
        // TODO: It seems that it is being executed twice for the user
        // TODO: that connects first?
        console.log('action executed:', action, 'from user', socket.id);

        // first we need to get game room of the socket
        var gameRoom = getGameRoom(socket.roomId);

        // TODO: Check if game room exists.

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
        // check if user belongs to game room
        var gameRoom = getGameRoom(socket.roomId);

        if (!gameRoom) {
            console.log('user without game room disconnected');
            return;
        }

        // get the user that is disconnecting
        var userId = gameRoom.users[socket.id].id;

        // transfer ownership of the game room if the disconnected
        // user is the owner of the game
        gameRoom.transferOwnership(socket.id);

        // if owner is still undefined, then there is no player left,
        // delete the room
        if (gameRoom.owner === undefined) {
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
                // TODO: See about using HTML5 Web Storage API for client side state handling!
                if (gameRoom.owner === undefined) {
                    deleteGameRoom(socket.roomId);
                    io.sockets.emit('deleteRoom', socket.roomId);
                }
            }, 20000);
        }
        // free player from game
        gameRoom.gameServer.freePlayers.push(gameRoom.users[socket.id].player.id);

        // remove user from game room
        delete gameRoom.users[socket.id];

        io.sockets.emit('updatePlayersIn', {
            roomId: socket.roomId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length
        });

        socket.broadcast.to(socket.roomId).emit('userLeft', userId);
        console.log('user with game room disconnected');
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
        var gameRoom = getGameRoom(socket.roomId);
        if (gameRoom) {
            io.sockets.in(socket.roomId).emit('chatMessage', {message: message, userId: gameRoom.users[socket.id].id});
        }
    });
});

module.exports = io;

