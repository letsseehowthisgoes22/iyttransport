const express = require('express');
const inMemoryStore = require('../data/inMemoryStore');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { UserRoles, TransportStatus } = require('../data/schema');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const transports = inMemoryStore.getTransportsByRole(req.user.userId, req.user.role);
    res.json(transports);
  } catch (error) {
    console.error('Get transports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, requireRole([UserRoles.ADMIN, UserRoles.STAFF]), (req, res) => {
  try {
    const { clientId, staffId, startTime, startLocation, destination } = req.body;

    if (!clientId || !startLocation || !destination) {
      return res.status(400).json({ error: 'Client ID, start location, and destination are required' });
    }

    const transport = inMemoryStore.createTransport({
      client_id: clientId,
      staff_id: staffId || req.user.userId,
      start_time: startTime || new Date().toISOString(),
      end_time: null,
      status: TransportStatus.SCHEDULED,
      start_location: startLocation,
      destination: destination
    });

    res.status(201).json(transport);
  } catch (error) {
    console.error('Create transport error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:transportId', authenticateToken, requireRole([UserRoles.ADMIN, UserRoles.STAFF]), (req, res) => {
  try {
    const { transportId } = req.params;
    const updates = req.body;

    const updatedTransport = inMemoryStore.updateTransport(transportId, updates);
    if (!updatedTransport) {
      return res.status(404).json({ error: 'Transport not found' });
    }

    res.json(updatedTransport);
  } catch (error) {
    console.error('Update transport error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:transportId/locations', authenticateToken, (req, res) => {
  try {
    const { transportId } = req.params;
    const locationUpdates = inMemoryStore.getLocationUpdates(transportId);
    res.json(locationUpdates);
  } catch (error) {
    console.error('Get location updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:transportId/locations', authenticateToken, requireRole([UserRoles.STAFF]), (req, res) => {
  try {
    const { transportId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const locationUpdate = inMemoryStore.addLocationUpdate({
      transport_id: transportId,
      timestamp: new Date().toISOString(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });

    res.status(201).json(locationUpdate);
  } catch (error) {
    console.error('Add location update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
