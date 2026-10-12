const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketHandler');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const platformRoutes = require('./routes/platformRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO on HTTP server
initSocket(server);

// Security and Logging Middleware
app.use(helmet());

// CORS configuration supporting CLIENT_URL and FRONTEND_URL, with multi-origin support
const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : []),
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : [])
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      // In non-production or if wildcard / empty list, allow all
      if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes('*') || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  // Invitation verification tokens are sent in the query string; never log them.
  app.use(morgan('dev', {
    skip: (req) => req.path === '/api/invitations/verify'
  }));
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DeskDrop API is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[DeskDrop Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = { app, server };
