/**
 * Neture Router
 *
 * Phase D-2: Neture Web Server (B2C) 구축
 * React Router 설정
 */

import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { HomePage, ProductListPage, ProductDetailPage } from '@/pages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
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
    ],
  },
]);

export default function NetureRouter() {
  return <RouterProvider router={router} />;
}
