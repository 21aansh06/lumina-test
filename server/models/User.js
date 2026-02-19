const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    sparse: true,
    unique: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  phone: {
    type: String,
    default: ''
  },
  emergencyContactName: {
    type: String,
    default: ''
  },
  emergencyContactPhone: {
    type: String,
    default: ''
  },
  profileType: {
    type: String,
    enum: ['General User', 'Student', 'Delivery Worker', 'Night Worker'],
    default: 'General User'
  },
  alertMode: {
    type: String,
    enum: ['SMS', 'In-App', 'Both'],
    default: 'In-App'
  },
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isOnboarded: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);