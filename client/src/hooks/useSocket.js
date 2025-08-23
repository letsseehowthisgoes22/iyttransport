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

    socketRef.current = io(`${config.API_BASE_URL}/transports`, {
      path: '/ws',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

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
    
    socketRef.current.emit('transport:join', { id: transportId });
    
    const locationData = {
      id: transportId,
      lat: latitude,
      lon: longitude,
      ts: new Date().toISOString()
    };
    console.log('Sending position update:', locationData);
    socketRef.current.emit('position:update', locationData);
    return true;
  };

  const updateTransportStatus = (transportId, status) => {
    if (!socketRef.current || !connected) {
      console.error('Socket not connected');
      return false;
    }
    const statusData = {
      id: transportId,
      status,
      note: ''
    };
    console.log('Sending status update:', statusData);
    socketRef.current.emit('status:update', statusData);
    return true;
  };

  const onLocationUpdate = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('position:rx', callback);
    return () => socketRef.current.off('position:rx', callback);
  };

  const onLocationUpdateConfirmed = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('position:rx', callback);
    return () => socketRef.current.off('position:rx', callback);
  };

  const onTransportStatusUpdate = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on('status:rx', callback);
    return () => socketRef.current.off('status:rx', callback);
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
