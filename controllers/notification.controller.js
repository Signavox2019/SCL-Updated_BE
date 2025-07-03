const Notification = require('../models/Notification');

// Create Notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, link } = req.body;
    const user = req.user._id; // Fetched from token

    const notification = await Notification.create({ user, title, message, type, link });
    res.status(201).json({ message: 'Notification sent', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error });
  }
};

// Get All Notifications for Authenticated User
exports.getNotificationsByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

// Mark a Notification as Read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { isRead: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found or access denied' });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

// Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!deleted) return res.status(404).json({ message: 'Notification not found or access denied' });

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error });
  }
};

// Get Notification Stats (for logged-in user)
exports.notificationStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const total = await Notification.countDocuments({ user: userId });
    const unread = await Notification.countDocuments({ user: userId, isRead: false });

    res.status(200).json({ total, unread });
  } catch (error) {
    res.status(500).json({ message: 'Error getting notification stats', error });
  }
};
