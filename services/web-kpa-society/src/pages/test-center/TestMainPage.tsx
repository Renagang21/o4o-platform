/**
 * TestMainPage - 메인 화면 트리 기반 테스트
 *
 * WO-KPA-A-TEST-CENTER-PHASE2-MAIN-TEST-PAGE-V1
 *
 * 실제 메인 화면(CommunityHomePage) 구조를 기준으로:
 * - 좌측: 섹션 트리 네비게이션
 * - 우측: 사용자 시선 테스트 문장
 *
 * 권한: 비로그인 접근 가능
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── Tree & Content Data ─── */

interface TreeItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface TestSection {
  id: string;
  title: string;
  situation: string;
  checkItems: string[];
  thinkItems: string[];
}

const TREE: TreeItem[] = [
  {
    id: 'nav',
    label: '상단 메뉴',
    children: [
      { id: 'nav-items', label: '메뉴 항목' },
      { id: 'nav-auth', label: '로그인/회원가입' },
    ],
  },
  {
    id: 'hero',
    label: '상단 배너',
  },
  {
    id: 'notice',
    label: '공지사항 & 뉴스',
    children: [
      { id: 'notice-list', label: '공지사항 목록' },
      { id: 'news-list', label: '뉴스 목록' },
    ],
  },
  {
    id: 'activity',
    label: '최근 활동',
    children: [
      { id: 'activity-forum', label: '최근 글' },
      { id: 'activity-featured', label: '추천 콘텐츠' },
    ],
  },
  {
    id: 'signage',
    label: '디지털 사이니지',
    children: [
      { id: 'signage-video', label: '동영상' },
      { id: 'signage-playlist', label: '플레이리스트' },
    ],
  },
  {
    id: 'service',
    label: '커뮤니티 & 서비스',
    children: [
      { id: 'service-forum', label: '약사 포럼' },
      { id: 'service-edu', label: '교육 / 강의' },
      { id: 'service-event', label: '이벤트' },
      { id: 'service-docs', label: '자료실' },
    ],
  },
  {
    id: 'utility',
    label: '하단 영역',
    children: [
      { id: 'utility-user', label: '사용자 패널' },
      { id: 'utility-links', label: '도움말 & 정책' },
    ],
  },
];

const SECTIONS: TestSection[] = [
  {
    id: 'nav',
    title: '상단 메뉴',
    situation: '화면 상단의 메뉴를 살펴보십시오. 처음 방문한 사람이 원하는 기능을 찾을 수 있는지 확인합니다.',
    checkItems: [
      '메뉴 이름만 보고 어떤 기능인지 이해되었습니까?',
      '원하는 기능을 찾기 위해 메뉴를 여러 번 살펴봐야 했습니까?',
      '"포럼", "강의", "콘텐츠" 등의 이름이 직관적입니까?',
    ],
    thinkItems: [
      '메뉴 항목 중 불필요하다고 느껴지는 것이 있습니까?',
      '빠져 있다고 느끼는 메뉴가 있습니까?',
      '로그인/회원가입 버튼이 쉽게 보입니까?',
    ],
  },
  {
    id: 'hero',
    title: '상단 배너',
    situation: '페이지 최상단의 배너 영역을 살펴보십시오. 이 공간이 서비스의 첫인상을 만듭니다.',
    checkItems: [
      '이 서비스가 무엇인지 한눈에 이해되었습니까?',
      '배너의 문구가 약사에게 와닿습니까?',
      '첫 화면을 보았을 때 전문적인 느낌이 듭니까?',
    ],
    thinkItems: [
      '배너 영역이 너무 크거나 작다고 느껴집니까?',
      '이 공간에 다른 정보가 있으면 더 좋겠습니까?',
      '전체적인 색상과 분위기가 적절합니까?',
    ],
  },
  {
    id: 'notice',
    title: '공지사항 & 뉴스',
    situation: '공지사항과 뉴스가 나란히 표시됩니다. 중요한 소식을 빠르게 확인할 수 있는지 살펴보십시오.',
    checkItems: [
      '공지사항과 뉴스의 구분이 명확합니까?',
      '제목만 보고 내용을 짐작할 수 있습니까?',
      '날짜 표시가 잘 보입니까?',
    ],
    thinkItems: [
      '공지사항 3건으로 충분합니까?',
      '"전체 보기" 링크를 자연스럽게 찾을 수 있었습니까?',
      '중요한 공지가 눈에 띄게 표시됩니까?',
    ],
  },
  {
    id: 'activity',
    title: '최근 활동',
    situation: '포럼에 올라온 최근 글과 추천 콘텐츠가 표시됩니다. 커뮤니티 활동이 활발하게 느껴지는지 확인합니다.',
    checkItems: [
      '최근 글 목록이 어떤 내용인지 파악됩니까?',
      '카테고리 표시가 이해됩니까?',
      '추천 콘텐츠의 의미가 명확합니까?',
    ],
    thinkItems: [
      '포럼 글을 클릭해서 읽어보고 싶은 마음이 드십니까?',
      '이 영역이 커뮤니티 활동을 독려하는 느낌이 듭니까?',
      '글의 작성자 정보가 적절히 표시되고 있습니까?',
    ],
  },
  {
    id: 'signage',
    title: '디지털 사이니지',
    situation: '약국에서 TV 화면에 표시할 수 있는 콘텐츠 영역입니다. 이 기능이 무엇인지 이해되는지 확인합니다.',
    checkItems: [
      '"디지털 사이니지"라는 이름을 보고 무엇인지 바로 이해되었습니까?',
      '동영상과 플레이리스트의 차이가 구분됩니까?',
      '이 기능이 약국 운영에 어떻게 쓰일지 상상됩니까?',
    ],
    thinkItems: [
      '실제 약국 TV에서 이 콘텐츠를 틀어보고 싶습니까?',
      '더 쉬운 이름으로 부르면 좋겠습니까? (예: 매장 TV, 약국 화면)',
      '이 영역이 메인 화면에 있는 것이 자연스럽습니까?',
    ],
  },
  {
    id: 'service',
    title: '커뮤니티 & 서비스',
    situation: '주요 서비스로 바로 이동할 수 있는 카드들이 표시됩니다. 각 서비스의 역할이 명확한지 확인합니다.',
    checkItems: [
      '4개 카드의 제목만 보고 각각의 기능을 이해할 수 있습니까?',
      '"이벤트" 카드는 어떤 내용일 것 같습니까?',
      '"자료실"에서 어떤 자료를 찾을 수 있을 것 같습니까?',
    ],
    thinkItems: [
      '이 중에서 가장 먼저 클릭해보고 싶은 카드는 무엇입니까?',
      '카드의 설명 문구가 도움이 됩니까?',
      '빠져 있다고 느끼는 서비스가 있습니까?',
    ],
  },
  {
    id: 'utility',
    title: '하단 영역',
    situation: '페이지 하단의 바로가기 및 정책 링크 영역입니다. 필요한 정보를 쉽게 찾을 수 있는지 확인합니다.',
    checkItems: [
      '로그인 후 사용자 패널에 표시되는 바로가기가 유용합니까?',
      '이용약관, 개인정보처리방침 링크를 찾을 수 있습니까?',
      '"내 활동 요약", "이수 현황" 같은 항목이 이해됩니까?',
    ],
    thinkItems: [
      '하단 영역까지 스크롤하여 내려오셨습니까?',
      '이 영역에 있으면 좋겠다고 생각하는 바로가기가 있습니까?',
      '전체적으로 페이지 길이가 적당합니까?',
    ],
  },
];

/* ─── Component ─── */

export default function TestMainPage() {
  const [activeSection, setActiveSection] = useState('nav');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setIsMobileSidebarOpen(false);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3 },
    );

    for (const section of SECTIONS) {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 바 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/test" className="text-sm text-slate-500 hover:text-slate-700 no-underline hidden sm:inline">
              {'<-'} 테스트 센터
            </Link>
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="sm:hidden px-2 py-1 text-sm text-slate-600 border border-slate-300 rounded"
            >
              {isMobileSidebarOpen ? '닫기' : '목차'}
            </button>
            <span className="text-base font-semibold text-slate-900">메인 화면 테스트</span>
          </div>
          <button
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            onClick={() => alert('테스트 결과 작성 기능은 준비 중입니다.')}
          >
            테스트 결과 작성하기
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* 좌측 사이드바 — desktop */}
        <nav className="hidden sm:block w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
          <SidebarContent
            activeSection={activeSection}
            onSelect={scrollToSection}
          />
        </nav>

        {/* 좌측 사이드바 — mobile overlay */}
        {isMobileSidebarOpen && (
          <div className="sm:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setIsMobileSidebarOpen(false)}>
            <nav
              className="absolute top-[57px] left-0 w-72 bg-white h-[calc(100vh-57px)] overflow-y-auto shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                activeSection={activeSection}
                onSelect={scrollToSection}
              />
            </nav>
          </div>
        )}

        {/* 우측 콘텐츠 */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 overflow-y-auto">
          {/* 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
            <p className="text-sm text-blue-900 leading-relaxed m-0">
              아래는 현재 메인 화면의 각 영역에 대한 테스트입니다.
              실제 메인 화면을 열어두고 비교하면서 진행하시면 더 좋습니다.
            </p>
          </div>

          {/* 섹션별 테스트 콘텐츠 */}
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="mb-10 scroll-mt-[72px]"
            >
              <SectionContent section={section} />
            </div>
          ))}

          {/* 완료 안내 */}
          <div className="text-center py-10 bg-emerald-50 border border-emerald-200 rounded-xl mb-8">
            <p className="text-base font-semibold text-emerald-800 mb-2">
              메인 화면 테스트를 모두 살펴보셨습니다
            </p>
            <p className="text-sm text-emerald-600 mb-4">
              위 질문들에 대한 생각을 정리하여 의견을 남겨주세요.
            </p>
            <button
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={() => alert('테스트 결과 작성 기능은 준비 중입니다.')}
            >
              테스트 결과 작성하기
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Sub Components ─── */

function SidebarContent({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="py-4">
      <div className="px-5 pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        메인 화면 구조
      </div>
      {TREE.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
              activeSection === item.id
                ? 'bg-blue-50 text-blue-700 font-semibold border-r-[3px] border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
          {item.children && (
            <div className="ml-5">
              {item.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onSelect(item.id)}
                  className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  {'- '}{child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionContent({ section }: { section: TestSection }) {
  return (
    <>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {SECTIONS.indexOf(section) + 1}
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">{section.title}</h2>
      </div>

      {/* 상황 안내 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-base flex-shrink-0">{'💬'}</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">상황 안내</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed m-0 pl-6">
          {section.situation}
        </p>
      </div>

      {/* 직접 확인해 보기 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-base flex-shrink-0">{'🔎'}</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">직접 확인해 보기</span>
        </div>
        <ul className="m-0 pl-6 space-y-2">
          {section.checkItems.map((item, i) => (
            <li key={i} className="text-sm text-slate-700 leading-relaxed">{item}</li>
          ))}
        </ul>
      </div>

      {/* 생각해 보기 */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-base flex-shrink-0">{'📌'}</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">생각해 보기</span>
        </div>
        <ul className="m-0 pl-6 space-y-2">
          {section.thinkItems.map((item, i) => (
            <li key={i} className="text-sm text-slate-600 leading-relaxed">{item}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
