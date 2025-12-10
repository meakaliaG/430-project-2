/* Socket.IO Handler - Manages real-time collaboration features */

const socketio = require('socket.io');

let io;

// Store active users per room
const roomUsers = {};

/* Initialize Socket.IO */
const setupSockets = (server) => {
  io = socketio(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    /* Join a room */
    socket.on('join-room', (data) => {
      const { roomCode, username } = data;

      if (!roomCode) {
        socket.emit('room-error', { error: 'Room code is required' });
        return;
      }

      // Join the Socket.IO room
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.username = username || 'Anonymous';

      // Track user in room
      if (!roomUsers[roomCode]) {
        roomUsers[roomCode] = [];
      }

      // Add user if not already in the list
      const existingUser = roomUsers[roomCode].find((u) => u.socketId === socket.id);
      if (!existingUser) {
        roomUsers[roomCode].push({
          socketId: socket.id,
          username: socket.username,
        });
      }

      console.log(`${socket.username} joined room ${roomCode}`);

      // Confirm join to the user
      socket.emit('room-joined', {
        roomCode,
        message: 'Successfully joined room',
      });

      // Notify others in the room
      socket.to(roomCode).emit('participant-joined', {
        username: socket.username,
        participantCount: roomUsers[roomCode].length,
      });

      // Send current participant list to the new user
      socket.emit('participants-update', {
        participants: roomUsers[roomCode].map((u) => u.username),
      });

      // Send participant list to everyone in the room
      io.to(roomCode).emit('participants-update', {
        participants: roomUsers[roomCode].map((u) => u.username),
      });
    });

    /* Leave a room */
    socket.on('leave-room', (data) => {
      const { roomCode } = data;
      handleLeaveRoom(socket, roomCode);
    });

    /* Drawing events */
    socket.on('draw-start', (data) => {
      // Broadcast to everyone else in the room
      socket.to(data.roomCode).emit('draw-start', {
        x: data.x,
        y: data.y,
        color: data.color,
        lineWidth: data.lineWidth,
        tool: data.tool,
        userId: socket.id,
      });
    });

    socket.on('draw-move', (data) => {
      // Broadcast drawing data to everyone else in the room
      socket.to(data.roomCode).emit('draw-data', {
        x0: data.x0,
        y0: data.y0,
        x1: data.x1,
        y1: data.y1,
        color: data.color,
        lineWidth: data.lineWidth,
        tool: data.tool,
        userId: socket.id,
      });
    });

    socket.on('draw-end', (data) => {
      // Broadcast to everyone else in the room
      socket.to(data.roomCode).emit('draw-end', {
        userId: socket.id,
      });
    });

    /* Clear canvas */
    socket.on('clear-canvas', (data) => {
      const { roomCode } = data;

      // Broadcast to everyone in the room (including sender)
      io.to(roomCode).emit('canvas-cleared', {
        clearedBy: socket.username,
      });

      console.log(`Canvas cleared in room ${roomCode} by ${socket.username}`);
    });

    /* Chat messages */
    socket.on('chat-message', (data) => {
      const { roomCode, text } = data;

      if (!text || !roomCode) {
        return;
      }

      const message = {
        username: socket.username,
        text: text.trim(),
        timestamp: Date.now(),
      };

      // Broadcast to everyone in the room (including sender)
      io.to(roomCode).emit('chat-message', message);

      console.log(`Chat message in ${roomCode} from ${socket.username}: ${text}`);
    });

    /* Cursor position tracking (optional feature) */
    socket.on('cursor-move', (data) => {
      const { roomCode, x, y } = data;

      // Broadcast to everyone else in the room
      socket.to(roomCode).emit('cursor-position', {
        userId: socket.id,
        username: socket.username,
        x,
        y,
      });
    });

    /* Handle disconnection */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove user from all rooms they were in
      if (socket.roomCode) {
        handleLeaveRoom(socket, socket.roomCode);
      }
    });
  });

  return io;
};

/* Helper function to handle leaving a room */
const handleLeaveRoom = (socket, roomCode) => {
  if (!roomCode || !roomUsers[roomCode]) {
    return;
  }

  // Remove user from room tracking
  roomUsers[roomCode] = roomUsers[roomCode].filter(
    (u) => u.socketId !== socket.id,
  );

  // Notify others in the room
  socket.to(roomCode).emit('participant-left', {
    username: socket.username,
    participantCount: roomUsers[roomCode].length,
  });

  // Send updated participant list to remaining users
  io.to(roomCode).emit('participants-update', {
    participants: roomUsers[roomCode].map((u) => u.username),
  });

  // Leave the Socket.IO room
  socket.leave(roomCode);

  console.log(`${socket.username} left room ${roomCode}`);

  // Clean up empty rooms
  if (roomUsers[roomCode].length === 0) {
    delete roomUsers[roomCode];
    console.log(`Room ${roomCode} is now empty and cleaned up`);
  }
};

/* Get Socket.IO instance (for use in other files if needed) */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  setupSockets,
  getIO,
};