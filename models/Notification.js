const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true },
  message: { type: String, required: true },

  type: {
    type: String,
    enum: ['registration', 'course', 'event', 'quiz', 'certificate', 'system'],
    default: 'system'
  },

  link: { type: String }, // optional link to page (e.g., /dashboard/courses/123)
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
