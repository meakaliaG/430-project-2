/* This file defines our schema and model interface for room data.
   Rooms are collaborative spaces where users can draw, map together in
   real-time.
*/

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const saltRounds = 10;

let RoomModel = {};

/** 
 * Helper to generate a unique 6-character room code
 */
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i=0; i<6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/* Room schema defines the data stored per room. 
  roomCode: string of alphanumeric characters
  name: string
  description: string; max 200 char
  owner: Account id
  isPublic: boolean
  password: the hashed version of the password created by bcrypt
  maxParticipants: Number limit
  currentParticipants: array of Account objects
  createdDate: Date
  lastActivity: Date
  isActive: boolean
  canvasSaveData: string
*/
const RoomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        match: /^[A-Z0-9]{6}$/,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 50,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 200,
        default: '',
    },
    owner: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Account',
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    password: {
        type: String,
        default: null,
    },
    maxParticipants: {
        type: Number,
        required: true,
        min: 2,
        default: 5,
    },
    currentParticipants: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Account',
    }],
    createdDate: {
        type: Date,
        default: Date.now,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    canvasSaveData: {
        type: String,
        default: null,
    },
})

RoomSchema.statics.toAPI = (doc) => ({
    roomCode: doc.roomCode,
    name: doc.name,
    description: doc.description,
    owner: doc.owner,
    isPublic: doc.isPublic,
    hasPassword: !!doc.password,
    maxParticipants: doc.maxParticipants,
    currentParticipantsCount: doc.currentParticipants.length,
    currentParticipants: doc.currentParticipants,
    createdDate: doc.createdDate,
    lastActivity: doc.lastActivity,
    isActive: doc.isActive,
    _id: doc._id,
});

/** 
 * Generate a unique room code that doesn't already exist
 */
RoomSchema.statics.generateUniqueCode = async () => {
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
        code = generateRoomCode();
        const room = await RoomModel.findOne({roomCode: code}).exec();
        exists = !!room;
        attempts += 1;
    }

    if (exists) {
        throw new Error('Could not generate unique room code');
    }

    return code;
};

/** 
 * Hash a room password
 */
RoomSchema.statics.hashPassword = (password) => bcrypt.hash(password, saltRounds);

/** 
 * Verify a room password
 */
RoomSchema.methods.verifyPassword = async function verifyPassword(password) {
    if (!this.password) return true; //no password set
    return bcrypt.compare(password, this.password);
};

/**
 * Check room capacity
 */
RoomSchema.methods.isFull = function isFull() {
    return this.currentParticipants.length >= this.maxParticipants;
};

/**
 * Check if user is tracked in room
 */
RoomSchema.methods.hasParticipant = function hasParticipant(accountId) {
    return this.currentParticipants.some((id) => id.toString() === accountId.toString());
};

/**
 * Add participant to room
 */
RoomSchema.methods.addParticipant = async function addParticipant(accountId) {
    if (this.isFull()) {
        throw new Error('Room is at maximum capacity!');
    } 
    
    if (this.hasParticipant(accountId)) {
        return this;
    }

    this.currentParticipants.push(accountId);
    this.lastActivity = Date.now();
    return this.save();
};

/**
 * Remove participant from room
 */
RoomSchema.methods.removeParticipant = async function removeParticipant(accountId) {
    this.currentParticipants = this.currentParticipants.filter(
      (id) => id.toString() !== accountId.toString(),
    );
    this.lastActivity = Date.now();
    return this.save();
};

/** 
 * Update last activity time
 */
RoomSchema.methods.updateActivity = async function updateActivity() {
    this.lastActivity = Date.now();
    return this.save();
};

/**
 * Save canvas state
 */
RoomSchema.methods.saveCanvas = async function saveCanvas(canvasData) {
    this.canvasSaveData = canvasData;
    this.lastActivity = Date.now();
    return this.save();
};

/**
 * Retrieve rooms owned by a given account
 */
RoomSchema.statics.findByOwner = (ownerId) =>
    RoomModel.find({ owner: ownerId })
        .sort({ lastActivity: -1 })
        .exec();

/**
 * Retrieve all public active rooms 
 */
RoomSchema.statics.findPublicRooms = (limit = 50) =>
    RoomModel.find({ isPublic: true, isActive: true })
        .sort({ lastActivity: -1 })
        .limit(limit)
        .populate('owner', 'username')
        .exec();
  
  /**
   * Find room by code 
   */
  RoomSchema.statics.findByCode = (roomCode) =>
    RoomModel.findOne({ roomCode: roomCode.toUpperCase() })
        .populate('owner', 'username subscriptionTier')
        .exec();

  RoomModel = mongoose.model('Room', RoomSchema);
  module.exports = RoomModel;