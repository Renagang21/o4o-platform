/**
 * Neture Router
 *
 * Phase G-2: B2C 핵심 기능 확장
 * Phase G-3: 주문/결제 플로우 구현
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
  CheckoutPage,
  PaymentPage,
  PaymentSuccessPage,
  PaymentFailPage,
  OrderListPage,
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
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'checkout/payment/:orderId',
        element: <PaymentPage />,
      },
      {
        path: 'checkout/success',
        element: <PaymentSuccessPage />,
      },
      {
        path: 'checkout/fail',
        element: <PaymentFailPage />,
      },
      {
        path: 'orders',
        element: <OrderListPage />,
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
