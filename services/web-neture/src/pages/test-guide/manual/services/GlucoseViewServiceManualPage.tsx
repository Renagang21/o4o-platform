/**
 * GlucoseViewServiceManualPage - GlucoseView 서비스 매뉴얼
 * 혈당 모니터링 및 관리 플랫폼
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, TrendingUp, Bell, FileBarChart, Target, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '서비스 소개' },
  { id: 'features', title: '주요 기능' },
  { id: 'recording', title: '혈당 기록' },
  { id: 'analysis', title: '데이터 분석' },
  { id: 'goals', title: '목표 관리' },
  { id: 'faq', title: '자주 묻는 질문' },
];

export default function GlucoseViewServiceManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'features':
        return <FeaturesSection />;
      case 'recording':
        return <RecordingSection />;
      case 'analysis':
        return <AnalysisSection />;
      case 'goals':
        return <GoalsSection />;
      case 'faq':
        return <FaqSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="GlucoseView 서비스 매뉴얼"
      subtitle="혈당 모니터링 및 관리 플랫폼"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#f59e0b"
    >
      {renderContent()}
    </ManualLayout>
  );
}

function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>GlucoseView란?</h2>
      <p style={styles.text}>
        GlucoseView는 <strong>혈당 수치를 기록하고 분석</strong>하는 건강 관리 플랫폼입니다.
        일상적인 혈당 변화를 추적하고, 패턴을 분석하여 더 나은 건강 관리를 지원합니다.
      </p>

      <div style={styles.infoCard}>
        <Activity size={24} style={{ color: '#f59e0b' }} />
        <div>
          <strong>핵심 가치</strong>
          <p style={styles.infoText}>
            매일의 혈당 기록을 통해 건강 패턴을 이해하고,
            목표 혈당 범위를 유지하도록 돕습니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>GlucoseView의 특징</h3>
        <ul style={styles.list}>
          <li><strong>간편한 기록</strong>: 빠르고 쉬운 혈당 수치 입력</li>
          <li><strong>시각화</strong>: 그래프와 차트로 트렌드 확인</li>
          <li><strong>알림 기능</strong>: 측정 시간 및 이상 수치 알림</li>
          <li><strong>리포트</strong>: 의사 상담용 리포트 생성</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>연동 가능한 기기</h3>
        <ul style={styles.list}>
          <li><strong>혈당 측정기</strong>: 주요 브랜드 연동 지원</li>
          <li><strong>연속혈당측정기(CGM)</strong>: 실시간 데이터 연동</li>
          <li><strong>스마트워치</strong>: 건강 데이터 연동</li>
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
        GlucoseView가 제공하는 핵심 기능들입니다.
      </p>

      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <Activity size={20} style={{ color: '#f59e0b' }} />
          <h4 style={styles.featureTitle}>혈당 기록</h4>
          <p style={styles.featureDesc}>
            수동 입력 또는 기기 연동 기록
          </p>
        </div>
        <div style={styles.featureCard}>
          <TrendingUp size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>트렌드 분석</h4>
          <p style={styles.featureDesc}>
            일별/주별/월별 추이 분석
          </p>
        </div>
        <div style={styles.featureCard}>
          <Bell size={20} style={{ color: '#ef4444' }} />
          <h4 style={styles.featureTitle}>알림</h4>
          <p style={styles.featureDesc}>
            측정 리마인더 및 이상 수치 알림
          </p>
        </div>
        <div style={styles.featureCard}>
          <FileBarChart size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>리포트</h4>
          <p style={styles.featureDesc}>
            의료진 상담용 PDF 리포트
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p style={styles.tipText}>
          GlucoseView는 의료기기가 아닙니다. 의료 결정은 전문의와 상담하세요.
        </p>
      </div>
    </div>
  );
}

function RecordingSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>혈당 기록</h2>
      <p style={styles.text}>
        혈당 수치를 기록하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>기록 화면 열기</strong>
            <p style={styles.stepText}>
              홈 화면에서 "+" 버튼을 탭합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>혈당 수치 입력</strong>
            <p style={styles.stepText}>
              측정한 혈당 수치(mg/dL)를 입력합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>측정 시점 선택</strong>
            <p style={styles.stepText}>
              공복, 식전, 식후 2시간, 취침 전 등을 선택합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>메모 추가 (선택)</strong>
            <p style={styles.stepText}>
              음식, 운동, 컨디션 등 메모를 남깁니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>5</span>
          <div>
            <strong>저장</strong>
            <p style={styles.stepText}>
              "저장" 버튼을 눌러 기록을 완료합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>측정 시점별 목표 범위</h3>
        <ul style={styles.list}>
          <li><strong>공복</strong>: 80-130 mg/dL</li>
          <li><strong>식후 2시간</strong>: 180 mg/dL 미만</li>
          <li><strong>취침 전</strong>: 100-140 mg/dL</li>
        </ul>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
          * 개인별 목표는 의사와 상담하여 설정하세요
        </p>
      </div>
    </div>
  );
}

function AnalysisSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>데이터 분석</h2>
      <p style={styles.text}>
        기록된 혈당 데이터를 분석하고 이해하는 방법입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>제공되는 분석</h3>
        <ul style={styles.list}>
          <li><strong>일별 그래프</strong>: 하루 동안의 혈당 변화</li>
          <li><strong>주간 트렌드</strong>: 7일간 평균 및 추이</li>
          <li><strong>월간 리포트</strong>: 한 달 통계 및 패턴</li>
          <li><strong>시간대별 분석</strong>: 특정 시간대 패턴 파악</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <TrendingUp size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>패턴 인사이트</strong>
          <p style={styles.infoText}>
            특정 음식이나 활동 후 혈당 변화 패턴을 파악하여
            생활 습관 개선에 활용할 수 있습니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 지표</h3>
        <ul style={styles.list}>
          <li><strong>평균 혈당</strong>: 기간별 평균 수치</li>
          <li><strong>범위 내 시간(TIR)</strong>: 목표 범위 유지 비율</li>
          <li><strong>혈당 변동성</strong>: 수치 변동 폭</li>
          <li><strong>추정 당화혈색소(eA1c)</strong>: 예상 HbA1c 수치</li>
        </ul>
      </div>
    </div>
  );
}

function GoalsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>목표 관리</h2>
      <p style={styles.text}>
        개인 목표를 설정하고 달성 현황을 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>목표 설정</strong>
            <p style={styles.stepText}>
              설정 &gt; 목표에서 혈당 목표 범위를 설정합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>알림 설정</strong>
            <p style={styles.stepText}>
              목표 범위 이탈 시 알림을 받을 수 있습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>진행 확인</strong>
            <p style={styles.stepText}>
              대시보드에서 목표 달성률을 확인합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <Target size={24} style={{ color: '#8b5cf6' }} />
        <div>
          <strong>목표 달성 보상</strong>
          <p style={styles.infoText}>
            연속 목표 달성 시 배지와 격려 메시지를 받을 수 있습니다.
            작은 성취가 큰 동기가 됩니다!
          </p>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p style={styles.tipText}>
          목표 범위는 의사와 상담하여 개인 상황에 맞게 설정하세요.
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
        <h4 style={styles.faqQuestion}>Q. 혈당계와 연동할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          주요 블루투스 혈당계 및 CGM 기기와 연동할 수 있습니다. 설정 &gt; 기기 연결에서 확인하세요.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 데이터를 의사에게 공유할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          리포트 메뉴에서 PDF 리포트를 생성하여 이메일로 전송하거나 출력할 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. 가족과 데이터를 공유할 수 있나요?</h4>
        <p style={styles.faqAnswer}>
          보호자 연결 기능을 통해 가족이 실시간으로 혈당 데이터를 확인할 수 있습니다.
        </p>
      </div>

      <div style={styles.faqItem}>
        <h4 style={styles.faqQuestion}>Q. GlycoPharm과 연동되나요?</h4>
        <p style={styles.faqAnswer}>
          네, GlycoPharm과 연동하면 복약 기록과 혈당 변화를 함께 분석할 수 있습니다.
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
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#92400e',
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
    backgroundColor: '#f59e0b',
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
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#92400e',
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
    backgroundColor: '#f59e0b',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
