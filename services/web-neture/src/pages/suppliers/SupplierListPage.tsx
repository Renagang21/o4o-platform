import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { netureApi, type Supplier } from '../../lib/api';

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const data = await netureApi.getSuppliers();
      setSuppliers(data);
      // API가 에러 시 []을 반환하므로, 빈 배열이면 API 문제일 수 있음
      // 하지만 실제로 공급자가 0명일 수도 있으므로 구분 불가 — 그냥 빈 상태 표시
    } catch {
      setApiError(true);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">공급자 목록</h1>
          <p className="text-lg text-gray-600">
            검증된 공급자의 정보를 확인하고 연락하세요
          </p>
        </div>
        <button
          onClick={fetchSuppliers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">공급자 정보를 불러오는 중...</p>
        </div>
      ) : apiError ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-lg mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-gray-400 text-sm mb-4">서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            onClick={fetchSuppliers}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">등록된 공급자가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">공급자가 등록되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/supplier-ops/suppliers/${supplier.slug}`}
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
      )}
    </div>
  );
}
