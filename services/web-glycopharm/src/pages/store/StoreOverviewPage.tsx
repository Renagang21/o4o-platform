/**
 * StoreOverviewPage — Canonical Store Hub
 *
 * WO-STORE-HUB-MERGE-INTO-OVERVIEW-V1 + WO-MENU-REALIGN-V1
 * 원본: /pharmacy/hub (PharmacyHubPage) → /store (StoreOverviewPage)
 *
 * WO-MENU-REALIGN-V1:
 * - Care 섹션 제거 (Care는 Home으로 분리)
 *
 * 구조:
 *  1. 매출/매장 카드 + 운영 신호 (pharmacist)
 *  2. 관리자 전용 카드 (glycopharm:admin)
 *  3. AI Summary 요약 (beforeSections)
 *
 * 레이아웃: StoreDashboardLayout (Outlet) → HubLayout (content)
 */

import { useNavigate } from 'react-router-dom';
import { HubLayout } from '@o4o/hub-core';
import type { HubSectionDefinition } from '@o4o/hub-core';
import {
  BrainCircuit,
  TrendingUp,
  ClipboardList,
  Package,
  Monitor,
  Building2,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useStoreHub } from './hooks/useStoreHub';
import type { AiSummaryData } from './hooks/useStoreHub';

// ─── Icon helper ───

function LucideIcon({ Icon, color }: { Icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }) {
  return <Icon style={{ width: 22, height: 22, color }} />;
}

// ─── Section Definitions ───

// WO-MENU-REALIGN-V1: Care 섹션 제거됨 (Care는 Home으로 분리)
const HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'store',
    title: '매출 / 매장',
    cards: [
      {
        id: 'revenue',
        title: '매출 요약',
        description: '이번 달 매출 및 성장률',
        href: '/store/orders',
        icon: <LucideIcon Icon={TrendingUp} color="#D97706" />,
        iconBg: '#FEF3C7',
        signalKey: 'glycopharm.revenue',
      },
      {
        id: 'pending-requests',
        title: '미처리 요청',
        description: '고객 요청 확인 및 처리',
        href: '/store/requests',
        icon: <LucideIcon Icon={ClipboardList} color="#EA580C" />,
        iconBg: '#FFF7ED',
        signalKey: 'glycopharm.pending_requests',
      },
      {
        id: 'products',
        title: '상품 관리',
        description: '등록 상품 현황 관리',
        href: '/store/products',
        icon: <LucideIcon Icon={Package} color="#2563EB" />,
        iconBg: '#EFF6FF',
        signalKey: 'glycopharm.products',
      },
      {
        id: 'signage',
        title: '사이니지',
        description: '디지털 사이니지 편성 관리',
        href: '/store/signage/my',
        icon: <LucideIcon Icon={Monitor} color="#6D28D9" />,
        iconBg: '#F5F3FF',
        signalKey: 'glycopharm.signage',
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 전용',
    badge: 'Admin',
    roles: ['operator', 'glycopharm:admin'],
    cards: [
      {
        id: 'pharmacy-approval',
        title: '약국 등록 승인',
        description: '신규 약국 참여 신청 심사',
        href: '/operator/applications',
        icon: <LucideIcon Icon={Building2} color="#DC2626" />,
        iconBg: '#FEF2F2',
        signalKey: 'glycopharm.pharmacy_approval',
      },
      {
        id: 'policy',
        title: '정책 설정',
        description: '운영 정책 및 서비스 설정',
        href: '/operator/settings',
        icon: <LucideIcon Icon={Settings} color="#475569" />,
        iconBg: '#F1F5F9',
      },
    ],
  },
];

// ─── AI Summary Card ───

function AiSummaryCard({ data }: { data: AiSummaryData }) {
  const { insight, meta } = data;
  const riskColor =
    insight.riskLevel === 'high' ? '#dc2626' :
    insight.riskLevel === 'medium' ? '#d97706' : '#059669';
  const riskBg =
    insight.riskLevel === 'high' ? '#fef2f2' :
    insight.riskLevel === 'medium' ? '#fffbeb' : '#ecfdf5';
  const riskLabel =
    insight.riskLevel === 'high' ? '주의' :
    insight.riskLevel === 'medium' ? '관찰' : '정상';

  return (
    <div style={styles.aiCard}>
      <div style={styles.aiCardHeader}>
        <BrainCircuit style={{ width: 20, height: 20, color: '#059669' }} />
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>약국 운영 분석</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: riskColor,
          backgroundColor: riskBg,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {riskLabel}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>
          {meta.provider} · {meta.durationMs}ms
        </span>
      </div>
      <p style={styles.aiSummaryText}>{insight.summary}</p>
      {insight.recommendedActions.length > 0 && (
        <div style={styles.aiActions}>
          {insight.recommendedActions.map((action, i) => (
            <div key={i} style={styles.aiActionItem}>
              <span style={styles.aiActionDot} />
              <span style={{ fontSize: '13px', color: '#475569' }}>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ───

export default function StoreOverviewPage() {
  const navigate = useNavigate();
  const { cockpitData, loading, error, signals, userRoles, fetchData, handleActionTrigger } = useStoreHub();

  return (
    <HubLayout
      title="의료 운영 허브"
      subtitle="AI 기반 약국 운영 현황을 한눈에 확인하고 실행하세요"
      sections={HUB_SECTIONS}
      userRoles={userRoles}
      signals={signals}
      onCardClick={(href) => navigate(href)}
      onActionTrigger={handleActionTrigger}
      beforeSections={
        <>
          {/* 새로고침 버튼 */}
          <div style={styles.refreshRow}>
            <button style={styles.refreshButton} onClick={fetchData} disabled={loading}>
              <RefreshCw style={{ width: 16, height: 16, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
              새로고침
            </button>
          </div>

          {/* AI Summary 카드 */}
          <section style={styles.summarySection}>
            <h2 style={styles.sectionTitle}>AI 운영 요약</h2>
            {loading ? (
              <div style={styles.loadingBox}>
                <Loader2 style={{ width: 24, height: 24, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#64748b', fontSize: '14px' }}>분석 중...</span>
              </div>
            ) : error ? (
              <div style={styles.errorBox}>
                <AlertCircle style={{ width: 20, height: 20, color: '#dc2626' }} />
                <span style={{ color: '#dc2626', fontSize: '14px' }}>{error}</span>
              </div>
            ) : cockpitData.aiSummary ? (
              <AiSummaryCard data={cockpitData.aiSummary} />
            ) : (
              <div style={styles.emptyBox}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>AI 요약 데이터가 없습니다.</span>
              </div>
            )}
          </section>
        </>
      }
      footerNote="허브는 각 기능의 진입점입니다. QuickAction 버튼으로 즉시 실행하거나, 카드를 클릭하여 상세 페이지로 이동하세요."
    />
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  refreshRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
    marginTop: '-16px',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#4b5563',
    cursor: 'pointer',
  },
  summarySection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '32px',
    justifyContent: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
  },
  emptyBox: {
    padding: '24px',
    textAlign: 'center' as const,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  aiCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  aiCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  aiSummaryText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#334155',
    margin: '0 0 12px 0',
  },
  aiActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  aiActionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  aiActionDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    flexShrink: 0,
  },
};
