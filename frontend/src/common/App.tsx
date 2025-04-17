import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './common/contexts/AuthContext';

// Admin Routes
import AdminLayout from './admin/core/layout/AdminLayout';
import AdminDashboard from './admin/dashboard/AdminDashboard';

// Marketplace Routes
import MarketplaceRoutes from './marketplace/core/routes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* Marketplace Routes */}
        <Route path="/*" element={<MarketplaceRoutes />} />
      </Routes>
    </AuthProvider>
  );
};

export default App; 