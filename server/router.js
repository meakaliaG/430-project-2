const controllers = require('./controllers');
const mid = require('./middleware');

const router = (app) => {
    
    // --- Account Routes ---
    app.get('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
    app.post('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.login);

    app.post('/signup', mid.requiresSecure, mid.requiresLogout, controllers.Account.signup);

    app.get('/logout', mid.requiresLogin, controllers.Account.logout);

    app.get('/change-password', mid.requiresLogin, controllers.Account.getAccount);
    app.post('/change-password', mid.requiresLogin, controllers.Account.changePassword);

    app.get('/account', mid.requiresLogin, controllers.Account.getAccount);
  
    // --- Room Routes ---
    app.get('/dashboard', mid.requiresLogin, controllers.Room.dashboardPage);

    // Room creation
    app.post('/rooms/create', mid.requiresLogin, mid.checkRoomLimit, controllers.Room.createRoom);
  
    // Room access
    app.get('/room/:code', mid.requiresLogin, controllers.Room.roomPage);
    app.get('/rooms/:code', mid.requiresLogin, controllers.Room.getRoom);
    app.post('/rooms/:code/join', mid.requiresLogin, mid.checkRoomCapacity, controllers.Room.joinRoom);
    app.post('/rooms/:code/leave', mid.requiresLogin, controllers.Room.leaveRoom);
  
    // Room canvas operations
    app.get('/rooms/:code/canvas', mid.requiresLogin, mid.requiresInRoom, controllers.Room.getRoomCanvas);
    app.post('/rooms/:code/canvas', mid.requiresLogin, mid.requiresInRoom, controllers.Room.saveRoomCanvas);
  
    // Room management (owner only)
    app.post('/rooms/:code/settings', mid.requiresLogin, mid.requiresOwner, controllers.Room.updateRoomSettings);
    app.delete('/rooms/:code', mid.requiresLogin, mid.requiresOwner, controllers.Room.deleteRoom);
  
    // --- API Routes ---
  
    // Room lists
    app.get('/api/rooms/my', mid.requiresLogin, controllers.API.getMyRooms);
    app.get('/api/rooms/public', mid.requiresLogin, controllers.API.getPublicRooms);

    // Participants
    app.get('/api/rooms/:code/participants', mid.requiresLogin, mid.requiresInRoom, controllers.API.getRoomParticipants);
    
    // Homepage (redirects to login or dashboard)
    app.get('/', mid.requiresSecure, (req, res) => {
      if (req.session.account) {
        return res.redirect('/dashboard');
      }
      return res.redirect('/login');
    });
};

module.exports = router;