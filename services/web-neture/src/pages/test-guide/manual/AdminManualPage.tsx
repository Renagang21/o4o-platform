/**
 * AdminManualPage - 운영자 역할 매뉴얼 (내부용)
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 접근 제어: admin role만 접근 가능
 * 왼쪽 목차 네비게이션 + 오른쪽 콘텐츠 레이아웃
 */

import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Shield, Users, AlertTriangle, Database } from 'lucide-react';
import { useAuth } from '../../../contexts';
import ManualLayout, { type ManualSection } from '../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '운영자 소개' },
  { id: 'dashboard', title: '관리자 대시보드' },
  { id: 'users', title: '사용자 관리' },
  { id: 'ai', title: 'AI 기능 관리' },
  { id: 'test-ops', title: '테스트 운영' },
  { id: 'caution', title: '주의사항' },
];

export default function AdminManualPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState('intro');

  // 권한 체크: admin만 접근 가능
  if (!isAuthenticated || !user?.roles.includes('admin')) {
    return <Navigate to="/test-guide" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'dashboard':
        return <DashboardSection />;
      case 'users':
        return <UsersSection />;
      case 'ai':
        return <AiSection />;
      case 'test-ops':
        return <TestOpsSection />;
      case 'caution':
        return <CautionSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="운영자 매뉴얼"
      subtitle="Neture 플랫폼 관리 가이드 (내부용)"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#ef4444"
    >
      {/* 내부용 경고 */}
      <div style={styles.warning}>
        <AlertTriangle size={16} />
        이 문서는 내부 운영자 전용입니다. 외부 공개 금지.
      </div>
      {renderContent()}
    </ManualLayout>
  );
}

// 섹션 1: 운영자 소개
function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>운영자는 무엇을 하나요?</h2>
      <p style={styles.text}>
        운영자는 Neture <strong>플랫폼 전체를 관리</strong>하는 역할입니다.
        사용자 관리, AI 기능 설정, 테스트 운영을 담당합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>운영자의 주요 책임</h3>
        <ul style={styles.list}>
          <li>공급자/파트너 계정 승인 및 역할 관리</li>
          <li>AI 기능 설정 및 모니터링</li>
          <li>테스트 환경 관리 및 데이터 초기화</li>
          <li>플랫폼 콘텐츠 및 공지사항 관리</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Shield size={24} style={{ color: '#ef4444' }} />
        <div>
          <strong>권한 수준</strong>
          <p style={styles.infoText}>
            운영자는 플랫폼의 모든 데이터에 접근할 수 있습니다.
            권한 사용에 주의하고, 변경 사항을 기록하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

// 섹션 2: 관리자 대시보드
function DashboardSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>관리자 대시보드</h2>
      <p style={styles.text}>
        관리자 대시보드에서 플랫폼 전체 현황을 모니터링합니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>대시보드 접속</strong>
            <p style={styles.stepText}>
              <code style={styles.code}>/admin</code> 경로로 접속합니다.
              관리자 계정으로 로그인해야 접근 가능합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>현황 카드 확인</strong>
            <p style={styles.stepText}>
              총 사용자 수, 활성 공급자/파트너, AI 사용량을 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>빠른 작업</strong>
            <p style={styles.stepText}>
              사용자 관리, AI 설정, 콘텐츠 관리로 바로 이동합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>주요 메뉴</h3>
        <ul style={styles.list}>
          <li><strong>/admin</strong>: 메인 대시보드</li>
          <li><strong>/admin/ai</strong>: AI 제어판</li>
          <li><strong>/admin/ai/engines</strong>: AI 엔진 관리</li>
          <li><strong>/admin/ai/policy</strong>: AI 정책 설정</li>
        </ul>
      </div>
    </div>
  );
}

// 섹션 3: 사용자 관리
function UsersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>사용자 관리</h2>
      <p style={styles.text}>
        플랫폼 사용자(공급자, 파트너)를 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>사용자 목록 확인</strong>
            <p style={styles.stepText}>
              관리자 대시보드에서 등록된 사용자 목록을 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>역할 부여</strong>
            <p style={styles.stepText}>
              사용자에게 공급자, 파트너, 관리자 역할을 부여합니다.
              한 사용자가 여러 역할을 가질 수 있습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>계정 상태 관리</strong>
            <p style={styles.stepText}>
              문제가 있는 계정을 비활성화하거나, 승인 대기 계정을 처리합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <Users size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
        <p style={styles.tipText}>
          테스트 중에는 테스터 요청에 따라 역할을 유연하게 변경해주세요.
        </p>
      </div>
    </div>
  );
}

// 섹션 4: AI 기능 관리
function AiSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>AI 기능 관리</h2>
      <p style={styles.text}>
        플랫폼의 AI 기능을 설정하고 모니터링합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>AI 제어판 기능</h3>
        <ul style={styles.list}>
          <li><strong>AI 엔진 관리</strong>: 사용 가능한 AI 모델 설정</li>
          <li><strong>AI 정책</strong>: 사용 한도, 접근 권한 설정</li>
          <li><strong>사용량 모니터링</strong>: API 호출량, 비용 추적</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>AI 대시보드 접속</strong>
            <p style={styles.stepText}>
              <code style={styles.code}>/admin/ai</code>에서 AI 현황을 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>엔진 설정</strong>
            <p style={styles.stepText}>
              각 기능별로 사용할 AI 엔진(GPT, Claude 등)을 설정합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>정책 관리</strong>
            <p style={styles.stepText}>
              역할별 AI 사용 한도와 접근 권한을 설정합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 섹션 5: 테스트 운영
function TestOpsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>테스트 운영</h2>
      <p style={styles.text}>
        테스트 기간 동안의 운영 업무입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>일일 운영 체크리스트</h3>
        <ul style={styles.list}>
          <li>테스트 포럼 확인 (새 피드백, 버그 리포트)</li>
          <li>신규 가입 테스터 역할 부여</li>
          <li>시스템 오류 로그 확인</li>
          <li>AI 사용량 모니터링</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>포럼 관리</strong>
            <p style={styles.stepText}>
              테스터 의견을 주기적으로 확인하고, 중요한 피드백을 정리합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>이슈 대응</strong>
            <p style={styles.stepText}>
              테스터가 보고한 버그나 문제를 확인하고 대응합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>데이터 관리</strong>
            <p style={styles.stepText}>
              필요 시 테스트 데이터를 초기화하고, 테스터에게 공지합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <Database size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
        <p style={styles.tipText}>
          데이터 초기화 전 반드시 테스터에게 사전 공지하세요.
        </p>
      </div>
    </div>
  );
}

// 섹션 6: 주의사항
function CautionSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>주의사항</h2>
      <p style={styles.text}>
        운영자로서 주의해야 할 사항입니다.
      </p>

      <div style={styles.warningBox}>
        <h3 style={styles.warningTitle}>절대 하지 말아야 할 것</h3>
        <ul style={styles.list}>
          <li>운영자 권한을 무단으로 타인에게 부여</li>
          <li>테스트 데이터를 실제 서비스로 이관</li>
          <li>내부 문서/데이터를 외부에 공유</li>
          <li>사전 공지 없이 데이터 초기화</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>권장 사항</h3>
        <ul style={styles.list}>
          <li>모든 주요 변경 사항을 기록으로 남기기</li>
          <li>테스터 피드백을 문서화하여 정리</li>
          <li>정기적으로 시스템 상태 점검</li>
          <li>문제 발생 시 즉시 팀에 공유</li>
        </ul>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          운영 관련 문의는 팀 채널로 연락하세요.
        </p>
        <Link to="/forum/test-feedback" style={styles.forumButton}>
          테스트 포럼 바로가기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  warning: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: 500,
  },
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
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#991b1b',
    margin: '4px 0 0 0',
    lineHeight: 1.6,
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
    backgroundColor: '#ef4444',
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
  code: {
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#0f172a',
  },
  tipBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#991b1b',
    margin: 0,
    lineHeight: 1.5,
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  },
  warningTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#991b1b',
    margin: '0 0 12px 0',
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
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
