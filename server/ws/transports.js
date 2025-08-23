const { z } = require('zod');
const { getDatabase } = require('../db/client');

const positionUpdateSchema = z.object({
  id: z.number(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  ts: z.string()
});

const statusUpdateSchema = z.object({
  id: z.number(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']),
  note: z.string().optional()
});

const transportJoinSchema = z.object({
  id: z.number()
});

const applyFamilyPrivacy = (position) => {
  const delay = 3 + Math.random() * 2;
  const jitterLat = (Math.random() - 0.5) * 0.009;
  const jitterLon = (Math.random() - 0.5) * 0.009;
  
  return {
    ...position,
    lat: position.lat + jitterLat,
    lon: position.lon + jitterLon,
    ts: new Date(Date.now() - delay * 60 * 1000).toISOString()
  };
};

const rateLimits = new Map();

const checkRateLimit = (userId, transportId) => {
  const key = `${userId}-${transportId}`;
  const now = Date.now();
  const limit = rateLimits.get(key) || { count: 0, resetTime: now + 500 };
  
  if (now > limit.resetTime) {
    limit.count = 0;
    limit.resetTime = now + 500;
  }
  
  if (limit.count >= 1) {
    return false;
  }
  
  limit.count++;
  rateLimits.set(key, limit);
  return true;
};

const handleTransportEvents = (io, socket) => {
  socket.on('transport:join', async (data) => {
    try {
      const validated = transportJoinSchema.parse(data);
      const db = getDatabase();
      
      const hasAccess = await db.checkTransportAccess(socket.user.id, validated.id, socket.user.role);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to transport' });
        return;
      }
      
      socket.join(`transport:${validated.id}`);
      socket.emit('transport:joined', { id: validated.id });
      console.log(`User ${socket.user.id} (${socket.user.role}) joined transport:${validated.id}`);
    } catch (error) {
      console.error('Transport join error:', error.message);
      socket.emit('error', { message: 'Failed to join transport' });
    }
  });

  socket.on('position:update', async (data) => {
    try {
      if (socket.user.role !== 'Staff') {
        socket.emit('error', { message: 'Only staff can send position updates' });
        return;
      }

      const validated = positionUpdateSchema.parse(data);
      
      if (!checkRateLimit(socket.user.id, validated.id)) {
        socket.emit('error', { message: 'Rate limit exceeded (max 2 Hz)' });
        return;
      }

      const db = getDatabase();
      const hasAccess = await db.checkTransportAccess(socket.user.id, validated.id, socket.user.role);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to transport' });
        return;
      }

      await db.addLocationUpdate(validated.id, validated.lat, validated.lon, 10);
      
      const room = `transport:${validated.id}`;
      const clients = await io.in(room).fetchSockets();
      
      for (const client of clients) {
        let position = validated;
        if (client.user.role === 'Family' && !process.env.DISABLE_FAMILY_PRIVACY) {
          position = applyFamilyPrivacy(position);
        }
        client.emit('position:rx', position);
      }
      
      console.log(`Position update from user ${socket.user.id} for transport ${validated.id}`);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid position data', details: error.errors });
      } else {
        console.error('Position update error:', error.message);
        socket.emit('error', { message: 'Failed to process position update' });
      }
    }
  });

  socket.on('status:update', async (data) => {
    try {
      const validated = statusUpdateSchema.parse(data);
      const db = getDatabase();
      
      if (socket.user.role === 'Family') {
        socket.emit('error', { message: 'Families cannot update transport status' });
        return;
      }
      
      if (socket.user.role === 'Clinician') {
        socket.emit('error', { message: 'Clinicians have read-only access' });
        return;
      }

      const hasAccess = await db.checkTransportAccess(socket.user.id, validated.id, socket.user.role);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to transport' });
        return;
      }

      await db.updateTransportStatus(validated.id, validated.status);
      
      io.to(`transport:${validated.id}`).emit('status:rx', validated);
      console.log(`Status update from user ${socket.user.id} for transport ${validated.id}: ${validated.status}`);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid status data', details: error.errors });
      } else {
        console.error('Status update error:', error.message);
        socket.emit('error', { message: 'Failed to process status update' });
      }
    }
  });
};

module.exports = { handleTransportEvents };
