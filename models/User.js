const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true,defaultValue},
  phone: { type: String, required: true,},
  password: { type: String, required: true },
  ip: { type: String, required: true },
  coins: { type: Number, default: 0 },
  linkStatus: { type: Array, default: [] }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
