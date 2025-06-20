import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CheckAccount from './pages/CheckAccount';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ContentManagement from './pages/admin/ContentManagement';
import MediaLibrary from './pages/admin/MediaLibrary';
import PageManager from './pages/admin/PageManager';

// Dropshipping Pages
import {
  DropshippingDashboard,
  ProductManagement,
  PartnerManagement,
  CustomerManagement
} from './pages/dropshipping';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/check-account" element={<CheckAccount />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Navbar />
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <Navbar />
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/content"
            element={
              <ProtectedRoute requireAdmin>
                <Navbar />
                <ContentManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/media"
            element={
              <ProtectedRoute requireAdmin>
                <Navbar />
                <MediaLibrary />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pages"
            element={
              <ProtectedRoute requireAdmin>
                <Navbar />
                <PageManager />
              </ProtectedRoute>
            }
          />

          {/* Dropshipping Module Routes */}
          <Route
            path="/dropshipping"
            element={
              <ProtectedRoute>
                <DropshippingDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dropshipping/dashboard"
            element={
              <ProtectedRoute>
                <DropshippingDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dropshipping/products"
            element={
              <ProtectedRoute>
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dropshipping/partners"
            element={
              <ProtectedRoute>
                <PartnerManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dropshipping/customers"
            element={
              <ProtectedRoute>
                <CustomerManagement />
              </ProtectedRoute>
            }
          />

          {/* Additional Dropshipping Routes */}
          <Route
            path="/dropshipping/commission"
            element={
              <ProtectedRoute>
                <PartnerManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dropshipping/analytics"
            element={
              <ProtectedRoute>
                <DropshippingDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;