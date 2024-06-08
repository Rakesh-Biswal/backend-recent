const mongoose = require('mongoose');

const paymentschema = new mongoose.Schema({
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
    enum: ['pending', 'success'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentschema);
