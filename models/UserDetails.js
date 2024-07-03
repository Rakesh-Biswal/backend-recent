const mongoose = require('mongoose');

const UserDetailsSchema = new mongoose.Schema({
    mobile: { type: String, unique: true },
    nickname: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('UserDetails', UserDetailsSchema);
