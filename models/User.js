const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    coins: { type: Number, default: 0 },
    referralId: { type: String, unique: true },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    linkStatus: [{ type: Boolean, default: false }],
    bonusGiven: { type: Boolean, default: false }, // Field to track if bonus is given
    referralCoins: { type: Number, default: 0 } // Field to track referral coins separately
});

const User = mongoose.model('User', userSchema);

module.exports = User;
