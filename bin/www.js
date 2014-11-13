#!/usr/bin/env node
var debug = require('debug')('Sokoban-multiplayer');
var app = require('../app');
var io = require('../logic/io');

// port on which to listen
app.set('port', process.env.port || 3000);

// listen for connections
var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port, server.address.ip);
});

// attach socket io
io.attach(server);