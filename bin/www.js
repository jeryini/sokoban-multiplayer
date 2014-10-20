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

// create new game
var gameServer = new GameServer();
gameServer.gameImage = levels[2];
gameServer.setGameStateFromImage();


// listen on connection events for incoming socket
// this fires every time new client connects
io.on('connection', function(socket){
    // socket.io already assigns unique id to every socket
    console.log('a user connected with id: ' + socket.id);

    // add client information to game server state
    gameServer.clients[socket.id] = {
        socket: socket,
        // assign one of the available players
        playerId: gameServer.freePlayers.pop()
    };

    // send game object to user
    socket.emit('starting state', {
        playerId: gameServer.clients[socket.id].playerId,
        stones: gameServer.stones,
        blocks: gameServer.blocks,
        placeholders: gameServer.placeholders,
        players: gameServer.players
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
        var isExecuted = gameServer.checkExecuteAction(action, gameServer.clients[socket.id].playerId);
        if (!isExecuted) {
            fn({
                'synchronized': false,
                'blocks': gameServer.blocks,
                'players': gameServer.players
            });
            return false;
        }

        // now check if game state is synchronized
        if (gameServer.synchronized(blocks, players)) {
            fn({'synchronized': true});
        } else {
            fn({
                'synchronized': false,
                'blocks': gameServer.blocks,
                'players': gameServer.players
            });
        }
        // emit new move to all other players (broadcast)
        // we need to send player id and action to execute
        // for given player id
        socket.broadcast.emit('new move', action, gameServer.blocks,
            gameServer.players, gameServer.clients[socket.id].playerId);
    });

    // on disconnect remove user
    socket.on('disconnect', function(){
        gameServer.freePlayers.push(gameServer.clients[socket.id].playerId);
        delete gameServer.clients[socket.id];

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
