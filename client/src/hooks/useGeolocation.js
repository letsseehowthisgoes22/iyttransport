import { useState, useEffect, useCallback } from 'react';

const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState(null);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    ...options
  };

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        };
        setLocation(locationData);
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }
        setError(errorMessage);
        setLoading(false);
      },
      defaultOptions
    );
  }, [defaultOptions]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    if (watchId !== null) {
      return; // Already watching
    }

    setError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        };
        setLocation(locationData);
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to watch location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }
        setError(errorMessage);
        setLoading(false);
      },
      defaultOptions
    );

    setWatchId(id);
  }, [defaultOptions, watchId]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const requestPermission = useCallback(async () => {
    if (!navigator.permissions) {
      getCurrentPosition();
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        setError('Location permission denied. Please enable location access in your browser settings.');
        return;
      }
      
      if (permission.state === 'granted') {
        getCurrentPosition();
        return;
      }
      
      getCurrentPosition();
    } catch (error) {
      console.error('Permission query failed:', error);
      getCurrentPosition(); // Fallback
    }
  }, [getCurrentPosition]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    loading,
    isWatching: watchId !== null,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission
  };
};

export default useGeolocation;
