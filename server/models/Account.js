/* This file defines our schema and model interface for the account data.

   We first import bcrypt and mongoose into the file. bcrypt is an industry
   standard tool for encrypting passwords. Mongoose is our tool for
   interacting with our mongo database.
*/
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

/* When generating a password hash, bcrypt (and most other password hash
   functions) use a "salt". The salt is simply extra data that gets hashed
   along with the password. The addition of the salt makes it more difficult
   for people to decrypt the passwords stored in our database. saltRounds
   essentially defines the number of times we will hash the password and salt.
*/
const saltRounds = 10;

let AccountModel = {};

/* Subscription tier limits configuration */
const TIER_LIMITS = {
  free: {
    maxRooms: 2,
    maxParticipants: 5,
    canvasPersistenceDays: 1,
  },
  pro: {
    maxRooms: 10,
    maxParticipants: 15,
    canvasPersistenceDays: 30,
  },
  // unlimited !!!
  enterprise: {
    maxRooms: -1,
    maxParticipants: -1,
    canvasPersistenceDays: -1, 
  },
};

/* Account schema defines the data stored. 
  username: string of alphanumeric characters
  email: string; lowercase
  password: the hashed version of the password created by bcrypt
  subscriptionTier: String from enum array
  roomsCreated: Number
  createdDate: Date
  lastLogin: Date
*/
const AccountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    match: /^[A-Za-z0-9_\-.]{1,16}$/,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    type: String,
    required: true,
  },
  subscriptionTier: {
    type: String,
    required: true,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  roomsCreated: {
    type: Number, 
    default: 0,
    min: 0,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
});

// Converts a doc to something we can store in redis later on.
AccountSchema.statics.toAPI = (doc) => ({
  username: doc.username,
  email: doc.email,
  subscriptionTier: doc.subscriptionTier,
  roomsCreated: doc.roomsCreated,
  _id: doc._id,
});

// Helper function to hash a password
AccountSchema.statics.generateHash = (password) => bcrypt.hash(password, saltRounds);

/* Helper function for authenticating a password against one already in the
   database. Essentially when a user logs in, we need to verify that the password
   they entered matches the one in the database. Since the database stores hashed
   passwords, we need to get the hash they have stored. We then pass the given password
   and hashed password to bcrypt's compare function. The compare function hashes the
   given password the same number of times as the stored password and compares the result.
*/
AccountSchema.statics.authenticate = async (username, password, callback) => {
  try {
    const doc = await AccountModel.findOne({username}).exec();
    if(!doc) {
      return callback();
    }

    const match = await bcrypt.compare(password, doc.password);
    if (match) {
      return callback(null, doc);
    }
    return callback();
  } catch (err) {
    return callback(err);
  }
};

AccountModel = mongoose.model('Account', AccountSchema);
module.exports = AccountModel;
