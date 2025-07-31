import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Transport Tracking System</h1>
        </header>
        <Routes>
          <Route path="/" element={<div>Welcome to Transport Tracker</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;