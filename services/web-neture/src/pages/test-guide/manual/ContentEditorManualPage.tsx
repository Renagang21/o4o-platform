/**
 * ContentEditorManualPage - 콘텐츠 에디터 사용 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 왼쪽 목차 네비게이션 + 오른쪽 콘텐츠 레이아웃
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Type,
  Video,
  Link as LinkIcon,
  Eye,
  Save,
  AlertCircle,
} from 'lucide-react';
import ManualLayout, { type ManualSection } from '../../../components/layouts/ManualLayout';

const SECTIONS: ManualSection[] = [
  { id: 'intro', title: '에디터 소개' },
  { id: 'text', title: '텍스트 편집' },
  { id: 'media', title: '이미지/동영상' },
  { id: 'formatting', title: '서식 도구' },
  { id: 'preview', title: '미리보기' },
  { id: 'save', title: '저장하기' },
];

export default function ContentEditorManualPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroSection />;
      case 'text':
        return <TextSection />;
      case 'media':
        return <MediaSection />;
      case 'formatting':
        return <FormattingSection />;
      case 'preview':
        return <PreviewSection />;
      case 'save':
        return <SaveSection />;
      default:
        return <IntroSection />;
    }
  };

  return (
    <ManualLayout
      title="콘텐츠 에디터 사용법"
      subtitle="리치 텍스트 에디터 가이드"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      roleColor="#10b981"
    >
      {renderContent()}
    </ManualLayout>
  );
}

// 섹션 1: 에디터 소개
function IntroSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>콘텐츠 에디터란?</h2>
      <p style={styles.text}>
        콘텐츠 에디터는 <strong>리치 텍스트(서식 있는 텍스트)</strong>를 작성할 수 있는 도구입니다.
        텍스트, 이미지, 동영상을 조합하여 다양한 콘텐츠를 만들 수 있습니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>에디터에서 할 수 있는 것</h3>
        <ul style={styles.list}>
          <li>텍스트 서식 (굵게, 기울임, 밑줄, 색상)</li>
          <li>제목 스타일 (H1, H2, H3)</li>
          <li>목록 (번호, 글머리)</li>
          <li>이미지 삽입 (URL)</li>
          <li>동영상 삽입 (YouTube, Vimeo)</li>
          <li>링크 추가</li>
        </ul>
      </div>

      <div style={styles.infoCard}>
        <Type size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>어디서 사용하나요?</strong>
          <p style={styles.infoText}>
            공급자 대시보드의 "콘텐츠 관리" 메뉴에서 새 콘텐츠를 추가하거나
            기존 콘텐츠를 수정할 때 에디터가 나타납니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// 섹션 2: 텍스트 편집
function TextSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>텍스트 편집</h2>
      <p style={styles.text}>
        에디터 영역을 클릭하고 텍스트를 입력하면 됩니다.
      </p>

      <h3 style={styles.subTitle}>기본 서식</h3>
      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>B</span>
          <div>
            <strong>굵게 (Bold)</strong>
            <p style={styles.stepText}>
              텍스트를 선택하고 B 버튼 또는 <code style={styles.code}>Ctrl+B</code>
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={{ ...styles.stepNumber, fontStyle: 'italic' }}>I</span>
          <div>
            <strong>기울임 (Italic)</strong>
            <p style={styles.stepText}>
              텍스트를 선택하고 I 버튼 또는 <code style={styles.code}>Ctrl+I</code>
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={{ ...styles.stepNumber, textDecoration: 'underline' }}>U</span>
          <div>
            <strong>밑줄 (Underline)</strong>
            <p style={styles.stepText}>
              텍스트를 선택하고 U 버튼 또는 <code style={styles.code}>Ctrl+U</code>
            </p>
          </div>
        </div>
      </div>

      <h3 style={styles.subTitle}>제목 스타일</h3>
      <div style={styles.highlightBox}>
        <ul style={styles.list}>
          <li><strong>H1</strong>: 가장 큰 제목</li>
          <li><strong>H2</strong>: 중간 제목</li>
          <li><strong>H3</strong>: 작은 제목</li>
        </ul>
        <p style={{ ...styles.stepText, marginTop: '12px' }}>
          텍스트를 선택하고 드롭다운에서 제목 스타일을 선택하세요.
        </p>
      </div>
    </div>
  );
}

// 섹션 3: 이미지/동영상
function MediaSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>이미지 & 동영상 삽입</h2>
      <p style={styles.text}>
        외부 URL을 통해 이미지와 동영상을 콘텐츠에 추가할 수 있습니다.
      </p>

      <h3 style={styles.subTitle}>이미지 삽입</h3>
      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>이미지 버튼 클릭</strong>
            <p style={styles.stepText}>
              툴바에서 이미지 아이콘을 클릭합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>URL 입력</strong>
            <p style={styles.stepText}>
              이미지 URL을 입력란에 붙여넣습니다.
              (예: https://example.com/image.jpg)
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>삽입 확인</strong>
            <p style={styles.stepText}>
              "삽입" 버튼을 클릭하면 커서 위치에 이미지가 추가됩니다.
            </p>
          </div>
        </div>
      </div>

      <h3 style={styles.subTitle}>동영상 삽입</h3>
      <div style={styles.infoCard}>
        <Video size={24} style={{ color: '#ef4444' }} />
        <div>
          <strong>지원 플랫폼</strong>
          <p style={styles.infoText}>
            YouTube와 Vimeo 동영상을 지원합니다.
            동영상 페이지 URL을 그대로 붙여넣으면 됩니다.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>동영상 URL 예시</h3>
        <ul style={styles.list}>
          <li><code style={styles.code}>https://www.youtube.com/watch?v=xxxxx</code></li>
          <li><code style={styles.code}>https://youtu.be/xxxxx</code></li>
          <li><code style={styles.code}>https://vimeo.com/xxxxxxx</code></li>
        </ul>
      </div>
    </div>
  );
}

// 섹션 4: 서식 도구
function FormattingSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>서식 도구</h2>
      <p style={styles.text}>
        툴바의 다양한 서식 도구를 활용하여 콘텐츠를 꾸밀 수 있습니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>목록 만들기</h3>
        <ul style={styles.list}>
          <li><strong>글머리 목록</strong>: 순서 없는 항목</li>
          <li><strong>번호 목록</strong>: 순서 있는 항목</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>정렬</h3>
        <ul style={styles.list}>
          <li><strong>왼쪽 정렬</strong>: 기본값</li>
          <li><strong>가운데 정렬</strong>: 제목이나 중요 문구</li>
          <li><strong>오른쪽 정렬</strong>: 서명, 날짜 등</li>
        </ul>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>기타 도구</h3>
        <ul style={styles.list}>
          <li><strong>인용</strong>: 인용문 스타일</li>
          <li><strong>코드</strong>: 코드 블록</li>
          <li><strong>구분선</strong>: 섹션 구분</li>
          <li><strong>하이라이트</strong>: 텍스트 강조</li>
        </ul>
      </div>

      <div style={styles.tipBox}>
        <LinkIcon size={16} style={{ color: '#10b981', flexShrink: 0 }} />
        <p style={styles.tipText}>
          <strong>링크 추가:</strong> 텍스트를 선택하고 링크 버튼을 클릭한 후 URL을 입력하세요.
        </p>
      </div>
    </div>
  );
}

// 섹션 5: 미리보기
function PreviewSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>미리보기</h2>
      <p style={styles.text}>
        에디터 오른쪽에서 작성 중인 콘텐츠를 실시간으로 미리볼 수 있습니다.
      </p>

      <div style={styles.infoCard}>
        <Eye size={24} style={{ color: '#10b981' }} />
        <div>
          <strong>실시간 미리보기</strong>
          <p style={styles.infoText}>
            왼쪽에서 편집하면 오른쪽 미리보기가 자동으로 업데이트됩니다.
            최종 결과물이 어떻게 보이는지 확인하면서 작성하세요.
          </p>
        </div>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>미리보기 모드</h3>
        <ul style={styles.list}>
          <li><strong>데스크톱</strong>: 넓은 화면 미리보기</li>
          <li><strong>모바일</strong>: 좁은 화면 미리보기</li>
        </ul>
        <p style={{ ...styles.stepText, marginTop: '12px' }}>
          미리보기 상단의 버튼으로 모드를 전환할 수 있습니다.
        </p>
      </div>

      <div style={styles.tipBox}>
        <AlertCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
        <p style={styles.tipText}>
          모바일에서 어떻게 보이는지 꼭 확인하세요. 파트너들이 모바일로 볼 수 있습니다.
        </p>
      </div>
    </div>
  );
}

// 섹션 6: 저장하기
function SaveSection() {
  return (
    <div>
      <h2 style={styles.sectionTitle}>저장하기</h2>
      <p style={styles.text}>
        작성한 콘텐츠를 저장하는 방법입니다.
      </p>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>저장 옵션</h3>
        <ul style={styles.list}>
          <li><strong>임시저장</strong>: 비공개 상태로 저장 (나중에 계속 수정)</li>
          <li><strong>공개 저장</strong>: 파트너가 볼 수 있도록 공개</li>
        </ul>
      </div>

      <div style={styles.stepList}>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>1</span>
          <div>
            <strong>콘텐츠 정보 입력</strong>
            <p style={styles.stepText}>
              제목, 유형, 설명을 입력합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>2</span>
          <div>
            <strong>본문 작성 완료</strong>
            <p style={styles.stepText}>
              에디터에서 본문 작성을 완료합니다.
            </p>
          </div>
        </div>
        <div style={styles.stepItem}>
          <span style={styles.stepNumber}>3</span>
          <div>
            <strong>저장 버튼 클릭</strong>
            <p style={styles.stepText}>
              "임시저장" 또는 "공개 저장" 버튼을 클릭합니다.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.tipBox}>
        <Save size={16} style={{ color: '#10b981', flexShrink: 0 }} />
        <p style={styles.tipText}>
          <strong>자동 저장:</strong> 에디터는 30초마다 자동 저장됩니다.
          <code style={styles.code}>Ctrl+S</code>로 수동 저장할 수도 있습니다.
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          에디터 사용 중 문제가 있나요?
        </p>
        <Link to="/forum/test-feedback" style={styles.forumButton}>
          피드백 남기기
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b981',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
