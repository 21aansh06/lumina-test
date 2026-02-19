const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');

// Configure Passport Google Strategy (kept for backwards compatibility)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Create new user
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0].value,
            isOnboarded: false
          });
          await user.save();
        } else {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

// ==================== FIREBASE AUTHENTICATION ====================

// Firebase Token Verification
router.post('/firebase-verify', async (req, res) => {
  try {
    const { token, user: firebaseUser } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Firebase token required' });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    // Check if user exists in our database
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: decodedToken.uid },
        { email: decodedToken.email }
      ]
    });

    if (!user) {
      // Create new user
      user = new User({
        firebaseUid: decodedToken.uid,
        googleId: null, // Not using Google OAuth
        email: decodedToken.email,
        name: decodedToken.name,
        avatar: decodedToken.picture,
        isOnboarded: false,
        isAdmin: false
      });
      await user.save();
    } else {
      // Update last login
      user.lastLogin = new Date();
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = decodedToken.uid;
      }
      await user.save();
    }

    // Generate JWT for our app
    const appToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: appToken,
      user
    });

  } catch (error) {
    console.error('Firebase verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRADITIONAL GOOGLE OAUTH (BACKWARDS COMPATIBILITY) ====================

// Google OAuth callback (kept for backwards compatibility)
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const redirectUrl = req.user.isOnboarded 
      ? `${process.env.CLIENT_URL}/dashboard?token=${token}`
      : `${process.env.CLIENT_URL}/onboard?token=${token}`;
    
    res.redirect(redirectUrl);
  }
);

// ==================== MIDDLEWARE & UTILITIES ====================

// Verify token middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Onboarding - Save user profile
router.post('/onboard', authMiddleware, async (req, res) => {
  try {
    const { phone, emergencyContactName, emergencyContactPhone, profileType, alertMode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        phone,
        emergencyContactName,
        emergencyContactPhone,
        profileType,
        alertMode,
        isOnboarded: true
      },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Demo login for testing (works with Firebase or traditional)
router.post('/demo-login', async (req, res) => {
  try {
    // Check if demo user exists
    let user = await User.findOne({ email: 'demo@lumina.app' });
    
    if (!user) {
      // Create demo user
      user = new User({
        firebaseUid: 'demo-user-' + Date.now(),
        googleId: 'demo-user-id',
        email: 'demo@lumina.app',
        name: 'Demo User',
        avatar: null,
        isOnboarded: false,
        isAdmin: true
      });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token, 
      user,
      message: 'Demo login successful. This is for testing only.' 
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, authMiddleware };