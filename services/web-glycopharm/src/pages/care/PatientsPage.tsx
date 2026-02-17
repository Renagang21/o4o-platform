/**
 * PatientsPage - 환자 관리 페이지
 *
 * WO-MENU-REALIGN-V1 Phase 2
 *
 * Care 실무 공간 - 환자 목록, 상세, 분석, 상담 기능 통합.
 *
 * 구조:
 * 1. 환자 목록 (검색, 필터)
 * 2. 환자 상세 (탭 기반: 정보, 분석, 상담, 성과)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
  MessageCircle,
  TrendingUp,
  MoreVertical,
  Loader2,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer, type CareDashboardSummary } from '@/api/pharmacy';

type RiskLevel = 'all' | 'high' | 'moderate' | 'low';
type TabType = 'info' | 'analysis' | 'coaching' | 'progress';

const RISK_CONFIG = {
  high: { label: '고위험', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  moderate: { label: '주의 필요', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  low: { label: '양호', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

const TAB_CONFIG: { key: TabType; label: string; icon: typeof Activity }[] = [
  { key: 'info', label: '기본 정보', icon: Users },
  { key: 'analysis', label: '분석', icon: Activity },
  { key: 'coaching', label: '상담', icon: MessageCircle },
  { key: 'progress', label: '성과', icon: TrendingUp },
];

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');
  const [selectedPatient, setSelectedPatient] = useState<PharmacyCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 데이터 로드
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
      console.error('Patients load error:', err);
      setError(err.message || '환자 정보를 불러오는데 실패했습니다.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // URL에서 환자 ID 읽기
  useEffect(() => {
    const patientId = searchParams.get('id');
    if (patientId && patients.length > 0) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [searchParams, patients]);

  // 환자 선택
  const handleSelectPatient = (patient: PharmacyCustomer) => {
    setSelectedPatient(patient);
    setActiveTab('info');
    setSearchParams({ id: patient.id });
  };

  // 위험도 결정 (Mock - 실제로는 Care API에서 가져와야 함)
  const getPatientRisk = (patient: PharmacyCustomer): keyof typeof RISK_CONFIG => {
    // diabetesType 기반 임시 로직
    if (patient.diabetesType === 'type1') return 'high';
    if (patient.diabetesType === 'type2') return 'moderate';
    return 'low';
  };

  // 필터링된 환자 목록
  const filteredPatients = patients.filter((p) => {
    if (riskFilter === 'all') return true;
    return getPatientRisk(p) === riskFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">환자 관리</h1>
              <p className="text-sm text-slate-500">
                {loading ? '불러오는 중...' : `총 ${patients.length}명의 환자`}
              </p>
            </div>

            {/* Summary Badges */}
            {summary && (
              <div className="hidden md:flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-full">
                  <AlertTriangle className="w-4 h-4" />
                  고위험 {summary.highRiskCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  주의 {summary.moderateRiskCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  양호 {summary.lowRiskCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Patient List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 연락처로 검색..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">전체 위험도</option>
                  <option value="high">고위험</option>
                  <option value="moderate">주의 필요</option>
                  <option value="low">양호</option>
                </select>
              </div>
            </div>

            {/* Patient List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 px-4">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-3 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    다시 시도
                  </button>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">환자가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {filteredPatients.map((patient) => {
                    const risk = getPatientRisk(patient);
                    const config = RISK_CONFIG[risk];
                    const RiskIcon = config.icon;
                    const isSelected = selectedPatient?.id === patient.id;

                    return (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium text-sm">
                                {patient.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{patient.name}</p>
                              <p className="text-xs text-slate-500">{patient.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                              <RiskIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Patient Detail */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Patient Header */}
                <div className="p-5 border-b bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {selectedPatient.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h2>
                          {(() => {
                            const risk = getPatientRisk(selectedPatient);
                            const config = RISK_CONFIG[risk];
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                                {config.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-slate-500">{selectedPatient.phone}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b">
                  <div className="flex">
                    {TAB_CONFIG.map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                            isActive
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <TabIcon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs text-slate-500 mb-1">이메일</p>
                          <p className="font-medium text-slate-800">{selectedPatient.email || '-'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs text-slate-500 mb-1">당뇨 유형</p>
                          <p className="font-medium text-slate-800">
                            {selectedPatient.diabetesType === 'type1' && '제1형 당뇨'}
                            {selectedPatient.diabetesType === 'type2' && '제2형 당뇨'}
                            {selectedPatient.diabetesType === 'gestational' && '임신성 당뇨'}
                            {selectedPatient.diabetesType === 'prediabetes' && '당뇨 전단계'}
                            {!selectedPatient.diabetesType && '-'}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs text-slate-500 mb-1">마지막 주문</p>
                          <p className="font-medium text-slate-800">
                            {selectedPatient.lastOrderAt
                              ? new Date(selectedPatient.lastOrderAt).toLocaleDateString('ko-KR')
                              : '-'}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs text-slate-500 mb-1">총 구매액</p>
                          <p className="font-medium text-slate-800">
                            {selectedPatient.totalSpent.toLocaleString()}원
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">혈당 분석 데이터가 연동되면 여기에 표시됩니다</p>
                      <p className="text-xs text-slate-400 mt-2">GlucoseView Care 모듈 연동 예정</p>
                    </div>
                  )}

                  {activeTab === 'coaching' && (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">상담 기록이 연동되면 여기에 표시됩니다</p>
                      <p className="text-xs text-slate-400 mt-2">GlucoseView Care 모듈 연동 예정</p>
                    </div>
                  )}

                  {activeTab === 'progress' && (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">성과 추적 데이터가 연동되면 여기에 표시됩니다</p>
                      <p className="text-xs text-slate-400 mt-2">GlucoseView Care 모듈 연동 예정</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">환자를 선택하세요</h3>
                <p className="text-slate-500">좌측 목록에서 환자를 선택하면 상세 정보를 볼 수 있습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
