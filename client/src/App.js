import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import StaffDashboard from './components/StaffDashboard';
import ClinicianDashboard from './components/ClinicianDashboard';
import FamilyDashboard from './components/FamilyDashboard';
import AdminDashboard from './components/AdminDashboard';
import './styles/Map.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['Staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/clinician" element={
              <ProtectedRoute allowedRoles={['Clinician']}>
                <ClinicianDashboard />
              </ProtectedRoute>
            } />
            <Route path="/family" element={
              <ProtectedRoute allowedRoles={['Family']}>
                <FamilyDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
