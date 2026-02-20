/**
 * CareDashboardPage - Care Home (환자 관리 포털)
 *
 * WO-CARE-HOME-LAYOUT-PHASE1-V1
 *
 * Phase 1: 레이아웃 골격 배치
 * - KPI 카드/그래프/Quick Actions 제거
 * - Hero + Action Bar + 환자 테이블 중심 구성
 * - 기존 API만 사용 (백엔드 수정 없음)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer } from '@/api/pharmacy';

const RISK_CONFIG = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
} as const;

export default function CareDashboardPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pharmacyApi.getCustomers({
        search: debouncedSearch || undefined,
        pageSize: 100,
      });
      if (res.success && res.data) {
        setPatients(res.data.items);
      }
    } catch {
      setError('환자 정보를 불러오는데 실패했습니다.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Risk level: diabetesType 기반 (기존 PatientsPage 로직 재사용)
  const getRisk = (p: PharmacyCustomer): keyof typeof RISK_CONFIG => {
    if (p.diabetesType === 'type1') return 'high';
    if (p.diabetesType === 'type2') return 'moderate';
    return 'low';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-xl font-bold text-slate-900">환자 관리</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            환자 등록
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처 검색"
              className="pl-10 pr-4 py-2.5 w-64 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">
                {debouncedSearch ? '검색 결과가 없습니다.' : '등록된 환자가 없습니다.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    환자명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    위험도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    최근 분석일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => {
                  const risk = getRisk(patient);
                  const config = RISK_CONFIG[risk];
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients?id=${patient.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {patient.phone || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.cls}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">-</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
