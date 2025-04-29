const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true
  },
  creator: {
    type: String,
    required: true
  },
  saveMessages: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', roomSchema);