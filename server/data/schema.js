const UserRoles = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CLINICIAN: 'clinician',
  FAMILY: 'family'
};

const TransportStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const UserSchema = {
  user_id: 'string',
  name: 'string',
  email: 'string',
  password_hash: 'string',
  role: 'string',
  client_id: 'string'
};

const ClientSchema = {
  client_id: 'string',
  name: 'string',
  assigned_clinician_id: 'string'
};

const TransportSchema = {
  transport_id: 'string',
  client_id: 'string',
  staff_id: 'string',
  start_time: 'string',
  end_time: 'string',
  status: 'string',
  start_location: 'object',
  destination: 'object'
};

const LocationUpdateSchema = {
  update_id: 'string',
  transport_id: 'string',
  timestamp: 'string',
  latitude: 'number',
  longitude: 'number'
};

module.exports = {
  UserRoles,
  TransportStatus,
  UserSchema,
  ClientSchema,
  TransportSchema,
  LocationUpdateSchema
};
