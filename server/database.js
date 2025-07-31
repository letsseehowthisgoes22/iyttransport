const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Connected to PostgreSQL' : 'No DATABASE_URL found');
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    this.init();
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          assigned_clinician_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Staff', 'Clinician', 'Family')),
          client_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS transports (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
          start_lat DECIMAL(10, 8),
          start_lng DECIMAL(11, 8),
          dest_lat DECIMAL(10, 8),
          dest_lng DECIMAL(11, 8),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS location_updates (
          id SERIAL PRIMARY KEY,
          transport_id INTEGER NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          accuracy DECIMAL(6, 2)
        )
      `);

      console.log('Skipping foreign key constraint creation - tables created successfully');
      
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }

  async createUser(name, email, password, role, clientId = null) {
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await this.pool.query(
        'INSERT INTO users (name, email, password_hash, role, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, email, passwordHash, role, clientId]
      );
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async createClient(name, assignedClinicianId = null) {
    try {
      const result = await this.pool.query(
        'INSERT INTO clients (name, assigned_clinician_id) VALUES ($1, $2) RETURNING id',
        [name, assignedClinicianId]
      );
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async getClientsByClinicianId(clinicianId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM clients WHERE assigned_clinician_id = $1',
        [clinicianId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async createTransport(clientId, staffId, startLat = null, startLng = null, destLat = null, destLng = null) {
    try {
      const result = await this.pool.query(
        'INSERT INTO transports (client_id, staff_id, start_lat, start_lng, dest_lat, dest_lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [clientId, staffId, startLat, startLng, destLat, destLng]
      );
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async getTransportsByRole(userId, role) {
    try {
      let query;
      let params;

      switch (role) {
        case 'Admin':
          query = `
            SELECT t.*, c.name as client_name, u.name as staff_name 
            FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users u ON t.staff_id = u.id
            ORDER BY t.created_at DESC
          `;
          params = [];
          break;
        case 'Staff':
          query = `
            SELECT t.*, c.name as client_name, u.name as staff_name 
            FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users u ON t.staff_id = u.id
            WHERE t.staff_id = $1
            ORDER BY t.created_at DESC
          `;
          params = [userId];
          break;
        case 'Clinician':
          query = `
            SELECT t.*, c.name as client_name, u.name as staff_name 
            FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users u ON t.staff_id = u.id
            WHERE c.assigned_clinician_id = $1
            ORDER BY t.created_at DESC
          `;
          params = [userId];
          break;
        case 'Family':
          query = `
            SELECT t.*, c.name as client_name, u.name as staff_name 
            FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users u ON t.staff_id = u.id
            JOIN users f ON f.client_id = c.id
            WHERE f.id = $1
            ORDER BY t.created_at DESC
          `;
          params = [userId];
          break;
        default:
          throw new Error('Invalid role');
      }

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updateTransportStatus(transportId, status, userId, role) {
    try {
      let permissionQuery;
      let permissionParams;

      switch (role) {
        case 'Admin':
          permissionQuery = 'SELECT id FROM transports WHERE id = $1';
          permissionParams = [transportId];
          break;
        case 'Staff':
          permissionQuery = 'SELECT id FROM transports WHERE id = $1 AND staff_id = $2';
          permissionParams = [transportId, userId];
          break;
        default:
          throw new Error('Insufficient permissions');
      }

      const permissionResult = await this.pool.query(permissionQuery, permissionParams);
      if (permissionResult.rows.length === 0) {
        throw new Error('Transport not found or insufficient permissions');
      }

      const updateTime = status === 'in-progress' ? 'start_time = CURRENT_TIMESTAMP' : 
                        status === 'completed' ? 'end_time = CURRENT_TIMESTAMP' : '';
      
      const query = updateTime ? 
        `UPDATE transports SET status = $1, ${updateTime} WHERE id = $2` :
        'UPDATE transports SET status = $1 WHERE id = $2';

      const result = await this.pool.query(query, [status, transportId]);
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  async addLocationUpdate(transportId, latitude, longitude, accuracy = null) {
    try {
      const result = await this.pool.query(
        'INSERT INTO location_updates (transport_id, latitude, longitude, accuracy) VALUES ($1, $2, $3, $4) RETURNING id',
        [transportId, latitude, longitude, accuracy]
      );
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async getLocationHistory(transportId, userId, role) {
    try {
      let permissionQuery;
      let permissionParams;

      switch (role) {
        case 'Admin':
          permissionQuery = 'SELECT id FROM transports WHERE id = $1';
          permissionParams = [transportId];
          break;
        case 'Staff':
          permissionQuery = 'SELECT id FROM transports WHERE id = $1 AND staff_id = $2';
          permissionParams = [transportId, userId];
          break;
        case 'Clinician':
          permissionQuery = `
            SELECT t.id FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            WHERE t.id = $1 AND c.assigned_clinician_id = $2
          `;
          permissionParams = [transportId, userId];
          break;
        case 'Family':
          permissionQuery = `
            SELECT t.id FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users f ON f.client_id = c.id
            WHERE t.id = $1 AND f.id = $2
          `;
          permissionParams = [transportId, userId];
          break;
        default:
          throw new Error('Invalid role');
      }

      const permissionResult = await this.pool.query(permissionQuery, permissionParams);
      if (permissionResult.rows.length === 0) {
        throw new Error('Transport not found or insufficient permissions');
      }

      const result = await this.pool.query(
        'SELECT * FROM location_updates WHERE transport_id = $1 ORDER BY timestamp DESC',
        [transportId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
