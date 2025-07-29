const jwt = require('jsonwebtoken');
const Database = require('../database');

const db = new Database();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    try {
      const user = await db.getUserById(decoded.userId);
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireClientAccess = async (req, res, next) => {
  const { clientId } = req.params;
  const user = req.user;

  try {
    switch (user.role) {
      case 'Admin':
        next();
        break;
      case 'Clinician':
        const clients = await db.getClientsByClinicianId(user.id);
        const hasAccess = clients.some(client => client.id == clientId);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this client' });
        }
        next();
        break;
      case 'Family':
        if (user.client_id != clientId) {
          return res.status(403).json({ error: 'Access denied to this client' });
        }
        next();
        break;
      default:
        res.status(403).json({ error: 'Invalid role for client access' });
    }
  } catch (error) {
    console.error('Client access middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

const validateTransportAccess = async (transportId, userId, role) => {
  try {
    const transports = await db.getTransportsByRole(userId, role);
    return transports.some(transport => transport.id == transportId);
  } catch (error) {
    console.error('Transport access validation error:', error);
    return false;
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireClientAccess,
  validateTransportAccess
};
