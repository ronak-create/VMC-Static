const mongoose = require('mongoose');

// Define Damages schema and model
const DamagesSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    type: String,
    severity: String,
    location: String,
    coords: {
        lat: Number,
        lng: Number
    },
    description: String,
    reportedDate: Date,
    status: String
});

module.exports = mongoose.model('Damages', DamagesSchema);