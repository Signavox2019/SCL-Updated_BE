// utils/sendNotification.js
const { getIo, getConnectedUsers } = require('../socketServer');

const sendNotification = ({ userId, title, message }) => {
  const io = getIo();
  const connectedUsers = getConnectedUsers();

  if (!io) {
    console.warn('⚠️ Socket.io not initialized');
    return;
  }

  if (!userId) {
    console.warn('⚠️ No userId provided for notification');
    return;
  }

  const socketId = connectedUsers.get(userId.toString());

  if (socketId) {
    console.log(`📤 Sending notification to ${userId} (${socketId})`);
    io.to(socketId).emit('notification', { title, message });
  } else {
    console.log(`⚠️ User ${userId} not connected, notification not sent`);
  }
};

module.exports = sendNotification;
