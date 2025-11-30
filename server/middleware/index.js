/**
 * Middlewarer functiions for authentication, authorization
 * and access control
 */

const models = require('../models');

const {Account, Room} = models;

/**
 * Require user to be logged in
 */
const requiresLogin = (req, res, next) => {
    if(!req.session.account) {
        return res.redirect('/');
    }
    return next();
};

/**
 * Require user to be logged out
 */
const requiresLogout = (req, res, next) => {
    if(req.session.account) {
        return res.redirect('/maker');
    }
    return next();
};

/**
 * Require HTTPS in production
 */
const requiresSecure = (req, res, next) => {
    if(req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }
    return next();
};

/**
 * Bypass HTTPS requirement in dev
 */
const bypassSecure = (req, res, next) => {
    next();
};

/**
 * Check if user has reached room creation limit
 * -- based on subscription tier
 */
const checkRoomLimit = async (req, res, next) => {

}

module.exports.requiresLogin = requiresLogin;
module.exports.requiresLogout = requiresLogout;

if(process.env.NODE_ENV === 'production') {
    module.exports.requiresSecure = requiresSecure;
} else {
    module.exports.requiresSecure = bypassSecure;
}