#!/usr/bin/env node
var debug = require('debug')('Sokoban-multiplayer');
var app = require('../app');
var GameServer = require('../logic/gameServer');
var levels = require('../levels/levels');

// port on which to listen
app.set('port', process.env.PORT || 3000);

// listen for connections
var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port, server.address.ip);
});

// initialize socket
var io = require('socket.io')(server);

// create a hash array that will hold games
// in progress for each room. Key is the id of the room.
var games = {};

// listen on connection events for incoming socket
// this fires every time new client connects
io.on('connection', function(socket){
    // socket.io already assigns unique id to every socket
    console.log('a user connected with id: ' + socket.id);

    // event for creating a room
    socket.on('create', function(roomId, levelId, playerName) {
        // create a new game
        games[roomId] = new GameServer();
        games[roomId].gameImage = levels[levelId];
        games[roomId].createdAt = Date.now();
        games[roomId].setGameStateFromImage();

        // show the new room to all players, even the one
        // who created it
        io.sockets.emit('new room', {
            roomId: roomId,
            levelId: levelId,
            createdAt: games[roomId].createdAt
        });
    });

    // event for joining a room
    socket.on('join', function(roomId) {
        // store the room in socket session
        socket.roomId = roomId;

        games[roomId] = new GameServer();
        games[roomId].gameImage = levels[2];
        games[roomId].createdAt = Date.now();
        games[roomId].setGameStateFromImage();

        // add client information to game server state
        games[roomId].clients[socket.id] = {
            socket: socket,
            // assign one of the available players
            playerId: games[roomId].freePlayers.pop()
        };

        // join the passed room
        socket.join(roomId);

        // send game object to user
        socket.emit('starting state', {
            roomId: roomId,
            playerId: games[roomId].clients[socket.id].playerId,
            stones: games[roomId].stones,
            blocks: games[roomId].blocks,
            placeholders: games[roomId].placeholders,
            players: games[roomId].players
        });
    });

    // event execute action, where action can be:
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

    // on disconnect remove user
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

    socket.on('chat message', function(msg){
        console.log('message: ' + msg);

        // send message to everyone, including the sender
        io.emit('chat message', msg);
    });

    socket.on('restart', function(msg){
        gameServer.blocks = {};
        gameServer.players = {};
        gameServer.setGameStateFromImage();

        // send message to everyone, including the sender
        io.emit('restart', gameServer.blocks, gameServer.players);
    });
});

module.exports = games;
