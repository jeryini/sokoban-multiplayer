var GameRoom = require('./gameRoom').GameRoom;
var getGameRoom = require('./gameRoom').getGameRoom;

// initialize socket without server arg!
var io = require('socket.io')();

// listen on connection events for incoming socket
// this fires every time new client connects
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
    socket.on('createGameRoom', function(roomId, description, levelId, userId) {
        // create a new game room
        // also pass in socket id of the creator
        var gameRoom = new GameRoom(roomId, levelId, description, userId, socket.id);

        // join the room on socket level
        socket.join(roomId);
        socket.roomId = roomId;

        // send starting state to the creator
        socket.emit('gameServerState', {
            roomId: roomId,
            playerId: gameRoom.owner.playerId,
            stones: gameRoom.gameServer.stones,
            blocks: gameRoom.gameServer.blocks,
            placeholders: gameRoom.gameServer.placeholders,
            players: gameRoom.gameServer.players
        });

        // show the new room to all players, even the one
        // who created it
        io.sockets.emit('newGameRoom', {
            roomId: roomId,
            levelId: gameRoom.gameServer.levelId,
            playersIn: Object.keys(gameRoom.gameServer.players).length -
                gameRoom.gameServer.freePlayers.length,
            allPlayers: Object.keys(gameRoom.gameServer.players).length
        });
    });

    /**
     * Event for joining a game room.
     */
    socket.on('joinGameRoom', function(roomId) {
        // first we need to get the game room from the passed id
        var gameRoom = getGameRoom(roomId);

        // join the client, which also returns a new player
        var player = gameRoom.joinGameRoom('Test', socket.id);

        // join the room on socket level
        socket.join(roomId);
        socket.roomId = roomId;

        /**
         * Send starting state to user.
         */
        socket.emit('gameServerState', {
            roomId: roomId,
            playerId: player.playerId,
            stones: gameRoom.gameServer.stones,
            blocks: gameRoom.gameServer.blocks,
            placeholders: gameRoom.gameServer.placeholders,
            players: gameRoom.gameServer.players
        });

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
        var isExecuted = gameRoom.gameServer.checkExecuteAction(action, gameRoom.clients[socket.id].playerId);
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
            gameRoom.gameServer.players, gameRoom.clients[socket.id].playerId);
    });

    // event when user disconnects
    socket.on('disconnect', function() {
        // free player from the current game
        for (var roomId in socket.rooms) {
            if (roomId != socket.id) {
                games[roomId].freePlayers.push(gameServer.clients[socket.id].playerId);
                delete games[roomId].clients[socket.id];
            }
        }

        console.log('user disconnected');
    });

    // event for restarting a game
    socket.on('restart', function(msg){
        gameServer.blocks = {};
        gameServer.players = {};
        gameServer.setGameStateFromImage();

        // send message to everyone, including the sender
        io.emit('restart', gameServer.blocks, gameServer.players);
    });
});

module.exports = io;

