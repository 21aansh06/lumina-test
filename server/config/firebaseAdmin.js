const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production, you should use a service account JSON file
// For development, you can use environment variables
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // For production, use service account credentials
      // You can download this from Firebase Console → Project Settings → Service Accounts
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('✅ Firebase Admin SDK initialized with service account');
          return admin.auth();
        } catch (parseError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
          console.log('⚠️  Falling back to demo mode');
          return null;
        }
      } else {
        // For development with demo/testing
        console.log('⚠️  Firebase Admin SDK not configured');
        console.log('   Running in DEMO mode - tokens will not be verified');
        console.log('   Set FIREBASE_SERVICE_ACCOUNT to enable production mode');
        return null;
      }
    }
    return admin.auth();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
};

const firebaseAuth = initializeFirebase();

// Verify Firebase ID Token
const verifyFirebaseToken = async (token) => {
  // If Firebase is not initialized (demo mode), accept any token
  if (!firebaseAuth) {
    console.log('🔓 Demo mode: Accepting token without verification');
    
    // Try to parse as JWT
    try {
      if (token && token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          return {
            uid: decoded.uid || decoded.sub || 'demo-user-' + Date.now(),
            email: decoded.email || 'demo@lumina.app',
            name: decoded.name || decoded.email?.split('@')[0] || 'Demo User',
            picture: decoded.picture || null,
            emailVerified: decoded.emailVerified || decoded.email_verified || false
          };
        }
      }
    } catch (e) {
      // Not a valid JWT, continue with fallback
    }
    
    // Fallback: accept any token string and generate demo user
    return {
      uid: 'demo-user-' + Date.now(),
      email: 'demo@lumina.app',
      name: 'Demo User',
      picture: null,
      emailVerified: false
    };
  }

  // Production: Verify with Firebase Admin
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      picture: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false
    };
  } catch (error) {
    throw new Error('Invalid or expired Firebase token: ' + error.message);
  }
};

module.exports = {
  admin,
  firebaseAuth,
  verifyFirebaseToken
};