const Database = require('./database');

const db = new Database();

async function seedDatabase() {
  try {
    console.log('Seeding database with test data...');

    const client1Id = await db.createClient('John Doe');
    const client2Id = await db.createClient('Jane Smith');
    const client3Id = await db.createClient('Bob Johnson');

    console.log('Created test clients');

    const adminId = await db.createUser('Admin User', 'admin@test.com', 'password123', 'Admin');
    const staffId1 = await db.createUser('Staff Member 1', 'staff1@test.com', 'password123', 'Staff');
    const staffId2 = await db.createUser('Staff Member 2', 'staff2@test.com', 'password123', 'Staff');
    const clinicianId = await db.createUser('Dr. Smith', 'clinician@test.com', 'password123', 'Clinician');
    const familyId1 = await db.createUser('John Doe Family', 'family1@test.com', 'password123', 'Family', client1Id);
    const familyId2 = await db.createUser('Jane Smith Family', 'family2@test.com', 'password123', 'Family', client2Id);

    console.log('Created test users');

    await db.db.run('UPDATE clients SET assigned_clinician_id = ? WHERE id IN (?, ?)', [clinicianId, client1Id, client2Id]);

    console.log('Assigned clinician to clients');

    const transport1Id = await db.createTransport(
      client1Id, 
      staffId1, 
      40.7128, -74.0060, // New York coordinates
      40.7589, -73.9851  // Times Square coordinates
    );

    const transport2Id = await db.createTransport(
      client2Id, 
      staffId2, 
      34.0522, -118.2437, // Los Angeles coordinates
      34.0928, -118.3287  // Beverly Hills coordinates
    );

    const transport3Id = await db.createTransport(
      client3Id, 
      staffId1, 
      41.8781, -87.6298, // Chicago coordinates
      41.8976, -87.6205  // Lincoln Park coordinates
    );

    console.log('Created test transports');

    await db.addLocationUpdate(transport1Id, 40.7128, -74.0060, 10);
    await db.addLocationUpdate(transport1Id, 40.7200, -74.0000, 8);
    await db.addLocationUpdate(transport1Id, 40.7300, -73.9900, 12);

    await db.addLocationUpdate(transport2Id, 34.0522, -118.2437, 15);
    await db.addLocationUpdate(transport2Id, 34.0600, -118.2300, 10);

    console.log('Added sample location updates');

    console.log('Database seeded successfully!');
    console.log('\nTest user credentials:');
    console.log('Admin: admin@test.com / password123');
    console.log('Staff 1: staff1@test.com / password123');
    console.log('Staff 2: staff2@test.com / password123');
    console.log('Clinician: clinician@test.com / password123');
    console.log('Family 1: family1@test.com / password123');
    console.log('Family 2: family2@test.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
