/**
 * CareDashboardPage - Care Home (환자 관리 포털)
 *
 * WO-CARE-HOME-LAYOUT-PHASE1-V1
 *
 * Phase 1: 레이아웃 골격 배치
 * - KPI 카드/Risk Distribution/Recent 리스트 제거
 * - Hero + Action Bar + 환자 테이블 중심 구성
 * - 기존 API만 사용 (백엔드 수정 없음)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Customer, CareDashboardDto } from '../services/api';

interface PatientRow {
  customer: Customer;
  riskLevel: string | null;
  lastAnalysisAt: string | null;
}

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
};

export default function CareDashboardPage() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers + dashboard snapshots
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [customersRes, dashboardRes] = await Promise.all([
          api.listCustomers({
            limit: 200,
            search: debouncedSearch || undefined,
          }),
          api.getCareDashboard().catch((): CareDashboardDto | null => null),
        ]);

        if (cancelled) return;

        // Build snapshot map: patientId → latest snapshot
        const snapshotMap = new Map<
          string,
          { riskLevel: string; createdAt: string }
        >();
        if (dashboardRes) {
          for (const s of dashboardRes.recentSnapshots) {
            if (!snapshotMap.has(s.patientId)) {
              snapshotMap.set(s.patientId, s);
            }
          }
        }

        // Merge customers with snapshot data
        const merged: PatientRow[] = customersRes.data.map((c) => {
          const snapshot = snapshotMap.get(c.id);
          return {
            customer: c,
            riskLevel: snapshot?.riskLevel ?? null,
            lastAnalysisAt: snapshot?.createdAt ?? null,
          };
        });

        // Sort: with snapshot first (date DESC), then without
        merged.sort((a, b) => {
          if (a.lastAnalysisAt && !b.lastAnalysisAt) return -1;
          if (!a.lastAnalysisAt && b.lastAnalysisAt) return 1;
          if (a.lastAnalysisAt && b.lastAnalysisAt) {
            return (
              new Date(b.lastAnalysisAt).getTime() -
              new Date(a.lastAnalysisAt).getTime()
            );
          }
          return 0;
        });

        setRows(merged);
      } catch {
        if (!cancelled) {
          setError('데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <h1 className="text-xl font-bold text-slate-900">환자 관리</h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-slate-900">환자 관리</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/patients"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 환자 등록
          </Link>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처 검색"
              className="pl-10 pr-4 py-2.5 w-64 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">
                {debouncedSearch
                  ? '검색 결과가 없습니다.'
                  : '등록된 환자가 없습니다.'}
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
                {rows.map((row) => {
                  const badge = row.riskLevel
                    ? RISK_BADGE[row.riskLevel]
                    : null;
                  return (
                    <tr
                      key={row.customer.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {row.customer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.customer.phone || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {badge ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">미분석</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {row.lastAnalysisAt
                          ? formatDate(row.lastAnalysisAt)
                          : '-'}
                      </td>
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
