import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// Add this import to use config (you need to have client/src/config.js)
import config from '../config';

const useSocket = () => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    // Use your deployed backend URL instead of localhost!
    // Option 1: Hardcode for prod (RECOMMENDED for now)
    socketRef.current = io('https://iyttransport-backend.onrender.com', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Option 2: If you set REACT_APP_API_URL in .env, use:
    // socketRef.current = io(config.API_BASE_URL, {
    //   auth: { token: token },
    //   transports: ['websocket', 'polling']
    // });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError(error.message);
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  const sendLocationUpdate = (transportId, latitude, longitude, accuracy) => {
    if (!socketRef.current || !connected) {
      console.error('Socket not connected');
      return false;
    }
    const locationData = {
      transportId,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString()
    };
    console.log('Sending location update:', locationData);
    socketRef.current.emit('location_update', locationData);
    return true;
  };

  const updateTransportStatus = (transportId, status) => {
    if (!socketRef.current || !connected) {
      console.error('Socket not connected');
      return false;
    }
    const statusData = {
      transportId,
      status,
      timestamp: new Date().toISOString()
    };
    console.log('Sending transport status update:', statusData);
    socketRef.current.emit('transport_status_update', statusData);
    return true;
  };

  const onLocationUpdate = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('location_update', callback);
    return () => socketRef.current.off('location_update', callback);
  };

  const onLocationUpdateConfirmed = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('location_update_confirmed', callback);
    return () => socketRef.current.off('location_update_confirmed', callback);
  };

  const onTransportStatusUpdate = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('transport_status_update', callback);
    return () => socketRef.current.off('transport_status_update', callback);
  };

  return {
    connected,
    error,
    sendLocationUpdate,
    updateTransportStatus,
    onLocationUpdate,
    onLocationUpdateConfirmed,
    onTransportStatusUpdate
  };
};

export default useSocket;
