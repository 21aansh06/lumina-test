# 🔥 Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for LUMINA. Firebase provides a secure, reliable, and easy-to-use authentication system that supports Google Sign-In, email/password, and anonymous authentication.

## 📋 Table of Contents
1. [Why Firebase?](#why-firebase)
2. [Setup Steps](#setup-steps)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

## 🎯 Why Firebase?

- **Secure**: Built by Google with enterprise-grade security
- **Easy**: Simple SDK integration
- **Reliable**: 99.99% uptime SLA
- **Free**: Generous free tier (10,000 users/month)
- **Features**: Social auth, email/password, anonymous, phone, and more

## 🚀 Setup Steps

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `lumina-safety-app` (or your preferred name)
4. Accept Firebase terms
5. Click "Continue"
6. **Disable Google Analytics** for now (you can enable later)
7. Click "Create project"
8. Wait for project creation (takes ~1 minute)

### Step 2: Enable Authentication

1. In Firebase Console, click "Authentication" from left sidebar
2. Click "Get started"
3. Under "Sign-in method" tab, enable providers:

   **Google (Required):**
   - Click "Google"
   - Enable toggle
   - Enter public-facing name: "Lumina"
   - Select support email
   - Click "Save"

   **Anonymous (Optional for demo):**
   - Click "Anonymous"
   - Enable toggle
   - Click "Save"

### Step 3: Get Frontend Configuration

1. In Firebase Console, click ⚙️ (gear icon) → "Project settings"
2. Under "Your apps" section, click "</>" (Web icon)
3. Register app:
   - Nickname: `Lumina Web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
4. Copy the Firebase configuration object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 4: Update Client Environment

Open `client/.env` and update with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 5: Setup Firebase Admin (Backend)

**For Production (Recommended):**

1. In Firebase Console, go to ⚙️ → "Project settings" → "Service accounts"
2. Click "Generate new private key"
3. Click "Generate key" (downloads a JSON file)
4. Save this file securely (never commit to git!)
5. Open the JSON file and copy the entire contents

**Option A: Environment Variable (Recommended)**

Open `server/.env` and add:
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...",...}
```

Paste the entire JSON content as the value (minified, no line breaks).

**Option B: Service Account File**

1. Save the JSON file as `server/config/firebase-service-account.json`
2. Add to `.gitignore`:
   ```
   server/config/firebase-service-account.json
   ```
3. Update `server/config/firebaseAdmin.js` to load from file:
   ```javascript
   const serviceAccount = require('./firebase-service-account.json');
   ```

### Step 6: Configure Authorized Domains

1. In Firebase Console → Authentication → Settings → Authorized domains
2. Add your domains:
   ```
   localhost
   localhost:5173
   your-production-domain.com
   ```

## ⚙️ Configuration Summary

### Client (.env)
```env
# Firebase Client Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=lumina-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lumina-12345
VITE_FIREBASE_STORAGE_BUCKET=lumina-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Server (.env)
```env
# Firebase Admin Service Account (paste entire JSON)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"lumina-12345","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

## 🧪 Testing

### Test 1: Google Sign-In
1. Start the app: `npm run dev`
2. Open http://localhost:5173
3. Click "Sign in with Google"
4. Select your Google account
5. You should be redirected to onboarding or dashboard
6. Check browser console for success messages

### Test 2: Anonymous Sign-In
1. Click "Continue as Guest"
2. You should be logged in as an anonymous user
3. Check Firebase Console → Authentication → Users
4. You should see an anonymous user

### Test 3: Verify Token
```bash
curl -X POST http://localhost:5000/api/auth/firebase-verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_firebase_id_token",
    "user": {
      "uid": "user_uid",
      "email": "user@example.com",
      "name": "Test User"
    }
  }'
```

## 🔧 Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
**Solution**: 
- Check that VITE_FIREBASE_API_KEY is correct
- Ensure you're using the Web API Key from Firebase Console

### "Firebase: Error (auth/unauthorized-domain)"
**Solution**:
- Add your domain to Firebase Console → Auth → Settings → Authorized domains
- For local development, add `localhost` and `localhost:5173`

### "Invalid Firebase token" (Backend)
**Solution**:
- Check FIREBASE_SERVICE_ACCOUNT is set correctly
- Verify the service account JSON is valid
- Ensure the service account has proper permissions

### "Demo mode active" warning
**Explanation**: 
- This is expected if FIREBASE_SERVICE_ACCOUNT is not set
- In demo mode, tokens are not verified (insecure, for testing only)
- For production, you MUST set up Firebase Admin SDK

### Google Sign-In popup blocked
**Solution**:
- Ensure your domain is in authorized domains
- Check browser popup blocker settings
- Use HTTPS in production (required by Google)

## 📊 Firebase Console Monitoring

Monitor your authentication:
1. Firebase Console → Authentication → Users
   - See all authenticated users
   - View sign-in methods
   - Manage user accounts

2. Firebase Console → Analytics → Events
   - Track sign_in events
   - Monitor authentication success/failure rates

## 🔐 Security Best Practices

1. **Never commit service account keys**
   ```bash
   echo "server/config/firebase-service-account.json" >> .gitignore
   echo "**/.env" >> .gitignore
   ```

2. **Use environment variables for production**
   - Never hardcode credentials
   - Use different Firebase projects for dev/staging/prod

3. **Enable Firebase Security Rules**
   - Configure Firestore/Realtime Database rules
   - Restrict access to authenticated users only

4. **Monitor Authentication Events**
   - Set up alerts for suspicious activity
   - Review authentication logs regularly

## 🎓 Learn More

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Console](https://console.firebase.google.com/)

## ✅ Verification Checklist

After setup, verify:
- [ ] Firebase project created
- [ ] Google authentication enabled
- [ ] Anonymous authentication enabled (optional)
- [ ] Frontend config added to client/.env
- [ ] Service account config added to server/.env
- [ ] Authorized domains configured
- [ ] Google Sign-In works
- [ ] Anonymous login works
- [ ] Tokens are verified on backend
- [ ] Users appear in Firebase Console

## 🚀 Demo Mode vs Production

### Demo Mode (No Firebase Setup)
- ✅ Works immediately
- ✅ Anonymous authentication works
- ⚠️ Tokens not verified (insecure)
- ⚠️ Google Sign-In won't work

### Production (Full Firebase Setup)
- ✅ Secure token verification
- ✅ Google Sign-In works
- ✅ Real user management
- ✅ Analytics and monitoring
- ⏱️ Requires setup time (15 minutes)

## 🎯 Next Steps

1. Complete Firebase setup using this guide
2. Test authentication flow
3. Set up production Firebase project (separate from dev)
4. Configure authorized domains for production
5. Enable Firebase Analytics (optional)
6. Set up Firebase Crashlytics (optional)

**You're now ready to use Firebase Authentication with LUMINA!** 🔥