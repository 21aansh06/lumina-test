const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  locationName: {
    type: String,
    default: ''
  },
  reportType: {
    type: String,
    enum: ['poor_lighting', 'broken_infrastructure', 'unsafe_area', 'suspicious_activity', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  aiConfidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  aiReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  }
});

reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);