const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class Database {
  constructor() {
    const dbPath = process.env.DB_PATH || './database.sqlite';
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('Admin', 'Staff', 'Clinician', 'Family')),
          client_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          assigned_clinician_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_clinician_id) REFERENCES users (id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS transports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          start_time DATETIME,
          end_time DATETIME,
          status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
          start_lat REAL,
          start_lng REAL,
          dest_lat REAL,
          dest_lng REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (staff_id) REFERENCES users (id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS location_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transport_id INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracy REAL,
          FOREIGN KEY (transport_id) REFERENCES transports (id)
        )
      `);
    });
  }

  async createUser(name, email, password, role, clientId = null) {
    return new Promise((resolve, reject) => {
      const passwordHash = bcrypt.hashSync(password, 10);
      this.db.run(
        'INSERT INTO users (name, email, password_hash, role, client_id) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, role, clientId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async createClient(name, assignedClinicianId = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO clients (name, assigned_clinician_id) VALUES (?, ?)',
        [name, assignedClinicianId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getClientsByClinicianId(clinicianId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM clients WHERE assigned_clinician_id = ?',
        [clinicianId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async createTransport(clientId, staffId, startLat = null, startLng = null, destLat = null, destLng = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO transports (client_id, staff_id, start_lat, start_lng, dest_lat, dest_lng) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, staffId, startLat, startLng, destLat, destLng],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getTransportsByRole(userId, role) {
    return new Promise((resolve, reject) => {
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
            WHERE t.staff_id = ?
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
            WHERE c.assigned_clinician_id = ?
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
            WHERE f.id = ?
            ORDER BY t.created_at DESC
          `;
          params = [userId];
          break;
        default:
          reject(new Error('Invalid role'));
          return;
      }

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async updateTransportStatus(transportId, status, userId, role) {
    return new Promise((resolve, reject) => {
      let permissionQuery;
      let permissionParams;

      switch (role) {
        case 'Admin':
          permissionQuery = 'SELECT id FROM transports WHERE id = ?';
          permissionParams = [transportId];
          break;
        case 'Staff':
          permissionQuery = 'SELECT id FROM transports WHERE id = ? AND staff_id = ?';
          permissionParams = [transportId, userId];
          break;
        default:
          reject(new Error('Insufficient permissions'));
          return;
      }

      this.db.get(permissionQuery, permissionParams, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          reject(new Error('Transport not found or insufficient permissions'));
          return;
        }

        const updateTime = status === 'in-progress' ? 'start_time = CURRENT_TIMESTAMP' : 
                          status === 'completed' ? 'end_time = CURRENT_TIMESTAMP' : '';
        
        const query = updateTime ? 
          `UPDATE transports SET status = ?, ${updateTime} WHERE id = ?` :
          'UPDATE transports SET status = ? WHERE id = ?';

        this.db.run(query, [status, transportId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
    });
  }

  async addLocationUpdate(transportId, latitude, longitude, accuracy = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO location_updates (transport_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)',
        [transportId, latitude, longitude, accuracy],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getLocationHistory(transportId, userId, role) {
    return new Promise((resolve, reject) => {
      let permissionQuery;
      let permissionParams;

      switch (role) {
        case 'Admin':
          permissionQuery = 'SELECT id FROM transports WHERE id = ?';
          permissionParams = [transportId];
          break;
        case 'Staff':
          permissionQuery = 'SELECT id FROM transports WHERE id = ? AND staff_id = ?';
          permissionParams = [transportId, userId];
          break;
        case 'Clinician':
          permissionQuery = `
            SELECT t.id FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            WHERE t.id = ? AND c.assigned_clinician_id = ?
          `;
          permissionParams = [transportId, userId];
          break;
        case 'Family':
          permissionQuery = `
            SELECT t.id FROM transports t 
            JOIN clients c ON t.client_id = c.id 
            JOIN users f ON f.client_id = c.id
            WHERE t.id = ? AND f.id = ?
          `;
          permissionParams = [transportId, userId];
          break;
        default:
          reject(new Error('Invalid role'));
          return;
      }

      this.db.get(permissionQuery, permissionParams, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          reject(new Error('Transport not found or insufficient permissions'));
          return;
        }

        this.db.all(
          'SELECT * FROM location_updates WHERE transport_id = ? ORDER BY timestamp DESC',
          [transportId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
