// models/Statistics.js
const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  linkClicks: { type: Number, default: 0 },
});

const Statistics = mongoose.model('Statistics', statisticsSchema);

module.exports = Statistics;
