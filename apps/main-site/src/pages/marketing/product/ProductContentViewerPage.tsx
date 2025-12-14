/**
 * ProductContentViewerPage
 *
 * Displays product content to sellers, consumers, and pharmacists.
 * Uses Core ContentBundleViewer for content rendering and automatic engagement logging.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProductContent,
  type ProductContent,
} from '@/lib/api/productContentApi';
import { getContentBundle } from '@/lib/api/contentBundleApi';
import { ContentBundleViewer, type ContentBundle } from '@/components/lms-core/viewer';

export function ProductContentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [productContent, setProductContent] = useState<ProductContent | null>(null);
  const [contentBundle, setContentBundle] = useState<ContentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Product content ID is required');
      setLoading(false);
      return;
    }

    loadProductContent(id);
  }, [id]);

  async function loadProductContent(productContentId: string) {
    setLoading(true);
    setError(null);

    try {
      // Load product content
      const productResponse = await getProductContent(productContentId);

      if (!productResponse.success || !productResponse.data) {
        setError(productResponse.error || 'Product content not found');
        setLoading(false);
        return;
      }

      const product = productResponse.data;
      setProductContent(product);

      // Load associated ContentBundle
      const bundleResponse = await getContentBundle(product.bundleId);

      if (!bundleResponse.success || !bundleResponse.data) {
        setError(bundleResponse.error || 'Content bundle not found');
        setLoading(false);
        return;
      }

      setContentBundle(bundleResponse.data);
    } catch (err) {
      console.error('[ProductContentViewerPage] Error loading content:', err);
      setError('Failed to load product content');
    } finally {
      setLoading(false);
    }
  }

  function handleComplete() {
    console.log('[ProductContentViewerPage] Content viewing completed');
    // Could navigate to next content or show completion message
  }

  function handleBack() {
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Content
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!productContent || !contentBundle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Content not available</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            {productContent.brand && (
              <span className="text-sm text-gray-500">
                {productContent.brand}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Product Info Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {productContent.title}
          </h1>

          <div className="mt-2 flex flex-wrap gap-2">
            {productContent.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {productContent.category}
              </span>
            )}
            {productContent.sku && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                SKU: {productContent.sku}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Bundle Viewer */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ContentBundleViewer
          bundle={contentBundle}
          onComplete={handleComplete}
          autoLogView={true}
        />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-sm text-gray-500 text-center">
            Product information provided by supplier
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ProductContentViewerPage;
