/**
 * CosmeticsRecommendationPanel
 *
 * Displays product recommendations based on criteria
 * Uses the recommendation engine API to fetch and display similar/recommended products
 */

import React, { useEffect, useState } from 'react';
import { CosmeticsProductCard } from './CosmeticsProductCard.js';

export interface RecommendationPanelProps {
  skinTypes?: string[];
  concerns?: string[];
  brand?: string;
  category?: string;
  excludeProductId?: string;
  limit?: number;
  apiBaseUrl?: string;
  title?: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  metadata: {
    skinTypes: string[];
    concerns: string[];
    category?: string;
    certifications: string[];
  };
}

export const CosmeticsRecommendationPanel: React.FC<RecommendationPanelProps> = ({
  skinTypes,
  concerns,
  brand,
  category,
  excludeProductId,
  limit = 5,
  apiBaseUrl = '/api/v1',
  title = '추천 제품'
}) => {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [skinTypes, concerns, brand, category, excludeProductId, limit]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (skinTypes && skinTypes.length > 0) {
        params.append('skinType', skinTypes.join(','));
      }

      if (concerns && concerns.length > 0) {
        params.append('concerns', concerns.join(','));
      }

      if (brand) {
        params.append('brand', brand);
      }

      if (category) {
        params.append('category', category);
      }

      if (excludeProductId) {
        params.append('excludeProductId', excludeProductId);
      }

      params.append('limit', limit.toString());

      const url = `${apiBaseUrl}/cosmetics/recommendations?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setProducts(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[RecommendationPanel] Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cosmetics-recommendation-panel">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cosmetics-recommendation-panel">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="cosmetics-recommendation-panel">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">추천 제품이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cosmetics-recommendation-panel">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {products.map(product => (
          <CosmeticsProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            brand={product.brand}
            price={product.price}
            image={product.image}
            metadata={product.metadata}
          />
        ))}
      </div>
    </div>
  );
};

export default CosmeticsRecommendationPanel;
