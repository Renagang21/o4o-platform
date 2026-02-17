/**
 * OperatorManualPage - 운영자 역할 매뉴얼 (내부용)
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 접근 제어: operator role만 접근 가능
 */

import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function OperatorManualPage() {
  const { user, isAuthenticated } = useAuth();

  // 권한 체크: operator만 접근 가능
  if (!isAuthenticated || !user?.roles.includes('operator')) {
    return <Navigate to="/test-guide" replace />;
  }

  return (
    <TestGuideLayout title="운영자 매뉴얼" subtitle="K-Cosmetics 매장 네트워크 운영 가이드 (내부용)">
      {/* 내부용 경고 */}
      <div style={styles.warning}>
        이 문서는 내부 운영자 전용입니다. 외부 공개 금지.
      </div>

      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>운영자는 무엇을 하나요?</h2>
        <p style={styles.text}>
          운영자는 K-Cosmetics <strong>매장 네트워크와 B2B 주문을 관리</strong>하는 역할입니다.
          제휴 매장 관리, 입점 신청 승인, 상품 공급, 정산 처리를 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>운영자 대시보드</strong>로 이동합니다.
          오늘의 주문, 대기 중인 신청, 재고 부족 상품, 정산 현황을 한눈에 확인할 수 있습니다.
        </p>
        <div style={styles.dashboardPreview}>
          <div style={styles.dashboardItem}>
            <span style={styles.dashboardIcon}>📦</span>
            <span>오늘 주문</span>
          </div>
          <div style={styles.dashboardItem}>
            <span style={styles.dashboardIcon}>📋</span>
            <span>입점 신청</span>
          </div>
          <div style={styles.dashboardItem}>
            <span style={styles.dashboardIcon}>⚠️</span>
            <span>재고 부족</span>
          </div>
          <div style={styles.dashboardItem}>
            <span style={styles.dashboardIcon}>💰</span>
            <span>정산 대기</span>
          </div>
        </div>
      </section>

      {/* 주요 메뉴 안내 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>주요 메뉴 안내</h2>
        <div style={styles.menuList}>
          <div style={styles.menuItem}>
            <strong>매장 네트워크</strong>
            <p style={styles.menuDesc}>제휴 매장 현황을 확인하고 관리합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>신청 관리</strong>
            <p style={styles.menuDesc}>매장 입점, 브랜드 추가, 계약 갱신 신청을 처리합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>상품 관리</strong>
            <p style={styles.menuDesc}>플랫폼 전체 상품을 관리하고 카테고리를 설정합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>주문 관리</strong>
            <p style={styles.menuDesc}>B2B 주문 현황을 모니터링하고 배송을 관리합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>재고/공급</strong>
            <p style={styles.menuDesc}>상품 재고를 확인하고 발주/입고를 관리합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>정산 관리</strong>
            <p style={styles.menuDesc}>매장별 매출 정산을 처리합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>분석/리포트</strong>
            <p style={styles.menuDesc}>매출, 상품, 매장 성과를 분석합니다.</p>
          </div>
          <div style={styles.menuItem}>
            <strong>마케팅</strong>
            <p style={styles.menuDesc}>프로모션과 캠페인을 등록하고 관리합니다.</p>
          </div>
        </div>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>입점 신청 승인</strong>
              <p style={styles.featureDesc}>신규 매장 입점 신청을 검토하고 승인/반려합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>주문 상태 관리</strong>
              <p style={styles.featureDesc}>결제대기, 준비중, 배송중, 완료 상태를 관리합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>정산 처리</strong>
              <p style={styles.featureDesc}>월별 매출 정산을 확인하고 지급 처리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 테스트 운영 시 주의사항 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>테스트 운영 시 주의사항</h2>
        <ul style={styles.noteList}>
          <li><strong>매장 데이터 확인</strong>: 테스트 매장 데이터가 정상적으로 표시되는지 확인합니다.</li>
          <li><strong>주문 흐름 테스트</strong>: 주문 상태 변경이 정상적으로 작동하는지 테스트합니다.</li>
          <li><strong>정산 계산 검증</strong>: 수수료 계산이 올바른지 확인합니다.</li>
          <li><strong>알림 기능 확인</strong>: 신규 주문, 재고 부족 알림이 정상 동작하는지 확인합니다.</li>
        </ul>
      </section>

      {/* 연결 문구 */}
      <div style={styles.footer}>
        <Link to="/test-guide" style={styles.footerLink}>← 테스트 가이드로 돌아가기</Link>
        <p style={styles.footerText}>의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  warning: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: 500,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: 0,
  },
  dashboardPreview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginTop: '16px',
  },
  dashboardItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#475569',
  },
  dashboardIcon: {
    fontSize: '24px',
  },
  menuList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  menuItem: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  menuDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  featureItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  featureNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: '#ec4899',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: '2px',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  noteList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 2,
  },
  footer: {
    textAlign: 'center',
    padding: '16px 0',
  },
  footerLink: {
    color: '#e91e63',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  footerText: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
};
