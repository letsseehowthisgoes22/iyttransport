import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import TransportMap from './TransportMap';

const ClinicianDashboard = () => {
  const { user } = useAuth();
  const { connected, onLocationUpdate, onTransportStatusUpdate } = useSocket();
  
  const [transports, setTransports] = useState([]);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [selectedTransportId, setSelectedTransportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransports = async () => {
      try {
        const response = await axios.get('/api/transports');
        setTransports(response.data);
        
        const active = response.data.find(t => t.status === 'in-progress');
        if (active) {
          setSelectedTransportId(active.id);
        } else if (response.data.length > 0) {
          setSelectedTransportId(response.data[0].id);
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
    const unsubscribe = onLocationUpdate((data) => {
      console.log('Received location update:', data);
      
      const canSeeTransport = transports.some(t => t.id == data.transportId);
      if (canSeeTransport) {
        setLocationUpdates(prev => {
          const filtered = prev.filter(update => 
            !(update.transport_id == data.transportId && update.id === data.id)
          );
          return [...filtered, {
            id: data.id,
            transport_id: data.transportId,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: data.timestamp
          }];
        });
      }
    });

    return unsubscribe;
  }, [onLocationUpdate, transports]);

  useEffect(() => {
    const unsubscribe = onTransportStatusUpdate((data) => {
      console.log('Received transport status update:', data);
      
      setTransports(prev => prev.map(transport => 
        transport.id == data.transportId 
          ? { ...transport, status: data.status }
          : transport
      ));
    });

    return unsubscribe;
  }, [onTransportStatusUpdate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#ffc107';
      case 'in-progress': return '#28a745';
      case 'completed': return '#007bff';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading transports...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Clinician Dashboard - {user.name}</h2>
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

      {/* Transport Overview */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4>Transport Overview</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {transports.filter(t => t.status === 'scheduled').length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Scheduled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {transports.filter(t => t.status === 'in-progress').length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>In Progress</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {transports.filter(t => t.status === 'completed').length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Transport List */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Client Transports</h4>
        {transports.length === 0 ? (
          <p>No transports for assigned clients</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {transports.map(transport => {
              const latestUpdate = locationUpdates
                .filter(update => update.transport_id == transport.id)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
              
              return (
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
                        Staff: {transport.staff_name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Status: <span style={{ color: getStatusColor(transport.status) }}>
                          {transport.status}
                        </span>
                      </div>
                      {transport.start_time && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Started: {new Date(transport.start_time).toLocaleString()}
                        </div>
                      )}
                      {latestUpdate && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Last GPS Update: {new Date(latestUpdate.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      {transport.status === 'in-progress' && (
                        <div style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          LIVE
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Map */}
      {selectedTransportId && (
        <div>
          <h4>Transport Tracking Map</h4>
          <TransportMap
            transports={transports.filter(t => t.id === selectedTransportId)}
            locationUpdates={locationUpdates.filter(update => update.transport_id == selectedTransportId)}
            userRole="Clinician"
            selectedTransportId={selectedTransportId}
            height="500px"
          />
          
          {/* Location History */}
          <div style={{ marginTop: '20px' }}>
            <h5>Recent Location Updates</h5>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ddd', 
              borderRadius: '5px',
              padding: '10px'
            }}>
              {locationUpdates
                .filter(update => update.transport_id == selectedTransportId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
                .map(update => (
                  <div key={update.id} style={{ 
                    padding: '5px 0', 
                    borderBottom: '1px solid #eee',
                    fontSize: '14px'
                  }}>
                    <strong>{new Date(update.timestamp).toLocaleTimeString()}</strong>
                    <span style={{ marginLeft: '10px', color: '#666' }}>
                      {update.latitude.toFixed(6)}, {update.longitude.toFixed(6)}
                    </span>
                    {update.accuracy && (
                      <span style={{ marginLeft: '10px', color: '#999', fontSize: '12px' }}>
                        ±{update.accuracy}m
                      </span>
                    )}
                  </div>
                ))
              }
              {locationUpdates.filter(update => update.transport_id == selectedTransportId).length === 0 && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  No location updates yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicianDashboard;
