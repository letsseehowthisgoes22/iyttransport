import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransportMap from './TransportMap';

const AdminDashboard = () => {
  const [transports, setTransports] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transportsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/transports`),
        axios.get(`${API_URL}/users`)
      ]);
      
      setTransports(transportsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationUpdates = async (transportId) => {
    try {
      const response = await axios.get(`${API_URL}/transports/${transportId}/locations`);
      setLocationUpdates(response.data);
    } catch (error) {
      console.error('Error fetching location updates:', error);
    }
  };

  const handleTransportSelect = (transport) => {
    setSelectedTransport(transport);
    fetchLocationUpdates(transport.transport_id);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>All Transports</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {transports.map(transport => (
              <div 
                key={transport.transport_id}
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '10px', 
                  margin: '10px 0',
                  cursor: 'pointer',
                  backgroundColor: selectedTransport?.transport_id === transport.transport_id ? '#e3f2fd' : 'white'
                }}
                onClick={() => handleTransportSelect(transport)}
              >
                <strong>Transport {transport.transport_id}</strong><br />
                Status: <span style={{ 
                  color: transport.status === 'completed' ? 'green' : 
                        transport.status === 'in-progress' ? 'orange' : 'blue'
                }}>
                  {transport.status}
                </span><br />
                From: {transport.start_location.address}<br />
                To: {transport.destination.address}<br />
                Start: {new Date(transport.start_time).toLocaleString()}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>System Users</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {users.map(user => (
              <div 
                key={user.id}
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '10px', 
                  margin: '10px 0'
                }}
              >
                <strong>{user.name}</strong><br />
                Email: {user.email}<br />
                Role: <span style={{ 
                  color: user.role === 'admin' ? 'red' : 
                        user.role === 'staff' ? 'blue' : 
                        user.role === 'clinician' ? 'green' : 'purple'
                }}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTransport && (
        <div style={{ marginTop: '20px' }}>
          <h3>Transport Details & Map</h3>
          <TransportMap 
            transport={selectedTransport} 
            locationUpdates={locationUpdates}
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
