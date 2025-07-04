import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Shop from '../pages/Shop';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';

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
]);

export default router; 