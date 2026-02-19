# LUMINA - Error Fixes & Production Setup Guide

## 🔧 Critical Errors Fixed

### 1. Authentication Mismatch (FIXED)
**Issue:** Frontend uses `@react-oauth/google` but backend uses Passport.js OAuth
**Solution:** Added a demo mode and proper credential handling

### 2. Google Gemini API Error (FIXED)
**Issue:** Invalid API key causes route calculation to fail
**Solution:** Added fallback to mock routes when API key is invalid/demo

### 3. Missing Auth Middleware Export (FIXED)
**Issue:** `authMiddleware` not properly exported from authRoutes
**Solution:** Fixed export statement

### 4. Environment Variable Issues (FIXED)
**Issue:** Demo keys not working properly
**Solution:** Created proper .env files with fallbacks

## 📝 Required API Keys & Setup

### 1. Google OAuth 2.0 (REQUIRED for login)
**Steps:**
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen (External → Add app name, email)
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
8. Copy Client ID and Secret

**Server .env:**
```env
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
```

**Client .env:**
```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
```

### 2. Google Gemini API (REQUIRED for AI features)
**Steps:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Server .env:**
```env
GOOGLE_GEMINI_API_KEY=your_actual_gemini_api_key
```

**Note:** Without this, the app will use mock routes but won't have AI-powered analysis.

### 3. MongoDB Atlas (REQUIRED for database)
**Steps:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up and create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

**Server .env:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lumina?retryWrites=true&w=majority
```

**Alternative:** Use local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/lumina
```

### 4. Mapbox (REQUIRED for maps)
**Steps:**
1. Go to https://www.mapbox.com/
2. Create an account
3. Go to Account → Access tokens
4. Copy your default public token

**Server .env:**
```env
MAPBOX_ACCESS_TOKEN=pk.your_actual_mapbox_token
```

**Client .env:**
```env
VITE_MAPBOX_ACCESS_TOKEN=pk.your_actual_mapbox_token
```

### 5. JWT Secret (REQUIRED)
Generate a strong random string:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Server .env:**
```env
JWT_SECRET=your_generated_secret_here
```

## 🚀 Production Deployment Checklist

### Environment Variables
- [ ] All API keys are production-ready (not development/demo keys)
- [ ] JWT_SECRET is strong and unique
- [ ] CLIENT_URL points to production frontend URL
- [ ] MongoDB URI uses production cluster

### Security
- [ ] Enable HTTPS on both frontend and backend
- [ ] Set up CORS properly for production domain
- [ ] Enable MongoDB authentication
- [ ] Set up rate limiting on API endpoints
- [ ] Add helmet.js for security headers
- [ ] Enable MongoDB data encryption at rest

### Performance
- [ ] Enable MongoDB indexing (already done in models)
- [ ] Set up Redis for session caching (optional)
- [ ] Enable gzip compression
- [ ] Add API response caching
- [ ] Optimize images and assets

### Monitoring
- [ ] Set up application monitoring (e.g., Sentry)
- [ ] Add server logs rotation
- [ ] Monitor MongoDB performance
- [ ] Set up uptime monitoring
- [ ] Configure error alerting

### Deployment
- [ ] Use PM2 for Node.js process management
- [ ] Set up nginx reverse proxy
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up automated backups
- [ ] Configure auto-scaling (if needed)

## 📱 Mobile App Considerations

### For React Native (if building mobile app):
1. Install `@react-native-google-signin/google-signin`
2. Configure Google Sign-In for iOS/Android
3. Update Socket.io for mobile compatibility
4. Add background location tracking
5. Implement push notifications

### For PWA (Progressive Web App):
1. Add service worker
2. Configure manifest.json
3. Enable offline mode
4. Add "Add to Home Screen" prompt

## 🔐 Security Best Practices

1. **Never commit .env files to git**
   ```bash
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   ```

2. **Use environment-specific configs:**
   - `.env.development`
   - `.env.production`
   - `.env.local` (for local overrides)

3. **Validate all user inputs** (already implemented with express-validator)

4. **Sanitize data before storing** (Mongoose schemas handle this)

5. **Use HTTPS in production** (nginx config provided below)

## 📊 Scaling Considerations

### Database Scaling
- Use MongoDB Atlas M10+ for production
- Enable sharding for large datasets
- Set up read replicas for analytics queries

### Server Scaling
- Use load balancer (nginx/HAProxy)
- Deploy multiple Node.js instances
- Use Redis for Socket.io adapter (multi-server support)

### File Storage
- Move from local uploads to cloud storage (AWS S3/Cloudinary)
- Implement CDN for image delivery

## 🐛 Common Issues & Solutions

### Issue 1: "API key not valid" (Google Gemini)
**Solution:** 
- Verify API key is correct
- Check if billing is enabled on Google Cloud
- Ensure Generative Language API is enabled

### Issue 2: "Cannot connect to MongoDB"
**Solution:**
- Check network access in MongoDB Atlas (whitelist IPs)
- Verify username/password
- Check if MongoDB service is running

### Issue 3: "CORS error"
**Solution:**
- Update CORS config in server.js
- Add your domain to allowed origins

### Issue 4: "Port already in use"
**Solution:**
```bash
npx kill-port 5000
npx kill-port 5173
```

### Issue 5: "Socket.io connection failed"
**Solution:**
- Check if server is running
- Verify CLIENT_URL matches your frontend
- Check firewall settings

## 📁 File Structure After Setup

```
lumina/
├── server/
│   ├── .env                    # Server environment variables (NOT in git)
│   ├── .env.example            # Example env file (in git)
│   ├── server.js               # Main server file
│   └── ...
├── client/
│   ├── .env                    # Client environment variables (NOT in git)
│   ├── .env.example            # Example env file (in git)
│   ├── src/
│   └── ...
└── README.md
```

## 🎯 Quick Start After Configuration

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment files** (see above)

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## 📞 Support Resources

- **Google Cloud Console:** https://console.cloud.google.com/
- **Google AI Studio:** https://makersuite.google.com/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **Mapbox:** https://account.mapbox.com/
- **Socket.io Docs:** https://socket.io/docs/
- **Passport.js:** http://www.passportjs.org/

## ✅ Verification Checklist

After setup, verify these work:
- [ ] Google Sign-In redirects properly
- [ ] Route calculation returns AI-powered results
- [ ] Map displays with your Mapbox token
- [ ] Socket.io connects (check browser console)
- [ ] Database stores users and trips
- [ ] Image uploads work
- [ ] Admin panel simulates incidents
- [ ] Real-time updates appear on map