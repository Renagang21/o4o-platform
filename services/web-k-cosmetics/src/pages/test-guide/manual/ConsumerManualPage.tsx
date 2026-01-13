/**
 * ConsumerManualPage - 소비자 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function ConsumerManualPage() {
  return (
    <TestGuideLayout title="소비자 매뉴얼" subtitle="K-Cosmetics 쇼핑 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>소비자는 무엇을 하나요?</h2>
        <p style={styles.text}>
          소비자는 K-Cosmetics에서 <strong>화장품을 탐색하고 구매</strong>하는 역할입니다.
          다양한 브랜드의 제품을 비교하고, 마음에 드는 상품을 장바구니에 담을 수 있습니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>홈페이지</strong>로 이동합니다.
          추천 상품, 카테고리별 상품, 인기 브랜드 등을 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>상품 탐색</strong>
              <p style={styles.featureDesc}>카테고리별로 상품을 둘러보거나 검색할 수 있습니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>장바구니</strong>
              <p style={styles.featureDesc}>마음에 드는 상품을 담아두고 한 번에 주문할 수 있습니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>주문하기</strong>
              <p style={styles.featureDesc}>장바구니의 상품을 주문하고 배송 정보를 입력합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이번 테스트에서 안 해도 되는 것</h2>
        <ul style={styles.skipList}>
          <li>실제 결제 (테스트 환경에서는 결제가 처리되지 않습니다)</li>
          <li>리뷰 작성 (현재 테스트 범위에 포함되지 않음)</li>
          <li>회원 정보 수정</li>
        </ul>
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
    backgroundColor: '#10b981',
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
