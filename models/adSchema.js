const mongoose = require('mongoose');


const adSchema = new mongoose.Schema({
  linkIndex: {
    type: Number,
    unique: true
  },
  adLink: {
    type: String,
  },
  adImage: {
    type: String,
  }
});

// Create and export the model
const Ad = mongoose.model('Ad', adSchema);
module.exports = Ad;
