const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['fire', 'protest', 'flood', 'infrastructure', 'accident', 'crime', 'other'],
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
    required: true
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  description: {
    type: String,
    default: ''
  },
  aiExtracted: {
    type: Boolean,
    default: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'expired'],
    default: 'active'
  }
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Incident', incidentSchema);