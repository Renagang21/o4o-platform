/**
 * KpaOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *
 * WO-O4O-OPERATOR-KPA-MIGRATION-V1:
 *   Config builder를 operatorConfig.ts로 분리.
 *
 * WO-O4O-KPA-OPERATOR-DASHBOARD-FRONTEND-ADAPTER-V1:
 *   IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1 (Option B) Adapter.
 *   신규 backend /operator/dashboard endpoint 의 OperatorDashboardConfig pass-through 사용.
 *   기존 7 fetch → 2 fetch (dashboard + storeStats — AxisNavigation 의 '등록 매장' metric 용).
 *   isAdmin role-aware 응답은 backend 가 처리 (KPI/AI/Action/QuickActions 분기 backend 측).
 *   AxisNavigation + OperatorRoleGuideCard 는 frontend 유지 (I3 + I1 정합).
 *
 * Block 구조 (backend 반환):
 *  [1] KPI Grid       — backend kpis
 *  [2] AI Summary     — backend aiSummary (rule-based, LLM 미호출)
 *  [3] Action Queue   — backend actionQueue
 *  [4] Activity Log   — backend activityLog
 *  [5] Quick Actions  — backend quickActions
 *
 * Frontend 추가 요소:
 *  - OperatorRoleGuideCard (static, KPA only)
 *  - AxisNavigationSection (kpis 에서 metrics 파생 + storeStats 의 totalStores 만 별도 fetch)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
  type KpiItem,
} from '@o4o/operator-ux-core';
import { AxisNavigationSection, type OperatorAxisGroup } from '@o4o/operator-core-ui';
import { operatorApi } from '../../api/operator';
import { getAccessToken } from '../../contexts/AuthContext';

const PLATFORM_API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface StoreStats {
  totalStores: number;
  activeStores: number;
}

export default function KpaOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WO-O4O-KPA-OPERATOR-DASHBOARD-FRONTEND-ADAPTER-V1:
      //   기본 dashboard 1 fetch + AxisNavigation '등록 매장' metric 용 storeStats 1 보조 fetch
      //   (backend dashboard response 에 totalStores 미포함 — Foundation WO 정합 유지).
      //   Promise.allSettled 로 개별 실패 격리.
      const token = getAccessToken();
      const storeHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const results = await Promise.allSettled([
        operatorApi.getDashboard(),
        // WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1: serviceKey 명시 (F6 Boundary Policy)
        fetch(`${PLATFORM_API_BASE}/api/v1/operator/stores?limit=1&serviceKey=kpa-society`, { headers: storeHeaders })
          .then((r) => (r.ok ? r.json() : null)),
      ]);

      const dashRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const storeRes = results[1].status === 'fulfilled' ? results[1].value : null;

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[KPA-a Dashboard] fetch[${i}] failed:`, r.reason);
        }
      });

      if (!dashRes?.data) {
        setError('운영자 권한이 필요하거나 데이터를 불러올 수 없습니다.');
      } else {
        setConfig(dashRes.data);
        setStoreStats((storeRes as any)?.stats ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const axes = buildKpaAxesFromConfig(config, storeStats);

  return (
    <div className="space-y-6">
      {/* WO-O4O-KPA-OPERATOR-DASHBOARD-GUIDE-CARD-V1: 운영 철학 카드 (KPA only, frontend static) */}
      <OperatorRoleGuideCard />
      {/* WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1: 2축 운영 네비게이션 (frontend 유지 — I3 정합) */}
      {axes.length > 0 && <AxisNavigationSection axes={axes} />}
      <OperatorDashboardLayout config={config} />
    </div>
  );
}

// ─── KPA axes 생성 (backend dashboard config 에서 metrics 파생) ────────────────
// WO-O4O-KPA-OPERATOR-DASHBOARD-FRONTEND-ADAPTER-V1:
//   기존 buildKpaAxes(extData) 는 8개의 source 필드를 사용했으나, Adapter 단계에서는
//   dashboardConfig.kpis (key 매칭) 5개 + storeStats.totalStores 1개로 파생.
//   축 자체의 title/description/icon/tone/links 는 frontend static 유지 (I3 정합).

function getKpiValue(kpis: KpiItem[], key: string): number {
  const item = kpis.find((k) => k.key === key);
  if (!item) return 0;
  const v = item.value;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildKpaAxesFromConfig(
  config: OperatorDashboardConfig,
  storeStats: StoreStats | null,
): OperatorAxisGroup[] {
  const pendingMembers = getKpiValue(config.kpis, 'pending');
  const forumPending = getKpiValue(config.kpis, 'forum');
  const contentPending = getKpiValue(config.kpis, 'content');
  const productApplicationPending = getKpiValue(config.kpis, 'product-applications');
  const pharmacyRequest = getKpiValue(config.kpis, 'pharmacy-requests');
  const totalStores = storeStats?.totalStores ?? 0;

  return [
    {
      key: 'community',
      title: '커뮤니티 운영',
      description: '포럼 · 회원 · 콘텐츠 · LMS · 자료실',
      icon: '💬',
      tone: 'blue',
      metrics: [
        { label: '회원 승인', value: pendingMembers, href: '/operator/members', warn: pendingMembers > 0 },
        { label: '포럼 요청', value: forumPending, href: '/operator/forum-management', warn: forumPending > 0 },
        { label: '콘텐츠 대기', value: contentPending, href: '/operator/content', warn: contentPending > 0 },
      ],
      links: [
        { key: 'forum', label: '포럼 운영', href: '/operator/forum' },
        { key: 'members', label: '회원 관리', href: '/operator/members' },
        { key: 'lms', label: '강의 관리', href: '/operator/lms' },
      ],
    },
    {
      key: 'store-hub',
      title: '매장 HUB 운영',
      description: '매장 · 이벤트 오퍼 · 사이니지 · 상품 신청',
      icon: '🏪',
      tone: 'emerald',
      metrics: [
        { label: '상품 신청', value: productApplicationPending, href: '/operator/product-applications', warn: productApplicationPending > 0 },
        { label: '약국 서비스', value: pharmacyRequest, href: '/operator/pharmacy-requests', warn: pharmacyRequest > 0 },
        { label: '등록 매장', value: totalStores, href: '/operator/stores', warn: false },
      ],
      links: [
        { key: 'stores', label: '매장 관리', href: '/operator/stores' },
        { key: 'event-offers', label: '이벤트 오퍼', href: '/operator/event-offers' },
        { key: 'signage', label: '사이니지', href: '/operator/signage/hq-media' },
      ],
    },
  ];
}

// ─── 운영 철학 가이드 카드 ─────────────────────────────────────────────────────
// WO-O4O-KPA-OPERATOR-DASHBOARD-GUIDE-CARD-V1: KPA only static. frontend 유지 (I1 정합).

function OperatorRoleGuideCard() {
  return (
    <section className="bg-white rounded-xl border border-indigo-100 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden="true">🤝</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            운영자는 관리자가 아닙니다
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            공급자 협력 · 자료 구성 · AI 보조 · 매장 지원 · 운영 생태계 구축
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            운영자는 공급자와 협력하고 자료를 정리하며 AI 도움을 활용하여
            매장이 실제 활용할 수 있는 환경을 지원합니다.
          </p>
          <Link
            to="/guide/for/operator"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            운영자 활용 가이드 보기
            <span className="ml-1" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
