const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    linkIndex: { type: Number, unique: true },
    adLink: String,
    adImage: String
});

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad;
