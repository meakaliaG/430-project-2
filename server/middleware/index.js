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

/**
 *  Require user to be participant in room 
 * */
const requiresInRoom = async (req, res, next) => {
    try {
      const { code } = req.params;
  
      if (!code) {
        return res.status(400).json({ error: 'Room code is required.' });
      }
  
      const room = await Room.findByCode(code);
  
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
  
      if (!room.isActive) {
        return res.status(410).json({ error: 'This room is no longer active.' });
      }
  
      const userId = req.session.account._id;
  
      // check if user is participant or owner
      if (!room.hasParticipant(userId) && room.owner.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied. Must be in room.' });
      }
  
      // attach room to request
      req.room = room;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error verifying room access.' });
    }
};
  
  /* 
  * Require user to be owner of room 
  */
  const requiresOwner = async (req, res, next) => {
    try {
      const { code } = req.params;
  
      if (!code) {
        return res.status(400).json({ error: 'Room code is required.' });
      }
  
      const room = await Room.findByCode(code);
  
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
  
      const userId = req.session.account._id;
  
      if (room.owner._id.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied. Must be room owner.' });
      }
  
      // attach room to request
      req.room = room;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error verifying room ownership.' });
    }
  };
  
/* 
* Check if room is at capacity before allowing join 
*/
const checkRoomCapacity = async (req, res, next) => {
try {
    const { code } = req.params;

    if (!code) {
    return res.status(400).json({ error: 'Room code is required.' });
    }

    const room = await Room.findByCode(code);

    if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
    }

    if (!room.isActive) {
    return res.status(410).json({ error: 'This room is no longer active.' });
    }

    const userId = req.session.account._id;

    if (room.hasParticipant(userId)) {
    req.room = room;
    return next();
    }

    if (room.isFull()) {
    return res.status(403).json({ error: 'Room is at maximum capacity.' });
    }

    // attach room to request
    req.room = room;
    return next();
} catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error checking room capacity.' });
}
};
  
module.exports.requiresLogin = requiresLogin;
module.exports.requiresLogout = requiresLogout;
module.exports.checkRoomLimit = checkRoomLimit;
module.exports.requiresInRoom = requiresInRoom;
module.exports.requiresOwner = requiresOwner;
module.exports.checkRoomCapacity = checkRoomCapacity;

if(process.env.NODE_ENV === 'production') {
    module.exports.requiresSecure = requiresSecure;
} else {
    module.exports.requiresSecure = bypassSecure;
}