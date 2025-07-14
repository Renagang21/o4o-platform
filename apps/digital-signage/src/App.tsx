import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignageHome from './pages/signage/SignageHome';
import SignageDashboard from './pages/signage/SignageDashboard';
import ContentManager from './pages/signage/ContentManager';
import ScheduleManager from './pages/signage/ScheduleManager';
import StoreManagement from './pages/signage/StoreManagement';
import LiveTVDisplay from './pages/signage/LiveTVDisplay';
import TVDisplay from './pages/signage/tv/TVDisplay';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignageHome />} />
        <Route path="/dashboard" element={<SignageDashboard />} />
        <Route path="/content" element={<ContentManager />} />
        <Route path="/schedule" element={<ScheduleManager />} />
        <Route path="/stores" element={<StoreManagement />} />
        <Route path="/live" element={<LiveTVDisplay />} />
        <Route path="/tv/:storeId" element={<TVDisplay />} />
      </Routes>
    </Router>
  );
};

export default App;