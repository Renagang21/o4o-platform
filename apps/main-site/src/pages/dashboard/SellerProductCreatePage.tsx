/**
 * Seller Product Create Page
 * Placeholder for importing supplier products
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';

export const SellerProductCreatePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Seller Dashboard', href: '/dashboard/seller' },
          { label: 'Products', href: '/dashboard/seller/products' },
          { label: 'Import Product', isCurrent: true },
        ]}
      />

      <PageHeader
        title="Import Product"
        subtitle="Select a supplier product and configure sales settings"
        actions={
          <button
            onClick={() => navigate('/dashboard/seller/products')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 mb-4">
          Product import feature coming soon. This page will allow you to:
        </p>
        <ul className="text-gray-600 text-left max-w-md mx-auto space-y-2">
          <li>- Browse supplier products</li>
          <li>- Set your sale price and margins</li>
          <li>- Configure product details</li>
          <li>- Publish to your store</li>
        </ul>
      </div>
    </>
  );
};

export default SellerProductCreatePage;
