/**
 * PartnerManualPage - 파트너 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 왼쪽 목차 네비게이션 + 오른쪽 콘텐츠 레이아웃
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, AlertCircle, Building2 } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '파트너 소개' },
  { id: 'dashboard', title: '대시보드 사용법' },
  { id: 'suppliers', title: '공급자 탐색' },
  { id: 'requests', title: '제휴 요청하기' },
  { id: 'orders', title: '발주 관리' },
  { id: 'alpha-checklist', title: '운영형 알파 체크리스트' },
  { id: 'tips', title: '테스트 팁' },
];

export default function PartnerManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'dashboard':
        return <DashboardSection />;
      case 'suppliers':
        return <SuppliersSection />;
      case 'requests':
        return <RequestsSection />;
      case 'orders':
        return <OrdersSection />;
      case 'alpha-checklist':
        return <AlphaChecklistSection />;
      case 'tips':
        return <TipsSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="파트너 매뉴얼"
      subtitle="Neture 파트너 가이드"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#0ea5e9"
    >
      {renderContent()}
    </ManualLayout>
  );
}

// 섹션 1: 파트너 소개
function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>파트너는 무엇을 하나요?</h2>
      <p style={styles.text}>
        파트너는 Neture 플랫폼을 통해 <strong>공급자와 연결되어 상품을 공급받는</strong> 역할입니다.
        공급자를 탐색하고, 제휴를 요청하며, 발주를 관리합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>파트너의 주요 책임</h3>
        <ul style={styles.list}>
          <li>공급자 탐색 및 상품 정보 확인</li>
          <li>원하는 공급자에게 제휴 요청</li>
          <li>승인된 공급자에게 상품 발주</li>
          <li>공급받은 상품을 고객에게 판매</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Building2 size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>로그인 후 첫 화면</strong>
          <p style={styles.infoText}>
            로그인하면 <strong>파트너 대시보드</strong>로 이동합니다.
            연결된 공급자, 진행 중인 요청, 최근 발주 현황을 한눈에 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// 섹션 2: 대시보드 사용법
function DashboardSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>대시보드 사용법</h2>
      <p style={styles.text}>
        파트너 대시보드에서는 공급자 연결 현황과 주요 활동을 한눈에 파악할 수 있습니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>대시보드 접속</strong>
            <p style={styles.stepText}>
              로그인 후 자동으로 대시보드로 이동합니다.
              상단 메뉴에서 "파트너"를 클릭해도 됩니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>현황 카드 확인</strong>
            <p style={styles.stepText}>
              연결된 공급자 수, 대기 중인 요청, 진행 중인 발주를 카드로 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>빠른 작업</strong>
            <p style={styles.stepText}>
              "공급자 찾기", "새 발주 요청" 등 자주 사용하는 기능에 바로 접근합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#0ea5e9', flexShrink: 0 }} />
        <p style={styles.tipText}>
          <strong>팁:</strong> 공급자가 제휴 요청을 승인하면 알림이 표시됩니다.
        </p>
      </div>
    </div>
  );
}

// 섹션 3: 공급자 탐색
function SuppliersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>공급자 탐색</h2>
      <p style={styles.text}>
        Neture에 등록된 공급자를 탐색하고 상품 정보를 확인하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>공급자 목록 이동</strong>
            <p style={styles.stepText}>
              메뉴에서 "공급자"를 클릭하거나 대시보드에서 "공급자 찾기"를 클릭합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>공급자 검색/필터</strong>
            <p style={styles.stepText}>
              카테고리, 지역, 상품 유형으로 필터링하거나 검색어로 찾습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>상세 정보 확인</strong>
            <p style={styles.stepText}>
              공급자 카드를 클릭하면 회사 소개, 공급 상품, 거래 조건을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <Search size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>콘텐츠 활용</strong>
          <p style={styles.infoText}>
            공급자가 등록한 제품 가이드, 이미지, 동영상을 참고하여
            판매 전략을 세울 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// 섹션 4: 제휴 요청하기
function RequestsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>제휴 요청하기</h2>
      <p style={styles.text}>
        관심 있는 공급자에게 제휴를 요청하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>공급자 상세 페이지 이동</strong>
            <p style={styles.stepText}>
              제휴하고 싶은 공급자의 상세 페이지로 이동합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>제휴 요청 버튼 클릭</strong>
            <p style={styles.stepText}>
              "제휴 요청" 버튼을 클릭합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>요청 정보 입력</strong>
            <p style={styles.stepText}>
              관심 상품을 선택하고, 간단한 소개 메시지를 작성합니다.
              사업자 정보는 자동으로 포함됩니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>요청 제출</strong>
            <p style={styles.stepText}>
              "요청 보내기"를 클릭하면 공급자에게 제휴 요청이 전달됩니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>요청 상태</h3>
        <ul style={styles.list}>
          <li><strong>대기중:</strong> 공급자 검토 중</li>
          <li><strong>승인됨:</strong> 제휴 완료, 발주 가능</li>
          <li><strong>거절됨:</strong> 공급자가 거절 (사유 확인 가능)</li>
        </ul>
      </div>
    </div>
  );
}

// 섹션 5: 발주 관리
function OrdersSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>발주 관리</h2>
      <p style={styles.text}>
        연결된 공급자에게 상품을 발주하고 관리하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>발주하기</strong>
            <p style={styles.stepText}>
              연결된 공급자의 상품 목록에서 "발주" 버튼을 클릭합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>수량 입력</strong>
            <p style={styles.stepText}>
              필요한 수량을 입력하고 배송 정보를 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>발주 확인</strong>
            <p style={styles.stepText}>
              발주 내역을 확인하고 "발주 요청"을 클릭합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <ShoppingCart size={16} style={{ color: '#0ea5e9', flexShrink: 0 }} />
        <p style={styles.tipText}>
          발주 현황은 "발주 관리" 메뉴에서 언제든지 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

// 섹션 6: 운영형 알파 체크리스트 (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE)
function AlphaChecklistSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>운영형 알파(v0.8.x) 안정화 체크리스트</h2>
      <p style={styles.text}>
        현재 Neture 플랫폼은 <strong>운영형 알파 단계(v0.8.0)</strong>입니다.
        파트너로서 아래 항목을 확인하고 참여해 주세요.
      </p>

      <div style={styles.alphaStatusBadge}>
        <span style={styles.alphaIndicator}></span>
        <span>운영형 알파 · v0.8.0</span>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>운영형 알파란?</h3>
        <p style={{ ...styles.text, marginBottom: 0 }}>
          일반 사용자 공개 전, 파트너·운영자가 실제 사용하며 구조와 흐름을 함께 정비하는 단계입니다.
        </p>
      </div>

      <div style={styles.checklistBox}>
        <h3 style={styles.highlightTitle}>파트너 안정화 체크리스트</h3>
        <ul style={styles.checkList}>
          <li style={styles.checkItem}>
            <span style={styles.checkIcon}>☐</span>
            <span>공급자 목록에서 연결 가능한 공급자를 확인했습니다</span>
          </li>
          <li style={styles.checkItem}>
            <span style={styles.checkIcon}>☐</span>
            <span>제휴 요청 기능이 정상 동작하는지 테스트했습니다</span>
          </li>
          <li style={styles.checkItem}>
            <span style={styles.checkIcon}>☐</span>
            <span>대시보드에서 현황 카드가 올바르게 표시됩니다</span>
          </li>
          <li style={styles.checkItem}>
            <span style={styles.checkIcon}>☐</span>
            <span>발주 흐름(수량 입력 → 요청)을 한 번 이상 진행했습니다</span>
          </li>
          <li style={styles.checkItem}>
            <span style={styles.checkIcon}>☐</span>
            <span>불편하거나 이상한 점을 테스트 포럼에 공유했습니다</span>
          </li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <AlertCircle size={24} style={{ color: '#0ea5e9' }} />
        <div>
          <strong>함께 만들어가는 단계입니다</strong>
          <p style={styles.infoText}>
            발견한 문제, 개선 아이디어, 사용 중 불편한 점을 알려주시면
            플랫폼 안정화에 큰 도움이 됩니다.
          </p>
        </div>
      </div>

      <div style={styles.warningBox}>
        <h3 style={styles.warningTitle}>알파 단계 유의사항</h3>
        <ul style={styles.list}>
          <li>화면이나 기능이 예고 없이 변경될 수 있습니다</li>
          <li>일부 기능은 아직 개발 중이거나 미완성일 수 있습니다</li>
          <li>테스트 데이터는 주기적으로 초기화될 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}

// 섹션 7: 테스트 팁
function TipsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>테스트 팁</h2>
      <p style={styles.text}>
        테스트를 더 효과적으로 진행하기 위한 팁입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>꼭 해보면 좋은 것</h3>
        <ul style={styles.list}>
          <li>공급자 목록 탐색하고 상세 정보 확인하기</li>
          <li>관심 있는 공급자에게 제휴 요청 보내기</li>
          <li>공급자 콘텐츠(가이드, 이미지) 확인하기</li>
          <li>대시보드에서 현황 파악하기</li>
        </ul>
      </div>

      <div style={styles.warningBox}>
        <h3 style={styles.warningTitle}>이번 테스트에서 안 해도 되는 것</h3>
        <ul style={styles.list}>
          <li>결제 관련 기능 (아직 미구현)</li>
          <li>정산 조회</li>
          <li>계약서 서명</li>
        </ul>
        <p style={styles.notice}>※ 테스트 데이터는 주기적으로 초기화될 수 있습니다.</p>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          문의사항이나 버그를 발견하셨나요?
        </p>
        <Link to="/forum/test-feedback" style={styles.forumButton}>
          테스트 포럼에 의견 남기기
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
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    color: '#0369a1',
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
    backgroundColor: '#0ea5e9',
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
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  tipText: {
    fontSize: '13px',
    color: '#0369a1',
    margin: 0,
    lineHeight: 1.5,
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
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
  notice: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
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
    backgroundColor: '#0ea5e9',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  // Alpha Checklist Styles (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE)
  alphaStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    backgroundColor: '#0f172a',
    borderRadius: '20px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '20px',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  },
  checklistBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  },
  checkList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    color: '#166534',
    lineHeight: 1.6,
    marginBottom: '10px',
  },
  checkIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
};
