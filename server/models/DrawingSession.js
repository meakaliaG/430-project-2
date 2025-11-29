
/* This file defines our schema and model interface for drawing session data.
   Drawing sessions track when users join/leave rooms and their activity.
   Data to be used for analytics and user engagement tracking.
*/

const mongoose = require('mongoose');

let DrawingSessionSchema = new mongoose.Schema({
    room: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Room'
    },
    participant: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Account',
    },
    joinedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    leftAt: {
        type: Date,
        default: null,
    },
    contributionCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    sessionDuration: {
        type: Number,
        deafult: 0,
    },
});

// quick queries
DrawingSessionSchema.index({room: 1, paticipant: 1});
DrawingSessionSchema.index({paticipant: 1, joinedAt: -1});

// convert to API format
DrawingSessionSchema.statics.toAPI = (doc) => ({
    room: doc.room,
    participant: doc.participant,
    joinedAt: doc.joinedAt,
    contributionCount: doc.contributionCount,
    sessionDuration: doc.sessionDuration,
    _id: doc._id,
});

/**
 * Create new drawing session when user joins a room
 */
DrawingSessionSchema.statics.createSession = async (roomId, participantId) => {
    try {
        const session = new DrawingSessionModel({
            room: roomId,
            participant: participantId,
            joinedAt: Date.now(),
        });
        await session.save();
        return session;
    } catch (err) {
        throwErr;
    }
};

/**
 * End drawing session when user leaves room
 */
DrawingSessionSchema.statics.endSession = async (roomId, participantId) => {
    try {
        const session = await DrawingSessionModel.findOne({
            room: roomId,
            participant: participantId,
            leftAt: null,
        }).exec();
        if (session) {
            session.leftAt = Date.now();
            // duration in seconds
            session.sessionDuration = Math.floor((session.leftAt - session.joinedAt) / 1000);
            await session.save();
            return session;
        }
        return null;
    } catch (err) {
        throw err;
    }
};


