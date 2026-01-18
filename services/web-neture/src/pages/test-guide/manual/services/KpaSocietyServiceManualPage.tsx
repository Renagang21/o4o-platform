/**
 * KpaSocietyServiceManualPage - KPA Society 서비스 매뉴얼
 * 약사회 SaaS 운영 플랫폼
 *
 * WO-KPA-SERVICE-MANUAL-UPDATE-V2: LMS, 포럼, 공동구매, 관리자 대시보드 기능 추가
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, FileText, AlertCircle, BookOpen, MessageSquare, ShoppingCart, LayoutDashboard } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'roles', title: '역할별 대시보드' },
  { id: 'lms', title: 'LMS (교육)' },
  { id: 'forum', title: '포럼/게시판' },
  { id: 'groupbuy', title: '공동구매' },
  { id: 'members', title: '회원 관리' },
  { id: 'faq', title: '자주 묻는 질문' },
];

export default function KpaSocietyServiceManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'features':
        return <FeaturesSection />;
      case 'roles':
        return <RolesSection />;
      case 'lms':
        return <LmsSection />;
      case 'forum':
        return <ForumSection />;
      case 'groupbuy':
        return <GroupbuySection />;
      case 'members':
        return <MembersSection />;
      case 'faq':
        return <FaqSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="KPA Society 서비스 매뉴얼"
      subtitle="약사회 SaaS 운영 플랫폼"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#6366f1"
    >
      {renderContent()}
    </ManualLayout>
  );
}

function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>KPA Society란?</h2>
      <p style={styles.text}>
        KPA Society는 <strong>약사회 및 직능단체를 위한 SaaS 운영 플랫폼</strong>입니다.
        회원 관리, 행사 운영, 교육, 문서 관리 등 단체 운영에 필요한 기능을 통합 제공합니다.
      </p>

      <div style={styles.infoCard}>
        <Building size={24} style={{ color: '#6366f1' }} />
        <div>
          <strong>핵심 가치</strong>
          <p style={styles.infoText}>
            직능단체의 디지털 전환을 지원하여
            효율적인 단체 운영과 회원 서비스를 가능하게 합니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>KPA Society의 특징</h3>
        <ul style={styles.list}>
          <li><strong>통합 관리</strong>: 회원, 행사, 교육을 한 곳에서</li>
          <li><strong>맞춤 설정</strong>: 단체 특성에 맞는 커스터마이징</li>
          <li><strong>클라우드 기반</strong>: 언제 어디서나 접속 가능</li>
          <li><strong>보안</strong>: 회원 정보 안전 관리</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>사용자 역할 (계층 구조)</h3>
        <ul style={styles.list}>
          <li><strong>서비스 운영자</strong>: 전체 플랫폼 운영 및 AI 리포트</li>
          <li><strong>지부 관리자</strong>: 지부 전체 운영 (분회 관리, 회원 승인)</li>
          <li><strong>분회 관리자</strong>: 분회 수준 운영 (뉴스, 자료, 회원)</li>
          <li><strong>일반 회원</strong>: 정보 조회, 포럼 참여, 교육 수강</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>조직 계층</h3>
        <ul style={styles.list}>
          <li><strong>본회</strong>: 대한약사회 (최상위)</li>
          <li><strong>지부</strong>: 각 시/도 약사회</li>
          <li><strong>분회</strong>: 구/군 단위 약사회</li>
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
        KPA Society가 제공하는 핵심 기능들입니다.
      </p>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <Users size={20} style={{ color: '#6366f1' }} />
          <h4 style={styles.featureTitle}>회원 관리</h4>
          <p style={styles.featureDesc}>
            회원 정보, 회비, 자격/면허 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <BookOpen size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>LMS (교육)</h4>
          <p style={styles.featureDesc}>
            강좌, 퀴즈, 수료증, 평점 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <MessageSquare size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>포럼/게시판</h4>
          <p style={styles.featureDesc}>
            복약지도, 부작용 공유, 교육자료
          </p>
        </div>
        <div style={styles.featureCard}>
          <ShoppingCart size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>공동구매</h4>
          <p style={styles.featureDesc}>
            회원 전용 상품, 공급자 연계
          </p>
        </div>
        <div style={styles.featureCard}>
          <LayoutDashboard size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>관리자 대시보드</h4>
          <p style={styles.featureDesc}>
            통계, 승인 대기, 퀵 메뉴
          </p>
        </div>
        <div style={styles.featureCard}>
          <FileText size={20} style={{ color: '#ec4899' }} />
          <h4 style={styles.featureTitle}>뉴스/자료실</h4>
          <p style={styles.featureDesc}>
            공지사항, 자료 아카이브
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p style={styles.tipText}>
          테스트 환경의 회원 정보는 가상의 테스트 데이터입니다.
        </p>
      </div>
    </div>
  );
}

function RolesSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>역할별 대시보드</h2>
      <p style={styles.text}>
        각 역할에 맞는 전용 대시보드와 기능을 제공합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>서비스 운영자 (/operator)</h3>
        <ul style={styles.list}>
          <li>전체 플랫폼 현황 대시보드</li>
          <li>AI 리포트 (운영 인사이트)</li>
          <li>공동구매 상품 관리 및 통계</li>
          <li>공급자 연계 상태 모니터링</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>지부 관리자 (/admin)</h3>
        <ul style={styles.list}>
          <li>분회 관리 (생성, 수정, 삭제)</li>
          <li>회원 목록 및 승인</li>
          <li>임원 관리</li>
          <li>연회비 관리</li>
          <li>신상신고 처리</li>
          <li>공지/소식 작성</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>분회 관리자 (/branch/:id/admin)</h3>
        <ul style={styles.list}>
          <li>분회 수준 회원 관리</li>
          <li>분회 임원 관리</li>
          <li>뉴스/자료 관리</li>
          <li>게시판 중재</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <LayoutDashboard size={24} style={{ color: '#6366f1' }} />
        <div>
          <strong>대시보드 통계 항목</strong>
          <p style={styles.infoText}>
            등록 분회 수, 전체 회원 수, 승인 대기, 진행중 공동구매
          </p>
        </div>
      </div>
    </div>
  );
}

function LmsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>LMS (교육 관리)</h2>
      <p style={styles.text}>
        약사 보수교육과 필수교육을 관리하는 학습관리시스템입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 기능</h3>
        <ul style={styles.list}>
          <li><strong>강좌 관리</strong>: 온라인/오프라인 강좌 등록</li>
          <li><strong>퀴즈/설문</strong>: 학습 평가 및 만족도 조사</li>
          <li><strong>수료증</strong>: 자동 발급 및 검증 코드</li>
          <li><strong>평점 관리</strong>: 보수교육 평점 누적 및 추적</li>
          <li><strong>필수교육 정책</strong>: 부서별 의무교육 설정</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>강좌 등록</strong>
            <p style={styles.stepText}>관리자가 강좌 정보, 강의 목록, 평점을 등록합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>수강 신청</strong>
            <p style={styles.stepText}>회원이 강좌를 검색하고 수강 신청합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>학습 진행</strong>
            <p style={styles.stepText}>레슨 시청, 퀴즈 응시, 진도 추적이 자동으로 관리됩니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>수료 및 평점</strong>
            <p style={styles.stepText}>수료 시 수료증 발급 및 보수교육 평점이 자동 기록됩니다.</p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <BookOpen size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>면허 프로필 연동</strong>
          <p style={styles.infoText}>
            약사 면허번호와 연동하여 보수교육 이수 현황을 자동 관리합니다.
            갱신 필요 여부, 당년도 평점 등을 실시간 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function ForumSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>포럼/게시판</h2>
      <p style={styles.text}>
        약사 회원 전용 커뮤니티 게시판입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>게시판 카테고리</h3>
        <ul style={styles.list}>
          <li><strong>지부 공지</strong>: 공식 공지사항</li>
          <li><strong>복약지도</strong>: 복약지도 노하우 공유</li>
          <li><strong>부작용 공유</strong>: 약물 부작용 정보 공유</li>
          <li><strong>교육자료</strong>: 학습 자료 공유</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 기능</h3>
        <ul style={styles.list}>
          <li>게시글 작성/수정/삭제</li>
          <li>댓글 및 답글 기능</li>
          <li>AI 요약 및 자동 태깅</li>
          <li>게시글 추천 엔진</li>
          <li>실시간 알림 (SSE)</li>
          <li>콘텐츠 중재 기능</li>
        </ul>
      </div>

      <div style={styles.tipBox}>
        <MessageSquare size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p style={styles.tipText}>
          약사 포럼은 승인제로 운영됩니다. 게시글은 관리자 승인 후 공개됩니다.
        </p>
      </div>
    </div>
  );
}

function GroupbuySection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>공동구매</h2>
      <p style={styles.text}>
        회원 전용 공동구매 서비스입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>운영자 기능</h3>
        <ul style={styles.list}>
          <li><strong>상품 관리</strong>: 추가, 삭제, 노출/비노출 설정</li>
          <li><strong>순서 관리</strong>: 상품 정렬 순서 변경</li>
          <li><strong>통계 조회</strong>: 주문 현황, 참여자 통계</li>
          <li><strong>공급자 연계</strong>: 공급자 시스템 연동 상태</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <ShoppingCart size={24} style={{ color: '#f59e0b' }} />
        <div>
          <strong>무재고 판매 구조</strong>
          <p style={styles.infoText}>
            매장은 재고를 보유하지 않습니다.
            공급자가 직접 배송하는 드롭쉬핑 방식으로 운영됩니다.
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p style={styles.tipText}>
          현재 테스트 환경에서는 공급자 연계가 Mock 모드로 동작합니다.
          실제 주문은 처리되지 않습니다.
        </p>
      </div>
    </div>
  );
}

function MembersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>회원 관리</h2>
      <p style={styles.text}>
        회원 정보를 등록하고 관리하는 방법입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>회원 정보 필드</h3>
        <ul style={styles.list}>
          <li><strong>기본 정보</strong>: 이름, 연락처, 이메일</li>
          <li><strong>면허 정보</strong>: 약사 면허번호, 발급일, 만료일</li>
          <li><strong>소속 정보</strong>: 약국명, 약국 주소</li>
          <li><strong>가입 정보</strong>: 가입일, 상태, 역할</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>회원 가입 신청</strong>
            <p style={styles.stepText}>
              사용자가 회원 가입을 신청하면 관리자에게 알림이 전송됩니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>승인/거절 처리</strong>
            <p style={styles.stepText}>
              관리자가 승인 대기 목록에서 가입 요청을 검토합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>회원 정보 관리</strong>
            <p style={styles.stepText}>
              승인된 회원의 정보를 조회하고 수정합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>회원 상태</h3>
        <ul style={styles.list}>
          <li><strong>pending</strong>: 승인 대기</li>
          <li><strong>active</strong>: 활성 (정상)</li>
          <li><strong>suspended</strong>: 정지</li>
          <li><strong>withdrawn</strong>: 탈퇴</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Users size={24} style={{ color: '#6366f1' }} />
        <div>
          <strong>권한과 직책의 분리</strong>
          <p style={styles.infoText}>
            임원은 직책(Position)이며, 권한은 Role로만 부여됩니다.
            예: 회장이라는 직책과 admin 권한은 별개입니다.
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
        <h4 style={styles.faqQuestion}>Q. 우리 단체도 사용할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          약사회뿐 아니라 다양한 직능단체, 학회, 협회에서 사용할 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 기존 회원 데이터를 가져올 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          Excel 파일로 회원 데이터 일괄 가져오기를 지원합니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 회비 결제 연동이 가능한가요?</h4>
        <p style={styles.faqAnswer}>
          카드 결제, 계좌이체 연동을 통해 온라인 회비 납부가 가능합니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 모바일에서도 사용할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          반응형 웹으로 모바일 브라우저에서도 사용 가능하며, 전용 앱도 제공됩니다.
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
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#4338ca',
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
    backgroundColor: '#6366f1',
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
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#4338ca',
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
    backgroundColor: '#6366f1',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
