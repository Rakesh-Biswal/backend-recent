const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    linkIndex: { type: Number, unique: true, required: true },
    adLink: { type: String, required: true },
    adImage: { type: String, required: true }
});

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad;
