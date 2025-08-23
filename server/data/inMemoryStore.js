const bcrypt = require('bcryptjs');
const { UserRoles, TransportStatus } = require('./schema');

class InMemoryStore {
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.transports = new Map();
    this.locationUpdates = new Map();
    this.initializeData();
  }

  async initializeData() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUsers = [
      {
        user_id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
        password_hash: hashedPassword,
        role: UserRoles.ADMIN,
        client_id: null
      },
      {
        user_id: 'staff-1',
        name: 'Staff Member 1',
        email: 'staff1@test.com',
        password_hash: hashedPassword,
        role: UserRoles.STAFF,
        client_id: null
      },
      {
        user_id: 'staff-2',
        name: 'Staff Member 2',
        email: 'staff2@test.com',
        password_hash: hashedPassword,
        role: UserRoles.STAFF,
        client_id: null
      },
      {
        user_id: 'clinician-1',
        name: 'Dr. Smith',
        email: 'clinician@test.com',
        password_hash: hashedPassword,
        role: UserRoles.CLINICIAN,
        client_id: 'client-1'
      },
      {
        user_id: 'family-1',
        name: 'John Family',
        email: 'family1@test.com',
        password_hash: hashedPassword,
        role: UserRoles.FAMILY,
        client_id: 'client-1'
      },
      {
        user_id: 'family-2',
        name: 'Jane Family',
        email: 'family2@test.com',
        password_hash: hashedPassword,
        role: UserRoles.FAMILY,
        client_id: 'client-2'
      }
    ];

    const testClients = [
      {
        client_id: 'client-1',
        name: 'Patient One',
        assigned_clinician_id: 'clinician-1'
      },
      {
        client_id: 'client-2',
        name: 'Patient Two',
        assigned_clinician_id: 'clinician-1'
      }
    ];

    const testTransports = [
      {
        transport_id: 'transport-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        start_time: new Date().toISOString(),
        end_time: null,
        status: TransportStatus.IN_PROGRESS,
        start_location: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
        destination: { lat: 40.7589, lng: -73.9851, address: 'Central Park, NY' }
      },
      {
        transport_id: 'transport-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date().toISOString(),
        status: TransportStatus.COMPLETED,
        start_location: { lat: 40.7505, lng: -73.9934, address: 'Times Square, NY' },
        destination: { lat: 40.7614, lng: -73.9776, address: 'Columbus Circle, NY' }
      }
    ];

    const testLocationUpdates = [
      {
        update_id: 'update-1',
        transport_id: 'transport-1',
        timestamp: new Date().toISOString(),
        latitude: 40.7300,
        longitude: -74.0000
      },
      {
        update_id: 'update-2',
        transport_id: 'transport-1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        latitude: 40.7200,
        longitude: -73.9900
      }
    ];

    testUsers.forEach(user => this.users.set(user.user_id, user));
    testClients.forEach(client => this.clients.set(client.client_id, client));
    testTransports.forEach(transport => this.transports.set(transport.transport_id, transport));
    testLocationUpdates.forEach(update => this.locationUpdates.set(update.update_id, update));
  }

  getUserByEmail(email) {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  getUserById(userId) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  createUser(userData) {
    const userId = `user-${Date.now()}`;
    const user = { ...userData, user_id: userId };
    this.users.set(userId, user);
    return user;
  }

  getTransportsByRole(userId, role) {
    const allTransports = Array.from(this.transports.values());
    
    switch (role) {
      case UserRoles.ADMIN:
        return allTransports;
      
      case UserRoles.STAFF:
        return allTransports.filter(transport => transport.staff_id === userId);
      
      case UserRoles.CLINICIAN:
        const user = this.getUserById(userId);
        const clientsForClinician = Array.from(this.clients.values())
          .filter(client => client.assigned_clinician_id === userId)
          .map(client => client.client_id);
        return allTransports.filter(transport => clientsForClinician.includes(transport.client_id));
      
      case UserRoles.FAMILY:
        const familyUser = this.getUserById(userId);
        return allTransports.filter(transport => transport.client_id === familyUser.client_id);
      
      default:
        return [];
    }
  }

  createTransport(transportData) {
    const transportId = `transport-${Date.now()}`;
    const transport = { ...transportData, transport_id: transportId };
    this.transports.set(transportId, transport);
    return transport;
  }

  updateTransport(transportId, updates) {
    const transport = this.transports.get(transportId);
    if (transport) {
      const updatedTransport = { ...transport, ...updates };
      this.transports.set(transportId, updatedTransport);
      return updatedTransport;
    }
    return null;
  }

  getLocationUpdates(transportId) {
    return Array.from(this.locationUpdates.values())
      .filter(update => update.transport_id === transportId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  addLocationUpdate(updateData) {
    const updateId = `update-${Date.now()}`;
    const update = { ...updateData, update_id: updateId };
    this.locationUpdates.set(updateId, update);
    return update;
  }

  getClients() {
    return Array.from(this.clients.values());
  }

  getClientById(clientId) {
    return this.clients.get(clientId);
  }
}

module.exports = new InMemoryStore();
