const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true
  },
  withdrawCoin: {
    type: Number,
    required: true
  },
  UpiId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
