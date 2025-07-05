import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Shop from '../pages/Shop';
import Checkout from '../pages/Checkout';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import Profile from '../pages/Profile';
import ProfileAddress from '../pages/ProfileAddress';
import OrderConfirmation from '../pages/OrderConfirmation';
import Login from '../pages/Login';
import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminOrders from '../pages/admin/Orders';
import AdminOrderDetail from '../pages/admin/OrderDetail';
import AdminUsers from '../pages/admin/Users';
import AdminLogs from '../pages/admin/Logs';
import AdminLogin from '../pages/admin/Login';
import AdminProtectedRoute from '../components/AdminProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shop />,
  },
  {
    path: '/shop',
    element: <Shop />,
  },
  {
    path: '/product/:id',
    element: <ProductDetail />,
  },
  {
    path: '/cart',
    element: <Cart />,
  },
  {
    path: '/checkout',
    element: <Checkout />,
  },
  {
    path: '/orders',
    element: <Orders />,
  },
  {
    path: '/orders/:id',
    element: <OrderDetail />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/profile/address',
    element: <ProfileAddress />,
  },
  {
    path: '/order/confirmation',
    element: <OrderConfirmation />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  // Admin routes
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'orders/:id', element: <AdminOrderDetail /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'logs', element: <AdminLogs /> },
      { index: true, element: <AdminDashboard /> },
    ],
  },
]);

export default router; 