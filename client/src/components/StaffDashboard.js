import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import useGeolocation from '../hooks/useGeolocation';
import TransportMap from './TransportMap';

const StaffDashboard = () => {
  const { user } = useAuth();
  const { connected, sendLocationUpdate, updateTransportStatus, onLocationUpdateConfirmed } = useSocket();
  const { 
    location, 
    error: geoError, 
    loading: geoLoading, 
    isWatching, 
    startWatching, 
    stopWatching, 
    requestPermission 
  } = useGeolocation();

  const [transports, setTransports] = useState([]);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [selectedTransportId, setSelectedTransportId] = useState(null);
  const [activeTransportId, setActiveTransportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransports = async () => {
      try {
        const response = await axios.get('/api/transports');
        setTransports(response.data);
        
        const inProgress = response.data.find(t => t.status === 'in-progress');
        if (inProgress) {
          setSelectedTransportId(inProgress.id);
          setActiveTransportId(inProgress.id);
        }
      } catch (error) {
        console.error('Failed to fetch transports:', error);
        setError('Failed to load transports');
      } finally {
        setLoading(false);
      }
    };

    fetchTransports();
  }, []);

  useEffect(() => {
    if (!selectedTransportId) return;

    const fetchLocationHistory = async () => {
      try {
        const response = await axios.get(`/api/transports/${selectedTransportId}/locations`);
        setLocationUpdates(response.data);
      } catch (error) {
        console.error('Failed to fetch location history:', error);
      }
    };

    fetchLocationHistory();
  }, [selectedTransportId]);

  useEffect(() => {
    if (location && activeTransportId && connected) {
      const success = sendLocationUpdate(
        activeTransportId,
        location.latitude,
        location.longitude,
        location.accuracy
      );
      
      if (success) {
        console.log('Location update sent:', location);
      }
    }
  }, [location, activeTransportId, connected, sendLocationUpdate]);

  useEffect(() => {
    const unsubscribe = onLocationUpdateConfirmed((data) => {
      console.log('Location update confirmed:', data);
      setLocationUpdates(prev => [...prev, {
        id: data.id,
        transport_id: data.transportId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: data.timestamp
      }]);
    });

    return unsubscribe;
  }, [onLocationUpdateConfirmed]);

  const handleStartTransport = async (transportId) => {
    try {
      await axios.put(`/api/transports/${transportId}/status`, { status: 'in-progress' });
      
      setTransports(prev => prev.map(t => 
        t.id === transportId ? { ...t, status: 'in-progress' } : t
      ));
      
      setActiveTransportId(transportId);
      setSelectedTransportId(transportId);
      
      requestPermission();
      
      updateTransportStatus(transportId, 'in-progress');
      
    } catch (error) {
      console.error('Failed to start transport:', error);
      setError('Failed to start transport');
    }
  };

  const handleCompleteTransport = async (transportId) => {
    try {
      await axios.put(`/api/transports/${transportId}/status`, { status: 'completed' });
      
      setTransports(prev => prev.map(t => 
        t.id === transportId ? { ...t, status: 'completed' } : t
      ));
      
      stopWatching();
      setActiveTransportId(null);
      
      updateTransportStatus(transportId, 'completed');
      
    } catch (error) {
      console.error('Failed to complete transport:', error);
      setError('Failed to complete transport');
    }
  };

  const handleStartLocationSharing = () => {
    if (!activeTransportId) {
      setError('Please start a transport first');
      return;
    }
    
    requestPermission();
    startWatching();
  };

  const handleStopLocationSharing = () => {
    stopWatching();
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading transports...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Staff Dashboard - {user.name}</h2>
        <div style={{ fontSize: '14px', color: connected ? 'green' : 'red' }}>
          Socket: {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Location Sharing Controls */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4>Location Sharing</h4>
        <div style={{ marginBottom: '10px' }}>
          <strong>Status:</strong> {isWatching ? 'Active' : 'Inactive'}
          {location && (
            <span style={{ marginLeft: '20px', fontSize: '12px', color: '#666' }}>
              Last update: {new Date(location.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {geoError && (
          <div style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>
            {geoError}
          </div>
        )}
        
        <div>
          <button
            onClick={handleStartLocationSharing}
            disabled={isWatching || !activeTransportId}
            style={{
              padding: '8px 16px',
              backgroundColor: isWatching ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginRight: '10px',
              cursor: isWatching || !activeTransportId ? 'not-allowed' : 'pointer'
            }}
          >
            {geoLoading ? 'Requesting Permission...' : 'Start Sharing Location'}
          </button>
          
          <button
            onClick={handleStopLocationSharing}
            disabled={!isWatching}
            style={{
              padding: '8px 16px',
              backgroundColor: !isWatching ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !isWatching ? 'not-allowed' : 'pointer'
            }}
          >
            Stop Sharing Location
          </button>
        </div>
      </div>

      {/* Transport List */}
      <div style={{ marginBottom: '20px' }}>
        <h4>My Transports</h4>
        {transports.length === 0 ? (
          <p>No transports assigned</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {transports.map(transport => (
              <div
                key={transport.id}
                style={{
                  border: selectedTransportId === transport.id ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: transport.status === 'in-progress' ? '#e7f3ff' : '#f8f9fa',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedTransportId(transport.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{transport.client_name}</strong>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Status: <span style={{ 
                        color: transport.status === 'in-progress' ? 'green' : 
                              transport.status === 'completed' ? 'blue' : 'orange'
                      }}>
                        {transport.status}
                      </span>
                    </div>
                    {transport.start_time && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Started: {new Date(transport.start_time).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {transport.status === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTransport(transport.id);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Start Transport
                      </button>
                    )}
                    
                    {transport.status === 'in-progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTransport(transport.id);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Complete Transport
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      {selectedTransportId && (
        <div>
          <h4>Transport Map</h4>
          <TransportMap
            transports={transports.filter(t => t.id === selectedTransportId)}
            locationUpdates={locationUpdates}
            userRole="Staff"
            selectedTransportId={selectedTransportId}
            height="500px"
          />
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
