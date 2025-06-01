import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfilePage from './pages/ProfilePage';
import ProductForm from './pages/ProductForm';
import ProductList from './pages/ProductList';
import YaksaApprovalList from './pages/admin/YaksaApprovalList';
import YaksaApprovalDetail from './pages/admin/YaksaApprovalDetail';
import HomeEditorPage from './pages/HomeEditor';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import YaksaProtectedRoute from './components/YaksaProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';
import OnboardingBanner from './components/OnboardingBanner';
import { ApprovalProvider } from './pages/admin/ApprovalContext';
import UserRoleManager from './pages/admin/UserRoleManager';
import { UserRoleManagerProvider } from './pages/admin/UserRoleManagerContext';
import SocialLoginConfigPage from './pages/admin/SocialLoginConfigPage';
import { SocialLoginConfigProvider } from './pages/admin/SocialLoginConfigContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Forbidden from './pages/Forbidden';
import AdminStats from './pages/admin/AdminStats';

// Placeholder components for demonstration
const ProductNew = () => <div className="p-8 text-center">[약사 전용] 상품 등록 페이지 (ProductNew)</div>;

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <OnboardingBanner />
            <Toast />
            <ToastContainer position="top-center" />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<ProfilePage />} />
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
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <ApprovalProvider>
                        <YaksaApprovalList />
                      </ApprovalProvider>
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin/approvals/:id"
                  element={
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <ApprovalProvider>
                        <YaksaApprovalDetail />
                      </ApprovalProvider>
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin/home-editor"
                  element={
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <HomeEditorPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin/user-role-manager"
                  element={
                    <RoleProtectedRoute allowedRoles={['administrator']}>
                      <UserRoleManagerProvider>
                        <UserRoleManager />
                      </UserRoleManagerProvider>
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin/social-login-config"
                  element={
                    <RoleProtectedRoute allowedRoles={['administrator']}>
                      <SocialLoginConfigProvider>
                        <SocialLoginConfigPage />
                      </SocialLoginConfigProvider>
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin/stats"
                  element={
                    <RoleProtectedRoute allowedRoles={['administrator', 'operator']}>
                      <AdminStats />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="/403" element={<Forbidden />} />
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App; 