const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  coins: {
    type: Number,
    default: 0
  },
  linkStatus: {
    type: [Boolean],
    default: () => Array(10).fill(false) // Assuming 10 links
  }
});

module.exports = mongoose.model('User', userSchema);
