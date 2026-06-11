/**
 * GlycoPharmOperatorDashboard — 운영자 대시보드
 *
 * WO-GLYCOPHARM-OPERATOR-DASHBOARD-5BLOCK-V1:
 *   KPA 표준 5-Block 구조 정렬.
 *   OperatorDashboardLayout 사용, BusinessBlock 제거.
 *
 * Block 구조:
 *  [1] KPI Grid          — 핵심 지표 (약국·상품·환자·케어)
 *  [2] AI Summary        — CopilotEngine 인사이트
 *  [3] Action Queue      — 즉시 처리 항목
 *  [4] Activity Log      — 최근 활동 타임라인
 *  [5] Quick Actions     — 주요 기능 바로가기
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
} from '@o4o/operator-ux-core';
import { AxisNavigationSection, type OperatorAxisGroup } from '@o4o/operator-core-ui';
import { fetchOperatorDashboard } from '../../api/operatorDashboard';
import { buildGlycoPharmOperatorConfig } from './operatorConfig';
import OperatorAlerts from '../../components/OperatorAlerts';

// ─── Types ──────────────────────────────────────────────────

// WO-O4O-GLYCOPHARM-FRONTEND-CARE-TYPE-UNION-CLEANUP-V1 (W5d-Frontend):
//   AlertItem type union 에서 'care' 멤버 제거 (OperatorAlerts.tsx 와 정합).
interface AlertItem {
  id: string;
  type: 'network' | 'commerce' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

// WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1
const GP_AXES: OperatorAxisGroup[] = [
  {
    key: 'community',
    title: '커뮤니티 운영',
    description: '포럼 · 회원 · 콘텐츠 · LMS',
    icon: '💬',
    tone: 'blue',
    links: [
      { key: 'forum', label: '포럼 신청 관리', href: '/operator/forum-requests' },
      { key: 'members', label: '회원 관리', href: '/operator/members' },
      { key: 'lms', label: '강의 관리', href: '/operator/lms' },
    ],
  },
  {
    key: 'pharmacy-hub',
    title: '약국 HUB 운영',
    description: '매장 · 채널 · 설문',
    icon: '🏥',
    tone: 'emerald',
    links: [
      { key: 'stores', label: '매장 관리', href: '/operator/stores' },
      { key: 'channels', label: '채널 관리', href: '/operator/store-channels' },
      { key: 'surveys', label: '설문 관리', href: '/operator/surveys' },
    ],
  },
];

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

  // WO-O4O-OPERATOR-DASHBOARD-ABOVE-BLOCK-SLOT-V1:
  //   부가 섹션 [Alert] → [Axis] 을 공통 layout slot(aboveBlocks)으로 이관.
  //   순서 컨벤션 유지: [Alert/Notice] → [Axis] → [5-block].
  //   (P1 에서 GP 단독 page header 제거 — shell/sidebar 가 컨텍스트 제공.)
  return (
    <OperatorDashboardLayout
      config={{
        ...config,
        aboveBlocks: (
          <>
            {/* Operator Alerts (rule-based) */}
            <OperatorAlerts alerts={alerts} />
            {/* WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1: 2축 운영 네비게이션 */}
            <AxisNavigationSection axes={GP_AXES} />
          </>
        ),
      }}
    />
  );
}
