const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: { type: String }, // Cloudinary file URL
  status: {
    type: String,
    enum: ['Pending', 'Solved', 'Breached', 'Closed', 'Open'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forwardedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  resolvedAt: { type: Date }
});

module.exports = mongoose.model('Ticket', ticketSchema);
