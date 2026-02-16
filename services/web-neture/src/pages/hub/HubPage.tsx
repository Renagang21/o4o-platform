/**
 * HubPage — Neture 통합 허브 (Control Tower)
 *
 * WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1: hub-core 기반 전환
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1: AI 신호 연결
 *
 * KPA에서 검증된 허브 모델을 Neture에 확산:
 * - Seller 6카드 (supplier/partner 역할) + 운영 신호
 * - Admin 5카드 (admin 역할) + 운영 신호
 * - 역할 기반 카드 렌더링 (hub-core 위임)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { contentAssetApi, dashboardApi } from '../../lib/api';
import { HubLayout, createSignal } from '@o4o/hub-core';
import type { HubSectionDefinition, HubSignal } from '@o4o/hub-core';

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
      },
      {
        id: 'requests',
        title: '요청 관리',
        description: '판매자 신청 및 공급 요청을 확인합니다.',
        href: '/workspace/supplier/requests',
        icon: '📋',
      },
      {
        id: 'contents',
        title: '콘텐츠 관리',
        description: '제품 콘텐츠와 사이니지를 관리합니다.',
        href: '/workspace/supplier/contents',
        icon: '📝',
      },
      {
        id: 'settlements',
        title: '정산 현황',
        description: '파트너 정산 내역을 확인합니다.',
        href: '/workspace/partner/settlements',
        icon: '💰',
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
      },
      {
        id: 'partnership',
        title: '파트너십 관리',
        description: '파트너십 요청과 제휴를 관리합니다.',
        href: '/workspace/partners/requests',
        icon: '🤝',
        signalKey: 'seller',
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
      },
    ],
  },
];

// ─── Signal Mapper ───

interface NetureSignalData {
  hasApprovedSupplier: boolean;
  hasApprovedSeller: boolean;
}

function buildNetureSignals(data: NetureSignalData | null): Record<string, HubSignal> {
  if (!data) return {};
  const signals: Record<string, HubSignal> = {};

  // 공급자 연결 신호
  if (data.hasApprovedSupplier) {
    signals.supplier = createSignal('info', { label: '연결됨' });
  } else {
    signals.supplier = createSignal('warning', { label: '미연결' });
  }

  // 판매자 파트너십 신호
  if (data.hasApprovedSeller) {
    signals.seller = createSignal('info', { label: '제휴 활성' });
  } else {
    signals.seller = createSignal('warning', { label: '제휴 없음' });
  }

  return signals;
}

// ─── Component ───

export default function HubPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [signalData, setSignalData] = useState<NetureSignalData | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const [supplierRes, sellerRes] = await Promise.all([
        contentAssetApi.getSupplierSignal(),
        dashboardApi.getSellerSignal(),
      ]);
      setSignalData({
        hasApprovedSupplier: supplierRes.hasApprovedSupplier,
        hasApprovedSeller: sellerRes.hasApprovedSeller,
      });
    } catch {
      // 신호 실패는 무시 — 카드는 신호 없이 정상 표시
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSignals();
    }
  }, [isAuthenticated, user, fetchSignals]);

  const signals = useMemo(() => buildNetureSignals(signalData), [signalData]);

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
