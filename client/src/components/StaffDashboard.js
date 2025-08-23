import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransportMap from './TransportMap';
import { useAuth } from '../contexts/AuthContext';

const StaffDashboard = () => {
  const [transports, setTransports] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [newLocation, setNewLocation] = useState({ latitude: '', longitude: '' });
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

  const updateTransportStatus = async (transportId, status) => {
    try {
      await axios.put(`${API_URL}/transports/${transportId}`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating transport status:', error);
    }
  };

  const addLocationUpdate = async () => {
    if (!selectedTransport || !newLocation.latitude || !newLocation.longitude) {
      return;
    }

    try {
      await axios.post(`${API_URL}/transports/${selectedTransport.transport_id}/locations`, {
        latitude: parseFloat(newLocation.latitude),
        longitude: parseFloat(newLocation.longitude)
      });
      
      setNewLocation({ latitude: '', longitude: '' });
      fetchLocationUpdates(selectedTransport.transport_id);
    } catch (error) {
      console.error('Error adding location update:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Staff Dashboard - {user?.name}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>My Assigned Transports</h3>
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
                Status: <span style={{ 
                  color: transport.status === 'completed' ? 'green' : 
                        transport.status === 'in-progress' ? 'orange' : 'blue'
                }}>
                  {transport.status}
                </span><br />
                From: {transport.start_location.address}<br />
                To: {transport.destination.address}<br />
                Start: {new Date(transport.start_time).toLocaleString()}
                
                <div style={{ marginTop: '10px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTransportStatus(transport.transport_id, 'in-progress');
                    }}
                    disabled={transport.status !== 'scheduled'}
                    style={{ marginRight: '5px', padding: '5px 10px' }}
                  >
                    Start
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTransportStatus(transport.transport_id, 'completed');
                    }}
                    disabled={transport.status !== 'in-progress'}
                    style={{ padding: '5px 10px' }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>GPS Location Updates</h3>
          {selectedTransport ? (
            <div>
              <p><strong>Selected:</strong> Transport {selectedTransport.transport_id}</p>
              
              <div style={{ marginBottom: '15px' }}>
                <h4>Add Location Update</h4>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={newLocation.latitude}
                    onChange={(e) => setNewLocation({...newLocation, latitude: e.target.value})}
                    style={{ marginRight: '10px', padding: '5px' }}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={newLocation.longitude}
                    onChange={(e) => setNewLocation({...newLocation, longitude: e.target.value})}
                    style={{ padding: '5px' }}
                  />
                </div>
                <button 
                  onClick={getCurrentLocation}
                  style={{ marginRight: '10px', padding: '5px 10px' }}
                >
                  Use Current Location
                </button>
                <button 
                  onClick={addLocationUpdate}
                  style={{ padding: '5px 10px' }}
                >
                  Add Update
                </button>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <h4>Recent Updates</h4>
                {locationUpdates.map(update => (
                  <div key={update.update_id} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
                    {new Date(update.timestamp).toLocaleString()}: 
                    ({update.latitude}, {update.longitude})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Select a transport to manage location updates</p>
          )}
        </div>
      </div>

      {selectedTransport && (
        <div style={{ marginTop: '20px' }}>
          <h3>Transport Route Map</h3>
          <TransportMap 
            transport={selectedTransport} 
            locationUpdates={locationUpdates}
          />
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
