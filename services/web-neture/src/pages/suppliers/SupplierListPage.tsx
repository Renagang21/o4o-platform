import { Link } from 'react-router-dom';
import { mockSuppliers } from '../../data/mockData';

export default function SupplierListPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">공급자 목록</h1>
        <p className="text-lg text-gray-600">
          검증된 공급자의 정보를 확인하고 연락하세요
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSuppliers.map((supplier) => (
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
                제품 {supplier.products.length}개
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
