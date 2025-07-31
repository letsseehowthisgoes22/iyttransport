const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Database = require('./database');
const authRoutes = require('./routes/auth');
const transportRoutes = require('./routes/transports');

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['https://iyttransport-frontend.onrender.com', 'http://localhost:3000'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const db = new Database();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['https://iyttransport-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transports', transportRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Transport Tracking API is running' });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.getUserById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} (${socket.user.role}) connected`);

  socket.join(`role_${socket.user.role}`);
  
  if (socket.user.role === 'Clinician' && socket.user.client_id) {
    socket.join(`clinician_${socket.user.id}`);
  } else if (socket.user.role === 'Family' && socket.user.client_id) {
    socket.join(`client_${socket.user.client_id}`);
  }

  socket.on('location_update', async (data) => {
    try {
      if (socket.user.role !== 'Staff') {
        socket.emit('error', { message: 'Only staff can send location updates' });
        return;
      }

      const { transportId, latitude, longitude, accuracy } = data;
      
      if (!transportId || !latitude || !longitude) {
        socket.emit('error', { message: 'Transport ID, latitude, and longitude are required' });
        return;
      }

      const transports = await db.getTransportsByRole(socket.user.id, socket.user.role);
      const hasAccess = transports.some(transport => transport.id == transportId);
      
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to this transport' });
        return;
      }

      const locationId = await db.addLocationUpdate(transportId, latitude, longitude, accuracy);
      
      const transport = transports.find(t => t.id == transportId);
      
      const locationData = {
        id: locationId,
        transportId,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
        transport: {
          id: transport.id,
          client_name: transport.client_name,
          staff_name: transport.staff_name,
          status: transport.status
        }
      };

      io.to('role_Admin').emit('location_update', locationData);
      
      socket.emit('location_update_confirmed', locationData);
      
      if (transport.assigned_clinician_id) {
        io.to(`clinician_${transport.assigned_clinician_id}`).emit('location_update', locationData);
      }
      
      io.to(`client_${transport.client_id}`).emit('location_update', locationData);

      console.log(`Location update from ${socket.user.name} for transport ${transportId}: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('error', { message: 'Failed to process location update' });
    }
  });

  socket.on('transport_status_update', async (data) => {
    try {
      if (!['Admin', 'Staff'].includes(socket.user.role)) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      const { transportId, status } = data;
      
      if (!transportId || !status) {
        socket.emit('error', { message: 'Transport ID and status are required' });
        return;
      }

      const changes = await db.updateTransportStatus(transportId, status, socket.user.id, socket.user.role);
      
      if (changes === 0) {
        socket.emit('error', { message: 'Transport not found or access denied' });
        return;
      }

      const transports = await db.getTransportsByRole(socket.user.id, socket.user.role);
      const transport = transports.find(t => t.id == transportId);

      const statusData = {
        transportId,
        status,
        timestamp: new Date().toISOString(),
        transport
      };

      io.to('role_Admin').emit('transport_status_update', statusData);
      
      if (transport.assigned_clinician_id) {
        io.to(`clinician_${transport.assigned_clinician_id}`).emit('transport_status_update', statusData);
      }
      
      io.to(`client_${transport.client_id}`).emit('transport_status_update', statusData);

      console.log(`Transport ${transportId} status updated to ${status} by ${socket.user.name}`);
    } catch (error) {
      console.error('Transport status update error:', error);
      socket.emit('error', { message: 'Failed to update transport status' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} (${socket.user.role}) disconnected`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server ready for real-time connections`);
});
