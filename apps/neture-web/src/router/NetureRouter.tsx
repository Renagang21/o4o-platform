/**
 * Neture Router
 *
 * Phase G-2: B2C 핵심 기능 확장
 * React Router 설정 + 레이아웃 통합
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import {
  HomePage,
  ProductListPage,
  ProductDetailPage,
  LoginPage,
  CartPage,
} from '@/pages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      {
        path: 'products/:productId',
        element: <ProductDetailPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
    ],
  },
  {
    // Login은 별도 레이아웃 (Header/Footer 없음)
    path: '/login',
    element: <LoginPage />,
  },
]);

export default function NetureRouter() {
  return <RouterProvider router={router} />;
}
