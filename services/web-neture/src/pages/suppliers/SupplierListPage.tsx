import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Shield, Users, Activity } from 'lucide-react';
import { netureApi, type Supplier } from '../../lib/api';

const FILTERS = [
  { key: 'contactAvailable', icon: Shield, label: '연락 가능', activeColor: 'text-green-600' },
  { key: 'partnerApproved', icon: Users, label: '파트너 승인', activeColor: 'text-green-600' },
  { key: 'recentActive', icon: Activity, label: '최근 활동', activeColor: 'text-green-600' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredSuppliers = useMemo(() => {
    if (activeFilters.size === 0) return suppliers;

    return suppliers.filter((s) => {
      if (!s.trustSignals) return false;
      if (activeFilters.has('contactAvailable') && s.trustSignals.contactCompleteness < 1) return false;
      if (activeFilters.has('partnerApproved') && !s.trustSignals.hasApprovedPartners) return false;
      if (activeFilters.has('recentActive') && !s.trustSignals.recentActivity) return false;
      return true;
    });
  }, [suppliers, activeFilters]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const data = await netureApi.getSuppliers();
      setSuppliers(data);
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

      {/* Trust Signal Filters */}
      {!loading && !apiError && suppliers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {FILTERS.map(({ key, icon: Icon, label }) => {
            const isActive = activeFilters.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              초기화
            </button>
          )}
        </div>
      )}

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
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">조건에 맞는 공급자가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">필터 조건을 변경해 보세요.</p>
          <button
            onClick={() => setActiveFilters(new Set())}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/workspace/suppliers/${supplier.slug}`}
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
                <p className="text-xs text-gray-500 mb-2">
                  제품 {supplier.productCount}개
                </p>
                {supplier.trustSignals && (
                  <div className="flex items-center justify-center gap-2">
                    <span title={`연락처 ${supplier.trustSignals.contactCompleteness}개 공개`}>
                      <Shield className={`w-3.5 h-3.5 ${
                        supplier.trustSignals.contactCompleteness >= 3 ? 'text-green-500'
                          : supplier.trustSignals.contactCompleteness >= 1 ? 'text-yellow-500'
                            : 'text-gray-300'
                      }`} />
                    </span>
                    <span title={supplier.trustSignals.hasApprovedPartners ? '승인된 파트너 있음' : '파트너 없음'}>
                      <Users className={`w-3.5 h-3.5 ${
                        supplier.trustSignals.hasApprovedPartners ? 'text-green-500' : 'text-gray-300'
                      }`} />
                    </span>
                    {supplier.trustSignals.recentActivity && (
                      <span title="최근 30일 내 활동">
                        <Activity className="w-3.5 h-3.5 text-green-500" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
