const Database = require('../database');

let dbInstance = null;

const getDatabase = () => {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
};

const initializeDatabase = async () => {
  const db = getDatabase();
  await db.init();
  return db;
};

module.exports = {
  getDatabase,
  initializeDatabase
};
