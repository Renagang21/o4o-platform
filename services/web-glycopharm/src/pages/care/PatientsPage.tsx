/**
 * PatientsPage - 당뇨인 목록 관리
 *
 * WO-CARE-DATA-ALIGNMENT-PHASE1-V1
 *
 * - 위험도: Care snapshot risk_level 기반 (fallback: 'low')
 * - 최근 분석일: Care snapshot created_at 기반
 * - 정렬: 최근 분석일 desc (fallback: lastOrderAt → createdAt)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Filter,
  ChevronRight,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ArrowDown,
  ArrowUp,
  UserPlus,
  X,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer, type CareDashboardSummary } from '@/api/pharmacy';
import CareSubNav from './CareSubNav';

type RiskLevel = 'all' | 'high' | 'moderate' | 'low';

const RISK_CONFIG = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
} as const;

const DIABETES_LABELS: Record<string, string> = {
  type1: '제1형',
  type2: '제2형',
  gestational: '임신성',
  prediabetes: '전단계',
};

interface SnapshotData {
  riskLevel: string;
  createdAt: string;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // WO-GLYCOPHARM-CARE-UI-ADJUST-V1: 당뇨인 등록 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customersRes, summaryRes] = await Promise.all([
        pharmacyApi.getCustomers({
          search: debouncedSearch || undefined,
          pageSize: 50,
        }),
        pharmacyApi.getCareDashboardSummary().catch(() => null),
      ]);

      if (customersRes.success && customersRes.data) {
        setPatients(customersRes.data.items);
      }
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'GLYCOPHARM_ORG_NOT_FOUND' || code === 'GLYCOPHARM_NOT_ENROLLED' || code === 'GLYCOPHARM_ORG_INACTIVE') {
        // 약국 연동 전 — 에러 배너 없이 빈 상태만 표시
      } else {
        setError('당뇨인 정보를 불러오는데 실패했습니다.');
      }
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Snapshot map: patientId → { riskLevel, createdAt }
  const snapshotMap = useMemo(() => {
    const map = new Map<string, SnapshotData>();
    if (summary?.recentSnapshots) {
      for (const s of summary.recentSnapshots) {
        if (!map.has(s.patientId)) {
          map.set(s.patientId, { riskLevel: s.riskLevel, createdAt: s.createdAt });
        }
      }
    }
    return map;
  }, [summary]);

  // Risk level: Care snapshot 기반 (fallback: 'low')
  const getRisk = (p: PharmacyCustomer): keyof typeof RISK_CONFIG => {
    const snapshot = snapshotMap.get(p.id);
    if (snapshot && snapshot.riskLevel in RISK_CONFIG) {
      return snapshot.riskLevel as keyof typeof RISK_CONFIG;
    }
    return 'low';
  };

  // Analysis date from snapshot
  const getAnalysisDate = (p: PharmacyCustomer): string | null => {
    const snapshot = snapshotMap.get(p.id);
    return snapshot?.createdAt ?? null;
  };

  // Client-side risk filter
  const filteredPatients = patients.filter((p) => {
    if (riskFilter === 'all') return true;
    return getRisk(p) === riskFilter;
  });

  // Sort: 최근 분석일 → 마지막 주문일 → createdAt (fallback chain)
  const getSortDate = (p: PharmacyCustomer): number => {
    const analysisDate = getAnalysisDate(p);
    if (analysisDate) return new Date(analysisDate).getTime();
    if (p.lastOrderAt) return new Date(p.lastOrderAt).getTime();
    return new Date(p.createdAt).getTime();
  };

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const dateA = getSortDate(a);
    const dateB = getSortDate(b);
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const SortIcon = sortDirection === 'desc' ? ArrowDown : ArrowUp;

  const handleRegisterSubmit = async () => {
    if (!registerForm.name.trim()) {
      setRegisterError('이름을 입력해주세요.');
      return;
    }
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const res = await pharmacyApi.createCustomer({
        name: registerForm.name.trim(),
        phone: registerForm.phone.trim() || undefined,
        email: registerForm.email.trim() || undefined,
        notes: registerForm.notes.trim() || undefined,
      });
      if (res.success) {
        setShowRegisterModal(false);
        setRegisterForm({ name: '', phone: '', email: '', notes: '' });
        loadData();
      } else {
        setRegisterError('당뇨인 등록에 실패했습니다.');
      }
    } catch {
      setRegisterError('당뇨인 등록 중 오류가 발생했습니다.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CareSubNav />
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">당뇨인 관리</h1>
              <p className="text-primary-100 mt-1">
                {loading ? '불러오는 중...' : `총 ${patients.length}명의 당뇨인`}
              </p>
            </div>

            {summary && (
              <div className="hidden md:flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-full">
                  <AlertTriangle className="w-4 h-4" />
                  고위험 {summary.highRiskCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  주의 {summary.moderateRiskCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  양호 {summary.lowRiskCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Action Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처 검색"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">전체 위험도</option>
              <option value="high">고위험</option>
              <option value="moderate">주의</option>
              <option value="low">양호</option>
            </select>
          </div>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            당뇨인 등록
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : sortedPatients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">
                {debouncedSearch || riskFilter !== 'all'
                  ? '조건에 맞는 당뇨인이 없습니다.'
                  : '연결된 당뇨인이 없습니다.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    당뇨 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    위험도
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer select-none hover:text-primary-600 transition-colors"
                    onClick={() => setSortDirection((d) => d === 'desc' ? 'asc' : 'desc')}
                  >
                    <span className="inline-flex items-center gap-1">
                      최근 분석일
                      <SortIcon className="w-3.5 h-3.5" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    마지막 주문
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    총 구매액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPatients.map((patient) => {
                  const risk = getRisk(patient);
                  const config = RISK_CONFIG[risk];
                  const analysisDate = getAnalysisDate(patient);
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/care/patients/${patient.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {patient.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{patient.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.diabetesType ? DIABETES_LABELS[patient.diabetesType] || patient.diabetesType : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.cls}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {analysisDate ? formatDate(analysisDate) : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {patient.lastOrderAt ? formatDate(patient.lastOrderAt) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">
                        {patient.totalSpent.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-300 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 당뇨인 등록 모달 (WO-GLYCOPHARM-CARE-UI-ADJUST-V1) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRegisterModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">당뇨인 등록</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="당뇨인 이름"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@email.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
                <textarea
                  value={registerForm.notes}
                  onChange={(e) => setRegisterForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="특이사항 등"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {registerError && (
                <p className="text-sm text-red-600">{registerError}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleRegisterSubmit}
                  disabled={registerLoading}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {registerLoading ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
