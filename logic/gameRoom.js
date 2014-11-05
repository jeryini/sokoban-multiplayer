/**
 * Created by Jernej on 5.11.2014.
 */
// TODO: Each game room will have at given point in time only one game, but
// TODO: at different times it will be able to have different games.

// a hash array that will hold games
// in progress for each room. Key is the id of the room.
var gameRooms = {};

var GameRoom = function(roomId, levelId, description, ownerId) {
    // id of the room
    this.roomId = roomId;

    // description of the room
    this.description = description;

    // id of the creator
    this.ownerId = ownerId;

    // create a new game
    // create a new game room, where room id is the unique
    // identifier
    // TODO: Creating new game server here or in gameServer script?
    gameServer = new GameServer();
    gameServer.gameImage = levels[levelId];
    gameRooms[roomId].createdAt = Date.now();
    gameRooms[roomId].setGameStateFromImage();
};