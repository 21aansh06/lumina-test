# 🌟 LUMINA - AI-First Safety Navigation Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</p>

<p align="center">
  <strong>Navigate Smart. Stay Safe.</strong>
</p>

## 🎯 What is LUMINA?

Lumina is a full-stack AI-powered urban safety navigation platform that **doesn't optimize for the fastest route — it calculates the Safest Route** using real-time AI intelligence.

### 🤖 Powered by 3 Autonomous AI Agents:

1. **Scout Agent** - Detects safety incidents in real-time using Google Gemini AI
2. **Verifier Agent** - Validates user photo reports with AI vision analysis
3. **Guardian Agent** - Monitors active trips and sends safety alerts

## ✨ Features

- 🗺️ **AI Safety Scoring** - Real-time route analysis with safety ratings
- 📡 **Real-Time Updates** - Live incident detection via Socket.io
- 🎨 **Dark Cyberpunk UI** - Premium futuristic design with Framer Motion
- 🔐 **Secure Authentication** - Firebase Authentication (Google Sign-In + Guest)
- 📊 **Analytics Dashboard** - Safety trends and trip insights
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🛡️ **Emergency Features** - SOS alerts and emergency contacts

## 🚀 Quick Start (5 Minutes)

### Option 1: Automated Deployment (Recommended)

**Linux/Mac:**
```bash
cd lumina
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```cmd
cd lumina
deploy.bat
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment (optional for demo)
# Edit server/.env and client/.env with your API keys

# 3. Start the application
npm run dev
```

### Access the Application:
- 🌐 **Frontend:** http://localhost:5173
- ⚙️ **Backend API:** http://localhost:5000

## 🎮 Demo Mode (No API Keys Required!)

Want to test immediately without setting up API keys? Use **Demo Mode**:

1. Open http://localhost:5173
2. Click **"👤 Continue as Guest"** button
3. Complete the onboarding form
4. Start exploring all features!

> 💡 **Demo mode works with mock data** - You can test all UI features, route calculation, and admin panel without any API configuration!

### 🔥 Add Google Sign-In (Optional - 10 Minutes)
Want real Google Sign-In? Just add Firebase config:
1. Create project at https://console.firebase.google.com/
2. Enable Google authentication
3. Copy config to `client/.env`
4. Done! Google Sign-In works instantly

See [FIREBASE_AUTH_COMPLETE.md](FIREBASE_AUTH_COMPLETE.md) for detailed instructions.

## 📋 Complete Setup Guide

### For Production / Full Features:

See **[PRODUCTION_READY.md](PRODUCTION_READY.md)** for comprehensive setup including:
- 🔑 Obtaining all required API keys
- 🛡️ Security configuration
- 🚀 Production deployment
- 📊 Performance optimization
- 🔐 Security best practices

### Quick API Key Setup:

You'll need these 4 API keys for full functionality:

1. **Firebase Authentication** (for login - easiest setup!)
   - https://console.firebase.google.com/
   - ✅ **Recommended**: Simplest setup, handles everything
   
2. **Google Gemini API** (for AI features)
   - https://makersuite.google.com/app/apikey
   
3. **MongoDB Atlas** (for database)
   - https://www.mongodb.com/cloud/atlas
   
4. **Mapbox** (for maps)
   - https://www.mapbox.com/

> 📚 **Detailed instructions:** See [SETUP_GUIDE.md](SETUP_GUIDE.md)
> 🔥 **Firebase Auth Guide:** See [FIREBASE_AUTH_COMPLETE.md](FIREBASE_AUTH_COMPLETE.md)

## 🏗️ Tech Stack

### Frontend
- ⚛️ **React 18** - UI framework
- ⚡ **Vite** - Build tool
- 🎨 **Tailwind CSS** - Styling
- 🎬 **Framer Motion** - Animations
- 🗺️ **Mapbox GL JS** - Maps
- 📈 **Recharts** - Data visualization
- 🔌 **Socket.io Client** - Real-time communication

### Backend
- 🟢 **Node.js** + **Express.js** - Server
- 🍃 **MongoDB** + **Mongoose** - Database
- 🤖 **Google Gemini 1.5 Flash** - AI model
- 🔌 **Socket.io** - Real-time updates
- 🔐 **Firebase Admin SDK** - Authentication
- 📁 **Multer** - File uploads

## 📁 Project Structure

```
lumina/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React contexts (Auth, Socket)
│   │   └── utils/            # Utilities
│   ├── .env                  # Frontend environment
│   └── package.json
├── server/                    # Node.js Backend
│   ├── agents/               # AI Agents (Scout, Verifier, Guardian)
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API routes
│   ├── config/               # Configuration
│   ├── .env                  # Backend environment
│   └── server.js             # Main server file
├── deploy.sh                 # Linux/Mac deployment script
├── deploy.bat                # Windows deployment script
├── PRODUCTION_READY.md       # Production deployment guide
├── SETUP_GUIDE.md           # Detailed setup instructions
└── package.json             # Root package.json
```

## 🧪 Testing

### Demo User Credentials
No credentials needed! Click "Try Demo" button on the homepage.

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Get all roads
curl http://localhost:5000/api/routes/roads

# Calculate routes
curl -X POST http://localhost:5000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{"origin": "Times Square", "destination": "Central Park"}'
```

## 🐛 Troubleshooting

### Common Issues:

**"API key not valid"**
- You're using demo keys - this is expected in demo mode
- App will use mock data instead of AI

**"Port already in use"**
```bash
npx kill-port 5000
npx kill-port 5173
```

**"Cannot connect to MongoDB"**
- MongoDB Atlas: Whitelist your IP
- Local MongoDB: Start with `mongod`

**"CORS error"**
- Check CLIENT_URL in server/.env matches your frontend URL

### Full Troubleshooting Guide
See [PRODUCTION_READY.md](PRODUCTION_READY.md) → "Common Issues & Solutions"

## 🚀 Deployment

### Deploy to Production:

1. **Get all API keys** (see SETUP_GUIDE.md)
2. **Update .env files** with production values
3. **Choose a platform:**
   - VPS: DigitalOcean, AWS EC2, Linode
   - PaaS: Render, Railway, Heroku
4. **Follow platform-specific deployment guide**

Detailed instructions in [PRODUCTION_READY.md](PRODUCTION_READY.md)

## 📊 Performance

- ⚡ **Sub-second** route calculations
- 🔄 **Real-time** incident updates
- 📱 **Optimized** for mobile devices
- 🗄️ **Indexed** MongoDB queries
- 🚀 **CDN-ready** static assets

## 🔐 Security Features

- ✅ JWT token authentication
- ✅ **Firebase Authentication** (Google Sign-In + Guest)
- ✅ Automatic token verification
- ✅ Input sanitization
- ✅ Rate limiting (production)
- ✅ CORS protection
- ✅ Helmet.js headers (production)
- ✅ HTTPS enforcement (production)

## 📝 Documentation

- 📖 **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- 🔥 **[FIREBASE_AUTH_COMPLETE.md](FIREBASE_AUTH_COMPLETE.md)** - Firebase Authentication guide
- 🚀 **[PRODUCTION_READY.md](PRODUCTION_READY.md)** - Production deployment
- 🔧 **[TROUBLESHOOTING.md](PRODUCTION_READY.md)** - Common issues

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- 🤖 Google Gemini AI for powering the safety analysis
- 🗺️ Mapbox for the mapping infrastructure
- 🍃 MongoDB for the database
- ⚛️ React team for the amazing framework

## 📞 Support

- 🐛 **Bug Reports:** Open an issue
- 💡 **Feature Requests:** Open an issue with label "enhancement"
- ❓ **Questions:** Check documentation first

---

<p align="center">
  <strong>Built with ❤️ for safer urban navigation</strong>
</p>

<p align="center">
  🌟 Star this repo if you find it helpful!
</p>