/**
 * Cosmetics Product Shortcode
 *
 * Usage: [cosmetics-product id="PRODUCT_ID"]
 *
 * Displays product detail with cosmetics metadata
 */

import React from 'react';
import { CosmeticsProductDetail } from '../components/CosmeticsProductDetail.js';

export interface CosmeticsProductShortcodeProps {
  id: string;
  apiBaseUrl?: string;
}

export const CosmeticsProductShortcode: React.FC<CosmeticsProductShortcodeProps> = ({
  id,
  apiBaseUrl
}) => {
  if (!id) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-700">
          ⚠️ Product ID is required. Usage: [cosmetics-product id="PRODUCT_ID"]
        </p>
      </div>
    );
  }

  return <CosmeticsProductDetail productId={id} apiBaseUrl={apiBaseUrl} />;
};

export default CosmeticsProductShortcode;
