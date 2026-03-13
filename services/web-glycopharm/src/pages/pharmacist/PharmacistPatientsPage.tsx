/**
 * PharmacistPatientsPage — 약사 환자 목록
 * WO-GLYCOPHARM-PHARMACIST-PATIENT-LIST-SCREEN-V1
 *
 * 약사가 관리하는 환자 목록 + 위험 상태 + 검색.
 * 기존 pharmacyApi (getCustomers, getRiskPatients) 재사용.
 * 새 백엔드 불필요.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Search,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type { PharmacyCustomer, RiskPatientDto } from '@/api/pharmacy';

// ─── Risk config ───

interface RiskConfig {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  sortOrder: number;
}

const RISK_MAP: Record<string, RiskConfig> = {
  high: { label: '고위험', color: 'text-red-700', bgColor: 'bg-red-50', dotColor: 'bg-red-500', sortOrder: 0 },
  caution: { label: '주의', color: 'text-amber-700', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500', sortOrder: 1 },
  normal: { label: '정상', color: 'text-emerald-700', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500', sortOrder: 2 },
};

const DEFAULT_RISK: RiskConfig = { label: '미분석', color: 'text-slate-500', bgColor: 'bg-slate-50', dotColor: 'bg-slate-300', sortOrder: 3 };

type SortKey = 'risk' | 'recent' | 'name';

// ─── Main Component ───

export default function PharmacistPatientsPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<PharmacyCustomer[]>([]);
  const [riskMap, setRiskMap] = useState<Map<string, RiskPatientDto>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('risk');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customersRes, riskRes] = await Promise.all([
        pharmacyApi.getCustomers({ pageSize: 200 }).catch(() => null),
        pharmacyApi.getRiskPatients().catch(() => null),
      ]);

      // Extract customers
      if (customersRes && 'data' in customersRes && customersRes.data) {
        const data = customersRes.data;
        if ('data' in data && Array.isArray(data.data)) {
          setCustomers(data.data);
        } else if (Array.isArray(data)) {
          setCustomers(data as PharmacyCustomer[]);
        }
      }

      // Build risk lookup map
      if (riskRes) {
        const map = new Map<string, RiskPatientDto>();
        const highRisk = Array.isArray(riskRes.highRisk) ? riskRes.highRisk : [];
        const caution = Array.isArray(riskRes.caution) ? riskRes.caution : [];
        [...highRisk, ...caution].forEach((r) => map.set(r.patientId, r));
        setRiskMap(map);
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
      const risk = riskMap.get(c.id);
      const riskLevel = risk?.compositeRiskLevel || 'normal';
      const riskCfg = RISK_MAP[riskLevel] || DEFAULT_RISK;
      return {
        ...c,
        risk,
        riskLevel,
        riskCfg: risk ? riskCfg : DEFAULT_RISK,
        tir: risk?.tir ?? null,
        cv: risk?.cv ?? null,
        lastAnalysis: risk?.lastAnalysisDate || null,
      };
    });
  }, [customers, riskMap]);

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
        const diff = a.riskCfg.sortOrder - b.riskCfg.sortOrder;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortBy === 'recent') {
        const aTime = a.lastAnalysis ? new Date(a.lastAnalysis).getTime() : 0;
        const bTime = b.lastAnalysis ? new Date(b.lastAnalysis).getTime() : 0;
        return bTime - aTime;
      }
      return a.name.localeCompare(b.name, 'ko');
    });

    return list;
  }, [enrichedPatients, search, sortBy]);

  // Summary counts
  const highCount = enrichedPatients.filter((p) => p.riskLevel === 'high').length;
  const cautionCount = enrichedPatients.filter((p) => p.riskLevel === 'caution').length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pharmacist')}
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
            <h1 className="text-xl font-bold text-slate-800">환자 관리</h1>
            <p className="text-xs text-slate-400">
              {enrichedPatients.length}명의 환자
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
                {cautionCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                    주의 {cautionCount}
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
                placeholder="환자 이름, 전화번호 검색"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2 mb-4">
              {([
                { key: 'risk' as SortKey, label: '위험도순' },
                { key: 'recent' as SortKey, label: '최근순' },
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
                  {search ? '검색 결과가 없습니다' : '등록된 환자가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/pharmacist/patient/${patient.id}`)}
                    className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    {/* Risk dot */}
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${patient.riskCfg.dotColor}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {patient.name}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${patient.riskCfg.bgColor} ${patient.riskCfg.color}`}>
                          {patient.riskCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {patient.tir != null && (
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            TIR {patient.tir}%
                          </span>
                        )}
                        {patient.lastAnalysis && (
                          <span>
                            {new Date(patient.lastAnalysis).toLocaleDateString('ko-KR')}
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
