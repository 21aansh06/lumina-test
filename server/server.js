const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');

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
  origin: ['http://localhost:5174', 'http://127.0.0.1:5173', process.env.CLIENT_URL].filter(Boolean),
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

// Health check endpoint
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