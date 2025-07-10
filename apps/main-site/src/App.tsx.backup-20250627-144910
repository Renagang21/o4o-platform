import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';

// Auth Pages
import Login from './pages/auth/Login';

// User Type Dashboards
import AdminDashboard from './pages/admin/Dashboard';
import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierProductList from './pages/supplier/ProductList';
import SupplierProductForm from './pages/supplier/ProductForm';
import SupplierProductDetail from './pages/supplier/ProductDetail';
import RetailerDashboard from './pages/retailer/Dashboard';
import CustomerShop from './pages/customer/Shop';

// Digital Signage Pages
import DigitalSignageDashboard from './pages/signage/DigitalSignageDashboard';

// TheDANG Style Home
import TheDANGStyleHome from './pages/TheDANGStyleHome';
import TheDANGStyleEditorPage from './pages/TheDANGStyleEditorPage';

// Components
import PrivateRoute from './components/auth/PrivateRoute';

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 인증 상태 확인
    checkAuth();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<TheDANGStyleHome />} />
          <Route path="/home" element={<TheDANGStyleHome />} />
          <Route path="/editor/home" element={<TheDANGStyleEditorPage />} />
          <Route path="/auth/login" element={<Login />} />
          
          {/* Protected Routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Supplier */}
          <Route
            path="/supplier/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductList />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/new"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/:id"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/:id/edit"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductForm />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Retailer */}
          <Route
            path="/retailer/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['retailer']}>
                <RetailerDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Customer */}
          <Route
            path="/shop"
            element={
              <PrivateRoute allowedUserTypes={['customer']}>
                <CustomerShop />
              </PrivateRoute>
            }
          />

          {/* Digital Signage Routes */}
          <Route
            path="/signage"
            element={
              <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                <DigitalSignageDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/signage/*"
            element={
              <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                <DigitalSignageDashboard />
              </PrivateRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;