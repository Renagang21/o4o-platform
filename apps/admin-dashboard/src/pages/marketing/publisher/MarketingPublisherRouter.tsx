/**
 * Marketing Publisher Router
 *
 * Router for Marketing LMS Publisher pages
 * Phase R10: Supplier Publishing UI
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy load pages
const PublisherHome = lazy(() => import('./PublisherHome'));
const ProductList = lazy(() => import('./product/list'));
const ProductCreate = lazy(() => import('./product/create'));
const ProductEdit = lazy(() => import('./product/edit'));
const QuizList = lazy(() => import('./quiz/list'));
const QuizCreate = lazy(() => import('./quiz/create'));
const QuizEdit = lazy(() => import('./quiz/edit'));
const SurveyList = lazy(() => import('./survey/list'));
const SurveyCreate = lazy(() => import('./survey/create'));
const SurveyEdit = lazy(() => import('./survey/edit'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export default function MarketingPublisherRouter() {
  return (
    <Routes>
      {/* Dashboard */}
      <Route
        path="/"
        element={
          <Suspense fallback={<PageLoader />}>
            <PublisherHome />
          </Suspense>
        }
      />

      {/* Product Info */}
      <Route
        path="/product"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProductList />
          </Suspense>
        }
      />
      <Route
        path="/product/create"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProductCreate />
          </Suspense>
        }
      />
      <Route
        path="/product/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProductEdit />
          </Suspense>
        }
      />

      {/* Quiz Campaign */}
      <Route
        path="/quiz"
        element={
          <Suspense fallback={<PageLoader />}>
            <QuizList />
          </Suspense>
        }
      />
      <Route
        path="/quiz/create"
        element={
          <Suspense fallback={<PageLoader />}>
            <QuizCreate />
          </Suspense>
        }
      />
      <Route
        path="/quiz/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <QuizEdit />
          </Suspense>
        }
      />

      {/* Survey Campaign */}
      <Route
        path="/survey"
        element={
          <Suspense fallback={<PageLoader />}>
            <SurveyList />
          </Suspense>
        }
      />
      <Route
        path="/survey/create"
        element={
          <Suspense fallback={<PageLoader />}>
            <SurveyCreate />
          </Suspense>
        }
      />
      <Route
        path="/survey/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <SurveyEdit />
          </Suspense>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin/marketing/publisher" replace />} />
    </Routes>
  );
}
