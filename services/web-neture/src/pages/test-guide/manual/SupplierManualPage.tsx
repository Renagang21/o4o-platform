/**
 * SupplierManualPage - 공급자 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 왼쪽 목차 네비게이션 + 오른쪽 콘텐츠 레이아웃
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Users, FileText, AlertCircle } from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '공급자 소개' },
  { id: 'dashboard', title: '대시보드 사용법' },
  { id: 'products', title: '상품 관리' },
  { id: 'requests', title: '제휴 요청 처리' },
  { id: 'contents', title: '콘텐츠 관리' },
  { id: 'tips', title: '테스트 팁' },
];

export default function SupplierManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'dashboard':
        return <DashboardSection />;
      case 'products':
        return <ProductsSection />;
      case 'requests':
        return <RequestsSection />;
      case 'contents':
        return <ContentsSection />;
      case 'tips':
        return <TipsSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="공급자 매뉴얼"
      subtitle="Neture 공급자 가이드"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#8b5cf6"
    >
      {renderContent()}
    </ManualLayout>
  );
}

// 섹션 1: 공급자 소개
function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>공급자는 무엇을 하나요?</h2>
      <p style={styles.text}>
        공급자는 Neture 플랫폼에서 <strong>상품을 등록하고 공급</strong>하는 핵심 역할입니다.
        파트너사에 상품을 공급하고, 제휴 요청을 관리합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>공급자의 주요 책임</h3>
        <ul style={styles.list}>
          <li>공급 가능한 상품 등록 및 정보 관리</li>
          <li>파트너사의 제휴 요청 검토 및 승인/거절</li>
          <li>제품 관련 콘텐츠(가이드, 이미지 등) 제공</li>
          <li>발주 요청 확인 및 출고 처리</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Package size={24} style={{ color: '#8b5cf6' }} />
        <div>
          <strong>로그인 후 첫 화면</strong>
          <p style={styles.infoText}>
            로그인하면 <strong>공급자 대시보드</strong>로 이동합니다.
            현재 상품 현황, 대기 중인 요청, 최근 활동을 한눈에 확인할 수 있습니다.
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
        공급자 대시보드는 플랫폼의 중심 허브입니다. 여기서 모든 주요 지표와 작업에 접근할 수 있습니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>대시보드 접속</strong>
            <p style={styles.stepText}>
              로그인 후 자동으로 대시보드로 이동합니다.
              또는 왼쪽 메뉴에서 "대시보드"를 클릭하세요.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>현황 카드 확인</strong>
            <p style={styles.stepText}>
              상단의 카드에서 등록 상품 수, 대기 요청, 활성 파트너 수를 확인합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>빠른 작업</strong>
            <p style={styles.stepText}>
              대시보드에서 바로 "새 상품 등록", "요청 확인" 등 주요 작업을 시작할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.tipText}>
          <strong>팁:</strong> 대기 중인 요청이 있으면 카드에 빨간색 알림 배지가 표시됩니다.
        </p>
      </div>
    </div>
  );
}

// 섹션 3: 상품 관리
function ProductsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>상품 관리</h2>
      <p style={styles.text}>
        공급 가능한 상품을 등록하고 관리하는 방법을 안내합니다.
      </p>

      <h3 style={styles.subTitle}>상품 등록하기</h3>
      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>상품 관리 메뉴 이동</strong>
            <p style={styles.stepText}>왼쪽 메뉴에서 "상품 관리"를 클릭합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>새 상품 추가</strong>
            <p style={styles.stepText}>"상품 추가" 버튼을 클릭합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>상품 정보 입력</strong>
            <p style={styles.stepText}>
              상품명, 카테고리, 공급가, 설명을 입력합니다.
              이미지는 URL 또는 파일 업로드로 추가합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>저장</strong>
            <p style={styles.stepText}>
              "저장" 버튼을 클릭하면 상품이 등록됩니다.
              등록된 상품은 파트너가 조회할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>상품 상태</h3>
        <ul style={styles.list}>
          <li><strong>활성:</strong> 파트너에게 노출됨</li>
          <li><strong>비활성:</strong> 일시적으로 숨김</li>
          <li><strong>품절:</strong> 재고 소진</li>
        </ul>
      </div>
    </div>
  );
}

// 섹션 4: 제휴 요청 처리
function RequestsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>제휴 요청 처리</h2>
      <p style={styles.text}>
        파트너사에서 보낸 제휴 요청을 확인하고 승인/거절하는 방법입니다.
      </p>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>요청 목록 확인</strong>
            <p style={styles.stepText}>
              왼쪽 메뉴에서 "판매자 요청"을 클릭합니다.
              대기 중인 요청이 목록으로 표시됩니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>요청 상세 보기</strong>
            <p style={styles.stepText}>
              요청을 클릭하면 파트너 정보, 요청 상품, 메시지를 확인할 수 있습니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>승인 또는 거절</strong>
            <p style={styles.stepText}>
              검토 후 "승인" 또는 "거절" 버튼을 클릭합니다.
              거절 시 사유를 입력할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.infoCard}>
        <Users size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>승인 후</strong>
          <p style={styles.infoText}>
            승인된 파트너는 해당 상품을 자신의 스토어에서 판매할 수 있습니다.
            발주가 들어오면 "발주 관리"에서 확인합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// 섹션 5: 콘텐츠 관리
function ContentsSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>콘텐츠 관리</h2>
      <p style={styles.text}>
        파트너가 참고할 수 있는 제품 설명, 이미지, 가이드 등의 콘텐츠를 관리합니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>콘텐츠 유형</h3>
        <ul style={styles.list}>
          <li><strong>제품 설명:</strong> 상세한 제품 소개 텍스트</li>
          <li><strong>이미지:</strong> 제품 사진, 배너 이미지</li>
          <li><strong>가이드:</strong> 사용 방법, FAQ 등</li>
          <li><strong>동영상:</strong> YouTube, Vimeo URL 링크</li>
        </ul>
      </div>

      <h3 style={styles.subTitle}>콘텐츠 작성하기</h3>
      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>콘텐츠 관리 이동</strong>
            <p style={styles.stepText}>왼쪽 메뉴에서 "콘텐츠 관리"를 클릭합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>콘텐츠 추가</strong>
            <p style={styles.stepText}>"콘텐츠 추가" 버튼을 클릭하면 에디터 페이지로 이동합니다.</p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>내용 작성</strong>
            <p style={styles.stepText}>
              리치 텍스트 에디터에서 텍스트, 이미지, 동영상을 추가합니다.
              오른쪽 미리보기로 결과를 확인하세요.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>4</span>
          <div>
            <strong>공개 설정</strong>
            <p style={styles.stepText}>
              "임시저장"은 비공개, "공개"하면 파트너가 볼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <FileText size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.tipText}>
          콘텐츠는 자동 적용되지 않습니다. 파트너가 참고 자료로 자유롭게 활용합니다.
        </p>
      </div>
    </div>
  );
}

// 섹션 6: 테스트 팁
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
          <li>상품 1개 이상 등록해보기</li>
          <li>파트너 요청 승인/거절 해보기</li>
          <li>콘텐츠 작성하고 미리보기 확인하기</li>
          <li>대시보드에서 현황 파악하기</li>
        </ul>
      </div>

      <div style={styles.warningBox}>
        <h3 style={styles.warningTitle}>이번 테스트에서 안 해도 되는 것</h3>
        <ul style={styles.list}>
          <li>정산 관련 기능 (아직 미구현)</li>
          <li>실제 물류 연동</li>
          <li>계약서 관리</li>
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
  subTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    margin: '24px 0 12px 0',
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
    backgroundColor: '#8b5cf6',
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
    backgroundColor: '#8b5cf6',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
