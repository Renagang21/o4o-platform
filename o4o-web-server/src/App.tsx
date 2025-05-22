import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Shop from './pages/Shop';
import YaksaShop from './pages/YaksaShop';
import Dashboard from './pages/yaksa/Dashboard';
import Notifications from './pages/yaksa/Notifications';
import Profile from './pages/yaksa/Profile';
import YaksaApprovals from './pages/admin/YaksaApprovals';
import ProtectedRoute from './components/ProtectedRoute';
import YaksaProtectedRoute from './components/YaksaProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

const App: React.FC = () => (
  <Router>
    <AppHeader />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shop" element={
        <ProtectedRoute><Shop /></ProtectedRoute>
      } />
      <Route path="/yaksa-shop" element={
        <YaksaProtectedRoute><YaksaShop /></YaksaProtectedRoute>
      } />
      <Route path="/yaksa/dashboard" element={
        <YaksaProtectedRoute><Dashboard /></YaksaProtectedRoute>
      } />
      <Route path="/yaksa/notifications" element={
        <YaksaProtectedRoute><Notifications /></YaksaProtectedRoute>
      } />
      <Route path="/yaksa/profile" element={
        <YaksaProtectedRoute><Profile /></YaksaProtectedRoute>
      } />
      <Route path="/admin/yaksa-approvals" element={
        <RoleProtectedRoute roles={['superadmin']}>
          <YaksaApprovals />
        </RoleProtectedRoute>
      } />
    </Routes>
  </Router>
);

export default App; 