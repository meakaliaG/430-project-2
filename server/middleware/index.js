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
    try {
        const account = await Account.findById(req.session.account._id).exec();

        if (!account) {
            return res.status(404).json({error: 'Account not found.'});
        }

        if (!account.canCreateRoom()) {
            const limits = Account.getTierLimits(account.subscriptionTier);
            return res.status(403).json({
                error: `Room limit reached. ${account.subscriptionTier} tier allows a max of ${limits.maxRooms} rooms.`,
                upgradeRequired: true,
            });
        }

        req.account = account;
        return next();
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: 'Error checking room limit'});
    }
};



module.exports.requiresLogin = requiresLogin;
module.exports.requiresLogout = requiresLogout;
module.exports.checkRoomLimit = checkRoomLimit;


if(process.env.NODE_ENV === 'production') {
    module.exports.requiresSecure = requiresSecure;
} else {
    module.exports.requiresSecure = bypassSecure;
}