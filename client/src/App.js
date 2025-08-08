import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import ClinicianDashboard from './components/ClinicianDashboard';
import FamilyDashboard from './components/FamilyDashboard';
import { useAuth } from './contexts/AuthContext';

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const map = {
    Admin: '/admin',
    Staff: '/staff',
    Clinician: '/clinician',
    Family: '/family'
  };
  return <Navigate to={map[user.role] || '/login'} />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Transport Tracking System</h1>
        </header>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute requiredRoles={['Staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician"
            element={
              <ProtectedRoute requiredRoles={['Clinician']}>
                <ClinicianDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/family"
            element={
              <ProtectedRoute requiredRoles={['Family']}>
                <FamilyDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
