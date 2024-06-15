const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  imageUrl: { type: String, required: true },
  index: { type: Number, required: true, unique: true }, // Unique index for each link
});

const Link = mongoose.model('Link', linkSchema);

module.exports = Link;
