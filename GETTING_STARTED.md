# Getting Started with Lumina

## Quick Start

### 1. Install Dependencies

From the project root, run:

```bash
npm run install:all
```

This will install dependencies for both the server and client.

### 2. Configure Environment Variables

#### Backend (.env file in /server)

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lumina
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_here
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
CLIENT_URL=http://localhost:5173
```

#### Frontend (.env file in /client)

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### 3. Setup Required Services

#### MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string and add it to `MONGODB_URI`

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret

#### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to your `.env` file

#### Mapbox
1. Create an account at [Mapbox](https://www.mapbox.com/)
2. Get your access token
3. Add it to your `.env` files

### 4. Run the Application

```bash
npm run dev
```

This will start both the backend server and frontend development server.

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

## Features Overview

### 🤖 AI Agents

1. **Scout Agent** - Monitors and detects safety incidents in real-time
2. **Verifier Agent** - Validates user reports using AI image analysis
3. **Guardian Agent** - Monitors active trips and sends safety alerts

### 🗺️ Safety Navigation

- Real-time route calculation with safety scoring
- 3 route options: Safest, Moderate, Fastest
- Live incident updates via Socket.io
- Interactive Mapbox map with color-coded routes

### 📊 Analytics

- Safety score trends
- Incident reports by type
- Risk factor analysis
- Trip history and statistics

### 👤 User Features

- Google OAuth authentication
- Emergency contact setup
- Profile customization
- Safety report submission with photo verification
- Route feedback system

## Project Structure

```
lumina/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React contexts
│   │   └── utils/       # Utilities
│   └── public/          # Static assets
├── server/              # Node.js backend
│   ├── agents/          # AI agents
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   └── config/          # Configuration
└── uploads/             # File uploads
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/onboard` - Complete user onboarding
- `GET /api/auth/me` - Get current user

### Routes
- `GET /api/routes/roads` - Get all road segments
- `POST /api/routes/calculate` - Calculate safe routes

### Reports
- `POST /api/reports` - Submit safety report
- `GET /api/reports/user/:userId` - Get user's reports

### Admin
- `POST /api/admin/simulate-incident` - Trigger incident simulation
- `GET /api/admin/incidents` - Get active incidents
- `GET /api/admin/stats` - Get system stats

### Feedback
- `POST /api/feedback` - Submit route feedback
- `GET /api/feedback/user/:userId` - Get user's feedback

### Analytics
- `GET /api/analytics/:userId` - Get user analytics

## Socket.io Events

### Client to Server
- `user_location_update` - Send location update
- `start_trip` - Start trip monitoring
- `end_trip` - End trip monitoring
- `user_response` - Respond to Guardian alert

### Server to Client
- `incident_update` - New incident detected
- `CHECK_IN` - Guardian check-in alert
- `SOS_ALERT` - Emergency alert
- `report_verified` - Report verification result

## License

MIT