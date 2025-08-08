import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be handled by main App component
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: 'red'
      }}>
        <h3>Access Denied</h3>
        <p>You don't have permission to access this page.</p>
        <p>Required roles: {requiredRoles.join(', ')}</p>
        <p>Your role: {user.role}</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
