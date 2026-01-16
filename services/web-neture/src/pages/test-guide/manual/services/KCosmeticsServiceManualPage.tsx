/**
 * KCosmeticsServiceManualPage - K-Cosmetics 서비스 매뉴얼
 * K-뷰티 화장품 유통 플랫폼
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShoppingBag, Globe, Truck, Star, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'products', title: '상품 관리' },
  { id: 'orders', title: '주문 프로세스' },
  { id: 'global', title: '글로벌 배송' },
  { id: 'faq', title: '자주 묻는 질문' },
];

export default function KCosmeticsServiceManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'features':
        return <FeaturesSection />;
      case 'products':
        return <ProductsSection />;
      case 'orders':
        return <OrdersSection />;
      case 'global':
        return <GlobalSection />;
      case 'faq':
        return <FaqSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="K-Cosmetics 서비스 매뉴얼"
      subtitle="K-뷰티 화장품 유통 플랫폼"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#ec4899"
    >
      {renderContent()}
    </ManualLayout>
  );
}

function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>K-Cosmetics란?</h2>
      <p style={styles.text}>
        K-Cosmetics는 <strong>K-뷰티 화장품을 전세계에 유통</strong>하는 글로벌 커머스 플랫폼입니다.
        한국 화장품 브랜드와 해외 바이어를 연결하여 K-뷰티의 세계화를 지원합니다.
      </p>

      <div style={styles.infoCard}>
        <Sparkles size={24} style={{ color: '#ec4899' }} />
        <div>
          <strong>핵심 가치</strong>
          <p style={styles.infoText}>
            정품 K-뷰티 화장품을 합리적인 가격에
            전세계 어디든 안전하게 배송합니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>K-Cosmetics의 특징</h3>
        <ul style={styles.list}>
          <li><strong>정품 보증</strong>: 공식 유통 채널을 통한 정품만 취급</li>
          <li><strong>글로벌 배송</strong>: 전세계 주요 국가 배송 지원</li>
          <li><strong>다국어 지원</strong>: 영어, 중국어, 일본어 등 지원</li>
          <li><strong>브랜드 다양성</strong>: 인기 K-뷰티 브랜드 총집합</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 카테고리</h3>
        <ul style={styles.list}>
          <li><strong>스킨케어</strong>: 토너, 에센스, 크림, 마스크팩</li>
          <li><strong>메이크업</strong>: 파운데이션, 립스틱, 아이섀도</li>
          <li><strong>바디케어</strong>: 바디로션, 핸드크림, 바디워시</li>
          <li><strong>헤어케어</strong>: 샴푸, 트리트먼트, 헤어에센스</li>
        </ul>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>주요 기능</h2>
      <p style={styles.text}>
        K-Cosmetics가 제공하는 핵심 기능들입니다.
      </p>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <ShoppingBag size={20} style={{ color: '#ec4899' }} />
          <h4 style={styles.featureTitle}>상품 브라우징</h4>
          <p style={styles.featureDesc}>
            브랜드, 카테고리, 가격대별 상품 탐색
          </p>
        </div>
        <div style={styles.featureCard}>
          <Star size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>리뷰 & 평점</h4>
          <p style={styles.featureDesc}>
            실제 구매자 리뷰와 평점 확인
          </p>
        </div>
        <div style={styles.featureCard}>
          <Globe size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>다국어 지원</h4>
          <p style={styles.featureDesc}>
            영어, 중국어, 일본어 인터페이스
          </p>
        </div>
        <div style={styles.featureCard}>
          <Truck size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>글로벌 배송</h4>
          <p style={styles.featureDesc}>
            전세계 주요 국가 직배송 지원
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#ec4899', flexShrink: 0 }} />
        <p style={styles.tipText}>
          테스트 환경에서는 실제 결제와 배송이 진행되지 않습니다.
        </p>
      </div>
    </div>
  );
}

function ProductsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>상품 관리</h2>
      <p style={styles.text}>
        K-Cosmetics에서 상품을 탐색하고 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>상품 탐색</strong>
            <p style={styles.stepText}>
              카테고리, 브랜드, 가격 필터로 원하는 상품을 찾습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>상품 상세 확인</strong>
            <p style={styles.stepText}>
              성분, 사용법, 리뷰를 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>장바구니 담기</strong>
            <p style={styles.stepText}>
              원하는 상품을 장바구니에 추가합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>위시리스트</strong>
            <p style={styles.stepText}>
              관심 상품을 위시리스트에 저장합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>상품 정보</h3>
        <ul style={styles.list}>
          <li><strong>브랜드</strong>: 제조사 및 브랜드 정보</li>
          <li><strong>성분</strong>: 전성분 표시</li>
          <li><strong>용량</strong>: 제품 용량/중량</li>
          <li><strong>유통기한</strong>: 제조일/유통기한</li>
        </ul>
      </div>
    </div>
  );
}

function OrdersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>주문 프로세스</h2>
      <p style={styles.text}>
        K-Cosmetics에서 주문하는 전체 과정입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>장바구니 확인</strong>
            <p style={styles.stepText}>
              담은 상품과 수량을 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>배송지 입력</strong>
            <p style={styles.stepText}>
              배송받을 주소와 연락처를 입력합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>배송 방법 선택</strong>
            <p style={styles.stepText}>
              일반/특급 배송 중 선택합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>결제</strong>
            <p style={styles.stepText}>
              신용카드, PayPal 등으로 결제합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>5</span>
          <div>
            <strong>주문 확인</strong>
            <p style={styles.stepText}>
              주문 완료 후 확인 이메일을 받습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>글로벌 배송</h2>
      <p style={styles.text}>
        K-Cosmetics의 글로벌 배송 서비스 안내입니다.
      </p>

      <div style={styles.infoCard}>
        <Globe size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>배송 가능 지역</strong>
          <p style={styles.infoText}>
            미국, 캐나다, 영국, 프랑스, 독일, 일본, 중국, 호주 등
            전세계 50개국 이상 배송 지원
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>배송 옵션</h3>
        <ul style={styles.list}>
          <li><strong>일반 배송</strong>: 7-14일 소요</li>
          <li><strong>특급 배송</strong>: 3-5일 소요 (추가 비용)</li>
          <li><strong>무료 배송</strong>: $50 이상 구매 시</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>통관 안내</h3>
        <ul style={styles.list}>
          <li>개인 사용 목적 구매만 가능</li>
          <li>국가별 수입 제한 품목 확인 필요</li>
          <li>관세는 수령인 부담</li>
        </ul>
      </div>
    </div>
  );
}

function FaqSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>자주 묻는 질문</h2>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 상품은 정품인가요?</h4>
        <p style={styles.faqAnswer}>
          네, 모든 상품은 공식 유통 채널을 통해 입고된 100% 정품입니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 배송은 얼마나 걸리나요?</h4>
        <p style={styles.faqAnswer}>
          일반 배송 7-14일, 특급 배송 3-5일 소요됩니다. 국가에 따라 다를 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 반품/교환이 가능한가요?</h4>
        <p style={styles.faqAnswer}>
          제품 하자 시 수령 후 7일 이내 반품 가능합니다. 단순 변심은 어렵습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 한국어 고객 상담 가능한가요?</h4>
        <p style={styles.faqAnswer}>
          네, 카카오톡 상담 및 이메일로 한국어 상담 지원합니다.
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>더 궁금한 점이 있나요?</p>
        <Link to="/forum/test-feedback" style={styles.forumButton}>
          테스트 포럼에서 질문하기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  text: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
  },
  highlightBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  },
  highlightTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 12px 0',
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.8,
  },
  infoCard: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    backgroundColor: '#fdf2f8',
    border: '1px solid #fbcfe8',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#9d174d',
    margin: '4px 0 0 0',
    lineHeight: 1.6,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  featureCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
  },
  featureTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '8px 0 4px 0',
  },
  featureDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  stepItem: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#ec4899',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  stepText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
    lineHeight: 1.5,
  },
  tipBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    backgroundColor: '#fdf2f8',
    border: '1px solid #fbcfe8',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#9d174d',
    margin: 0,
    lineHeight: 1.5,
  },
  faqItem: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  faqQuestion: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  faqAnswer: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  footer: {
    textAlign: 'center',
    padding: '24px 0 0 0',
    borderTop: '1px solid #e2e8f0',
    marginTop: '24px',
  },
  footerText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  forumButton: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: '#ec4899',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
