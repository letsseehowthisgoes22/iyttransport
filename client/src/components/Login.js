import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const testCredentials = [
    { role: 'Admin', email: 'admin@test.com', password: 'password123' },
    { role: 'Staff 1', email: 'staff1@test.com', password: 'password123' },
    { role: 'Staff 2', email: 'staff2@test.com', password: 'password123' },
    { role: 'Clinician', email: 'clinician@test.com', password: 'password123' },
    { role: 'Family 1', email: 'family1@test.com', password: 'password123' },
    { role: 'Family 2', email: 'family2@test.com', password: 'password123' }
  ];

  const fillCredentials = (email, password) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '50px auto', 
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login to Transport Tracker</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        {error && (
          <div style={{ 
            color: 'red', 
            marginBottom: '15px',
            padding: '8px',
            backgroundColor: '#ffe6e6',
            border: '1px solid #ff9999',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: '20px' }}>
        <h4>Test Credentials:</h4>
        <div style={{ fontSize: '12px' }}>
          {testCredentials.map((cred, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              padding: '5px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              cursor: 'pointer'
            }} onClick={() => fillCredentials(cred.email, cred.password)}>
              <strong>{cred.role}:</strong> {cred.email}
            </div>
          ))}
          <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
            Click any credential above to auto-fill the form
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
