import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const staffIcon = createCustomIcon('#007bff');
const startIcon = createCustomIcon('#28a745');
const endIcon = createCustomIcon('#dc3545');

const TransportMap = ({ 
  transports = [], 
  locationUpdates = [], 
  userRole, 
  selectedTransportId = null,
  onTransportSelect = null,
  height = '400px'
}) => {
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(10);

  useEffect(() => {
    if (transports.length === 0 && locationUpdates.length === 0) {
      return;
    }

    const allPoints = [];
    
    transports.forEach(transport => {
      if (transport.start_lat && transport.start_lng) {
        allPoints.push([transport.start_lat, transport.start_lng]);
      }
      if (transport.dest_lat && transport.dest_lng) {
        allPoints.push([transport.dest_lat, transport.dest_lng]);
      }
    });

    locationUpdates.forEach(update => {
      allPoints.push([update.latitude, update.longitude]);
    });

    if (allPoints.length > 0) {
      const avgLat = allPoints.reduce((sum, point) => sum + point[0], 0) / allPoints.length;
      const avgLng = allPoints.reduce((sum, point) => sum + point[1], 0) / allPoints.length;
      
      setMapCenter([avgLat, avgLng]);
      
      if (allPoints.length > 1) {
        const latSpread = Math.max(...allPoints.map(p => p[0])) - Math.min(...allPoints.map(p => p[0]));
        const lngSpread = Math.max(...allPoints.map(p => p[1])) - Math.min(...allPoints.map(p => p[1]));
        const maxSpread = Math.max(latSpread, lngSpread);
        
        if (maxSpread > 1) setMapZoom(8);
        else if (maxSpread > 0.1) setMapZoom(11);
        else setMapZoom(13);
      }
    }
  }, [transports, locationUpdates]);

  const locationsByTransport = locationUpdates.reduce((acc, update) => {
    if (!acc[update.transport_id]) {
      acc[update.transport_id] = [];
    }
    acc[update.transport_id].push(update);
    return acc;
  }, {});

  Object.keys(locationsByTransport).forEach(transportId => {
    locationsByTransport[transportId].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  });

  return (
    <div style={{ height, width: '100%', border: '1px solid #ddd', borderRadius: '8px' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render transport markers and routes */}
        {transports.map(transport => {
          const isSelected = selectedTransportId === transport.id;
          const transportLocations = locationsByTransport[transport.id] || [];
          const latestLocation = transportLocations[transportLocations.length - 1];
          
          return (
            <div key={transport.id}>
              {/* Start marker */}
              {transport.start_lat && transport.start_lng && (
                <Marker
                  position={[transport.start_lat, transport.start_lng]}
                  icon={startIcon}
                  eventHandlers={{
                    click: () => onTransportSelect && onTransportSelect(transport.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Start Location</strong><br />
                      Transport: {transport.client_name}<br />
                      Staff: {transport.staff_name}<br />
                      Status: {transport.status}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* End marker */}
              {transport.dest_lat && transport.dest_lng && (
                <Marker
                  position={[transport.dest_lat, transport.dest_lng]}
                  icon={endIcon}
                  eventHandlers={{
                    click: () => onTransportSelect && onTransportSelect(transport.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Destination</strong><br />
                      Transport: {transport.client_name}<br />
                      Staff: {transport.staff_name}<br />
                      Status: {transport.status}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Current location marker (latest GPS update) */}
              {latestLocation && (
                <Marker
                  position={[latestLocation.latitude, latestLocation.longitude]}
                  icon={staffIcon}
                  eventHandlers={{
                    click: () => onTransportSelect && onTransportSelect(transport.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Current Location</strong><br />
                      Transport: {transport.client_name}<br />
                      Staff: {transport.staff_name}<br />
                      Status: {transport.status}<br />
                      Last Update: {new Date(latestLocation.timestamp).toLocaleTimeString()}<br />
                      Accuracy: {latestLocation.accuracy}m
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Route line showing GPS trail */}
              {transportLocations.length > 1 && (isSelected || !selectedTransportId) && (
                <Polyline
                  positions={transportLocations.map(loc => [loc.latitude, loc.longitude])}
                  color={isSelected ? '#007bff' : '#6c757d'}
                  weight={isSelected ? 4 : 2}
                  opacity={isSelected ? 0.8 : 0.5}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
      
      {/* Map legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            backgroundColor: '#28a745', 
            borderRadius: '50%',
            marginRight: '5px'
          }}></span>
          Start Location
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            backgroundColor: '#007bff', 
            borderRadius: '50%',
            marginRight: '5px'
          }}></span>
          Current Location
        </div>
        <div>
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            backgroundColor: '#dc3545', 
            borderRadius: '50%',
            marginRight: '5px'
          }}></span>
          Destination
        </div>
      </div>
    </div>
  );
};

export default TransportMap;
