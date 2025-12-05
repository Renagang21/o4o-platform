/**
 * Cosmetics Products List Shortcode
 *
 * Shortcode: [cosmetics-products-list]
 *
 * Displays a filterable list of cosmetics products
 */

import React, { useState, useEffect } from 'react';
import { CosmeticsProductCard } from '../components/CosmeticsProductCard.js';
import { FilterControlPanel } from '../components/FilterControlPanel.js';
import type { CosmeticsFilters } from '../../types.js';

export interface CosmeticsProductsListProps {
  filters?: CosmeticsFilters;
  showFilters?: boolean;
  columns?: number;
}

export const CosmeticsProductsList: React.FC<CosmeticsProductsListProps> = ({
  filters: initialFilters = {},
  showFilters = true,
  columns = 3,
}) => {
  const [filters, setFilters] = useState<CosmeticsFilters>(initialFilters);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/cosmetics/products/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      const data = await response.json() as { data?: any[] };
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: CosmeticsFilters) => {
    setFilters(newFilters);
  };

  const handleProductClick = (productId: string) => {
    console.log('Product clicked:', productId);
    // TODO: Navigate to product detail page
  };

  return (
    <div className="cosmetics-products-list">
      {showFilters && (
        <FilterControlPanel
          onFilterChange={handleFilterChange}
          initialFilters={initialFilters}
        />
      )}

      {loading && <div>Loading products...</div>}

      <div
        className="products-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          marginTop: '16px',
        }}
      >
        {products.map((product) => (
          <CosmeticsProductCard
            key={product.id}
            product={product}
            onClick={handleProductClick}
          />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div>No products found matching your filters.</div>
      )}
    </div>
  );
};

export default CosmeticsProductsList;
