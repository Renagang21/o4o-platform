import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FundingHome from './pages/FundingHome';
import CampaignList from './pages/campaigns/CampaignList';
import CampaignDetail from './pages/campaigns/CampaignDetail';
import CreateCampaign from './pages/campaigns/CreateCampaign';
import FundingDashboard from './pages/FundingDashboard';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FundingHome />} />
        <Route path="/campaigns" element={<CampaignList />} />
        <Route path="/campaigns/new" element={<CreateCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/campaigns/:id/edit" element={<CreateCampaign />} />
        <Route path="/dashboard" element={<FundingDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;