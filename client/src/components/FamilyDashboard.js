import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransportMap from './TransportMap';
import { useAuth } from '../contexts/AuthContext';

const FamilyDashboard = () => {
  const [transports, setTransports] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transportsRes, clientsRes] = await Promise.all([
        axios.get(`${API_URL}/transports`),
        axios.get(`${API_URL}/users/clients`)
      ]);
      
      setTransports(transportsRes.data);
      setClients(clientsRes.data);
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

  const getFamilyMemberName = () => {
    const client = clients.find(c => c.client_id === user?.clientId);
    return client ? client.name : 'Family Member';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Family Dashboard - {user?.name}</h2>
      <p>Tracking transports for: <strong>{getFamilyMemberName()}</strong></p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Family Member Transports</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {transports.length === 0 ? (
              <p>No transports found for your family member.</p>
            ) : (
              transports.map(transport => (
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
                  {transport.end_time && (
                    <>
                      <br />End: {new Date(transport.end_time).toLocaleString()}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3>Transport Status</h3>
          {selectedTransport ? (
            <div>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '15px' }}>
                <h4>Current Transport Details</h4>
                <strong>Status:</strong> <span style={{ 
                  color: selectedTransport.status === 'completed' ? 'green' : 
                        selectedTransport.status === 'in-progress' ? 'orange' : 'blue'
                }}>
                  {selectedTransport.status.toUpperCase()}
                </span><br />
                <strong>From:</strong> {selectedTransport.start_location.address}<br />
                <strong>To:</strong> {selectedTransport.destination.address}<br />
                <strong>Started:</strong> {new Date(selectedTransport.start_time).toLocaleString()}
                {selectedTransport.end_time && (
                  <>
                    <br /><strong>Completed:</strong> {new Date(selectedTransport.end_time).toLocaleString()}
                  </>
                )}
              </div>

              <div>
                <h4>Recent Location Updates</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {locationUpdates.length === 0 ? (
                    <p>No location updates available yet.</p>
                  ) : (
                    locationUpdates.map(update => (
                      <div key={update.update_id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <strong>{new Date(update.timestamp).toLocaleString()}</strong><br />
                        Location: ({update.latitude.toFixed(4)}, {update.longitude.toFixed(4)})
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p>Select a transport to view details and tracking information.</p>
          )}
        </div>
      </div>

      {selectedTransport && (
        <div style={{ marginTop: '20px' }}>
          <h3>Live Transport Tracking</h3>
          <TransportMap 
            transport={selectedTransport} 
            locationUpdates={locationUpdates}
          />
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;
