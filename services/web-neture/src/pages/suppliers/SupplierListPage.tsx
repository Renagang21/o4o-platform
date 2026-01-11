import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { netureApi, type Supplier } from '../../lib/api';

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await netureApi.getSuppliers();
        setSuppliers(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600">Loading suppliers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-red-600">Error loading suppliers: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">공급자 목록</h1>
        <p className="text-lg text-gray-600">
          검증된 공급자의 정보를 확인하고 연락하세요
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <Link
            key={supplier.id}
            to={`/suppliers/${supplier.slug}`}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <img
                src={supplier.logo}
                alt={supplier.name}
                className="w-24 h-24 rounded-full mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {supplier.name}
              </h3>
              <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full mb-3">
                {supplier.category}
              </span>
              <p className="text-sm text-gray-600 mb-4">
                {supplier.shortDescription}
              </p>
              <p className="text-xs text-gray-500">
                제품 {supplier.productCount}개
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
