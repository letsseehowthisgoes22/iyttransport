const express = require('express');
const inMemoryStore = require('../data/inMemoryStore');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { UserRoles } = require('../data/schema');

const router = express.Router();

router.get('/', authenticateToken, requireRole([UserRoles.ADMIN]), (req, res) => {
  try {
    const users = inMemoryStore.getAllUsers().map(user => ({
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.client_id
    }));
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clients', authenticateToken, (req, res) => {
  try {
    const clients = inMemoryStore.getClients();
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
