const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ip: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  linkStatus: { type: [Boolean], default: [] },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // List of referred users
  referralCoins: { type: Number, default: 0 }, // Coins earned from referrals
  referrerBonusApplied: { type: Boolean, default: false } // Flag for 500 coin bonus
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
