const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    ip: { type: String, required: true, unique: true, index: true },
    coins: { type: Number, default: 0 },
    linkStatus: { type: [Boolean], default: [] },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralId: { type: String, unique: true, index: true },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true }],
    referralCoins: { type: Number, default: 0 }
});

// Ensure indexes are created
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ ip: 1 }, { unique: true });
userSchema.index({ referralId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
