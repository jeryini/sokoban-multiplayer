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

        // TODO: we should send to the creator a starting state

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
        // store the room in socket session
        // TODO: Do we need to store room id in socket?
        //socket.roomId = roomId;
        // first we need to get the game room from the passed id
        var gameRoom = getGameRoom(roomId);

        // join the client, which also returns a new player
        var player = gameRoom.joinGameRoom('Test', socket.id);

        // join the passed room
        socket.join(roomId);

        // send starting state to user
        socket.emit('gameServerState', {
            roomId: roomId,
            playerId: games[roomId].clients[socket.id].playerId,
            stones: games[roomId].stones,
            blocks: games[roomId].blocks,
            placeholders: games[roomId].placeholders,
            players: games[roomId].players
        });

        // update the number of players in game
        io.sockets.emit('update room', {
            roomId: roomId,
            playersIn: Object.keys(games[roomId].clients).length
        });
    });

    // event for executing a action, where action can be:
    // up, down, left, right
    // and a function to callback to client side
    socket.on('execute action', function(action, blocks, players, fn) {
        console.log('action executed:', action, 'from user', socket.id);

        // execute given action on server. If the action is
        // not executable it immediately returns current game state
        // on the server. It does not even go checking if game state
        // is synchronized as the action should be executable if client
        // send it to the server (it implicitly means that the state
        // does not match).
        var isExecuted = games[socket.roomId].checkExecuteAction(action, games[socket.roomId].clients[socket.id].playerId);
        if (!isExecuted) {
            fn({
                'synchronized': false,
                'blocks': games[socket.roomId].blocks,
                'players': games[socket.roomId].players
            });
            return false;
        }

        // now check if game state is synchronized
        if (games[socket.roomId].synchronized(blocks, players)) {
            fn({'synchronized': true});
        } else {
            fn({
                'synchronized': false,
                'blocks': games[socket.roomId].blocks,
                'players': games[socket.roomId].players
            });
        }
        // emit new move to all other players (broadcast)
        // for given room
        // we need to send player id and action to execute
        // for given player id
        socket.broadcast.to(socket.roomId).emit('new move', action, games[socket.roomId].blocks,
            games[socket.roomId].players, games[socket.roomId].clients[socket.id].playerId);
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

