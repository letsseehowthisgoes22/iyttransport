const express = require('express');
const { authenticateToken, requireRole, validateTransportAccess } = require('../middleware/auth');

const router = express.Router();

let db;

router.get('/', authenticateToken, async (req, res) => {
  try {
    const transports = await db.getTransportsByRole(req.user.id, req.user.role);
    res.json(transports);
  } catch (error) {
    console.error('Get transports error:', error);
    res.status(500).json({ error: 'Failed to fetch transports' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { clientId, staffId, startLat, startLng, destLat, destLng } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const finalStaffId = staffId || (req.user.role === 'Staff' ? req.user.id : null);
    
    if (!finalStaffId) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    const transportId = await db.createTransport(
      clientId, 
      finalStaffId, 
      startLat, 
      startLng, 
      destLat, 
      destLng
    );

    res.status(201).json({
      message: 'Transport created successfully',
      transportId
    });
  } catch (error) {
    console.error('Create transport error:', error);
    res.status(500).json({ error: 'Failed to create transport' });
  }
});

router.put('/:id/status', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const changes = await db.updateTransportStatus(id, status, req.user.id, req.user.role);
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Transport not found or access denied' });
    }

    res.json({ message: 'Transport status updated successfully' });
  } catch (error) {
    console.error('Update transport status error:', error);
    res.status(500).json({ error: 'Failed to update transport status' });
  }
});

router.get('/:id/locations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const locations = await db.getLocationHistory(id, req.user.id, req.user.role);
    res.json(locations);
  } catch (error) {
    console.error('Get location history error:', error);
    if (error.message.includes('not found') || error.message.includes('permissions')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch location history' });
    }
  }
});

router.post('/:id/locations', authenticateToken, requireRole(['Staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const hasAccess = await validateTransportAccess(id, req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this transport' });
    }

    const locationId = await db.addLocationUpdate(id, latitude, longitude, accuracy);
    
    res.status(201).json({
      message: 'Location update added successfully',
      locationId,
      data: { latitude, longitude, accuracy, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Add location update error:', error);
    res.status(500).json({ error: 'Failed to add location update' });
  }
});

module.exports = (database) => {
  db = database;
  return router;
};
