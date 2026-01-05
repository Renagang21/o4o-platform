/**
 * PharmacyPatients - 약국 고객 관리
 * Mock 데이터 제거, API 연동 구조
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  Activity,
  MoreVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer } from '@/api/pharmacy';

const diabetesLabels: Record<string, string> = {
  type1: '제1형 당뇨',
  type2: '제2형 당뇨',
  gestational: '임신성 당뇨',
  prediabetes: '당뇨 전단계',
};

export default function PharmacyPatients() {
  const [customers, setCustomers] = useState<PharmacyCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PharmacyCustomer | null>(null);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 고객 로드
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await pharmacyApi.getCustomers({
        search: debouncedSearch || undefined,
        pageSize: 50,
      });

      if (res.success && res.data) {
        setCustomers(res.data.items);
        setTotalCount(res.data.total);
      } else {
        throw new Error('고객 정보를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Customers load error:', err);
      setError(err.message || '고객 정보를 불러오는데 실패했습니다.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 고객 선택 시 상세 정보 로드
  const handleSelectCustomer = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고객 관리</h1>
          <p className="text-slate-500 text-sm">
            {loading ? '불러오는 중...' : `총 ${totalCount}명의 고객`}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25">
          <Plus className="w-5 h-5" />
          고객 등록
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처, 이메일로 검색..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <button
                onClick={loadCustomers}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Customers */}
          {!loading && !error && customers.length > 0 && (
            <div className="space-y-3">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.id)}
                  className={`bg-white rounded-2xl p-4 cursor-pointer transition-all ${selectedCustomer?.id === c.id
                      ? 'ring-2 ring-primary-500 shadow-md'
                      : 'hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <span className="text-white font-semibold">{c.name?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{c.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                              }`}
                          >
                            {c.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">
                        {c.totalSpent.toLocaleString()}원
                      </p>
                      <p className="text-xs text-slate-400">{c.totalOrders}회 구매</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && customers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">고객이 없습니다</h3>
              <p className="text-slate-500">
                {debouncedSearch
                  ? '검색 조건에 맞는 고객이 없습니다.'
                  : '아직 등록된 고객이 없습니다.'}
              </p>
            </div>
          )}
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl shadow-sm sticky top-6">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">고객 상세</h2>
                  <button className="p-1 hover:bg-slate-100 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {/* Profile */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-white">
                      {selectedCustomer.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedCustomer.name}</h3>
                  {selectedCustomer.diabetesType && (
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full mt-2">
                      {diabetesLabels[selectedCustomer.diabetesType] || selectedCustomer.diabetesType}
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.lastOrderAt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-700">
                        마지막 주문: {new Date(selectedCustomer.lastOrderAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-primary-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary-700">
                      {selectedCustomer.totalOrders}
                    </p>
                    <p className="text-xs text-primary-600">총 주문</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-lg font-bold text-green-700">
                      {(selectedCustomer.totalSpent / 10000).toFixed(0)}만원
                    </p>
                    <p className="text-xs text-green-600">총 구매액</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                    주문 내역 보기
                  </button>
                  <button className="w-full py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                    메모 작성
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                고객을 선택하면 상세 정보를 볼 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
