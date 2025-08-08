import React, { useEffect, useState } from 'react';
import axios from 'axios';

const apiBase = process.env.REACT_APP_API_URL || '';

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    axios.get(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMe(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, [token]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h2>Dashboard</h2>
      {me ? (
        <div>
          <div>Logged in as: {me.email}</div>
          <div>Role: {me.role}</div>
          <button onClick={logout} style={{ marginTop: 12 }}>Logout</button>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
