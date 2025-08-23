import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransportMap from './TransportMap';
import { useAuth } from '../contexts/AuthContext';

const ClinicianDashboard = () => {
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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.client_id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Clinician Dashboard - {user?.name}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>My Patients' Transports</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                Patient: <strong>{getClientName(transport.client_id)}</strong><br />
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
            ))}
          </div>
        </div>

        <div>
          <h3>My Patients</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {clients.filter(client => client.assigned_clinician_id === user?.id).map(client => (
              <div 
                key={client.client_id}
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '10px', 
                  margin: '10px 0'
                }}
              >
                <strong>{client.name}</strong><br />
                Client ID: {client.client_id}<br />
                Active Transports: {transports.filter(t => 
                  t.client_id === client.client_id && 
                  (t.status === 'scheduled' || t.status === 'in-progress')
                ).length}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTransport && (
        <div style={{ marginTop: '20px' }}>
          <h3>Transport Monitoring</h3>
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <strong>Patient:</strong> {getClientName(selectedTransport.client_id)}<br />
            <strong>Status:</strong> {selectedTransport.status}<br />
            <strong>Route:</strong> {selectedTransport.start_location.address} → {selectedTransport.destination.address}
          </div>
          
          <TransportMap 
            transport={selectedTransport} 
            locationUpdates={locationUpdates}
          />
          
          <div style={{ marginTop: '15px' }}>
            <h4>Location History</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {locationUpdates.map(update => (
                <div key={update.update_id} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
                  <strong>{new Date(update.timestamp).toLocaleString()}</strong><br />
                  Location: ({update.latitude}, {update.longitude})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicianDashboard;
