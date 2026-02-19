const mongoose = require('mongoose');

const roadSegmentSchema = new mongoose.Schema({
  geometry: {
    type: {
      type: String,
      enum: ['LineString'],
      required: true
    },
    coordinates: {
      type: [[Number]],
      required: true
    }
  },
  name: {
    type: String,
    default: ''
  },
  lightingScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  crowdScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  openShops: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  incidentImpact: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  safetyScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

roadSegmentSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('RoadSegment', roadSegmentSchema);