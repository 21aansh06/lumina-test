const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  routeId: {
    type: String,
    required: true
  },
  routeLabel: {
    type: String,
    required: true
  },
  safetyScore: {
    type: Number,
    required: true
  },
  estimatedTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'cancelled'],
    default: 'ongoing'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  path: [{
    lat: Number,
    lng: Number,
    timestamp: Date
  }],
  alertsTriggered: [{
    type: {
      type: String,
      enum: ['CHECK_IN', 'SOS_ALERT']
    },
    message: String,
    timestamp: Date
  }]
});

module.exports = mongoose.model('Trip', tripSchema);