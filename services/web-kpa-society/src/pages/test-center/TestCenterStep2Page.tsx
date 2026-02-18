/**
 * TestCenterStep2Page - 2단계 실제 가입 테스트
 *
 * 실제 운영 흐름 전체를 점검하는 UX/운영 통합 테스트:
 * 가입 → 승인 요청 → 승인 완료 → 실제 사용
 *
 * 좌우 레이아웃: 왼쪽 사이드바(11단계) + 오른쪽 본문
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Step {
  id: number;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 1, label: '회원가입', icon: '📝' },
  { id: 2, label: '로그인', icon: '🔑' },
  { id: 3, label: '약국 정보 입력', icon: '🏥' },
  { id: 4, label: '승인 요청', icon: '📩' },
  { id: 5, label: '승인 완료 후 확인', icon: '✅' },
  { id: 6, label: '약국 경영 메뉴 사용', icon: '📊' },
  { id: 7, label: '포럼 체험', icon: '💬' },
  { id: 8, label: '디지털사이니지 설정', icon: '📺' },
  { id: 9, label: '콘텐츠 확인', icon: '📚' },
  { id: 10, label: '약국 사이버 공간 점검', icon: '🌐' },
  { id: 11, label: '종합 평가', icon: '📋' },
];

const FORUM_URL = 'https://neture.co.kr/forum/test-feedback';

export default function TestCenterStep2Page() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div style={styles.page}>
      {/* 상단 헤더 */}
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.topBarLeft}>
            <Link to="/test" style={styles.backLink}>← 테스트 센터</Link>
            <span style={styles.topBarTitle}>2단계: 실제 가입 테스트</span>
          </div>
          <a
            href={FORUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.feedbackButton}
          >
            테스트 결과 작성하기
          </a>
        </div>
      </div>

      {/* 본문 */}
      <div style={styles.body}>
        {/* 왼쪽 사이드바 */}
        <nav style={styles.sidebar}>
          <div style={styles.sidebarHeader}>테스트 단계</div>
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              style={{
                ...styles.sidebarItem,
                ...(activeStep === step.id ? styles.sidebarItemActive : {}),
              }}
            >
              <span style={styles.stepIcon}>{step.icon}</span>
              <span style={styles.stepNumber}>{step.id}.</span>
              <span style={styles.stepLabel}>{step.label}</span>
            </button>
          ))}
        </nav>

        {/* 오른쪽 콘텐츠 */}
        <main style={styles.main}>
          <StepContent stepId={activeStep} />
        </main>
      </div>
    </div>
  );
}

function StepContent({ stepId }: { stepId: number }) {
  switch (stepId) {
    case 1:
      return <Step1Content />;
    case 2:
      return <Step2Content />;
    case 3:
      return <Step3Content />;
    case 4:
      return <Step4Content />;
    case 5:
      return <Step5Content />;
    case 6:
      return <Step6Content />;
    case 7:
      return <Step7Content />;
    case 8:
      return <Step8Content />;
    case 9:
      return <Step9Content />;
    case 10:
      return <Step10Content />;
    case 11:
      return <Step11Content />;
    default:
      return null;
  }
}

/* ─── 각 단계별 콘텐츠 ─── */

function Step1Content() {
  return (
    <div>
      <StepHeader number={1} title="회원가입" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>상단의 <strong>회원가입</strong> 버튼을 클릭합니다</li>
          <li>실제 본인 이메일 사용을 권장합니다</li>
          <li>약사 또는 약대생 유형을 선택하고 정보를 입력합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '가입 과정이 복잡하지 않았는가?',
        '불필요한 정보 요구는 없는가?',
        '각 입력 필드의 의미가 명확한가?',
      ]} />
    </div>
  );
}

function Step2Content() {
  return (
    <div>
      <StepHeader number={2} title="로그인" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>가입한 이메일과 비밀번호로 로그인합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '로그인 후 어디로 이동하는가?',
        '내 역할이 정확히 표시되는가?',
        '로그인 과정이 자연스러운가?',
      ]} />
    </div>
  );
}

function Step3Content() {
  return (
    <div>
      <StepHeader number={3} title="약국 정보 입력" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>약국 이름을 입력합니다</li>
          <li>지역을 선택합니다</li>
          <li>기본 정보를 입력합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '입력이 직관적인가?',
        '실제 약국 정보를 입력하기 부담스럽지 않은가?',
        '어떤 정보가 필수인지 명확한가?',
      ]} />
    </div>
  );
}

function Step4Content() {
  return (
    <div>
      <StepHeader number={4} title="승인 요청" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li><strong>승인 요청</strong> 버튼을 클릭합니다</li>
          <li>요청 후 승인 대기 상태를 확인합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '요청 상태가 명확히 보이는가?',
        '승인 대기라는 것이 이해되는가?',
        '불안하지 않은가? (언제 승인될지 안내가 있는가?)',
      ]} />
    </div>
  );
}

function Step5Content() {
  return (
    <div>
      <StepHeader number={5} title="승인 완료 후 확인" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <p style={cs.desc}>운영자가 승인을 완료합니다. 승인 후 변화를 확인합니다.</p>
      </ContentCard>
      <UxCheckCard questions={[
        '승인되었다는 안내가 명확한가?',
        '어떤 기능이 열렸는지 이해되는가?',
        '승인 전후 차이가 느껴지는가?',
      ]} />
    </div>
  );
}

function Step6Content() {
  return (
    <div>
      <StepHeader number={6} title="약국 경영 메뉴 사용" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>새로 보이는 경영 메뉴를 확인합니다</li>
          <li>각 메뉴를 탐색합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '메뉴가 새로 보이는가?',
        '내 공간이라는 느낌이 드는가?',
        '경영 메뉴는 실제로 필요한 것처럼 보이는가?',
      ]} />
    </div>
  );
}

function Step7Content() {
  return (
    <div>
      <StepHeader number={7} title="포럼 체험" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>포럼에서 글을 읽어봅니다</li>
          <li>댓글을 작성해봅니다</li>
          <li>새 글을 작성해봅니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '글 읽기/쓰기가 자연스러운가?',
        '카테고리 구분이 이해되는가?',
        '다른 약사들과 소통하는 느낌이 드는가?',
      ]} />
    </div>
  );
}

function Step8Content() {
  return (
    <div>
      <StepHeader number={8} title="디지털사이니지 설정" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>매장 TV에서 활용한다고 가정합니다</li>
          <li>콘텐츠 등록 흐름을 확인합니다</li>
          <li>재생 목록을 구성해봅니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '실제 매장에서 쓸 수 있을 것 같은가?',
        '너무 전문 장비 느낌은 없는가?',
        '설정 과정이 어렵지 않은가?',
      ]} />
    </div>
  );
}

function Step9Content() {
  return (
    <div>
      <StepHeader number={9} title="콘텐츠 확인" />
      <ContentCard>
        <h3 style={cs.cardTitle}>진행 방법</h3>
        <ul style={cs.actionList}>
          <li>교육 자료를 확인합니다</li>
          <li>공지사항을 확인합니다</li>
          <li>강의 목록을 탐색합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '콘텐츠의 품질과 양이 적절한가?',
        '필요한 정보를 쉽게 찾을 수 있는가?',
        '교육 콘텐츠가 유용해 보이는가?',
      ]} />
    </div>
  );
}

function Step10Content() {
  return (
    <div>
      <StepHeader number={10} title="약국 사이버 공간 점검" />
      <ContentCard>
        <h3 style={cs.cardTitle}>이 단계가 핵심입니다</h3>
        <ul style={cs.actionList}>
          <li>내 약국 화면을 확인합니다</li>
          <li>고객이 본다고 가정합니다</li>
          <li>실제 공개해도 괜찮은지 판단합니다</li>
        </ul>
      </ContentCard>
      <UxCheckCard questions={[
        '실제 고객에게 보여주고 싶은가?',
        '관리가 어렵지 않은가?',
        '약국의 전문성이 잘 드러나는가?',
      ]} />
    </div>
  );
}

function Step11Content() {
  return (
    <div>
      <StepHeader number={11} title="종합 평가" />
      <ContentCard>
        <h3 style={cs.cardTitle}>다음 질문에 답해주세요</h3>
        <div style={cs.evaluationList}>
          <EvaluationItem number={1} question="이 서비스는 실제로 도움이 될 것 같은가?" />
          <EvaluationItem number={2} question="가장 개선이 필요한 부분은?" />
          <EvaluationItem number={3} question="가장 인상 깊었던 기능은?" />
          <EvaluationItem number={4} question="월 구독 의향은?" />
          <EvaluationItem number={5} question="동료 약사에게 추천 의향은?" />
        </div>
      </ContentCard>
      <div style={cs.finalAction}>
        <p style={cs.finalText}>
          모든 테스트를 완료하셨습니다. 소중한 의견을 남겨주세요.
        </p>
        <a
          href={FORUM_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={cs.finalButton}
        >
          테스트 결과 작성하기
        </a>
      </div>
    </div>
  );
}

/* ─── 공통 서브 컴포넌트 ─── */

function StepHeader({ number, title }: { number: number; title: string }) {
  return (
    <div style={cs.stepHeader}>
      <span style={cs.stepHeaderNumber}>{number}</span>
      <h2 style={cs.stepHeaderTitle}>{title}</h2>
    </div>
  );
}

function ContentCard({ children }: { children: React.ReactNode }) {
  return <div style={cs.contentCard}>{children}</div>;
}

function UxCheckCard({ questions }: { questions: string[] }) {
  return (
    <div style={cs.uxCard}>
      <h3 style={cs.uxCardTitle}>UX 점검 질문</h3>
      <ul style={cs.uxList}>
        {questions.map((q, i) => (
          <li key={i} style={cs.uxItem}>
            <span style={cs.uxBullet}>?</span>
            {q}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvaluationItem({ number, question }: { number: number; question: string }) {
  return (
    <div style={cs.evalItem}>
      <span style={cs.evalNumber}>{number}</span>
      <span style={cs.evalQuestion}>{question}</span>
    </div>
  );
}

/* ─── 페이지 레이아웃 스타일 ─── */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  topBar: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  topBarInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  topBarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  feedbackButton: {
    padding: '10px 20px',
    backgroundColor: '#059669',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
  body: {
    flex: 1,
    display: 'flex',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    backgroundColor: '#fff',
    borderRight: '1px solid #e2e8f0',
    padding: '16px 0',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '8px 20px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    textAlign: 'left',
    transition: 'background-color 0.15s',
  },
  sidebarItemActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontWeight: 600,
    borderRight: '3px solid #2563eb',
  },
  stepIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: '13px',
    flexShrink: 0,
    minWidth: '18px',
  },
  stepLabel: {
    fontSize: '14px',
  },
  main: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
  },
};

/* ─── 콘텐츠 영역 스타일 ─── */

const cs: Record<string, React.CSSProperties> = {
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  stepHeaderNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '16px',
    fontWeight: 700,
    flexShrink: 0,
  },
  stepHeaderTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  actionList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '15px',
    lineHeight: 2,
  },
  desc: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: 0,
  },
  uxCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #bfdbfe',
    marginBottom: '16px',
  },
  uxCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 12px 0',
  },
  uxList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1e3a5f',
  },
  uxBullet: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: 700,
    flexShrink: 0,
  },
  evaluationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  evalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  evalNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#059669',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  evalQuestion: {
    fontSize: '15px',
    color: '#1e293b',
    fontWeight: 500,
  },
  finalAction: {
    textAlign: 'center',
    padding: '32px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    border: '1px solid #86efac',
  },
  finalText: {
    fontSize: '16px',
    color: '#166534',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  finalButton: {
    display: 'inline-block',
    padding: '14px 36px',
    backgroundColor: '#059669',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
  },
};
