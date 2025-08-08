const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;

const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());

let pool;

async function initDb() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    return;
  }
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(`
    create table if not exists users (
      id serial primary key,
      name text not null default '',
      email text unique not null,
      password_hash text not null,
      role text not null,
      created_at timestamptz not null default now()
    )
  `);

  const testUsers = [
    { email: 'admin@test.com', role: 'Admin' },
    { email: 'staff1@test.com', role: 'Staff' },
    { email: 'staff2@test.com', role: 'Staff' },
    { email: 'clinician@test.com', role: 'Clinician' },
    { email: 'family1@test.com', role: 'Family' },
    { email: 'family2@test.com', role: 'Family' }
  ];
  const passwordHash = await bcrypt.hash('password123', 10);
  for (const u of testUsers) {
    const name = u.email.split('@')[0];
    await pool.query(
      'insert into users (name, email, password_hash, role) values ($1, $2, $3, $4) on conflict (email) do nothing',
      [name, u.email, passwordHash, u.role]
    );
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Transport Tracking API is running' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    if (!pool) return res.status(500).json({ error: 'Database not initialized' });

    const result = await pool.query('select id, email, password_hash, role from users where email = $1', [email]);
    if (result.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/transports', authMiddleware, async (req, res) => {
  res.json([]);
});

app.get('/api/transports/:id/locations', authMiddleware, async (req, res) => {
  res.json([]);
});

app.put('/api/transports/:id/status', authMiddleware, async (req, res) => {
  res.json({ ok: true });
});


initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((e) => {
  console.error('Failed to init DB', e);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (DB init failed)`);
  });
});
