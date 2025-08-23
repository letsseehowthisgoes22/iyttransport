const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/client');

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDatabase();
    const user = await db.getUserById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = { id: user.id, role: user.role, name: user.name };
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication failed'));
  }
};

module.exports = { authenticateSocket };
