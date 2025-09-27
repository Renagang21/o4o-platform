import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Products from './Products';
import Partners from './Partners';
import Suppliers from './Suppliers';
import Commissions from './Commissions';
import SystemSetup from './SystemSetup';

const DropshippingRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="products" element={<Products />} />
      <Route path="partners" element={<Partners />} />
      <Route path="suppliers" element={<Suppliers />} />
      <Route path="commissions" element={<Commissions />} />
      <Route path="setup" element={<SystemSetup />} />
      <Route path="/" element={<Navigate to="/dropshipping/products" replace />} />
    </Routes>
  );
};

export default DropshippingRouter;