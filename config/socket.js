import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.IO
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join project room
    socket.on('join-project', (projectId) => {
      socket.join(`project-${projectId}`);
      console.log(`User ${socket.id} joined project ${projectId}`);
    });

    // Leave project room
    socket.on('leave-project', (projectId) => {
      socket.leave(`project-${projectId}`);
      console.log(`User ${socket.id} left project ${projectId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit task update to project room
 */
export const emitTaskUpdate = (projectId, task, action = 'update') => {
  if (io) {
    io.to(`project-${projectId}`).emit('task-updated', {
      action,
      task,
      timestamp: new Date()
    });
  }
};

/**
 * Emit project update to project room
 */
export const emitProjectUpdate = (projectId, project, action = 'update') => {
  if (io) {
    io.to(`project-${projectId}`).emit('project-updated', {
      action,
      project,
      timestamp: new Date()
    });
  }
};

/**
 * Emit notification to specific user
 */
export const emitNotification = (userId, notification) => {
  if (io) {
    io.emit(`notification-${userId}`, {
      ...notification,
      timestamp: new Date()
    });
  }
};

export default { initSocket, getIO, emitTaskUpdate, emitProjectUpdate, emitNotification };
