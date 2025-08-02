import { useState, useEffect, FC } from 'react';
import ProductCard, { Product } from '../components/ProductCard';
import useToast from '../hooks/useToast';

const tempProducts: Product[] = [
  {
    id: '1',
    name: '비타민C 1000',
    description: '고함량 비타민C로 면역력 강화에 도움을 줍니다.',
    price: 12000,
    stock: 50,
    imageUrl: '',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '오메가3',
    description: '혈행 개선과 두뇌 건강에 좋은 오메가3.',
    price: 18000,
    stock: 30,
    imageUrl: '',
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

const ProductList: FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제 API 연동
    setProducts(tempProducts);
    setLoading(false);
  }, []);

  const handleEdit = (id: string) => {
    showToast({ type: 'info', message: `상품 수정: ${id}` });
    // TODO: 상품 수정 페이지로 이동
  };

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast({ type: 'success', message: '상품이 삭제되었습니다.' });
  };

  const handleToggleActive = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isActive: !p.isActive } : p
      )
    );
    showToast({ type: 'info', message: '상품 판매 상태가 변경되었습니다.' });
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh] text-gray-500 dark:text-gray-300">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">내 상품 목록</h2>
          <a
            href="/products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            상품 등록
          </a>
        </div>
        {products.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-300 py-16">등록된 상품이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList; 