const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  textFeedback: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    enum: ['Poor Lighting', 'High Traffic', 'Felt Unsafe', 'Incident Not Shown', 'Good Lighting', 'Safe Area', 'Well Monitored']
  }],
  processedByAI: {
    type: Boolean,
    default: false
  },
  safetyAdjustment: {
    type: Number,
    default: 0
  },
  aiAnalysis: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);