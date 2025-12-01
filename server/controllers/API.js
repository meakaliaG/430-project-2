/**
 * API Controller - Handles API endpoints for detching data
 */
const models = require('../models');

const {Room, DrawingSession, Account} = models;

/**
 * Get all rooms created by current user
 */
const getMyRooms = async (req, res) => {
    try {
        const rooms = await Room.findByOwner(req.session.account._id);

        const roomsData = rooms.map((room) => Room.toAPI(room));

        return res.json({rooms: roomsData});
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: 'Error retrieving your rooms'});
    }
};

/* 
* Get all public rooms 
*/
const getPublicRooms = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const rooms = await Room.findPublicRooms(limit);
  
      const roomsData = rooms.map((room) => ({
        ...Room.toAPI(room),
        ownerUsername: room.owner.username,
      }));
  
      return res.json({ rooms: roomsData });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error retrieving public rooms.' });
    }
  };
  
  /* 
  * Get participants in a room 
  */
  const getRoomParticipants = async (req, res) => {
    const { code } = req.params;
  
    try {
      const room = await Room.findByCode(code);
  
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
  
      const userId = req.session.account._id;
  
      if (!room.hasParticipant(userId) && room.owner._id.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied. Must be in room.' });
      }
  
      const activeSessions = await DrawingSession.getActiveSessionsByRoom(room._id);
  
      const participants = activeSessions.map((session) => ({
        username: session.participant.username,
        userId: session.participant._id,
        joinedAt: session.joinedAt,
        contributionCount: session.contributionCount,
      }));
  
      return res.json({ participants });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error retrieving room participants.' });
    }
  };
  
  /* 
  * Search rooms by name or code 
  */
//   const searchRooms = async (req, res) => {
//     const { query } = req.query;
  
//     if (!query) {
//       return res.status(400).json({ error: 'Search query is required.' });
//     }
  
//     try {
//       const searchRegex = new RegExp(query, 'i'); // case-insensitive
  
//       const rooms = await Room.find({
//         isPublic: true,
//         isActive: true,
//         $or: [
//           { name: searchRegex },
//           { roomCode: query.toUpperCase() },
//         ],
//       })
//         .limit(20)
//         .populate('owner', 'username')
//         .exec();
  
//       const roomsData = rooms.map((room) => ({
//         ...Room.toAPI(room),
//         ownerUsername: room.owner.username,
//       }));
  
//       return res.json({ rooms: roomsData });
//     } catch (err) {
//       console.log(err);
//       return res.status(500).json({ error: 'Error searching rooms.' });
//     }
//   };
  
  module.exports = {
    getMyRooms,
    getPublicRooms,
    // getActiveSessions,
    // getUserStats,
    // getRoomStats,
    // getSessionHistory,
    getRoomParticipants,
    //searchRooms,
  };