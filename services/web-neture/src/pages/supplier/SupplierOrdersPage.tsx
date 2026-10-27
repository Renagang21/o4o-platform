/**
 * SupplierOrdersPage - 공급자 운영 허브
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0, P1, P2-REORDER
 *
 * 핵심 개념: 결제 완료 후 공급자의 최종 배송을 처리하는 운영 화면
 * - 서비스별 주문 현황을 한눈에 확인
 * - 필요한 서비스로 바로 이동
 * - 결제는 공통 프로세스로 진행하고 공급자는 최종 배송을 수행
 */

import { Link } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import { ShoppingBag, Info, Users, Clock, Compass, Truck, ArrowRight } from 'lucide-react';
import { useSupplierOrders } from './orders/useSupplierOrders';
import { ServiceCard } from './orders/ServiceCard';
import { UnifiedOrdersSection } from './orders/UnifiedOrdersSection';
import { styles } from './orders/styles';

export default function SupplierOrdersPage() {
  const { data, loading, summaryError, unifiedError, expandedService, unifiedOrders, unifiedLoading, unifiedTotal, unifiedPage, unifiedPageSize, setUnifiedPage, sourceFilter, setSourceFilter, fetchSummary, fetchUnified, toggleExpand } = useSupplierOrders();

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Compass size={28} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h1 style={styles.title}>공급자 운영 허브</h1>
          <p style={styles.subtitle}>
            결제된 주문을 확인하고 공급자의 최종 배송을 진행합니다
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide" label="이용 안내" /></div>
        </div>
      </div>

      {/* Hub Concept Info */}
      <div style={styles.infoCard}>
        <Info size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div>
          <p style={styles.infoCardText}>
            <strong>Neture는 공급자의 운영 허브입니다.</strong><br />
            각 서비스의 주문은 공통 결제 프로세스를 거칩니다. 공급자는 결제 완료 후
            주문 확인, 배송 준비, 송장 등록과 배송 완료를 진행합니다.
          </p>
        </div>
      </div>

      {/* Stats — 조회 실패 시 0 으로 오인시키지 않도록 숨긴다 */}
      {!summaryError && (
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <ShoppingBag size={24} style={{ color: '#3b82f6' }} />
          <div>
            <p style={styles.statValue}>{data.services.length}</p>
            <p style={styles.statLabel}>연결된 서비스</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Users size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{data.totalApprovedSellers}</p>
            <p style={styles.statLabel}>승인된 판매자</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{data.totalPendingRequests}</p>
            <p style={styles.statLabel}>대기 중인 신청</p>
          </div>
        </div>
      </div>
      )}

      {/* 주문 처리 workspace 진입 — WO-O4O-NETURE-SUPPLIER-OFFER-AND-ORDER-NAVIGATION-DEAD-END-CLOSE-V1:
          자기참조(/supplier/orders) 제거 → 실제 주문 처리 목록으로 연결
          WO-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1:
          연결 대상을 legacy /account/supplier/orders → canonical /supplier/orders/manage 로 이관 */}
      <Link to="/supplier/orders/manage" style={styles.fulfillCard}>
        <div style={styles.fulfillIcon}>
          <Truck size={24} style={{ color: '#2563eb' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.fulfillTitle}>주문 처리 · 배송 관리</p>
          <p style={styles.fulfillText}>
            Neture 주문의 주문 확인 · 배송 준비 · 송장 등록 · 배송 완료를 처리합니다.
            <br />
            <span style={styles.fulfillNote}>
              통합 주문 보기에서 주문별 배송 처리 가능 여부를 확인하고, 처리 가능한 주문은 배송 관리 화면으로 이동합니다.
            </span>
          </p>
        </div>
        <ArrowRight size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
      </Link>

      {/* 통합 주문 보기 (읽기) — WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 */}
      <UnifiedOrdersSection
        orders={unifiedOrders}
        loading={unifiedLoading}
        error={unifiedError}
        onRetry={fetchUnified}
        total={unifiedTotal}
        sourceFilter={sourceFilter}
        onChangeFilter={setSourceFilter}
        page={unifiedPage}
        pageSize={unifiedPageSize}
        onChangePage={setUnifiedPage}
      />

      {/* Service List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : summaryError ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>
            <Compass size={40} style={{ color: '#dc2626' }} />
          </div>
          <p>서비스별 주문 현황을 불러오지 못했습니다.</p>
          <button
            onClick={fetchSummary}
            style={{
              marginTop: '12px', padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', backgroundColor: '#fff',
              color: '#475569', fontSize: '14px', cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : data.services.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>
            <Compass size={40} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={styles.emptyStateTitle}>아직 연결된 서비스가 없습니다</h3>
          <p style={styles.emptyStateText}>
            판매자 신청이 승인되면,<br />
            해당 서비스가 이곳에 자동으로 표시됩니다.
          </p>
          <p style={styles.emptyStateHint}>
            판매자 신청 현황은 "신청 관리" 메뉴에서 확인하세요
          </p>
        </div>
      ) : (
        <div>
          <h2 style={styles.sectionTitle}>서비스별 운영 현황</h2>
          <div style={styles.serviceList}>
            {data.services.map((svc) => (
              <ServiceCard
                key={svc.serviceId}
                service={svc}
                expanded={expandedService === svc.serviceId}
                onToggle={() => toggleExpand(svc.serviceId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Role Separation Notice */}
      <div style={styles.roleNotice}>
        <div style={styles.roleNoticeContent}>
          <span style={styles.roleNoticeBadge}>책임 분리</span>
          <p style={styles.roleNoticeText}>
            <strong>Neture</strong>: 판매자 승인, 주문 확인 및 최종 배송 &nbsp;|&nbsp;
            <strong>각 서비스</strong>: 주문 발생 및 서비스별 운영
          </p>
        </div>
      </div>
    </div>
  );
}
