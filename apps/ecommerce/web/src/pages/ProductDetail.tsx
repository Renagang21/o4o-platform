import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

interface Product {
  id: string;
  title: string;
  thumbnail: string | null;
  description?: string;
  variants: Array<{
    prices: Array<{
      amount: number;
    }>;
  }>;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCart = useCartStore((state: any) => state.addToCart);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/store/products/${id}`);
        if (!res.ok) throw new Error('상품 정보를 불러오지 못했습니다.');
        const data = await res.json();
        setProduct(data.product);
      } catch (err) {
        setError(err instanceof Error ? err.message : '에러 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center text-red-500 py-10">{error || '상품을 찾을 수 없습니다.'}</div>
    );
  }

  const price = product.variants[0]?.prices[0]?.amount || 0;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{product.title}</h1>
      {product.thumbnail && (
        <img src={product.thumbnail} alt={product.title} className="w-full h-64 object-cover rounded mb-4" />
      )}
      <div className="text-lg font-semibold mb-2">₩{price.toLocaleString()}</div>
      <div className="mb-6 text-gray-700 min-h-[48px]">
        {product.description || <span className="text-gray-400">설명이 없습니다.</span>}
      </div>
      <button
        className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition"
        onClick={() => {
          addToCart({
            id: product.id,
            title: product.title,
            price: price,
            thumbnail: product.thumbnail,
          });
          navigate('/cart');
        }}
      >
        장바구니에 담기
      </button>
    </div>
  );
};

export default ProductDetail; 