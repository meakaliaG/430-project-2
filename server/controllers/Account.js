/**
 * Account Controller - Handles user authentication, registration,
 * password management, and subscription upgrades
 */
const models = require('../models');
const { Account } = models;

/**
 * Render login page
 */
const loginPage = (req, res) => {
    return res.render('login');
};

/**
 * Render password change page
 */
const passwordChangePage = (req, res) => {
    res.render('changePassword');
};

/**
 * Handle user logout - destroys session and redirects to login
 */
const logout = (req, res) => {
    req.session.destroy();
    return res.redirect('/');
};

/**
 * Authenticate user login credentials
 */
const login = (req, res) => {
    const username = `${req.body.username}`;
    const pass = `${req.body.pass}`;

    if(!username || !pass) {
        return res.status(400).json({error: 'All fields required.'});
    }

    return Account.authenticate(username, pass, (err, account) => {
        if(err || !account) {
            return res.status(401).json({error: 'Wrong username or password.'});
        }

        req.session.account = Account.toAPI(account);

        return res.json({redirect: '/dashboard'});
    });
};

/**
 * Create new user account
 */
const signup = async (req, res) => {
    const username = `${req.body.username}`;
    const email = `${req.body.email}`;
    const pass = `${req.body.pass}`;
    const pass2 = `${req.body.pass2}`;

    if (!username || !email || !pass || !pass2) {
        return res.status(400).json({error: 'All fields are required!'});
    }
    if (pass !== pass2) {
        return res.status(400).json({error: 'Passwords do not match!'});
    }

    // email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({error: 'Invalid email address'});
    }

    try {
        const hash = await Account.generateHash(pass);
        const newAccount = new Account({
            username,
            email,
            password: hash,
            subscriptionTier: 'free',
        });
        await newAccount.save();
        req.session.account = Account.toAPI(newAccount);
        return res.json({redirect: '/dashboard'});
    } catch (err) {
        console.log(err);
        if(err.code === 11000) {
            // determine which field triggered duplicate key error
            if (err.keyPattern && err.keyPattern.email) {
                return res.status(400).json({error: 'Email already in use!'});
            }
            return res.status(400).json({error: 'Username already in use!'});
        }
        return res.status(500).json({error: 'An error occured.'});
    }
};

/**
 * Change user password
 */
const changePassword = async (req, res) => {
    const currentPass = `${req.body.currentPass}`;
    const newPass = `${req.body.newPass}`;
    const newPass2 = `${req.body.newPass2}`;

    if (!currentPass || !newPass || !newPass2) {
        return res.status(400).json({error: 'All fields are required'});
    }

    if (newPass !== newPass2) {
        return res.status(400).json({error: 'New passwords do not match'});
    }

    if (newPass.length < 8) {
        return res.status(400).json({error: 'Password must be at least 8 characters'});
    }

    try {
        const result = await Account.changePassword(
            req.session.account._id,
            currentPass,
            newPass,
        );

        if (result.error) {
            return res.status(400).json({error: result.error});
        }

        return res.json({message: 'Password changed successfully'});
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: 'An error occurred changing password'});
    }
};

/**
 * Get account information 
 * */
const getAccount = async (req, res) => {
    try {
      const account = await Account.findById(req.session.account._id)
        .select('username email subscriptionTier roomsCreated createdDate lastLogin')
        .lean()
        .exec();
  
      if (!account) {
        return res.status(404).json({ error: 'Account not found.' });
      }
  
      // Get tier limits
      const limits = Account.getTierLimits(account.subscriptionTier);
  
      return res.json({
        account: {
          ...account,
          limits,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error retrieving account information.' });
    }
};

/* 
* Upgrade subscription tier (no actual payment processing) 
*/
const upgradeSubscription = async (req, res) => {
    const { tier } = req.body;
  
    if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier.' });
    }
  
    try {
      const result = await Account.upgradeSubscription(req.session.account._id, tier);
  
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
  
      req.session.account = result.account;
  
      return res.json({
        message: `Successfully upgraded to ${tier} tier!`,
        account: result.account,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'An error occurred upgrading subscription.' });
    }
};

module.exports = {
    loginPage,
    login,
    logout,
    signup,
    getAccount,
    changePassword,
    passwordChangePage,
    upgradeSubscription,
    
};