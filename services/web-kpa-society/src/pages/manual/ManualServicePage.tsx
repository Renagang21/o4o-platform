/**
 * ManualServicePage — KPA-a 서비스 안내 매뉴얼
 *
 * WO-KPA-A-MANUAL-SERVICE-PAGE-V1
 *
 * 좌측 2단계 트리 + 우측 콘텐츠 구조.
 * 트리 항목 클릭 시 우측 콘텐츠가 전환됨.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, ArrowLeft, BookOpen, Users, MessageSquare, GraduationCap, Briefcase } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TreeItem {
  id: string;
  label: string;
  children?: TreeItem[];
}

interface ContentSection {
  title: string;
  body: React.ReactNode;
}

// ─────────────────────────────────────────────
// Tree Data
// ─────────────────────────────────────────────

const TREE: TreeItem[] = [
  {
    id: 'intro',
    label: 'Ⅰ. KPA-a 소개',
    children: [
      { id: 'intro-nature', label: '서비스 성격' },
      { id: 'intro-audience', label: '이용 대상' },
      { id: 'intro-operation', label: '운영 구조' },
    ],
  },
  {
    id: 'forum',
    label: 'Ⅱ. 포럼(커뮤니티)',
    children: [
      { id: 'forum-usage', label: '포럼 이용' },
      { id: 'forum-write', label: '게시글 작성' },
      { id: 'forum-apply', label: '포럼 개설 신청' },
      { id: 'forum-approval', label: '승인 구조' },
    ],
  },
  {
    id: 'course',
    label: 'Ⅲ. 강좌',
    children: [
      { id: 'course-attend', label: '강좌 수강' },
      { id: 'course-apply', label: '강좌 개설 신청' },
      { id: 'course-approval', label: '승인 구조' },
    ],
  },
  {
    id: 'content',
    label: 'Ⅳ. 직역별 콘텐츠',
    children: [
      { id: 'content-production', label: '생산' },
      { id: 'content-distribution', label: '유통' },
      { id: 'content-employee', label: '근무 약사' },
      { id: 'content-student', label: '약대생' },
    ],
  },
];

// ─────────────────────────────────────────────
// Content Data
// ─────────────────────────────────────────────

/** Image placeholder — 실제 캡처 후 src를 교체 */
function ScreenCapture({ alt, filename }: { alt: string; filename: string }) {
  return (
    <div style={{
      margin: '20px 0',
      padding: '40px 24px',
      borderRadius: '8px',
      border: '2px dashed #cbd5e1',
      background: '#f8fafc',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px' }}>
        {alt}
      </p>
      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
        파일: {filename}
      </p>
    </div>
  );
}

const CONTENT: Record<string, ContentSection> = {
  'intro-nature': {
    title: '서비스 성격',
    body: (
      <>
        <p>KPA-a는 약사와 약대생을 위한 커뮤니티 서비스입니다.</p>
        <p>정보를 공유하고, 토론하고, 학습하는 공간입니다.</p>
        <p>온라인 판매 플랫폼이 아닙니다.</p>
      </>
    ),
  },
  'intro-audience': {
    title: '이용 대상',
    body: (
      <>
        <ul>
          <li>약사</li>
          <li>약대생</li>
        </ul>
        <p>직역에 따라 필요한 정보를 선택해 이용할 수 있습니다.</p>
      </>
    ),
  },
  'intro-operation': {
    title: '운영 구조',
    body: (
      <ul>
        <li>누구나 이용 가능</li>
        <li>포럼과 강좌는 신청 후 운영자 승인 방식</li>
        <li>무분별한 개설은 허용되지 않음</li>
      </ul>
    ),
  },
  'forum-usage': {
    title: '포럼 이용',
    body: (
      <>
        <ul>
          <li>게시글 읽기</li>
          <li>댓글 작성</li>
          <li>토론 참여</li>
        </ul>
        <ScreenCapture alt="포럼 메인 화면" filename="service-forum-main.png" />
      </>
    ),
  },
  'forum-write': {
    title: '게시글 작성',
    body: (
      <>
        <ul>
          <li>실무 경험 공유</li>
          <li>질문 작성</li>
          <li>정보 공유</li>
        </ul>
        <ScreenCapture alt="게시글 작성 화면" filename="service-forum-create.png" />
      </>
    ),
  },
  'forum-apply': {
    title: '포럼 개설 신청',
    body: (
      <>
        <ul>
          <li>포럼 개설 신청</li>
          <li>운영자 검토</li>
          <li>승인 후 개설</li>
        </ul>
        <ScreenCapture alt="포럼 개설 신청 화면" filename="service-forum-apply.png" />
      </>
    ),
  },
  'forum-approval': {
    title: '승인 구조',
    body: (
      <>
        <p>포럼 개설은 다음 절차를 따릅니다:</p>
        <ol>
          <li>사용자가 포럼 개설을 신청합니다.</li>
          <li>운영자가 내용을 검토합니다.</li>
          <li>승인 시 포럼이 활성화됩니다.</li>
          <li>반려 시 사유와 함께 안내됩니다.</li>
        </ol>
      </>
    ),
  },
  'course-attend': {
    title: '강좌 수강',
    body: (
      <>
        <ul>
          <li>강좌 목록 확인</li>
          <li>강좌 선택</li>
          <li>수강 진행</li>
        </ul>
        <ScreenCapture alt="강좌 목록 화면" filename="service-course-list.png" />
      </>
    ),
  },
  'course-apply': {
    title: '강좌 개설 신청',
    body: (
      <>
        <ul>
          <li>강좌 제안</li>
          <li>운영자 검토</li>
          <li>승인 후 개설</li>
        </ul>
        <ScreenCapture alt="강좌 개설 신청 화면" filename="service-course-apply.png" />
      </>
    ),
  },
  'course-approval': {
    title: '승인 구조',
    body: (
      <>
        <p>강좌 개설은 다음 절차를 따릅니다:</p>
        <ol>
          <li>사용자가 강좌 개설을 제안합니다.</li>
          <li>운영자가 내용을 검토합니다.</li>
          <li>승인 시 강좌가 활성화됩니다.</li>
          <li>반려 시 사유와 함께 안내됩니다.</li>
        </ol>
      </>
    ),
  },
  'content-production': {
    title: '생산',
    body: (
      <>
        <p>생산 직역 관련 콘텐츠입니다.</p>
        <ScreenCapture alt="생산 직역 콘텐츠 화면" filename="service-content-production.png" />
      </>
    ),
  },
  'content-distribution': {
    title: '유통',
    body: (
      <>
        <p>유통 직역 관련 콘텐츠입니다.</p>
        <ScreenCapture alt="유통 직역 콘텐츠 화면" filename="service-content-distribution.png" />
      </>
    ),
  },
  'content-employee': {
    title: '근무 약사',
    body: (
      <>
        <p>근무 약사 직역 관련 콘텐츠입니다.</p>
        <ScreenCapture alt="근무 약사 콘텐츠 화면" filename="service-content-employee.png" />
      </>
    ),
  },
  'content-student': {
    title: '약대생',
    body: (
      <>
        <p>약대생 직역 관련 콘텐츠입니다.</p>
        <ScreenCapture alt="약대생 콘텐츠 화면" filename="service-content-student.png" />
      </>
    ),
  },
};

// ─────────────────────────────────────────────
// Tree Icons (section-level)
// ─────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ReactNode> = {
  intro: <BookOpen size={16} />,
  forum: <MessageSquare size={16} />,
  course: <GraduationCap size={16} />,
  content: <Briefcase size={16} />,
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ManualServicePage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('intro-nature');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(TREE.map((t) => t.id))
  );
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileTreeOpen(false);
  };

  const activeContent = CONTENT[activeId];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/manual')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', borderRadius: '6px',
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#475569', fontSize: '13px', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> 매뉴얼 홈
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          서비스 안내
        </h1>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileTreeOpen(!mobileTreeOpen)}
        style={{
          display: 'none',
          width: '100%', padding: '10px 16px', marginBottom: '12px',
          borderRadius: '8px', border: '1px solid #e2e8f0',
          background: '#f8fafc', cursor: 'pointer',
          fontSize: '14px', color: '#334155', fontWeight: 500,
          alignItems: 'center', justifyContent: 'space-between',
        }}
        className="manual-mobile-toggle"
      >
        <span><Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />목차</span>
        <ChevronDown size={16} style={{ transform: mobileTreeOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {/* Layout: sidebar + content */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Sidebar Tree */}
        <nav
          className="manual-sidebar"
          style={{
            width: '240px', minWidth: '240px', flexShrink: 0,
            borderRadius: '10px', border: '1px solid #e2e8f0',
            background: '#fff', padding: '12px 0',
            position: 'sticky', top: '80px',
            ...(mobileTreeOpen ? {} : {}),
          }}
        >
          {TREE.map((section) => {
            const expanded = expandedSections.has(section.id);
            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '10px 16px', border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600, color: '#1e293b',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{SECTION_ICONS[section.id]}</span>
                  <span style={{ flex: 1 }}>{section.label}</span>
                  {expanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                </button>
                {expanded && section.children && (
                  <div>
                    {section.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleSelect(child.id)}
                        style={{
                          display: 'block', width: '100%',
                          padding: '8px 16px 8px 44px', border: 'none',
                          background: activeId === child.id ? '#eff6ff' : 'transparent',
                          color: activeId === child.id ? '#2563eb' : '#475569',
                          fontWeight: activeId === child.id ? 600 : 400,
                          fontSize: '13px', cursor: 'pointer',
                          textAlign: 'left', borderRadius: 0,
                          borderLeft: activeId === child.id ? '3px solid #2563eb' : '3px solid transparent',
                        }}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Content Area */}
        <main style={{
          flex: 1, minWidth: 0,
          borderRadius: '10px', border: '1px solid #e2e8f0',
          background: '#fff', padding: '32px',
        }}>
          {activeContent ? (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                {activeContent.title}
              </h2>
              <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155' }}>
                {activeContent.body}
              </div>
            </>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
              좌측 메뉴에서 항목을 선택하세요.
            </p>
          )}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .manual-mobile-toggle {
            display: flex !important;
          }
          .manual-sidebar {
            display: ${mobileTreeOpen ? 'block' : 'none'};
            width: 100% !important;
            min-width: 0 !important;
            position: static !important;
          }
          /* Stack layout on mobile */
          .manual-sidebar + main {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
