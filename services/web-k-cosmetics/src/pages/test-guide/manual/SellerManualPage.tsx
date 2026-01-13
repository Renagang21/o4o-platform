/**
 * SellerManualPage - 판매자 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function SellerManualPage() {
  return (
    <TestGuideLayout title="판매자 매뉴얼" subtitle="K-Cosmetics 판매 관리 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>판매자는 무엇을 하나요?</h2>
        <p style={styles.text}>
          판매자는 K-Cosmetics에서 <strong>화장품을 등록하고 판매</strong>하는 역할입니다.
          상품 등록, 재고 관리, 주문 확인 및 배송 처리를 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>판매자 대시보드</strong>로 이동합니다.
          오늘의 주문 현황, 재고 알림, 매출 요약을 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>상품 등록</strong>
              <p style={styles.featureDesc}>새로운 화장품을 등록하고 가격, 재고, 설명을 입력합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>주문 관리</strong>
              <p style={styles.featureDesc}>들어온 주문을 확인하고 배송 처리를 진행합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>재고 관리</strong>
              <p style={styles.featureDesc}>상품별 재고 현황을 확인하고 수량을 조정합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이번 테스트에서 안 해도 되는 것</h2>
        <ul style={styles.skipList}>
          <li>정산 관련 기능 (현재 테스트 범위에 포함되지 않음)</li>
          <li>실제 배송 연동</li>
          <li>고객 문의 응대</li>
        </ul>
        <p style={styles.note}>
          테스트 계정으로 모든 판매 기능을 사용할 수 있습니다.
        </p>
        <p style={styles.notice}>
          ※ 테스트 환경은 실제 서비스와 다를 수 있습니다.
        </p>
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
    backgroundColor: '#3b82f6',
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
  skipList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  note: {
    fontSize: '13px',
    color: '#10b981',
    marginTop: '12px',
    fontWeight: 500,
  },
  notice: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
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
