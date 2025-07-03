const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: String,
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  quizzes: [
    {
      title: String,
      date: Date,
      details: String
    }
  ],
  events: [
    {
      title: String,
      description: String,
      date: Date
    }
  ]
});

module.exports = mongoose.model('Batch', batchSchema);
