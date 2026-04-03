/**
 * GlycoPharmOperatorDashboard — 운영자 대시보드
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-FOUNDATION-V1:
 *   Phase 1 — KPI + Action Queue + Quick Actions 기본 골격
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-BUSINESS-BLOCKS-V2:
 *   Phase 2 — 사업 운영 블록 추가
 *   [4] Store / Pharmacy 운영  — 약국·매장 운영 허브
 *   [5] Forum / Community 운영 — 포럼·커뮤니티 운영 허브
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-CONTENT-BLOCKS-V3:
 *   Phase 3 — 남은 핵심 운영 축 추가
 *   [6] Care 운영              — 케어 현황·알림 모니터링
 *   [7] Content / Signage 운영 — 본부 콘텐츠 자산 운영
 *
 * Block 구조:
 *  [1] KPI Grid          — 6개 핵심 지표 (약국·상품·케어)
 *  [2] Action Queue      — 즉시 처리 항목 (입점 대기·임시저장·알림)
 *  [3] Quick Actions     — 주요 기능 바로가기 (5개)
 *  [4] Store/Pharmacy    — 약국 네트워크·매장 운영 진입점
 *  [5] Forum/Community   — 포럼 요청·삭제·관리·분석 진입점
 *  [6] Care              — 케어 현황·알림 모니터링 진입점
 *  [7] Content/Signage   — 미디어·플레이리스트·템플릿·가이드라인 진입점
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Loader2,
  Building2,
  Store,
  ChevronRight,
  MessageSquare,
  Trash2,
  Settings,
  Users,
  BarChart3,
  HeartPulse,
  Bell,
  MonitorPlay,
  ListMusic,
  LayoutTemplate,
  Library,
  Tv,
  BookOpen,
} from 'lucide-react';
import {
  KpiGrid,
  ActionQueueBlock,
  QuickActionBlock,
  type OperatorDashboardConfig,
  type KpiItem,
  type QuickActionItem,
} from '@o4o/operator-ux-core';
import { fetchOperatorDashboard } from '../../api/operatorDashboard';
import { buildGlycoPharmOperatorConfig } from './operatorConfig';
import OperatorAlerts from '../../components/OperatorAlerts';

// ─── Phase 1 Constants ──────────────────────────────────────

/** Phase 1: 6개 KPI만 표시 (total-orders stub · care-adoption-rate 제외) */
const PHASE1_KPI_KEYS = new Set([
  'active-pharmacies',
  'pending-applications',
  'active-products',
  'total-patients',
  'high-risk-patients',
  'open-care-alerts',
]);

/** Phase 1: Quick Actions — 운영자 주요 진입점 5개 */
const PHASE1_QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
  { id: 'manage-orders', label: '주문 관리', link: '/operator/orders', icon: 'shopping-cart' },
  { id: 'manage-care', label: '케어 관리', link: '/operator/care', icon: 'heart' },
  { id: 'manage-hq-media', label: '본부 콘텐츠', link: '/operator/signage/hq-media', icon: 'monitor' },
  { id: 'ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: 'bar-chart' },
];

// ─── Types ──────────────────────────────────────────────────

interface AlertItem {
  id: string;
  type: 'network' | 'commerce' | 'care' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

// ─── Phase 2: Business Block Definitions ────────────────────

interface BusinessLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STORE_PHARMACY_LINKS: BusinessLink[] = [
  { label: '약국 관리', path: '/operator/pharmacies', icon: Building2, description: '약국 네트워크 조회·관리' },
  { label: '매장 관리', path: '/operator/stores', icon: Store, description: '매장 운영 현황·설정' },
];

const FORUM_COMMUNITY_LINKS: BusinessLink[] = [
  { label: '포럼 관리', path: '/operator/forum-management', icon: Settings, description: '포럼 구조·설정 관리' },
  { label: '포럼 신청', path: '/operator/forum-requests', icon: MessageSquare, description: '신규 포럼 개설 요청 심사' },
  { label: '포럼 삭제 요청', path: '/operator/forum-delete-requests', icon: Trash2, description: '게시글 삭제 요청 처리' },
  { label: '커뮤니티 관리', path: '/operator/community', icon: Users, description: '커뮤니티 운영·모니터링' },
  { label: '포럼 분석', path: '/operator/forum-analytics', icon: BarChart3, description: '포럼 활동 통계·트렌드' },
];

// ─── Phase 3: Care / Content Block Definitions ──────────────

const CARE_LINKS: BusinessLink[] = [
  { label: '케어 현황', path: '/operator/care', icon: HeartPulse, description: '네트워크 전체 케어 모니터링' },
  { label: '케어 알림', path: '/operator/care/alerts', icon: Bell, description: '미처리 알림 확인·처리' },
];

const CONTENT_SIGNAGE_LINKS: BusinessLink[] = [
  { label: 'HQ 미디어', path: '/operator/signage/hq-media', icon: MonitorPlay, description: '본부 미디어 자산 관리' },
  { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists', icon: ListMusic, description: '본부 플레이리스트 편성' },
  { label: '템플릿', path: '/operator/signage/templates', icon: LayoutTemplate, description: '사이니지 템플릿 관리' },
  { label: '콘텐츠 허브', path: '/operator/signage/content', icon: Tv, description: '콘텐츠 통합 관리' },
  { label: '콘텐츠 라이브러리', path: '/operator/signage/library', icon: Library, description: '공유 콘텐츠 라이브러리' },
  { label: '가이드라인 관리', path: '/operator/guidelines', icon: BookOpen, description: '운영 가이드라인 작성·배포' },
];

// ─── Business Block Component ───────────────────────────────

function BusinessBlock({
  title,
  description,
  links,
  stats,
}: {
  title: string;
  description: string;
  links: BusinessLink[];
  stats?: { label: string; value: number | string }[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>

      {/* Stats (optional) */}
      {stats && stats.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="divide-y divide-slate-50">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
              <link.icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700">{link.label}</div>
              <div className="text-xs text-slate-400">{link.description}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function getKpiValue(kpis: KpiItem[], key: string): number | string | undefined {
  return kpis.find(k => k.key === key)?.value;
}

// ─── Main Component ─────────────────────────────────────────

export default function GlycoPharmOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOperatorDashboard();
      if (!data) {
        setError('운영자 권한이 필요하거나 데이터를 불러올 수 없습니다.');
      } else {
        setConfig(buildGlycoPharmOperatorConfig(data));
        setAlerts((data as any).operatorAlerts ?? []);
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
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
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

  // Phase 1: 6개 KPI만 필터
  const filteredKpis = config.kpis.filter(k => PHASE1_KPI_KEYS.has(k.key));

  // Phase 2: KPI 값에서 요약 수치 추출
  const activePharmacies = getKpiValue(config.kpis, 'active-pharmacies');
  const pendingApplications = getKpiValue(config.kpis, 'pending-applications');

  const storePharmacyStats = [
    ...(activePharmacies != null ? [{ label: '활성 약국', value: activePharmacies }] : []),
    ...(pendingApplications != null && pendingApplications !== 0
      ? [{ label: '입점 대기', value: pendingApplications }]
      : []),
  ];

  // Phase 3: Care 요약 수치 (기존 KPI에서 추출)
  const highRiskPatients = getKpiValue(config.kpis, 'high-risk-patients');
  const openCareAlerts = getKpiValue(config.kpis, 'open-care-alerts');

  const careStats = [
    ...(highRiskPatients != null ? [{ label: '고위험 환자', value: highRiskPatients }] : []),
    ...(openCareAlerts != null && openCareAlerts !== 0
      ? [{ label: '미처리 알림', value: openCareAlerts }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Operator Alerts (rule-based, above dashboard) */}
      <OperatorAlerts alerts={alerts} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">GlycoPharm 플랫폼 현황</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Block 1: KPI Grid (Phase 1 — 6 items) */}
      <KpiGrid items={filteredKpis} />

      {/* Block 2: Action Queue (backend-driven) */}
      <ActionQueueBlock items={config.actionQueue} />

      {/* Block 3: Quick Actions (Phase 1 — 5 items) */}
      <QuickActionBlock items={PHASE1_QUICK_ACTIONS} />

      {/* Block 4-5: 사업 운영 블록 (Phase 2) — 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 4: Store / Pharmacy 운영 */}
        <BusinessBlock
          title="약국 · 매장 운영"
          description="약국 네트워크와 매장 운영 상태를 관리합니다."
          links={STORE_PHARMACY_LINKS}
          stats={storePharmacyStats}
        />

        {/* Block 5: Forum / Community 운영 */}
        <BusinessBlock
          title="포럼 · 커뮤니티 운영"
          description="포럼 요청, 삭제 요청, 커뮤니티 운영 상태를 관리합니다."
          links={FORUM_COMMUNITY_LINKS}
        />
      </div>

      {/* Block 6-7: Care / Content 운영 블록 (Phase 3) — 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 6: Care 운영 */}
        <BusinessBlock
          title="케어 운영"
          description="네트워크 전체 케어 현황과 알림을 모니터링합니다."
          links={CARE_LINKS}
          stats={careStats}
        />

        {/* Block 7: Content / Signage 운영 */}
        <BusinessBlock
          title="콘텐츠 · 사이니지 운영"
          description="본부 콘텐츠 자산과 사이니지 운영 항목을 관리합니다."
          links={CONTENT_SIGNAGE_LINKS}
        />
      </div>
    </div>
  );
}
