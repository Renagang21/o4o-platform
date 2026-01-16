/**
 * NetureServiceManualPage - Neture 서비스 매뉴얼
 * 공급자-파트너 연결 유통 정보 플랫폼
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Package, Building2, FileText, Users, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'supplier-flow', title: '공급자 흐름' },
  { id: 'partner-flow', title: '파트너 흐름' },
  { id: 'content', title: '콘텐츠 활용' },
  { id: 'faq', title: '자주 묻는 질문' },
];

export default function NetureServiceManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'features':
        return <FeaturesSection />;
      case 'supplier-flow':
        return <SupplierFlowSection />;
      case 'partner-flow':
        return <PartnerFlowSection />;
      case 'content':
        return <ContentSection />;
      case 'faq':
        return <FaqSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="Neture 서비스 매뉴얼"
      subtitle="공급자-파트너 연결 유통 정보 플랫폼"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#2563eb"
    >
      {renderContent()}
    </ManualLayout>
  );
}

function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Neture란?</h2>
      <p style={styles.text}>
        Neture는 <strong>공급자와 파트너(판매자)를 연결</strong>하는 B2B 유통 정보 플랫폼입니다.
        공급자는 상품 정보와 콘텐츠를 등록하고, 파트너는 이를 탐색하여 제휴를 요청합니다.
      </p>

      <div style={styles.infoCard}>
        <Layers size={24} style={{ color: '#2563eb' }} />
        <div>
          <strong>핵심 가치</strong>
          <p style={styles.infoText}>
            공급자와 파트너 간의 효율적인 연결을 통해
            유통 비용을 줄이고 비즈니스 기회를 확대합니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>Neture의 특징</h3>
        <ul style={styles.list}>
          <li><strong>정보 플랫폼</strong>: 직접 거래가 아닌 연결 중심</li>
          <li><strong>콘텐츠 공유</strong>: 공급자가 제공하는 자료를 파트너가 참고</li>
          <li><strong>자율적 제휴</strong>: 공급자가 직접 요청을 승인/거절</li>
          <li><strong>투명한 정보</strong>: 공급 조건과 상품 정보 공개</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>사용자 역할</h3>
        <ul style={styles.list}>
          <li><strong>공급자</strong>: 상품 등록, 콘텐츠 제공, 제휴 요청 처리</li>
          <li><strong>파트너</strong>: 공급자 탐색, 제휴 요청, 상품 정보 활용</li>
          <li><strong>운영자</strong>: 플랫폼 전체 관리 (내부용)</li>
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
        Neture가 제공하는 핵심 기능들입니다.
      </p>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <Package size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>공급자 대시보드</h4>
          <p style={styles.featureDesc}>
            상품 등록, 제휴 요청 관리, 콘텐츠 관리를 한 곳에서
          </p>
        </div>
        <div style={styles.featureCard}>
          <Building2 size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>파트너 탐색</h4>
          <p style={styles.featureDesc}>
            공급자 검색, 상품 정보 확인, 제휴 요청
          </p>
        </div>
        <div style={styles.featureCard}>
          <FileText size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>콘텐츠 관리</h4>
          <p style={styles.featureDesc}>
            제품 설명, 가이드, 이미지, 동영상 제공
          </p>
        </div>
        <div style={styles.featureCard}>
          <Users size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>제휴 관리</h4>
          <p style={styles.featureDesc}>
            요청 검토, 승인/거절, 파트너 관계 유지
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.tipText}>
          현재 테스트 버전에서는 주문/결제/정산 기능이 제외되어 있습니다.
        </p>
      </div>
    </div>
  );
}

function SupplierFlowSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>공급자 흐름</h2>
      <p style={styles.text}>
        공급자로서 Neture를 사용하는 전체 흐름입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>계정 생성 및 로그인</strong>
            <p style={styles.stepText}>공급자 계정으로 로그인합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>상품 등록</strong>
            <p style={styles.stepText}>
              공급 가능한 상품의 정보와 공급가를 등록합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>콘텐츠 제공</strong>
            <p style={styles.stepText}>
              파트너가 참고할 수 있는 제품 자료를 등록합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>제휴 요청 검토</strong>
            <p style={styles.stepText}>
              파트너의 제휴 요청을 검토하고 승인/거절합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>5</span>
          <div>
            <strong>파트너 관리</strong>
            <p style={styles.stepText}>
              승인된 파트너와의 관계를 유지하고 발주를 처리합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerFlowSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>파트너 흐름</h2>
      <p style={styles.text}>
        파트너로서 Neture를 사용하는 전체 흐름입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>공급자 탐색</strong>
            <p style={styles.stepText}>
              공급자 목록에서 관심 있는 공급자를 찾습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>상품 정보 확인</strong>
            <p style={styles.stepText}>
              공급자의 상품, 공급 조건, 콘텐츠를 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>제휴 요청</strong>
            <p style={styles.stepText}>
              관심 있는 공급자에게 제휴를 요청합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>승인 대기</strong>
            <p style={styles.stepText}>
              공급자의 승인을 기다립니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>5</span>
          <div>
            <strong>발주 진행</strong>
            <p style={styles.stepText}>
              승인 후 필요한 상품을 발주합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>콘텐츠 활용</h2>
      <p style={styles.text}>
        Neture에서 콘텐츠가 어떻게 활용되는지 안내합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>콘텐츠 유형</h3>
        <ul style={styles.list}>
          <li><strong>제품 설명</strong>: 상세한 제품 소개 텍스트</li>
          <li><strong>이미지</strong>: 제품 사진, 배너 이미지</li>
          <li><strong>가이드</strong>: 사용 방법, FAQ</li>
          <li><strong>동영상</strong>: YouTube, Vimeo 링크</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <FileText size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>콘텐츠 활용 원칙</strong>
          <p style={styles.infoText}>
            공급자가 등록한 콘텐츠는 파트너가 <strong>참고 자료로 활용</strong>합니다.
            자동 적용되거나 강제 배포되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function FaqSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>자주 묻는 질문</h2>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 공급자와 파트너의 차이는?</h4>
        <p style={styles.faqAnswer}>
          공급자는 상품을 공급하는 측, 파트너는 공급받아 판매하는 측입니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 제휴 요청이 거절되면?</h4>
        <p style={styles.faqAnswer}>
          공급자가 거절 사유를 제공하며, 조건 개선 후 다시 요청할 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 콘텐츠는 어떻게 활용하나요?</h4>
        <p style={styles.faqAnswer}>
          파트너는 공급자가 제공한 콘텐츠를 참고하여 자체 마케팅에 활용할 수 있습니다.
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
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#1e40af',
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#1e40af',
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
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
