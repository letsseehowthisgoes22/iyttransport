require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const config = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DISABLE_FAMILY_PRIVACY: process.env.DISABLE_FAMILY_PRIVACY === 'true'
};

if (!config.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = config;
