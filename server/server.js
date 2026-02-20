const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import routes
const { router: authRoutes } = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Import agents
const GuardianAgent = require('./agents/guardianAgent');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Initialize Guardian Agent
const guardianAgent = new GuardianAgent(io);

// CORS Middleware - MUST be first
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security Headers Middleware
app.use((req, res, next) => {
  // Fix Cross-Origin-Opener-Policy issue for Firebase
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);

// ── Nominatim OSM Proxy ────────────────────────────────────────────────────────
// Nominatim ToS requires a proper User-Agent and forbids browser-side calls.
// These inline routes proxy requests server-side with a 10-minute result cache.
const _osmCache = new Map();
const _NOMINATIM = 'https://nominatim.openstreetmap.org';
const _OSM_HEADERS = {
  'User-Agent': 'Lumina-Safety-App/1.0 (contact:aansh6473@gmail.com)',
  'Accept-Language': 'en',
  'Accept': 'application/json'
};

const _OSM_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function _osmCacheGet(key) {
  const entry = _osmCache.get(key);
  if (!entry || Date.now() > entry.exp) { _osmCache.delete(key); return null; }
  return entry.data;
}
function _osmCacheSet(key, data) {
  _osmCache.set(key, { data, exp: Date.now() + _OSM_CACHE_TTL });
}

// GET /api/geocode?q=<address>  — single result, for route origin/destination
app.get('/api/geocode', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  const key = `geocode:${q.toLowerCase()}`;
  const cached = _osmCacheGet(key);
  if (cached) return res.json(cached);
  try {
    const r = await axios.get(`${_NOMINATIM}/search`, {
      params: { q, format: 'json', limit: 1 },
      headers: _OSM_HEADERS,
      timeout: 8000
    });
    const data = r.data || [];
    if (data.length === 0) return res.status(404).json({ error: 'Address not found' });
    _osmCacheSet(key, data);
    return res.json(data);
  } catch (err) {
    console.error('[OSM geocode]', err.message);
    return res.status(502).json({ error: 'Geocoding failed', details: err.message });
  }
});

// GET /api/search?q=<query>  — up to 5 results for autocomplete
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  const key = `search:${q.toLowerCase()}`;
  const cached = _osmCacheGet(key);
  if (cached) return res.json(cached);
  try {
    const r = await axios.get(`${_NOMINATIM}/search`, {
      params: { q, format: 'json', addressdetails: 1, limit: 5 },
      headers: _OSM_HEADERS,
      timeout: 8000
    });
    const data = r.data || [];
    _osmCacheSet(key, data);
    return res.json(data);
  } catch (err) {
    console.error('[OSM search]', err.message);
    return res.status(502).json({ error: 'Place search failed', details: err.message });
  }
});


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agents: {
      scout: 'active',
      verifier: 'active',
      guardian: 'active'
    }
  });
});
// ── Overpass Safety Data Proxy ────────────────────────────────────────────────
// Proxies queries to Overpass API to avoid CORS and handle complex 'around' queries.
app.get('/api/overpass', async (req, res) => {
  try {
    const { bbox, polyline, radius = 100 } = req.query;

    if (!bbox && !polyline) {
      return res.status(400).json({ error: 'Bounding box or polyline required' });
    }

    let overpassQuery = '';

    if (polyline) {
      // 'polyline' should be a string of "lat,lng lat,lng ..."
      // We sample the polyline to avoid Overpass "query too long" error (max points ~15-20)
      const points = polyline.trim().split(' ');
      const sampled = [];
      const sampleStep = Math.max(1, Math.floor(points.length / 15));
      for (let i = 0; i < points.length; i += sampleStep) sampled.push(points[i]);
      if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);

      const polyStr = sampled.join(' ');

      overpassQuery = `
        [out:json][timeout:35];
        (
          node["highway"="street_lamp"](around:${radius},${polyStr});
          node["highway"="traffic_signals"](around:${radius},${polyStr});
          way["highway"="traffic_signals"](around:${radius},${polyStr});
          node["shop"](around:${radius},${polyStr});
          way["shop"](around:${radius},${polyStr});
          node["amenity"~"restaurant|cafe|pub|fast_food|pharmacy"](around:${radius},${polyStr});
          way["amenity"~"restaurant|cafe|pub|fast_food|pharmacy"](around:${radius},${polyStr});
        );
        out center;
      `;
    } else {
      // bbox is "minLng,minLat,maxLng,maxLat" (Vite calculation)
      // Overpass needs "minLat,minLng,maxLat,maxLng"
      const parts = bbox.split(',').map(Number);
      if (parts.length !== 4) return res.status(400).json({ error: 'Invalid bbox format' });
      const [minLng, minLat, maxLng, maxLat] = parts;
      const opBbox = `${minLat},${minLng},${maxLat},${maxLng}`;

      overpassQuery = `
        [out:json][timeout:35];
        (
          node["highway"="street_lamp"](${opBbox});
          node["highway"="traffic_signals"](${opBbox});
          way["highway"="traffic_signals"](${opBbox});
          node["shop"](${opBbox});
          way["shop"](${opBbox});
          node["amenity"~"restaurant|cafe|pub|fast_food|pharmacy"](${opBbox});
          way["amenity"~"restaurant|cafe|pub|fast_food|pharmacy"](${opBbox});
        );
        out center;
      `;
    }

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 50000
      }
    );

    const elements = response.data.elements || [];

    const normalise = (el) => ({
      id: el.id,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      tags: el.tags || {}
    });

    const streetLights = elements.filter(e => e.tags?.highway === 'street_lamp').map(normalise).filter(e => e.lat != null);
    const trafficSignals = elements.filter(e => e.tags?.highway === 'traffic_signals').map(normalise).filter(e => e.lat != null);
    const shops = elements.filter(e => (e.tags?.shop || e.tags?.amenity)).map(normalise).filter(e => e.lat != null);

    console.log(`[Overpass] ${polyline ? 'around' : 'bbox'} → ${streetLights.length} lights, ${trafficSignals.length} signals, ${shops.length} shops`);

    res.json({ streetLights, trafficSignals, shops });

  } catch (error) {
    if (error.response) {
      console.error('Overpass API Error:', error.response.status, error.response.data);
      res.status(502).json({ error: 'Overpass server error', details: error.response.data });
    } else {
      console.error('Overpass Proxy Error:', error.message);
      res.status(504).json({ error: 'Overpass timeout or connection issue' });
    }
  }
});



// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join user-specific room for targeted updates
  socket.on('authenticate', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} authenticated on socket ${socket.id}`);
  });

  // Handle location updates from mobile/client
  socket.on('user_location_update', async (data) => {
    const { lat, lng, userId } = data;

    try {
      await guardianAgent.processLocationUpdate(userId, { lat, lng }, io);
    } catch (error) {
      console.error('Location update error:', error);
    }
  });

  // Handle trip start
  socket.on('start_trip', (data) => {
    const { userId, tripId } = data;
    guardianAgent.startTrip(userId, tripId);
  });

  // Handle trip end
  socket.on('end_trip', (data) => {
    const { userId } = data;
    guardianAgent.endTrip(userId);
  });

  // Handle user response to alerts
  socket.on('user_response', (data) => {
    const { userId, response } = data;
    guardianAgent.handleUserResponse(userId, response, io);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Connect to database and start server
const PORT = process.env.PORT;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   🌟 LUMINA SERVER                                    ║
    ║   AI-First Safety Navigation Platform                 ║
    ║                                                       ║
    ║   Server running on port ${PORT}                      ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
    ║                                                       ║
    ║   🤖 AI Agents Active:                                ║
    ║      • Scout Agent    - Real-time incident detection  ║
    ║      • Verifier Agent - Image verification            ║
    ║      • Guardian Agent - Live trip monitoring          ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});