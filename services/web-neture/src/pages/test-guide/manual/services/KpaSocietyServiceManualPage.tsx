/**
 * KpaSocietyServiceManualPage - KPA Society 서비스 매뉴얼
 * 약사회 SaaS 운영 플랫폼
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, Calendar, FileText, Settings, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'members', title: '회원 관리' },
  { id: 'events', title: '행사/교육 관리' },
  { id: 'documents', title: '문서 관리' },
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
      case 'members':
        return <MembersSection />;
      case 'events':
        return <EventsSection />;
      case 'documents':
        return <DocumentsSection />;
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
        <h3 style={styles.highlightTitle}>사용자 역할</h3>
        <ul style={styles.list}>
          <li><strong>관리자</strong>: 단체 전체 운영 및 설정</li>
          <li><strong>운영진</strong>: 행사/교육 관리</li>
          <li><strong>일반 회원</strong>: 정보 조회 및 행사 참여</li>
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
            회원 정보, 회비, 자격 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <Calendar size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>행사 관리</h4>
          <p style={styles.featureDesc}>
            행사 등록, 참가 신청, 출석 관리
          </p>
        </div>
        <div style={styles.featureCard}>
          <FileText size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>문서 관리</h4>
          <p style={styles.featureDesc}>
            공문, 회의록, 자료 아카이브
          </p>
        </div>
        <div style={styles.featureCard}>
          <Settings size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>설정</h4>
          <p style={styles.featureDesc}>
            단체 정보, 권한, 알림 설정
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

function MembersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>회원 관리</h2>
      <p style={styles.text}>
        회원 정보를 등록하고 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>회원 목록 조회</strong>
            <p style={styles.stepText}>
              회원 관리 메뉴에서 전체 회원을 조회합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>회원 검색/필터</strong>
            <p style={styles.stepText}>
              이름, 소속, 회비 납부 상태 등으로 필터링합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>회원 정보 수정</strong>
            <p style={styles.stepText}>
              회원 상세에서 연락처, 소속, 자격 정보를 수정합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>회비 관리</strong>
            <p style={styles.stepText}>
              회비 납부 현황을 확인하고 독촉 알림을 발송합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>회원 상태</h3>
        <ul style={styles.list}>
          <li><strong>정회원</strong>: 회비 납부 완료, 모든 권한</li>
          <li><strong>준회원</strong>: 일부 권한 제한</li>
          <li><strong>휴면</strong>: 회비 미납 또는 활동 중단</li>
          <li><strong>탈퇴</strong>: 회원 자격 상실</li>
        </ul>
      </div>
    </div>
  );
}

function EventsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>행사/교육 관리</h2>
      <p style={styles.text}>
        단체 행사와 교육 프로그램을 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>행사 등록</strong>
            <p style={styles.stepText}>
              새 행사를 등록하고 일시, 장소, 내용을 입력합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>참가 신청 관리</strong>
            <p style={styles.stepText}>
              회원의 참가 신청을 접수하고 관리합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>알림 발송</strong>
            <p style={styles.stepText}>
              참가자에게 행사 안내 및 리마인더를 발송합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>출석 관리</strong>
            <p style={styles.stepText}>
              QR 코드 또는 수동으로 출석을 체크합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>5</span>
          <div>
            <strong>교육 이수 기록</strong>
            <p style={styles.stepText}>
              교육 참석 시 보수교육 이수 시간을 자동 기록합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <Calendar size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>행사 유형</strong>
          <p style={styles.infoText}>
            정기총회, 학술대회, 보수교육, 친목행사 등
            다양한 행사 유형을 지원합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>문서 관리</h2>
      <p style={styles.text}>
        단체 문서를 저장하고 관리하는 방법입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>문서 유형</h3>
        <ul style={styles.list}>
          <li><strong>공문</strong>: 발송/수신 공문 관리</li>
          <li><strong>회의록</strong>: 이사회, 총회 등 회의 기록</li>
          <li><strong>규정</strong>: 정관, 운영규정, 세칙</li>
          <li><strong>자료실</strong>: 각종 참고 자료 보관</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>문서 업로드</strong>
            <p style={styles.stepText}>
              PDF, Word, Excel 등 문서 파일을 업로드합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>분류 및 태그</strong>
            <p style={styles.stepText}>
              문서를 분류하고 검색용 태그를 추가합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>공개 범위 설정</strong>
            <p style={styles.stepText}>
              전체 공개, 회원 전용, 운영진 전용 등 설정합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <FileText size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p style={styles.tipText}>
          중요 문서는 버전 관리 기능을 활용하여 변경 이력을 추적할 수 있습니다.
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
