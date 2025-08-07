import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Transport Tracking System</h1>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
