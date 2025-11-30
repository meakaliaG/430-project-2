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

    app.get('/', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
};

module.exports = router;