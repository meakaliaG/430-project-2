/* Room Controller - Handles room creation, management, and access control */
const models = require('../models');

const { Room, Account } = models;

/* 
* Render the dashboard page 
*/
const dashboardPage = (req, res) => res.render('dashboard');

/* 
* Render the room page 
*/
const roomPage = (req, res) => res.render('room');

/* 
* Create a new room 
*/
const createRoom = async (req, res) => {
  const { name, description, isPublic, password } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Room name is required.' });
  }

  try {
    const account = await Account.findById(req.session.account._id).exec();

    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // check user limits
    if (!account.canCreateRoom()) {
      const limits = Account.getTierLimits(account.subscriptionTier);
      return res.status(403).json({
        error: `Room limit reached. ${account.subscriptionTier} tier allows ${limits.maxRooms} rooms.`,
        upgradeRequired: true,
      });
    }

    const roomCode = await Room.generateUniqueCode();

    let hashedPassword = null;
    if (password && password.trim() !== '') {
      hashedPassword = await Room.hashPassword(password);
    }

    const maxParticipants = account.getMaxParticipants();

    const newRoom = new Room({
      roomCode,
      name: name.trim(),
      description: description ? description.trim() : '',
      owner: account._id,
      isPublic: isPublic !== false, // Default to true
      password: hashedPassword,
      maxParticipants,
    });

    await newRoom.save();

    await account.incrementRoomCount();

    // update session with new room count
    req.session.account.roomsCreated = account.roomsCreated;

    return res.status(201).json({
      message: 'Room created successfully!',
      room: Room.toAPI(newRoom),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'An error occurred creating the room.' });
  }
};

/* 
* Get room by code 
*/
const getRoom = async (req, res) => {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({ error: 'Room code is required.' });
  }

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: 'This room is no longer active.' });
    }

    const userId = req.session.account._id;
    const isOwner = room.owner._id.toString() === userId.toString();
    const isParticipant = room.hasParticipant(userId);

    return res.json({
      room: Room.toAPI(room),
      isOwner,
      isParticipant,
      ownerUsername: room.owner.username,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error retrieving room.' });
  }
};

/* 
* Join a room 
*/
const joinRoom = async (req, res) => {
  const { code } = req.params;
  const { password } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Room code is required.' });
  }

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: 'This room is no longer active.' });
    }

    const userId = req.session.account._id;

    if (room.hasParticipant(userId)) {
      return res.json({
        message: 'Already in room.',
        room: Room.toAPI(room),
      });
    }

    if (room.isFull()) {
      return res.status(403).json({ error: 'Room is at maximum capacity.' });
    }

    // validate password if required
    if (room.password) {
      if (!password) {
        return res.status(401).json({ error: 'Password required.', passwordRequired: true });
      }

      const passwordMatch = await room.verifyPassword(password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    }

    await room.addParticipant(userId);

    return res.json({
      message: 'Joined room successfully!',
      room: Room.toAPI(room),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'An error occurred joining the room.' });
  }
};

/* 
* Leave a room 
*/
const leaveRoom = async (req, res) => {
  const { code } = req.params;

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const userId = req.session.account._id;

    await room.removeParticipant(userId);

    return res.json({ message: 'Left room successfully.' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'An error occurred leaving the room.' });
  }
};

/* 
* Get room canvas data 
*/
const getRoomCanvas = async (req, res) => {
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

    return res.json({
      canvasData: room.canvasSaveData,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error retrieving canvas data.' });
  }
};

/* 
* Save room canvas data 
*/
const saveRoomCanvas = async (req, res) => {
  const { code } = req.params;
  const { canvasData } = req.body;

  if (!canvasData) {
    return res.status(400).json({ error: 'Canvas data is required.' });
  }

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const userId = req.session.account._id;

    if (!room.hasParticipant(userId)) {
      return res.status(403).json({ error: 'Access denied. Must be in room.' });
    }

    await room.saveCanvas(canvasData);

    return res.json({ message: 'Canvas saved successfully.' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error saving canvas data.' });
  }
};

/* 
* Update room settings
* -- owner-only permission
*/
const updateRoomSettings = async (req, res) => {
  const { code } = req.params;
  const { name, description, isPublic, password } = req.body;

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const userId = req.session.account._id;

    if (room.owner._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only room owner can change settings.' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();
    if (isPublic !== undefined) room.isPublic = isPublic;

    if (password !== undefined) {
      if (password === '' || password === null) {
        room.password = null;
      } else {
        room.password = await Room.hashPassword(password);
      }
    }

    await room.save();

    return res.json({
      message: 'Room settings updated successfully.',
      room: Room.toAPI(room),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error updating room settings.' });
  }
};

/* 
* Delete a room 
* -- owner-only permission 
*/
const deleteRoom = async (req, res) => {
  const { code } = req.params;

  try {
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const userId = req.session.account._id;

    if (room.owner._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only room owner can delete the room.' });
    }

    const account = await Account.findById(userId).exec();

    room.isActive = false;
    await room.save();

    if (account) {
      await account.decrementRoomCount();
      req.session.account.roomsCreated = account.roomsCreated;
    }

    return res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error deleting room.' });
  }
};

module.exports = {
  dashboardPage,
  roomPage,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  getRoomCanvas,
  saveRoomCanvas,
  updateRoomSettings,
  deleteRoom,
};