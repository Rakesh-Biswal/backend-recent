const mongoose = require('mongoose');

const User = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: false},
  password: { type: String, required: true },
  ip: { type: String, required: true },
  coins: { type: Number, default: 0 },
  linkStatus: { type: Array, default: [] }
});

module.exports = mongoose.models.User || mongoose.model("User", User);