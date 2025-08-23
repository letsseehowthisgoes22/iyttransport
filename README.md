# IYT Transport Tracking System

A comprehensive healthcare transport tracking application with role-based dashboards, real-time GPS tracking, and WebSocket communication.

## Features

- **Role-Based Access Control**: Admin, Staff, Clinician, and Family dashboards with appropriate permissions
- **Real-Time GPS Tracking**: Live location updates via WebSocket with React Leaflet maps
- **Privacy Controls**: Family role receives delayed and jittered location data for privacy
- **Modular Architecture**: Clean separation of API, WebSocket, and database concerns
- **Security**: JWT authentication, input validation, rate limiting, and PHI protection

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Installation

1. Clone the repository:
```bash
git clone https://github.com/letsseehowthisgoes22/iyttransport.git
cd iyttransport
```

2. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL, JWT secret, etc.
```

4. Seed the database:
```bash
cd server && node seed.js && cd ..
```

5. Start the application:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:5000/ws

## Architecture

### Server Structure
```
server/
  index.js              # Bootstrap only (HTTP server + route mounting)
  config.js             # Environment configuration
  api/
    auth.js             # Authentication endpoints
    transports.js       # Transport management endpoints
  ws/
    index.js            # WebSocket server initialization
    auth.js             # JWT handshake authentication
    transports.js       # WebSocket event handlers
  db/
    client.js           # Database client wrapper
    models/             # Data models (future expansion)
  middleware/
    auth.js             # Authentication middleware
  database.js           # Database class (legacy, wrapped by db/client.js)
```

### WebSocket Contract

**Connection**: `ws://localhost:5000/ws` with namespace `/transports`

**Authentication**: JWT token in handshake auth

**Events**:
- Client → Server:
  - `transport:join {id}` - Join transport room
  - `position:update {id, lat, lon, ts}` - Send GPS update (Staff only)
  - `status:update {id, status, note?}` - Update transport status

- Server → Client:
  - `position:rx` - Receive GPS updates (with privacy controls for Family)
  - `status:rx` - Receive status updates
  - `transport:joined` - Confirmation of room join

**Rooms**: `transport:{id}` format for transport-specific communication

## User Roles & Permissions

### Admin
- Full system access
- View all transports and users
- System-wide dashboard with real-time activity feed

### Staff
- Read/write access to assigned transports
- GPS location sharing capabilities
- Transport management (start/complete)

### Clinician
- Read-only access to assigned client transports
- Transport monitoring and status overview

### Family
- Read-only access to family member transports
- Privacy-protected location data (3-5 min delay, 200-500m jitter)
- Real-time status notifications

## Test Credentials

```
Admin: admin@test.com / password123
Staff: staff1@test.com, staff2@test.com / password123
Clinician: clinician@test.com / password123
Family: family1@test.com, family2@test.com / password123
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Strict data filtering by user role
- **Input Validation**: Zod schemas for all WebSocket payloads
- **Rate Limiting**: Position updates limited to 2 Hz per user/transport
- **Privacy Controls**: Family location data delayed and jittered
- **PHI Protection**: No sensitive data in logs
- **CORS Protection**: Restricted to configured frontend domains

## Development

### Running Tests
```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test
```

### Environment Variables
See `.env.example` for all required configuration options.

### Privacy Controls
Set `DISABLE_FAMILY_PRIVACY=true` in `.env` to disable location delay/jitter for clinical testing.

## Deployment

The application is designed for deployment on platforms like Render, Heroku, or similar:

1. Deploy backend as Node.js service
2. Deploy frontend as static site
3. Configure environment variables in deployment platform
4. Ensure database is accessible from deployed backend

## License

MIT License - see LICENSE file for details.
