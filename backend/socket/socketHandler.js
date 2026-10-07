const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join:user', (userId) => {
      if (userId) {
        const roomName = `user:${userId}`;
        socket.join(roomName);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn('[Socket.IO] getIO called before initialization');
  }
  return io;
};

// Event emitters
const emitResourceStatusChanged = (payload) => {
  if (io) {
    io.emit('resource:status_changed', payload);
  }
};

const emitBookingCreated = (payload) => {
  if (io) {
    io.emit('booking:created', payload);
  }
};

const emitBookingCheckedIn = (payload) => {
  if (io) {
    io.emit('booking:checked_in', payload);
  }
};

const emitBookingCheckedOut = (payload) => {
  if (io) {
    io.emit('booking:checked_out', payload);
  }
};

const emitBookingCancelled = (payload) => {
  if (io) {
    io.emit('booking:cancelled', payload);
  }
};

const emitBookingAutoReleased = (payload) => {
  if (io) {
    io.emit('booking:auto_released', payload);
  }
};

const emitNotificationToUser = (userId, notification) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit('notification:new', notification);
    io.emit('notification:created', notification);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitResourceStatusChanged,
  emitBookingCreated,
  emitBookingCheckedIn,
  emitBookingCheckedOut,
  emitBookingCancelled,
  emitBookingAutoReleased,
  emitNotificationToUser
};
