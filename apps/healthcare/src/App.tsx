import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HealthcarePage } from './pages/healthcare';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HealthcarePage />} />
        <Route path="/healthcare" element={<HealthcarePage />} />
        <Route path="/healthcare/demo" element={<div>Healthcare Demo - Coming Soon</div>} />
      </Routes>
    </Router>
  );
};

export default App;