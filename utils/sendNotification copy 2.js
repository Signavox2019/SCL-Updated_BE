// utils/sendNotification.js

const { getIo, getConnectedUsers } = require('../socketServer');
const Notification = require('../models/Notification'); // Make sure the path is correct

const sendNotification = async ({ userId, title, message }) => {
  const io = getIo();
  const connectedUsers = getConnectedUsers();

  if (!userId) {
    console.warn('⚠️ No userId provided for notification');
    return;
  }

  try {
    // Save to DB
    const newNotification = new Notification({
      user: userId,
      title,
      message
    });

    await newNotification.save();
    console.log(`💾 Notification saved for user: ${userId}`);

    // Send via socket.io if user is connected
    if (io && connectedUsers) {
      const socketId = connectedUsers.get(userId.toString());

      if (socketId) {
        console.log(`📤 Sending real-time notification to ${userId} (${socketId})`);
        io.to(socketId).emit('notification', {
          title,
          message,
          _id: newNotification._id,
          createdAt: newNotification.createdAt
        });
      } else {
        console.log(`⚠️ User ${userId} not connected, real-time notification skipped`);
      }
    } else {
      console.warn('⚠️ Socket.io not initialized or connectedUsers map not available');
    }

  } catch (err) {
    console.error('❌ Error sending/saving notification:', err.message);
  }
};

module.exports = sendNotification;
