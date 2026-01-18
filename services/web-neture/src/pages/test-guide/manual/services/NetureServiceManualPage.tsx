/**
 * NetureServiceManualPage - Neture 서비스 매뉴얼
 * 공급자-파트너 연결 유통 정보 플랫폼
 *
 * WO-NETURE-SERVICE-MANUAL-UPDATE-V2: 디지털사이니지, 포럼, 채널/판매 구조 추가
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Package, Users, AlertCircle, Sparkles, MessageSquare, DollarSign, Tv, QrCode } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'channel', title: '채널/판매 구조' },
  { id: 'signage', title: '디지털사이니지' },
  { id: 'forum', title: '포럼/게시판' },
  { id: 'supplier-flow', title: '공급자 흐름' },
  { id: 'ai-system', title: 'AI 시스템' },
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
      case 'channel':
        return <ChannelSection />;
      case 'signage':
        return <SignageSection />;
      case 'forum':
        return <ForumSection />;
      case 'supplier-flow':
        return <SupplierFlowSection />;
      case 'ai-system':
        return <AiSystemSection />;
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
          <li><strong>무재고 판매</strong>: 매장은 재고 없이 취급과 노출만 선택</li>
          <li><strong>채널 주도권</strong>: 매장이 디지털 채널을 소유</li>
          <li><strong>자율적 제휴</strong>: 공급자가 직접 요청을 승인/거절</li>
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
            상품 등록, 제휴 요청 관리, 콘텐츠 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <Tv size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>디지털사이니지</h4>
          <p style={styles.featureDesc}>
            플레이리스트, 스케줄, 템플릿 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <MessageSquare size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>포럼/게시판</h4>
          <p style={styles.featureDesc}>
            테스트 피드백, 서비스 업데이트
          </p>
        </div>
        <div style={styles.featureCard}>
          <QrCode size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>QR 채널</h4>
          <p style={styles.featureDesc}>
            매장별 QR 코드 생성 및 다운로드
          </p>
        </div>
        <div style={styles.featureCard}>
          <Users size={20} style={{ color: '#ec4899' }} />
          <h4 style={styles.featureTitle}>제휴 관리</h4>
          <p style={styles.featureDesc}>
            요청 검토, 승인/거절, 파트너 관계
          </p>
        </div>
        <div style={styles.featureCard}>
          <Sparkles size={20} style={{ color: '#6366f1' }} />
          <h4 style={styles.featureTitle}>AI 시스템</h4>
          <p style={styles.featureDesc}>
            Context Asset, 응답 규칙 관리
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

function ChannelSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>채널/판매 구조</h2>
      <p style={styles.text}>
        o4o 플랫폼의 핵심 개념인 <strong>채널 주도권</strong>과 <strong>무재고 판매</strong> 구조입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>채널 주도권</h3>
        <ul style={styles.list}>
          <li>매장이 디지털 채널(QR 코드)을 소유합니다</li>
          <li>플랫폼은 도구만 제공하고, 채널 운영은 매장이 결정합니다</li>
          <li>콘텐츠 선택과 노출도 매장의 권한입니다</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>무재고 판매 (B2C)</h3>
        <ul style={styles.list}>
          <li><strong>재고 부담 없음</strong>: 창고, 보관, 재고 관리 불필요</li>
          <li><strong>배송 부담 없음</strong>: 포장, 배송은 공급사가 처리</li>
          <li><strong>취급만 선택</strong>: 어떤 상품을 노출할지만 결정</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <QrCode size={24} style={{ color: '#f59e0b' }} />
        <div>
          <strong>QR 코드의 역할</strong>
          <p style={styles.infoText}>
            QR 코드는 매장의 디지털 채널 입구입니다.
            고객이 스캔하면 매장이 선택한 콘텐츠와 상품이 노출됩니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>B2B + B2C 동시 구조</h3>
        <ul style={styles.list}>
          <li><strong>B2B</strong>: 공급사 → 매장 (도매 가격, 대량 주문)</li>
          <li><strong>B2C</strong>: 매장 → 소비자 (무재고, 드롭쉬핑)</li>
          <li>하나의 시스템에서 두 가지 흐름을 동시에 지원</li>
        </ul>
      </div>

      <div style={styles.footer}>
        <Link to="/channel/structure" style={styles.forumButton}>
          채널·판매 구조 상세 보기 →
        </Link>
      </div>
    </div>
  );
}

function SignageSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>디지털사이니지</h2>
      <p style={styles.text}>
        매장 내 TV/디스플레이에 콘텐츠를 송출하는 시스템입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 기능</h3>
        <ul style={styles.list}>
          <li><strong>플레이리스트</strong>: 미디어 항목의 재생 목록</li>
          <li><strong>미디어 라이브러리</strong>: 이미지, 동영상, HTML 콘텐츠</li>
          <li><strong>스케줄</strong>: 요일/시간별 자동 재생</li>
          <li><strong>템플릿</strong>: 레이아웃 및 영역 설정</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>콘텐츠 흐름 (Global Content)</h3>
        <ul style={styles.list}>
          <li><strong>HQ</strong>: 본사에서 제작한 글로벌 콘텐츠</li>
          <li><strong>Supplier</strong>: 공급사가 제공하는 콘텐츠</li>
          <li><strong>Community</strong>: 커뮤니티 공유 콘텐츠</li>
          <li><strong>Store</strong>: 매장 자체 콘텐츠</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Tv size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>Clone & Customize</strong>
          <p style={styles.infoText}>
            매장은 글로벌 콘텐츠를 복제(Clone)하여 자체적으로 수정할 수 있습니다.
            원본은 유지되고, 매장 전용 버전이 생성됩니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>역할별 기능</h3>
        <ul style={styles.list}>
          <li><strong>HQ 운영자</strong>: 글로벌 플레이리스트/미디어, 템플릿 관리</li>
          <li><strong>매장</strong>: 자체 플레이리스트, 스케줄, 디스플레이 관리</li>
        </ul>
      </div>
    </div>
  );
}

function ForumSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>포럼/게시판</h2>
      <p style={styles.text}>
        서비스 사용자들이 소통하는 커뮤니티 게시판입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>게시판 종류</h3>
        <ul style={styles.list}>
          <li><strong>테스트 피드백</strong>: 테스트 중 발견한 문제, 개선 의견</li>
          <li><strong>서비스 업데이트</strong>: 새 기능, 변경 사항 공지</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 기능</h3>
        <ul style={styles.list}>
          <li>게시글 작성/수정/삭제</li>
          <li>댓글 및 답글</li>
          <li>AI 요약 및 자동 태깅</li>
          <li>실시간 알림 (SSE)</li>
          <li>게시글 추천</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <MessageSquare size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>외부 연락처 표시</strong>
          <p style={styles.infoText}>
            게시글 작성 시 카카오톡 등 외부 연락처 공개를 선택할 수 있습니다.
          </p>
        </div>
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

function AiSystemSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>AI 시스템</h2>
      <p style={styles.text}>
        Neture 플랫폼의 AI 기능은 <strong>사용자에게 자연스러운 정보 제공</strong>을 목표로 합니다.
        관리자는 AI 응답의 구성 규칙과 Context Asset을 관리합니다.
      </p>

      <div style={styles.infoCard}>
        <Sparkles size={24} style={{ color: '#8b5cf6' }} />
        <div>
          <strong>Perplexity형 UX 원칙</strong>
          <p style={styles.infoText}>
            AI 응답이 항상 주인공이며, Context Asset은 보조 정보입니다.
            <strong>광고처럼 보이면 실패, 정보처럼 느껴지면 성공</strong>입니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>AI 관리 메뉴 (관리자용)</h3>
        <ul style={styles.list}>
          <li><strong>/admin/ai</strong>: AI 운영 대시보드</li>
          <li><strong>/admin/ai/engines</strong>: AI 엔진 설정 (Gemini, GPT, Claude)</li>
          <li><strong>/admin/ai/policy</strong>: 사용 기준 설정 (한도, 임계치)</li>
          <li><strong>/admin/ai/asset-quality</strong>: 품질 관리 (서비스별 품질 신호)</li>
          <li><strong>/admin/ai/cost</strong>: 비용 현황 (엔진별·서비스별 비용)</li>
          <li><strong>/admin/ai/context-assets</strong>: Context Asset 관리</li>
          <li><strong>/admin/ai/composition-rules</strong>: 응답 구성 규칙</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>Context Asset이란?</h3>
        <p style={{ ...styles.tipText, color: '#475569', marginBottom: '12px' }}>
          AI 응답에 노출되는 광고/정보/콘텐츠입니다. 관리자가 등록한 자산만 AI가 노출할 수 있습니다.
        </p>
        <ul style={styles.list}>
          <li><strong>브랜드</strong>: 브랜드/공급자 소개</li>
          <li><strong>상품</strong>: 판매 상품 정보</li>
          <li><strong>비상품</strong>: 출시 예정, 테스트 제품</li>
          <li><strong>콘텐츠</strong>: 가이드, 캠페인, 정보성 콘텐츠</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>응답 구성 규칙 (V1)</h3>
        <p style={{ ...styles.tipText, color: '#475569', marginBottom: '12px' }}>
          AI 응답과 Context Asset의 배치·톤·비율을 규정합니다.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '13px', color: '#334155' }}>질문 유형별 규칙</strong>
          <ul style={{ ...styles.list, marginTop: '8px' }}>
            <li><strong>범용 질문</strong>: information 태그만 허용, 하단 배치</li>
            <li><strong>전문/업무 질문</strong>: information + branding 허용</li>
            <li><strong>탐색/비교 질문</strong>: 모든 태그 허용, 병렬 카드</li>
          </ul>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '13px', color: '#334155' }}>금지 표현</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span style={styles.forbiddenTag}>"지금 구매하세요"</span>
            <span style={styles.forbiddenTag}>"특가"</span>
            <span style={styles.forbiddenTag}>"추천드립니다"</span>
            <span style={styles.forbiddenTag}>"최고의 선택"</span>
          </div>
        </div>

        <div>
          <strong style={{ fontSize: '13px', color: '#334155' }}>허용 표현</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span style={styles.allowedTag}>"관련 자료"</span>
            <span style={styles.allowedTag}>"참고할 수 있는 정보"</span>
            <span style={styles.allowedTag}>"도움이 될 수 있는 내용"</span>
          </div>
        </div>
      </div>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <MessageSquare size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>응답 중간 삽입 금지</h4>
          <p style={styles.featureDesc}>
            Context Asset은 응답 하단 또는 병렬 카드로만 배치
          </p>
        </div>
        <div style={styles.featureCard}>
          <DollarSign size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>최대 카드 3개</h4>
          <p style={styles.featureDesc}>
            응답당 Context Asset 카드는 최대 3개까지만 노출
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.tipText}>
          AI 응답 규칙은 실험을 통해 변경할 수 없습니다. 규칙은 실험 위에 고정됩니다.
        </p>
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
  forbiddenTag: {
    padding: '4px 10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '16px',
    fontSize: '12px',
    color: '#dc2626',
  },
  allowedTag: {
    padding: '4px 10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '16px',
    fontSize: '12px',
    color: '#16a34a',
  },
};
