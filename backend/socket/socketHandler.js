const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OrganizationMember } = require('../models/OrganizationMember');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    // Authenticate socket if token is provided in handshake
    const handshakeToken = socket.handshake.auth?.token;
    if (handshakeToken) {
      try {
        const decoded = jwt.verify(handshakeToken, process.env.JWT_SECRET);
        socket.userId = decoded.id;
      } catch (err) {
        // Invalid handshake token
      }
    }

    // User-specific private room
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.userId = userId;
        const roomName = `user:${userId}`;
        socket.join(roomName);
      }
    });

    // Organization tenant-specific room with membership validation
    socket.on('join:org', async (payload) => {
      try {
        const orgId = typeof payload === 'object' ? payload.orgId : payload;
        const token = (typeof payload === 'object' && payload.token) || socket.handshake.auth?.token;

        if (!orgId) return;

        let userId = socket.userId;
        if (!userId && token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;
            socket.userId = userId;
          } catch (e) {}
        }

        // Validate organization existence and status
        const { Organization } = require('../models/Organization');
        const org = await Organization.findById(orgId);
        if (!org || org.status === 'SUSPENDED') {
          socket.emit('error:suspended', {
            code: 'ORGANIZATION_SUSPENDED',
            organizationId: orgId,
            message: 'Organization is suspended. Real-time events disabled.'
          });
          return;
        }

        // Validate membership if user is authenticated
        if (userId) {
          const user = await User.findById(userId);
          const isMember = await OrganizationMember.findOne({
            organizationId: orgId,
            userId
          });

          if (!isMember && user?.role !== 'ADMIN') {
            socket.emit('error:unauthorized', {
              message: 'Not authorized to join this organization room'
            });
            return;
          }
        }

        const roomName = `org:${orgId}`;
        socket.join(roomName);
      } catch (err) {
        console.error('[Socket.IO] Error in join:org:', err);
      }
    });

    // Leave organization room
    socket.on('leave:org', (orgId) => {
      if (orgId) {
        const roomName = `org:${orgId}`;
        socket.leave(roomName);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn('[Socket.IO] getIO called before initialization');
  }
  return io;
};

// Event emitters strictly scoped to tenant organization room (NO GLOBAL BROADCASTS)
const emitResourceStatusChanged = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('resource:status_changed', payload);
  }
};

const emitBookingCreated = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('booking:created', payload);
  }
};

const emitBookingCheckedIn = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('booking:checked_in', payload);
  }
};

const emitBookingCheckedOut = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('booking:checked_out', payload);
  }
};

const emitBookingCancelled = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('booking:cancelled', payload);
  }
};

const emitBookingAutoReleased = (payload) => {
  if (io && payload && payload.organizationId) {
    io.to(`org:${payload.organizationId}`).emit('booking:auto_released', payload);
  }
};

const emitOrganizationSuspended = (orgId) => {
  if (io && orgId) {
    const roomName = `org:${orgId}`;
    io.to(roomName).emit('org:suspended', {
      orgId,
      code: 'ORGANIZATION_SUSPENDED',
      message: 'This organization has been suspended by platform administration.'
    });
    // Eject all connected sockets from the suspended organization room
    io.in(roomName).socketsLeave(roomName);
  }
};

const emitNotificationToUser = (userId, notification) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit('notification:new', notification);
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
  emitOrganizationSuspended,
  emitNotificationToUser
};
