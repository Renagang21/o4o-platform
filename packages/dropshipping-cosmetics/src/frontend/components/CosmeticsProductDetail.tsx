/**
 * CosmeticsProductDetail Component
 *
 * Displays product detail with cosmetics metadata
 * Used by cosmetics-product shortcode
 */

import React, { useEffect, useState } from 'react';
import { CosmeticsRecommendationPanel } from './CosmeticsRecommendationPanel.js';

export interface CosmeticsProductData {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  description?: string;
  metadata: {
    skinTypes: string[];
    concerns: string[];
    ingredients: string[];
    certifications: string[];
    category?: string;
    usage?: string;
  };
  routineMatches: {
    id: string;
    title: string;
    partnerId: string;
  }[];
}

interface CosmeticsProductDetailProps {
  productId: string;
  apiBaseUrl?: string;
}

export const CosmeticsProductDetail: React.FC<CosmeticsProductDetailProps> = ({
  productId,
  apiBaseUrl = '/api/v1'
}) => {
  const [data, setData] = useState<CosmeticsProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/cosmetics/product/${productId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Failed to load product');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId, apiBaseUrl]);

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse max-w-4xl mx-auto p-6">
        <div className="bg-gray-200 h-96 rounded-lg mb-6"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">Product not found</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Product Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Image Section */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {data.brand}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {data.title}
          </h1>

          <div className="text-2xl font-bold text-blue-600 mb-6">
            {formatCurrency(data.price)}
          </div>

          {data.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              {data.description}
            </p>
          )}

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            Buy Now
          </button>
        </div>
      </div>

      {/* Metadata Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skin Types */}
        {data.metadata.skinTypes.length > 0 && (
          <Section title="Skin Types">
            <div className="flex flex-wrap gap-2">
              {data.metadata.skinTypes.map((type, idx) => (
                <Badge key={idx} variant="primary">{type}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Concerns */}
        {data.metadata.concerns.length > 0 && (
          <Section title="Concerns">
            <div className="flex flex-wrap gap-2">
              {data.metadata.concerns.map((concern, idx) => (
                <Badge key={idx} variant="secondary">{concern}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Ingredients */}
        {data.metadata.ingredients.length > 0 && (
          <Section title="Key Ingredients" fullWidth>
            <div className="flex flex-wrap gap-2">
              {data.metadata.ingredients.map((ingredient, idx) => (
                <Tag key={idx}>{ingredient}</Tag>
              ))}
            </div>
          </Section>
        )}

        {/* Certifications */}
        {data.metadata.certifications.length > 0 && (
          <Section title="Certifications">
            <div className="flex flex-wrap gap-2">
              {data.metadata.certifications.map((cert, idx) => (
                <CertBadge key={idx}>{cert}</CertBadge>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Routine Matches */}
      {data.routineMatches.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ✨ Included in Beauty Routines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.routineMatches.map((routine) => (
              <RoutineTag key={routine.id} routine={routine} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Products */}
      <div className="mt-12">
        <CosmeticsRecommendationPanel
          skinTypes={data.metadata.skinTypes}
          concerns={data.metadata.concerns}
          brand={data.brand}
          category={data.metadata.category}
          excludeProductId={data.id}
          limit={5}
          apiBaseUrl={apiBaseUrl}
          title="비슷한 제품 추천"
        />
      </div>
    </div>
  );
};

// Section Component
const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ title, children, fullWidth = false }) => (
  <div className={`${fullWidth ? 'md:col-span-2' : ''}`}>
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
      {title}
    </h3>
    {children}
  </div>
);

// Badge Component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}> = ({ children, variant = 'primary' }) => {
  const colors = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
};

// Tag Component
const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
    {children}
  </span>
);

// CertBadge Component
const CertBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
    {children}
  </span>
);

// RoutineTag Component
const RoutineTag: React.FC<{
  routine: { id: string; title: string; partnerId: string };
}> = ({ routine }) => (
  <a
    href={`/routines/${routine.id}`}
    className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all"
  >
    <span className="font-medium text-gray-900">{routine.title}</span>
    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </a>
);

export default CosmeticsProductDetail;
