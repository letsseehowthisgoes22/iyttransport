import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TransportMap = ({ transport, locationUpdates = [] }) => {
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]);

  useEffect(() => {
    if (transport && transport.start_location) {
      setMapCenter([transport.start_location.lat, transport.start_location.lng]);
    }
  }, [transport]);

  if (!transport) {
    return <div>No transport data available</div>;
  }

  const startIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const endIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const routePoints = [
    [transport.start_location.lat, transport.start_location.lng],
    ...locationUpdates.map(update => [update.latitude, update.longitude]),
    [transport.destination.lat, transport.destination.lng]
  ];

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <Marker 
          position={[transport.start_location.lat, transport.start_location.lng]}
          icon={startIcon}
        >
          <Popup>
            <div>
              <strong>Start Location</strong><br />
              {transport.start_location.address}
            </div>
          </Popup>
        </Marker>

        <Marker 
          position={[transport.destination.lat, transport.destination.lng]}
          icon={endIcon}
        >
          <Popup>
            <div>
              <strong>Destination</strong><br />
              {transport.destination.address}
            </div>
          </Popup>
        </Marker>

        {locationUpdates.map((update, index) => (
          <Marker 
            key={update.update_id}
            position={[update.latitude, update.longitude]}
          >
            <Popup>
              <div>
                <strong>Location Update</strong><br />
                Time: {new Date(update.timestamp).toLocaleString()}<br />
                Lat: {update.latitude}<br />
                Lng: {update.longitude}
              </div>
            </Popup>
          </Marker>
        ))}

        {routePoints.length > 1 && (
          <Polyline 
            positions={routePoints}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default TransportMap;
