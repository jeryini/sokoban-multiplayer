/** @module io */
var GameRoom = require('./gameRoom').GameRoom;
var getGameRoom = require('./gameRoom').getGameRoom;
var deleteGameRoom = require('./gameRoom').deleteGameRoom;
var levels = require('../levels/levels');

// initialize socket without server arg!
var io = require('socket.io')();

/**
 * Represents a connection events for incoming socket.
 * It fires every time a new client connects.
 *
 * @event SocketIO#connection
 * @param socket Socket of the connected user.
 */
io.on('connection', function(socket){
    /**************** Events from users ****************/
    // socket.io already assigns unique id to every socket
    console.log('a user connected with id: ' + socket.id);

    /**
     * Event from client for creating a new game room.
     *
     * @event SocketIO#createGameRoom
     * @param {string} roomName The name of the new game room.
     * @param {string} description The description of the game room.
     * @param {number} levelId The id of the level.
     * @param {string} playerId The player id/name.
     */
    socket.on('createGameRoom', function(roomName, description, levelId, userId) {
        // create a new game room
        var gameRoom = Object.create(GameRoom.prototype);
        GameRoom.call(gameRoom, roomName, levelId, description, userId, socket.id);

        // check if user is already a member of room
        if (socket.roomId) {
            var joinedGameRoom = getGameRoom(socket.roomId);
            // call logic for handling user removal
            joinedGameRoom.removeUserFromGame(socket, io);
            socket.leave(socket.roomId);
        }

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
     *
     * @event SocketIO#joinGameRoom
     * @param {string} roomId The UUID of the game room.
     * @param {number} userId The id of the user who wants to join.
     */
    socket.on('joinGameRoom', function(roomId, userId) {
        // first we need to get the game room from the passed id
        var gameRoom = getGameRoom(roomId);

        // check that game room exists, it is possible that game room
        // gets deleted in mean time
        if (!gameRoom) {
            return false;
        }

        // check if game room is already full
        if (gameRoom.gameServer.freePlayers.length == 0) {
            return false;
        }

        // join the game room, which also returns a new user
        var user = gameRoom.joinGameRoom(userId, socket.id);

        // check if user is already a member of room
        if (socket.roomId) {
            var joinedGameRoom = getGameRoom(socket.roomId);
            // call logic for handling user removal
            joinedGameRoom.removeUserFromGame(socket, io);
            socket.leave(socket.roomId);
        }

        // join the room on socket level
        socket.join(roomId);
        socket.roomId = roomId;

        // send starting state to the user.
        socket.emit('gameServerState', gameRoom.gameServerState(user));

        // broadcast to other users the new user
        socket.broadcast.to(socket.roomId).emit('userJoined', user.id, user.player);

        // check if all players have joined
        if (gameRoom.checkAllPlayersJoined()) {
            // broadcast that game is enabled to all players
            io.sockets.in(socket.roomId).emit('gameEnabled', true);
        }

        // update the number of players in game.
        io.sockets.emit('updatePlayersIn', {
            roomId: roomId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length,
            allPlayers: Object.keys(gameRoom.gameServer.players).length
        });
    });

    /**
     * Event for executing a action, where action can be:
     * - UP
     * - DOWN
     * - LEFT
     * - RIGHT
     * Now when the user executes action, the game rules are first check on client side.
     * If everything is OK according to game rules, the action is immediately executed on client side.
     * Only then is executed action sent to the server to check against game rules on server side and
     * to check if game state is synchronized. The big difference is, that the user does not wait for
     * a response from server to execute action, but only checks for acknowledge of the action for
     * possible undo of the executed action. This means that for a fraction of the time, the client
     * side is small step ahead of the server side. This idea was taken from the following two sources:
     * http://gafferongames.com/networking-for-game-programmers/what-every-programmer-needs-to-know-about-game-networking/
     * https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
     *
     * @event SocketIO#executeAction
     * @param {string} actionName One of the four possible actions.
     * @param {} blocks Current block position on the client side of the user, that executed a new action.
     * @param {} players Current players position on the client side of the user.
     * @param {} fn The callback function to call on the client side.
     */
    socket.on('executeAction', function(actionName, blocks, players, fn) {
        console.log('action executed:', actionName, 'from user', socket.id);

        // first we need to get game room of the socket
        var gameRoom = getGameRoom(socket.roomId);

        if (!gameRoom) {
            return false;
        }

        // Execute given action on server. If the action is
        // not executable it immediately returns current game state
        // on the server. It does not even go checking if game state
        // is synchronized as the action should be executable if client
        // send it to the server (it implicitly means that the game state
        // on the client side does not match with game state on the server side).
        var isExecuted = gameRoom.gameServer.checkExecuteAction(actionName, gameRoom.users[socket.id].player.id);
        if (!isExecuted) {
            // callback on the client side with new game state, i.e. with player
            // positions and blocks position
            fn({
                'synchronized': false,
                'blocks': gameRoom.gameServer.blocks,
                'players': gameRoom.gameServer.players
            });
            return false;
        }

        // the client action is executable, but now we need to check if game
        // state is synchronized
        if (gameRoom.gameServer.synchronized(blocks, players)) {
            fn({'synchronized': true});
        } else {
            // the game state on client side does not match with game state on
            // server side. Send client new state.
            fn({
                'synchronized': false,
                'blocks': gameRoom.gameServer.blocks,
                'players': gameRoom.gameServer.players
            });
        }

        // check if solved
        if (gameRoom.gameServer.solved()) {
            io.sockets.in(socket.roomId).emit('chatMessage', {message: "SOLVED!"});
        }

        // emit new move to all other players (broadcast) for given room.
        // We need to send player id and action to execute for given player id.
        // We also send new game state, to check on client side of the users, if
        // their game state matches after executing the received action.
        socket.broadcast.to(socket.roomId).emit('newMove', actionName, gameRoom.gameServer.blocks,
            gameRoom.gameServer.players, gameRoom.users[socket.id].player.id);
    });

    /**
     * Event when user disconnects.
     *
     * @event SocketIO#disconnect
     */
    socket.on('disconnect', function() {
        if (!socket.roomId) {
            console.log('user without being connected to game room disconnected');
            return false;
        }
        // check if user belongs to game room
        var gameRoom = getGameRoom(socket.roomId);

        if (!gameRoom) {
            return false;
        }

        // call logic for handling user removal
        gameRoom.removeUserFromGame(socket, io);
        socket.leave(socket.roomId);

        console.log('user with game room disconnected');
    });

    /**
     * Event for restarting a game server.
     *
     * @event SocketIO#restart
     */
    socket.on('restart', function(){
        var gameRoom = getGameRoom(socket.roomId);

        if (!gameRoom) {
            return false;
        }

        // set them to empty
        gameRoom.gameServer.blocks = {};
        gameRoom.gameServer.players = {};

        // reread starting game state
        var gameState = gameRoom.gameServer.setGameStateFromImage(levels[gameRoom.gameServer.levelId]);

        gameRoom.gameServer.blocks = gameState.blocks;
        gameRoom.gameServer.players = gameState.players;

        // send message to everyone in the game room, including the sender
        io.sockets.in(socket.roomId).emit('restart', gameRoom.gameServer.blocks, gameRoom.gameServer.players);
    });

    /**
     * A event handler for incoming message in the game room.
     *
     * @event SocketIO#restart
     */
    socket.on('chatMessage', function(message) {
        var gameRoom = getGameRoom(socket.roomId);
        if (gameRoom) {
            // send message to all users in the game room
            io.sockets.in(socket.roomId).emit('chatMessage', {message: message, userId: gameRoom.users[socket.id].id});
        }
    });
});

/** Export io. */
module.exports = io;