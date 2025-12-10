/**
 * API Controller - Handles API endpoints for detching data
 */
const models = require('../models');

const { Room } = models;

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

  /**
   * Get active sessions for current user
   */
  
  /* 
  * Get participants in a room 
  */
  const getRoomParticipants = async (req, res) => {
    const { code } = req.params;
  
    try {
      const room = await Room.findOne({ roomCode: code.toUpperCase() })
        .populate('currentParticipants', 'username')
        .populate('owner', 'username')
        .exec();
  
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
  
      const userId = req.session.account._id.toString();
  
      // Verify user is in room or is owner
      const isParticipant = room.currentParticipants.some(
        (p) => p._id.toString() === userId
      );
      const isOwner = room.owner._id.toString() === userId;
  
      if (!isParticipant && !isOwner) {
        return res.status(403).json({ error: 'Access denied. Must be in room.' });
      }
  
      // Format participant data
      const participantsData = room.currentParticipants.map((participant) => ({
        username: participant.username,
        userId: participant._id,
        contributionCount: 0, // Simplified - no tracking
      }));
  
      return res.json({ participants: participantsData });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error retrieving room participants.' });
    }
};
  
module.exports = {
  getMyRooms,
  getPublicRooms,
  getRoomParticipants,
};