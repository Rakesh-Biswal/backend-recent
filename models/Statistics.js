const mongoose = require('mongoose');

// Define schema for Statistics
const statisticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    linkClicksToday: {
        type: Number,
        default: 0
    }
});

// Create model for Statistics
const Statistics = mongoose.model('Statistics', statisticsSchema);

module.exports = Statistics;
