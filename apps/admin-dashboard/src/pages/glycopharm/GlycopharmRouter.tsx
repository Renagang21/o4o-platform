/**
 * Glycopharm Router
 *
 * Phase B-3: Glycopharm Admin Integration
 * Route definitions for Glycopharm admin pages
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PharmacyListPage, PharmacyDetailPage } from './pharmacies';
import { ProductListPage, ProductDetailPage } from './products';

const GlycopharmRouter: React.FC = () => {
  return (
    <Routes>
      {/* Default redirect to products */}
      <Route index element={<Navigate to="products" replace />} />

      {/* Pharmacy Routes */}
      <Route path="pharmacies" element={<PharmacyListPage />} />
      <Route path="pharmacies/:pharmacyId" element={<PharmacyDetailPage />} />

      {/* Product Routes */}
      <Route path="products" element={<ProductListPage />} />
      <Route path="products/:productId" element={<ProductDetailPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="products" replace />} />
    </Routes>
  );
};

export default GlycopharmRouter;
