# GPS Payload and WebSocket Message Examples

## 📡 **GPS Data Flow Architecture**

```
[Staff Mobile Device] → [Geolocation API] → [React App] → [WebSocket] → [Server] → [Database]
                                                            ↓
[Other Dashboards] ← [WebSocket Broadcast] ← [Role Filter] ← [Server]
```

---

## 📱 **Outgoing GPS Payload (Staff Device)**

### **Geolocation API Response**
```javascript
// navigator.geolocation.getCurrentPosition() success callback
{
  "coords": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "altitude": null,
    "altitudeAccuracy": null,
    "heading": null,
    "speed": null
  },
  "timestamp": 1753795500000
}
```

### **Processed GPS Payload (Sent to Server)**
```javascript
// WebSocket emit: 'location_update'
{
  "transportId": 1,
  "staffId": 2,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10,
  "timestamp": "2025-07-29T13:25:00.000Z",
  "source": "gps"
}
```

### **High-Accuracy GPS Options**
```javascript
// Geolocation options for staff tracking
{
  "enableHighAccuracy": true,
  "timeout": 10000,
  "maximumAge": 30000
}
```

---

## 🌐 **WebSocket Message Flow**

### **1. Staff Location Update (Outgoing)**
```javascript
// Client → Server
socket.emit('location_update', {
  transportId: 1,
  staffId: 2,
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp: '2025-07-29T13:25:00.000Z'
});
```

### **2. Server Processing & Database Storage**
```sql
-- Server inserts into location_updates table
INSERT INTO location_updates (
  transport_id, 
  latitude, 
  longitude, 
  accuracy, 
  timestamp
) VALUES (1, 40.7128, -74.0060, 10, '2025-07-29T13:25:00.000Z');
```

### **3. Broadcast to Authorized Dashboards (Incoming)**
```javascript
// Server → Authorized Clients
socket.emit('location_update', {
  id: 123,
  transportId: 1,
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp: '2025-07-29T13:25:00.000Z',
  clientName: 'John Doe',
  staffName: 'Staff Member 1'
});
```

---

## 🔐 **Role-Based Message Filtering**

### **Admin Dashboard** (Receives All)
```javascript
// Admin sees all transport updates
{
  "transportId": 1,
  "clientName": "John Doe",
  "staffName": "Staff Member 1",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10,
  "timestamp": "2025-07-29T13:25:00.000Z"
}
```

### **Clinician Dashboard** (Client-Filtered)
```javascript
// Clinician sees only assigned client transports
if (transport.client.assigned_clinician_id === user.id) {
  socket.emit('location_update', locationData);
}
```

### **Family Dashboard** (Family-Filtered)
```javascript
// Family sees only family member transports
if (transport.client_id === user.client_id) {
  socket.emit('location_update', locationData);
}
```

### **Staff Dashboard** (Assignment-Filtered)
```javascript
// Staff sees only assigned transports
if (transport.staff_id === user.id) {
  socket.emit('location_update', locationData);
}
```

---

## 📊 **Real-time Update Examples**

### **Transport Status Change**
```javascript
// Transport status update broadcast
socket.emit('transport_status_update', {
  transportId: 1,
  status: 'in-progress',
  startTime: '2025-07-29T13:18:26.000Z',
  staffId: 2,
  clientId: 1
});
```

### **Location History Request**
```javascript
// GET /api/transports/1/locations
[
  {
    "id": 121,
    "transport_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "timestamp": "2025-07-29T13:20:00.000Z"
  },
  {
    "id": 122,
    "transport_id": 1,
    "latitude": 40.7130,
    "longitude": -74.0058,
    "accuracy": 8,
    "timestamp": "2025-07-29T13:21:00.000Z"
  }
]
```

---

## 🎯 **Map Marker Updates**

### **React Leaflet Marker Data**
```javascript
// Map marker props from location updates
{
  position: [40.7128, -74.0060],
  icon: staffLocationIcon,
  popup: {
    content: `
      <strong>Staff Member 1</strong><br/>
      Client: John Doe<br/>
      Accuracy: ±10m<br/>
      Updated: 1:25:00 PM
    `
  }
}
```

### **Polyline Path Updates**
```javascript
// Transport route visualization
{
  positions: [
    [40.7128, -74.0060], // Start location
    [40.7130, -74.0058], // GPS update 1
    [40.7132, -74.0056], // GPS update 2
    [40.7135, -74.0054]  // Current location
  ],
  color: '#007bff',
  weight: 4,
  opacity: 0.8
}
```

---

## 📱 **Mobile Device Considerations**

### **iOS Safari GPS Payload**
```javascript
// iOS-specific geolocation characteristics
{
  "accuracy": 5-15,     // meters (typically high accuracy)
  "heading": 45,        // degrees (if device supports)
  "speed": 0,           // m/s (if moving)
  "altitude": 10.5,     // meters above sea level
  "altitudeAccuracy": 3 // meters
}
```

### **Android Chrome GPS Payload**
```javascript
// Android-specific geolocation characteristics
{
  "accuracy": 3-20,     // meters (varies by GPS/network)
  "heading": null,      // often null on Android
  "speed": 1.2,         // m/s (if available)
  "altitude": null,     // often null
  "altitudeAccuracy": null
}
```

### **Permission Handling**
```javascript
// Geolocation permission states
navigator.permissions.query({name: 'geolocation'}).then(result => {
  console.log(result.state); // 'granted', 'denied', or 'prompt'
});

// Permission request flow
if (result.state === 'prompt') {
  // First time - browser will show permission dialog
} else if (result.state === 'denied') {
  // User denied - show manual location entry
} else if (result.state === 'granted') {
  // Permission granted - start GPS tracking
}
```

---

## 🔧 **Error Handling Examples**

### **GPS Timeout/Error**
```javascript
// Geolocation error callback
{
  "code": 3,                    // TIMEOUT
  "message": "Timeout expired", 
  "PERMISSION_DENIED": 1,
  "POSITION_UNAVAILABLE": 2,
  "TIMEOUT": 3
}
```

### **WebSocket Connection Error**
```javascript
// Socket.io connection error
socket.on('connect_error', (error) => {
  console.log('Connection failed:', error.message);
  // Implement reconnection logic
});
```

### **Fallback Location Methods**
```javascript
// IP-based location fallback
{
  "latitude": 40.7589,
  "longitude": -73.9851,
  "accuracy": 1000,
  "source": "ip",
  "city": "New York",
  "region": "NY"
}
```

---

## 📈 **Performance Metrics**

### **Update Frequency**
- **High Accuracy Mode**: Every 5-10 seconds
- **Standard Mode**: Every 30-60 seconds
- **Battery Saver**: Every 2-5 minutes

### **Data Usage**
- **GPS Update**: ~100 bytes per message
- **WebSocket Overhead**: ~50 bytes per message
- **Hourly Data**: ~720 KB (high frequency)

### **Battery Impact**
- **Continuous GPS**: High battery drain
- **Significant Location Changes**: Medium battery drain
- **WiFi/Cell Tower**: Low battery drain

---

## 🎯 **Testing Verification**

### **Desktop Testing Results**
```javascript
// Console output from Staff Dashboard
[log] === GPS PAYLOAD CAPTURE TEST ===
[warning] WebSocket connection to 'ws://localhost:5000/socket.io/?EIO=4&transport=websocket' failed
[log] Socket connected
[log] Location request timed out (expected on desktop)
```

### **Expected Mobile Results**
```javascript
// Expected console output on mobile
[log] === GPS PAYLOAD CAPTURE TEST ===
[log] Socket connected
[log] Geolocation permission granted
[log] GPS location acquired: {lat: 40.7128, lng: -74.0060, accuracy: 10}
[log] Location update sent to server
[log] Location update broadcast to dashboards
```

---

This documentation provides comprehensive examples of the GPS payload structure and WebSocket message flow for the React Leaflet map integration system.
