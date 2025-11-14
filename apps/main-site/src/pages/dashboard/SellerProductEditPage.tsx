/**
 * Seller Product Edit Page
 * Page for editing existing seller products
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { sellerProductAPI } from '../../services/sellerProductApi';
import {
  SellerProductDetail,
  SellerProductUpdateRequest,
} from '../../types/seller-product';

export const SellerProductEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<SellerProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch product detail
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID is missing');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await sellerProductAPI.fetchProductDetail(id);
        const productData = response.data;
        setProduct(productData);
        setTitle(productData.title);
        setSalePrice(productData.sale_price.toString());
        setIsPublished(productData.is_published);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const calculateMargin = () => {
    if (!product || !salePrice) return { amount: 0, rate: 0 };

    const salePriceNum = parseInt(salePrice);
    const supplyPrice = product.supply_price || 0;
    const marginAmount = salePriceNum - supplyPrice;
    const marginRate = supplyPrice > 0 ? (marginAmount / supplyPrice) * 100 : 0;

    return {
      amount: marginAmount,
      rate: marginRate,
    };
  };

  const handleUpdate = async () => {
    if (!id || !product) return;

    if (!salePrice || parseInt(salePrice) <= 0) {
      alert('Please enter sale price');
      return;
    }

    const salePriceNum = parseInt(salePrice);
    if (product.supply_price && salePriceNum <= product.supply_price) {
      alert('Sale price must be higher than supply price');
      return;
    }

    setUpdating(true);
    try {
      const margin = calculateMargin();

      const payload: SellerProductUpdateRequest = {
        title,
        sale_price: salePriceNum,
        margin_amount: margin.amount,
        margin_rate: margin.rate,
        is_published: isPublished,
      };

      await sellerProductAPI.updateProduct(id, payload);
      alert('Product updated successfully');
      navigate('/dashboard/seller/products');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    } finally {
      setUpdating(false);
    }
  };

  const margin = calculateMargin();

  if (loading) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: 'Seller Dashboard', href: '/dashboard/seller' },
            { label: 'Products', href: '/dashboard/seller/products' },
            { label: 'Edit Product', isCurrent: true },
          ]}
        />
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: 'Seller Dashboard', href: '/dashboard/seller' },
            { label: 'Products', href: '/dashboard/seller/products' },
            { label: 'Edit Product', isCurrent: true },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/dashboard/seller/products')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Product List
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Seller Dashboard', href: '/dashboard/seller' },
          { label: 'Products', href: '/dashboard/seller/products' },
          { label: product.title, isCurrent: true },
        ]}
      />

      <PageHeader
        title="Edit Product"
        subtitle={`Editing: ${product.sku}`}
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

      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
        <div className="space-y-4">
          {/* Source Product Info */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Source Product</div>
            <div className="flex items-center gap-3">
              {product.thumbnail_url && (
                <img
                  src={product.thumbnail_url}
                  alt={product.title}
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div>
                <div className="font-medium text-gray-900">
                  {product.supplier_product_title || product.title}
                </div>
                <div className="text-sm text-gray-500">SKU: {product.sku}</div>
              </div>
            </div>
          </div>

          {/* Product Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter product title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Supply Price (Read-only) */}
          {product.supply_price !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supply Price
              </label>
              <input
                type="text"
                value={`${product.supply_price.toLocaleString()} KRW`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          )}

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Enter sale price"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Margin Display */}
          {salePrice && parseInt(salePrice) > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Expected Margin
                </span>
                <span className="text-lg font-bold text-green-600">
                  {margin.amount.toLocaleString()} KRW
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Margin Rate: {margin.rate.toFixed(2)}%
              </div>
            </div>
          )}

          {/* Published Status */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Published</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleUpdate}
              disabled={
                updating ||
                !salePrice ||
                (product.supply_price !== undefined &&
                  parseInt(salePrice) <= product.supply_price)
              }
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerProductEditPage;
