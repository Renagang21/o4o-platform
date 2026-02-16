/**
 * HubPage — Neture 통합 허브 (Control Tower)
 *
 * WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1: hub-core 기반 전환
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1: AI 신호 연결
 * WO-NETURE-HUB-ACTION-TRIGGER-EXPANSION-V1: AI→Signal→QuickAction→Trigger 실행
 *
 * KPA에서 검증된 허브 모델을 Neture에 확산:
 * - Seller 6카드 (supplier/partner 역할) + AI 기반 운영 신호 + QuickAction
 * - Admin 5카드 (admin 역할) + 운영 신호 + QuickAction
 * - AI Insight 카드 (beforeSections)
 * - 역할 기반 카드 렌더링 (hub-core 위임)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { contentAssetApi, dashboardApi } from '../../lib/api';
import { HubLayout, createSignal, createActionSignal } from '@o4o/hub-core';
import type { HubSectionDefinition, HubSignal, HubActionResult } from '@o4o/hub-core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

// Action key constants (mirrors @o4o/ai-core ACTION_KEYS — frontend uses inline to avoid heavy dep)
const NETURE_KEYS = {
  REVIEW_PENDING: 'neture.trigger.review_pending',
  AUTO_PRODUCT: 'neture.trigger.auto_product',
  COPY_BEST_CONTENT: 'neture.trigger.copy_best_content',
  REFRESH_SETTLEMENT: 'neture.trigger.refresh_settlement',
  REFRESH_AI: 'neture.trigger.refresh_ai',
  APPROVE_SUPPLIER: 'neture.trigger.approve_supplier',
  MANAGE_PARTNERSHIP: 'neture.trigger.manage_partnership',
  AUDIT_REVIEW: 'neture.trigger.audit_review',
} as const;

// ─── Section Definitions ───

const HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'seller',
    title: '공급자 운영',
    roles: ['supplier', 'partner', 'admin'],
    cards: [
      {
        id: 'products',
        title: '상품 관리',
        description: '등록된 제품 현황을 확인하고 관리합니다.',
        href: '/workspace/supplier/products',
        icon: '📦',
        signalKey: 'products',
      },
      {
        id: 'requests',
        title: '요청 관리',
        description: '판매자 신청 및 공급 요청을 확인합니다.',
        href: '/workspace/supplier/requests',
        icon: '📋',
        signalKey: 'requests',
      },
      {
        id: 'contents',
        title: '콘텐츠 관리',
        description: '제품 콘텐츠와 사이니지를 관리합니다.',
        href: '/workspace/supplier/contents',
        icon: '📝',
        signalKey: 'contents',
      },
      {
        id: 'settlements',
        title: '정산 현황',
        description: '파트너 정산 내역을 확인합니다.',
        href: '/workspace/partner/settlements',
        icon: '💰',
        signalKey: 'settlements',
      },
      {
        id: 'services',
        title: '연결 서비스',
        description: '연결된 서비스 상태와 공급 요청을 확인합니다.',
        href: '/workspace/supplier/supply-requests',
        icon: '🔗',
        signalKey: 'supplier',
      },
      {
        id: 'ai-report',
        title: 'AI 리포트',
        description: 'AI 기반 운영 분석 리포트를 확인합니다.',
        href: '/workspace/operator/ai-report',
        icon: '🤖',
        signalKey: 'ai',
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 운영',
    badge: 'Admin',
    roles: ['admin'],
    cards: [
      {
        id: 'supplier-approval',
        title: '공급자 승인',
        description: '가입 신청 및 공급자 승인을 관리합니다.',
        href: '/workspace/operator/registrations',
        icon: '✅',
        signalKey: 'supplierApproval',
      },
      {
        id: 'partnership',
        title: '파트너십 관리',
        description: '파트너십 요청과 제휴를 관리합니다.',
        href: '/workspace/partners/requests',
        icon: '🤝',
        signalKey: 'partnership',
      },
      {
        id: 'fee-policy',
        title: '수수료 정책',
        description: '서비스 수수료 및 정산 정책을 설정합니다.',
        href: '/workspace/admin',
        icon: '📊',
      },
      {
        id: 'service-settings',
        title: '서비스 설정',
        description: '이메일, 알림 등 플랫폼 설정을 관리합니다.',
        href: '/workspace/admin/settings/email',
        icon: '⚙️',
      },
      {
        id: 'audit-log',
        title: '감사 로그',
        description: '운영자 활동 내역과 시스템 로그를 확인합니다.',
        href: '/workspace/admin/operators',
        icon: '🛡️',
        signalKey: 'audit',
      },
    ],
  },
];

// ─── Signal Data ───

interface AiInsightData {
  summary: string;
  riskLevel: string;
  recommendedActions: string[];
  confidenceScore: number;
}

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalProducts: number;
  activeProducts: number;
  totalContents: number;
  publishedContents: number;
  connectedServices: number;
}

interface AdminStats {
  pendingRequests: number;
  openPartnershipRequests: number;
  totalSuppliers: number;
  activeSuppliers: number;
}

interface NetureSignalData {
  hasApprovedSupplier: boolean;
  hasApprovedSeller: boolean;
  aiInsight?: AiInsightData;
  dashboardStats?: DashboardStats;
  adminStats?: AdminStats;
}

// ─── Signal Mapper ───

function buildNetureSignals(data: NetureSignalData | null): Record<string, HubSignal> {
  if (!data) return {};
  const signals: Record<string, HubSignal> = {};

  // --- Supplier connection signal ---
  if (data.hasApprovedSupplier) {
    signals.supplier = createSignal('info', { label: '연결됨' });
  } else {
    signals.supplier = createSignal('warning', { label: '미연결' });
  }

  // --- Dashboard stats-based signals ---
  const stats = data.dashboardStats;
  if (stats) {
    // Requests
    if (stats.pendingRequests > 0) {
      signals.requests = createActionSignal('warning', {
        label: '대기 중',
        count: stats.pendingRequests,
        pulse: stats.pendingRequests >= 5,
        action: {
          key: NETURE_KEYS.REVIEW_PENDING,
          buttonLabel: '일괄 검토',
        },
      });
    } else {
      const approvalRate = stats.totalRequests > 0
        ? Math.round((stats.approvedRequests / stats.totalRequests) * 100)
        : 100;
      signals.requests = createSignal(
        approvalRate < 50 ? 'warning' : 'info',
        { label: `승인율 ${approvalRate}%` },
      );
    }

    // Products
    const activeRatio = stats.totalProducts > 0
      ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
      : 0;
    if (stats.totalProducts === 0) {
      signals.products = createActionSignal('warning', {
        label: '상품 없음',
        action: {
          key: NETURE_KEYS.AUTO_PRODUCT,
          buttonLabel: '상품 등록',
        },
      });
    } else if (activeRatio < 30) {
      signals.products = createActionSignal('warning', {
        label: `활성 ${activeRatio}%`,
        count: stats.activeProducts,
        action: {
          key: NETURE_KEYS.AUTO_PRODUCT,
          buttonLabel: '상품 활성화',
        },
      });
    } else {
      signals.products = createSignal('info', {
        label: `${stats.activeProducts}개 활성`,
        count: stats.totalProducts,
      });
    }

    // Contents
    const publishRate = stats.totalContents > 0
      ? Math.round((stats.publishedContents / stats.totalContents) * 100)
      : 0;
    if (stats.totalContents === 0) {
      signals.contents = createActionSignal('warning', {
        label: '콘텐츠 없음',
        action: {
          key: NETURE_KEYS.COPY_BEST_CONTENT,
          buttonLabel: '콘텐츠 생성',
        },
      });
    } else if (publishRate < 50) {
      signals.contents = createActionSignal('warning', {
        label: `발행 ${publishRate}%`,
        count: stats.publishedContents,
        action: {
          key: NETURE_KEYS.COPY_BEST_CONTENT,
          buttonLabel: '초안 발행',
        },
      });
    } else {
      signals.contents = createSignal('info', {
        label: `${stats.publishedContents}건 발행`,
      });
    }

    // Settlements
    if (stats.connectedServices === 0) {
      signals.settlements = createSignal('warning', { label: '연결 없음' });
    } else {
      signals.settlements = createActionSignal('info', {
        label: `${stats.connectedServices}개 서비스`,
        action: {
          key: NETURE_KEYS.REFRESH_SETTLEMENT,
          buttonLabel: '정산 갱신',
        },
      });
    }
  }

  // --- AI signal ---
  const ai = data.aiInsight;
  if (ai) {
    const aiLevel: HubSignal['level'] = ai.riskLevel === 'high' ? 'critical'
      : ai.riskLevel === 'medium' ? 'warning' : 'info';
    signals.ai = createActionSignal(aiLevel, {
      label: ai.riskLevel === 'high' ? '주의 필요'
        : ai.riskLevel === 'medium' ? '검토 권장' : '양호',
      pulse: ai.riskLevel === 'high',
      action: {
        key: NETURE_KEYS.REFRESH_AI,
        buttonLabel: 'AI 재분석',
      },
    });
  }

  // --- Admin signals ---
  const admin = data.adminStats;
  if (admin) {
    if (admin.pendingRequests > 0) {
      signals.supplierApproval = createActionSignal('warning', {
        label: '승인 대기',
        count: admin.pendingRequests,
        pulse: admin.pendingRequests >= 10,
        action: {
          key: NETURE_KEYS.APPROVE_SUPPLIER,
          buttonLabel: '일괄 승인',
        },
      });
    } else {
      signals.supplierApproval = createSignal('info', {
        label: `${admin.activeSuppliers}개 활성`,
      });
    }

    if (admin.openPartnershipRequests > 0) {
      signals.partnership = createActionSignal('warning', {
        label: '제휴 요청',
        count: admin.openPartnershipRequests,
        action: {
          key: NETURE_KEYS.MANAGE_PARTNERSHIP,
          buttonLabel: '제휴 검토',
        },
      });
    } else {
      signals.partnership = data.hasApprovedSeller
        ? createSignal('info', { label: '제휴 활성' })
        : createSignal('warning', { label: '제휴 없음' });
    }

    signals.audit = createActionSignal('info', {
      label: '운영 현황',
      action: {
        key: NETURE_KEYS.AUDIT_REVIEW,
        buttonLabel: '현황 확인',
      },
    });
  }

  return signals;
}

// ─── AI Insight Card ───

function AiInsightCard({ insight }: { insight?: AiInsightData }) {
  if (!insight) return null;
  const bg = insight.riskLevel === 'high' ? '#fef2f2'
    : insight.riskLevel === 'medium' ? '#fffbeb' : '#f0fdf4';
  const border = insight.riskLevel === 'high' ? '#fecaca'
    : insight.riskLevel === 'medium' ? '#fde68a' : '#bbf7d0';
  const icon = insight.riskLevel === 'high' ? '🚨'
    : insight.riskLevel === 'medium' ? '⚠️' : '✅';

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
          AI 운영 인사이트
        </span>
        {insight.confidenceScore < 1 && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
            신뢰도 {Math.round(insight.confidenceScore * 100)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.875rem', color: '#334155', margin: '0 0 8px' }}>
        {insight.summary}
      </p>
      {insight.recommendedActions.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.813rem', color: '#475569' }}>
          {insight.recommendedActions.slice(0, 3).map((action, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{action}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Trigger API ───

async function executeHubTrigger(
  endpoint: string,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/neture/hub/trigger/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Trigger failed: ${response.status}`);
  }
  return response.json();
}

// ─── Component ───

export default function HubPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [signalData, setSignalData] = useState<NetureSignalData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSignals = useCallback(async () => {
    try {
      const isAdmin = user?.currentRole === 'admin';

      // Fetch base signals + dashboard summary + AI insight in parallel
      // Promise.allSettled: individual failures don't crash the entire hub
      const basePromises: Promise<any>[] = [
        contentAssetApi.getSupplierSignal(),
        dashboardApi.getSellerSignal(),
        dashboardApi.getSupplierDashboardSummary(),
        fetch(`${API_BASE_URL}/api/v1/neture/supplier/dashboard/ai-insight`, {
          credentials: 'include',
        }).then(r => r.ok ? r.json() : null).catch(() => null),
      ];

      if (isAdmin) {
        basePromises.push(dashboardApi.getAdminDashboardSummary());
      }

      const results = await Promise.allSettled(basePromises);

      // Extract values with fallback on rejection
      const supplierRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const sellerRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const dashSummary = results[2].status === 'fulfilled' ? results[2].value : null;
      const aiRes = results[3].status === 'fulfilled' ? results[3].value : null;
      const adminSummary = isAdmin && results[4]?.status === 'fulfilled' ? results[4].value : null;

      // Log individual failures for debugging (non-blocking)
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[Neture Hub] fetch[${i}] failed:`, r.reason);
        }
      });

      const data: NetureSignalData = {
        hasApprovedSupplier: supplierRes?.hasApprovedSupplier ?? false,
        hasApprovedSeller: sellerRes?.hasApprovedSeller ?? false,
      };

      // Dashboard stats (with empty fallback)
      if (dashSummary?.stats) {
        data.dashboardStats = dashSummary.stats;
      } else if (results[2].status === 'rejected') {
        // Provide empty structure so hub renders without crash
        data.dashboardStats = {
          totalRequests: 0, pendingRequests: 0, approvedRequests: 0, rejectedRequests: 0,
          totalProducts: 0, activeProducts: 0, totalContents: 0, publishedContents: 0,
          connectedServices: 0,
        };
      }

      // AI insight
      if (aiRes?.success && aiRes?.data?.insight) {
        data.aiInsight = aiRes.data.insight;
      }

      // Admin stats
      if (adminSummary?.stats) {
        data.adminStats = {
          pendingRequests: adminSummary.stats.pendingRequests,
          openPartnershipRequests: adminSummary.stats.openPartnershipRequests,
          totalSuppliers: adminSummary.stats.totalSuppliers,
          activeSuppliers: adminSummary.stats.activeSuppliers,
        };
      }

      setSignalData(data);
    } catch {
      // Signal fetch failure is non-blocking
    }
  }, [user?.currentRole]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSignals();
    }
  }, [isAuthenticated, user, fetchSignals, refreshKey]);

  const signals = useMemo(() => buildNetureSignals(signalData), [signalData]);

  // QuickAction handler
  const handleActionTrigger = useCallback(async (key: string): Promise<HubActionResult> => {
    const triggerMap: Record<string, string> = {
      [NETURE_KEYS.REVIEW_PENDING]: 'review-pending',
      [NETURE_KEYS.AUTO_PRODUCT]: 'auto-product',
      [NETURE_KEYS.COPY_BEST_CONTENT]: 'copy-best-content',
      [NETURE_KEYS.REFRESH_SETTLEMENT]: 'refresh-settlement',
      [NETURE_KEYS.REFRESH_AI]: 'ai-refresh',
      [NETURE_KEYS.APPROVE_SUPPLIER]: 'approve-supplier',
      [NETURE_KEYS.MANAGE_PARTNERSHIP]: 'manage-partnership',
      [NETURE_KEYS.AUDIT_REVIEW]: 'audit-review',
    };

    const endpoint = triggerMap[key];
    if (!endpoint) {
      return { success: false, message: `Unknown action: ${key}` };
    }

    try {
      const result = await executeHubTrigger(endpoint);
      // Auto-refresh signals after successful trigger
      setRefreshKey(k => k + 1);
      return { success: true, message: result.message || '실행 완료' };
    } catch (err) {
      return { success: false, message: (err as Error).message || '실행 실패' };
    }
  }, []);

  // Guards
  if (isLoading) {
    return (
      <div style={styles.guardContainer}>
        <p style={styles.loadingText}>허브 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={styles.guardContainer}>
        <div style={styles.guardBox}>
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <h2 style={styles.guardTitle}>로그인이 필요합니다</h2>
          <p style={styles.guardMessage}>허브에 접근하려면 로그인이 필요합니다.</p>
          <Link to="/login" style={styles.loginButton}>로그인하기</Link>
        </div>
      </div>
    );
  }

  const role = user.currentRole;
  const userRoles = [role];

  // user 역할은 허브 접근 불가
  if (!['admin', 'supplier', 'partner'].includes(role)) {
    return (
      <div style={styles.guardContainer}>
        <div style={styles.guardBox}>
          <span style={{ fontSize: '2rem' }}>🚫</span>
          <h2 style={styles.guardTitle}>접근 권한이 없습니다</h2>
          <p style={styles.guardMessage}>공급자, 파트너 또는 관리자 권한이 필요합니다.</p>
          <Link to="/workspace" style={styles.backButton}>워크스페이스로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <HubLayout
      title="Neture Hub"
      subtitle={`${user.name}님, 운영에 필요한 모든 기능을 한곳에서 관리하세요.`}
      sections={HUB_SECTIONS}
      userRoles={userRoles}
      signals={signals}
      onCardClick={(href) => navigate(href)}
      onActionTrigger={handleActionTrigger}
      beforeSections={<AiInsightCard insight={signalData?.aiInsight} />}
      footerNote="허브는 각 기능의 진입점입니다. 상세 작업은 각 페이지에서 진행해주세요."
    />
  );
}

// ─── Styles (guard only — card styles are in hub-core) ───

const styles: Record<string, React.CSSProperties> = {
  guardContainer: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 24px',
  },
  loadingText: {
    color: '#64748b',
    textAlign: 'center' as const,
    padding: '48px 0',
  },
  guardBox: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  guardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '16px 0 8px',
  },
  guardMessage: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 24px',
  },
  loginButton: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
  backButton: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
};
