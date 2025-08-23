const { Server } = require('socket.io');
const { authenticateSocket } = require('./auth');
const { handleTransportEvents } = require('./transports');

const initializeWebSocket = (server) => {
  const io = new Server(server, {
    path: '/ws',
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  const transportsNamespace = io.of('/transports');
  
  transportsNamespace.use(authenticateSocket);
  
  transportsNamespace.on('connection', (socket) => {
    console.log(`User ${socket.user.id} (${socket.user.role}) connected to transports namespace`);
    
    handleTransportEvents(transportsNamespace, socket);
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} (${socket.user.role}) disconnected`);
    });
  });

  return io;
};

module.exports = { initializeWebSocket };
