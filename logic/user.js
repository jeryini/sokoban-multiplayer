// TODO: Get the user from DB, if it is in session.
var User = function(userId, socketId) {
    // if player is in session, then he exists in DB
//    if (session) {
//        this.playerId = session.playerId;
//        // set the player from DB
//        //this.player =
//    }
    this.userId = userId;
    this.socketID = socketId;
};

module.exports = User;