/**
 * PharmacistPatientsPage — 약사 당뇨인 목록
 * WO-GLYCOPHARM-PHARMACIST-PATIENT-LIST-SCREEN-V1
 * WO-GLYCOPHARM-PATIENT-RISK-SCORE-V1
 *
 * 약사가 관리하는 당뇨인 목록 + 위험도 + 최근/평균 혈당 + 검색.
 * 클라이언트 측 calculateRisk() 기반 위험도 계산.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Search,
  ChevronRight,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type { PharmacyCustomer, HealthReadingDto } from '@/api/pharmacy';
import { calculateRisk, RISK_CONFIG, NO_DATA_CONFIG } from '@/utils/riskScore';
import type { RiskResult } from '@/utils/riskScore';

type SortKey = 'risk' | 'recent' | 'name';

// ─── Main Component ───

export default function PharmacistPatientsPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<PharmacyCustomer[]>([]);
  const [readingsMap, setReadingsMap] = useState<Map<string, RiskResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('risk');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const customersRes = await pharmacyApi.getCustomers({ pageSize: 200 }).catch(() => null);

      let loadedCustomers: PharmacyCustomer[] = [];
      if (customersRes && 'data' in customersRes && customersRes.data) {
        const data = customersRes.data;
        if ('data' in data && Array.isArray(data.data)) {
          loadedCustomers = data.data;
        } else if (Array.isArray(data)) {
          loadedCustomers = data as PharmacyCustomer[];
        }
      }
      setCustomers(loadedCustomers);

      // Fetch readings per patient in parallel → compute risk
      if (loadedCustomers.length > 0) {
        const riskEntries = await Promise.all(
          loadedCustomers.map(async (c) => {
            try {
              const readings = await pharmacyApi.getHealthReadings(c.id, { metricType: 'glucose' });
              const arr = Array.isArray(readings) ? readings as HealthReadingDto[] : [];
              return [c.id, calculateRisk(arr)] as const;
            } catch {
              return [c.id, calculateRisk([])] as const;
            }
          }),
        );
        setReadingsMap(new Map(riskEntries));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived data ───

  const enrichedPatients = useMemo(() => {
    return customers.map((c) => {
      const risk = readingsMap.get(c.id) || null;
      const hasData = risk && risk.readingCount > 0;
      const cfg = hasData ? RISK_CONFIG[risk.level] : NO_DATA_CONFIG;
      return { ...c, risk, cfg, hasData };
    });
  }, [customers, readingsMap]);

  const filtered = useMemo(() => {
    let list = enrichedPatients;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)),
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === 'risk') {
        const diff = a.cfg.sortOrder - b.cfg.sortOrder;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortBy === 'recent') {
        const aVal = a.risk?.latestGlucose ?? 0;
        const bVal = b.risk?.latestGlucose ?? 0;
        return bVal - aVal;
      }
      return a.name.localeCompare(b.name, 'ko');
    });

    return list;
  }, [enrichedPatients, search, sortBy]);

  // Summary counts
  const highCount = enrichedPatients.filter((p) => p.hasData && p.risk?.level === 'HIGH').length;
  const mediumCount = enrichedPatients.filter((p) => p.hasData && p.risk?.level === 'MEDIUM').length;
  const lowCount = enrichedPatients.filter((p) => p.hasData && p.risk?.level === 'LOW').length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pharmacy')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">당뇨인 관리</h1>
            <p className="text-xs text-slate-400">
              {enrichedPatients.length}명의 당뇨인
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Summary badges */}
            {enrichedPatients.length > 0 && (
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  전체 {enrichedPatients.length}
                </span>
                {highCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    고위험 {highCount}
                  </span>
                )}
                {mediumCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                    주의 {mediumCount}
                  </span>
                )}
                {lowCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                    정상 {lowCount}
                  </span>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="당뇨인 이름, 전화번호 검색"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2 mb-4">
              {([
                { key: 'risk' as SortKey, label: '위험도순' },
                { key: 'recent' as SortKey, label: '최근 혈당순' },
                { key: 'name' as SortKey, label: '이름순' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    sortBy === opt.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Patient List */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  {search ? '검색 결과가 없습니다' : '등록된 당뇨인가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/pharmacy/patient/${patient.id}`)}
                    className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    {/* Risk dot */}
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${patient.cfg.dotColor}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {patient.name}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${patient.cfg.bgColor} ${patient.cfg.color}`}>
                          {patient.cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {patient.risk?.avgGlucose != null && (
                          <span>
                            평균 <span className="font-medium text-slate-600">{patient.risk.avgGlucose}</span>
                          </span>
                        )}
                        {patient.risk?.hypoCount != null && patient.risk.hypoCount > 0 && (
                          <span className="text-violet-500">
                            저혈당 {patient.risk.hypoCount}회
                          </span>
                        )}
                        {patient.diabetesType && (
                          <span>
                            {patient.diabetesType === 'type1'
                              ? '1형'
                              : patient.diabetesType === 'type2'
                                ? '2형'
                                : patient.diabetesType === 'gestational'
                                  ? '임신성'
                                  : '전당뇨'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Latest glucose */}
                    {patient.risk?.latestGlucose != null && (
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold tabular-nums ${
                          patient.risk.latestGlucose > 180 || patient.risk.latestGlucose < 70
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}>
                          {patient.risk.latestGlucose}
                        </p>
                        <p className="text-[10px] text-slate-400">mg/dL</p>
                      </div>
                    )}

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
