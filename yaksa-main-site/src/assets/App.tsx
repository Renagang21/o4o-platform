import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import YaksaApprovalList from './pages/admin/YaksaApprovalList';
import YaksaApprovalDetail from './pages/admin/YaksaApprovalDetail';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import YaksaProtectedRoute from './components/YaksaProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Yaksa Routes */}
              <Route
                path="/products/new"
                element={
                  <YaksaProtectedRoute>
                    <ProductForm />
                  </YaksaProtectedRoute>
                }
              />
              <Route
                path="/products/my"
                element={
                  <YaksaProtectedRoute>
                    <ProductList />
                  </YaksaProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/approvals"
                element={
                  <RoleProtectedRoute role="admin">
                    <YaksaApprovalList />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/admin/approvals/:id"
                element={
                  <RoleProtectedRoute role="admin">
                    <YaksaApprovalDetail />
                  </RoleProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App; 