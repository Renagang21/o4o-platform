/**
 * GlycoPharmServiceManualPage - GlycoPharm 서비스 매뉴얼
 * 당뇨병 환자를 위한 약국 서비스 플랫폼
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill, Heart, ClipboardList, Calendar, MapPin, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'pharmacy', title: '약국 찾기' },
  { id: 'prescription', title: '처방전 관리' },
  { id: 'health', title: '건강 정보' },
  { id: 'faq', title: '자주 묻는 질문' },
];

export default function GlycoPharmServiceManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'features':
        return <FeaturesSection />;
      case 'pharmacy':
        return <PharmacySection />;
      case 'prescription':
        return <PrescriptionSection />;
      case 'health':
        return <HealthSection />;
      case 'faq':
        return <FaqSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="GlycoPharm 서비스 매뉴얼"
      subtitle="당뇨병 환자를 위한 약국 서비스 플랫폼"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#059669"
    >
      {renderContent()}
    </ManualLayout>
  );
}

function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>GlycoPharm이란?</h2>
      <p style={styles.text}>
        GlycoPharm은 <strong>당뇨병 환자를 위한 전문 약국 서비스</strong> 플랫폼입니다.
        가까운 약국 찾기, 처방전 관리, 건강 정보 제공을 통해 당뇨 관리를 지원합니다.
      </p>

      <div style={styles.infoCard}>
        <Pill size={24} style={{ color: '#059669' }} />
        <div>
          <strong>핵심 가치</strong>
          <p style={styles.infoText}>
            당뇨병 환자의 일상적인 약국 이용과 건강 관리를
            더 쉽고 편리하게 만듭니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>GlycoPharm의 특징</h3>
        <ul style={styles.list}>
          <li><strong>전문 약국 연결</strong>: 당뇨 전문 약국 네트워크</li>
          <li><strong>처방전 관리</strong>: 처방 이력 및 복약 관리</li>
          <li><strong>건강 정보</strong>: 당뇨 관련 전문 정보 제공</li>
          <li><strong>예약 시스템</strong>: 약국 방문 예약 지원</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>대상 사용자</h3>
        <ul style={styles.list}>
          <li><strong>당뇨 환자</strong>: 처방약 수령 및 건강 관리</li>
          <li><strong>보호자</strong>: 가족의 약 관리 지원</li>
          <li><strong>약국</strong>: 환자 관리 및 서비스 제공</li>
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
        GlycoPharm이 제공하는 핵심 기능들입니다.
      </p>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <MapPin size={20} style={{ color: '#059669' }} />
          <h4 style={styles.featureTitle}>약국 찾기</h4>
          <p style={styles.featureDesc}>
            현재 위치 기반 가까운 약국 검색
          </p>
        </div>
        <div style={styles.featureCard}>
          <ClipboardList size={20} style={{ color: '#0ea5e9' }} />
          <h4 style={styles.featureTitle}>처방전 관리</h4>
          <p style={styles.featureDesc}>
            처방 이력 저장 및 복약 알림
          </p>
        </div>
        <div style={styles.featureCard}>
          <Calendar size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>예약</h4>
          <p style={styles.featureDesc}>
            약국 방문 시간 예약
          </p>
        </div>
        <div style={styles.featureCard}>
          <Heart size={20} style={{ color: '#ef4444' }} />
          <h4 style={styles.featureTitle}>건강 정보</h4>
          <p style={styles.featureDesc}>
            당뇨 관리 팁과 전문 정보
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
        <p style={styles.tipText}>
          테스트 환경의 약국 정보는 실제와 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function PharmacySection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>약국 찾기</h2>
      <p style={styles.text}>
        가까운 약국을 찾고 정보를 확인하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>위치 설정</strong>
            <p style={styles.stepText}>
              현재 위치 또는 주소를 입력합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>약국 검색</strong>
            <p style={styles.stepText}>
              주변 약국 목록이 거리순으로 표시됩니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>약국 정보 확인</strong>
            <p style={styles.stepText}>
              영업시간, 연락처, 제공 서비스를 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>방문 예약</strong>
            <p style={styles.stepText}>
              원하는 시간에 방문 예약을 합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>약국 필터</h3>
        <ul style={styles.list}>
          <li><strong>24시간 약국</strong>: 야간/휴일 운영</li>
          <li><strong>당뇨 전문</strong>: 당뇨 상담 가능</li>
          <li><strong>드라이브스루</strong>: 차량 수령 가능</li>
          <li><strong>배달 서비스</strong>: 약 배달 가능</li>
        </ul>
      </div>
    </div>
  );
}

function PrescriptionSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>처방전 관리</h2>
      <p style={styles.text}>
        처방전을 등록하고 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>처방전 등록</strong>
            <p style={styles.stepText}>
              처방전 사진을 촬영하거나 병원에서 전송받습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>약국 선택</strong>
            <p style={styles.stepText}>
              처방약을 받을 약국을 선택합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>조제 완료 알림</strong>
            <p style={styles.stepText}>
              약 조제가 완료되면 알림을 받습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>복약 알림 설정</strong>
            <p style={styles.stepText}>
              복용 시간에 맞춰 알림을 설정합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <ClipboardList size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>처방 이력</strong>
          <p style={styles.infoText}>
            지난 처방 이력을 확인하고, 동일 처방이 필요할 때
            빠르게 재요청할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function HealthSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>건강 정보</h2>
      <p style={styles.text}>
        당뇨 관리에 도움이 되는 건강 정보를 제공합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>제공 정보</h3>
        <ul style={styles.list}>
          <li><strong>혈당 관리</strong>: 혈당 수치 이해와 관리법</li>
          <li><strong>식이요법</strong>: 당뇨에 좋은 음식 정보</li>
          <li><strong>운동 가이드</strong>: 당뇨 환자를 위한 운동법</li>
          <li><strong>합병증 예방</strong>: 합병증 정보와 예방법</li>
          <li><strong>약물 정보</strong>: 처방약 복용 가이드</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Heart size={24} style={{ color: '#ef4444' }} />
        <div>
          <strong>전문가 콘텐츠</strong>
          <p style={styles.infoText}>
            의사, 약사, 영양사가 검토한 신뢰할 수 있는
            건강 정보를 제공합니다.
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
        <p style={styles.tipText}>
          건강 정보는 참고용이며, 의료 결정은 반드시 전문의와 상담하세요.
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
        <h4 style={styles.faqQuestion}>Q. 처방전 없이 약을 받을 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          전문의약품은 처방전이 필요합니다. 일반의약품은 약국에서 바로 구매 가능합니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 복약 알림은 어떻게 설정하나요?</h4>
        <p style={styles.faqAnswer}>
          처방전 등록 후 "복약 알림" 메뉴에서 복용 시간을 설정할 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 약 배달 서비스는 어떻게 이용하나요?</h4>
        <p style={styles.faqAnswer}>
          배달 서비스를 제공하는 약국을 선택하고, 처방전 등록 시 배달 옵션을 선택하세요.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 혈당 기록도 관리할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          GlucoseView 서비스와 연동하면 혈당 기록과 약 복용을 함께 관리할 수 있습니다.
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
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#065f46',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#065f46',
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
    backgroundColor: '#059669',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
