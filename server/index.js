const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const config = require('./config');
const { initializeDatabase } = require('./db/client');
const { initializeWebSocket } = require('./ws');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./api/auth'));
app.use('/api/transports', require('./api/transports'));

const io = initializeWebSocket(server);

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    server.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`WebSocket server available at /ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
