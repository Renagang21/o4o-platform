import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Products from './Products';
import Orders from './Orders';
import Settlements from './Settlements';
import SellersList from './SellersList';
import PartnersList from './PartnersList';
import SuppliersList from './SuppliersList';
import Approvals from './Approvals';
import Commissions from './Commissions';
import SystemSetup from './SystemSetup';
import BulkProductImport from './BulkProductImport';
import ErpConnectorStatus from './ErpConnectorStatus';
import ErpTransmissionHistory from './ErpTransmissionHistory';

const DropshippingRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="products" element={<Products />} />
      <Route path="products/bulk-import" element={<BulkProductImport />} />
      <Route path="orders" element={<Orders />} />
      <Route path="settlements" element={<Settlements />} />
      <Route path="sellers" element={<SellersList />} />
      <Route path="partners" element={<PartnersList />} />
      <Route path="suppliers" element={<SuppliersList />} />
      <Route path="approvals" element={<Approvals />} />
      <Route path="commissions" element={<Commissions />} />
      <Route path="setup" element={<SystemSetup />} />
      <Route path="erp-status" element={<ErpConnectorStatus />} />
      <Route path="erp-transmissions" element={<ErpTransmissionHistory />} />
      <Route path="/" element={<Navigate to="/dropshipping/products" replace />} />
    </Routes>
  );
};

export default DropshippingRouter;