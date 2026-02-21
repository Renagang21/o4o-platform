/**
 * TestHubPage - 약국 HUB 트리 기반 테스트
 *
 * WO-KPA-A-TEST-CENTER-PHASE3A-HUB-TEST-PAGE-V1
 * WO-KPA-A-TEST-CENTER-PHASE3B1-HUB-TEST-PAGE-V1
 * WO-KPA-A-TEST-CENTER-PHASE3B2-HUB-ADMIN-TEST-PAGE-V1
 *
 * 실제 HUB(HubPage) 구조를 기준으로:
 * - 좌측: 섹션 트리 네비게이션 (상위 + 하위)
 * - 우측: 사용자 시선 테스트 문장
 * - 관리자 전용 메뉴: 시각적 구분 + 하위 트리 확장
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
  isAdminSection?: boolean;
}

interface TestSection {
  id: string;
  title: string;
  situation: string;
  checkItems: string[];
  thinkItems: string[];
  isAdmin?: boolean;
}

/**
 * 실제 HUB 구조 기반 트리 (사용자 시선 명칭)
 *
 * 운영 관리: 포럼, 콘텐츠, 자료실, 가입요청, 강의, 공동구매, AI
 * 관리자 전용:
 *   - 조직 관리 (AdminDashboard 4-Block): 현황, 정책, 경고, 바로가기
 *   - 회원 관리 (Tabs): 회원 목록, 가입 신청
 *   - 포럼 구조 관리: 카테고리 요청, 직접 생성
 *   - 정책/약관 설정 (Tabs): 이용약관, 개인정보처리방침
 *   - 간사 관리: 간사 배정, 조직/범위별 필터
 *   - 감사 로그: 활동 기록, 유형/대상 필터
 */
const TREE: TreeItem[] = [
  {
    id: 'overview',
    label: 'HUB 첫 화면',
    children: [
      { id: 'overview-cards', label: '운영 카드 목록' },
      { id: 'overview-status', label: '상태 요약' },
    ],
  },
  {
    id: 'forum',
    label: '게시글 관리',
    children: [
      { id: 'forum-list', label: '요청 목록' },
      { id: 'forum-filter', label: '상태 필터' },
      { id: 'forum-action', label: '승인/반려 처리' },
    ],
  },
  {
    id: 'content',
    label: '콘텐츠·공지 관리',
    children: [
      { id: 'content-type', label: '콘텐츠 유형 구분' },
      { id: 'content-write', label: '작성/편집' },
      { id: 'content-status', label: '게시 상태 관리' },
    ],
  },
  {
    id: 'docs',
    label: '자료실',
    children: [
      { id: 'docs-category', label: '분류별 자료' },
      { id: 'docs-upload', label: '자료 등록' },
      { id: 'docs-download', label: '다운로드' },
    ],
  },
  {
    id: 'membership',
    label: '가입 요청·서비스 신청',
    children: [
      { id: 'membership-join', label: '가입 요청 목록' },
      { id: 'membership-review', label: '승인 처리' },
      { id: 'membership-service', label: '서비스 신청 관리' },
    ],
  },
  {
    id: 'education',
    label: '강의 관리',
    children: [
      { id: 'education-list', label: '강좌 목록' },
      { id: 'education-enroll', label: '수강 현황' },
      { id: 'education-cert', label: '수료 관리' },
    ],
  },
  {
    id: 'groupbuy',
    label: '공동구매',
    children: [
      { id: 'groupbuy-status', label: '진행 상태별 보기' },
      { id: 'groupbuy-detail', label: '상품 정보' },
      { id: 'groupbuy-history', label: '구매 이력' },
    ],
  },
  {
    id: 'ai',
    label: 'AI 리포트',
    children: [
      { id: 'ai-kpi', label: 'KPI 요약' },
      { id: 'ai-trend', label: '추세 분석' },
      { id: 'ai-quality', label: '품질 신호' },
    ],
  },
  // ─── 관리자 전용 영역 ───
  {
    id: 'admin-org',
    label: '조직 관리',
    isAdminSection: true,
    children: [
      { id: 'admin-org-snapshot', label: '현황 요약' },
      { id: 'admin-org-policy', label: '정책 개요' },
      { id: 'admin-org-actions', label: '바로가기 목록' },
    ],
  },
  {
    id: 'admin-members',
    label: '회원 관리',
    isAdminSection: true,
    children: [
      { id: 'admin-members-list', label: '회원 목록' },
      { id: 'admin-members-apply', label: '가입 신청 처리' },
      { id: 'admin-members-status', label: '상태 변경' },
    ],
  },
  {
    id: 'admin-forum-structure',
    label: '포럼 구조 관리',
    isAdminSection: true,
    children: [
      { id: 'admin-forum-requests', label: '게시판 요청' },
      { id: 'admin-forum-create', label: '게시판 생성' },
    ],
  },
  {
    id: 'admin-policy',
    label: '정책·약관 관리',
    isAdminSection: true,
    children: [
      { id: 'admin-policy-terms', label: '이용약관' },
      { id: 'admin-policy-privacy', label: '개인정보처리방침' },
    ],
  },
  {
    id: 'admin-stewards',
    label: '간사 관리',
    isAdminSection: true,
    children: [
      { id: 'admin-stewards-list', label: '간사 목록' },
      { id: 'admin-stewards-assign', label: '간사 배정' },
    ],
  },
  {
    id: 'admin-audit',
    label: '활동 기록',
    isAdminSection: true,
    children: [
      { id: 'admin-audit-log', label: '기록 목록' },
      { id: 'admin-audit-filter', label: '유형별 조회' },
    ],
  },
];

/* ─── 사용자 영역 섹션 ─── */

const OPERATOR_SECTIONS: TestSection[] = [
  {
    id: 'overview',
    title: 'HUB 첫 화면',
    situation:
      'HUB에 처음 들어왔다고 가정해 보십시오. 화면에 여러 메뉴 카드가 보이고, 상단에는 현재 운영 상태 요약이 표시됩니다.',
    checkItems: [
      '화면에 있는 카드들을 보고 각각 무슨 기능인지 바로 이해되었습니까?',
      '가장 먼저 눈에 들어온 카드는 무엇입니까?',
      '카드의 배치 순서가 자연스럽게 느껴집니까?',
      '상태 요약 영역(콘텐츠 수, 게시글 수 등)이 한눈에 파악됩니까?',
      '경고 표시(신호 배지)가 보인다면, 무엇을 의미하는지 이해됩니까?',
    ],
    thinkItems: [
      '이 화면에서 불필요하다고 느끼는 카드가 있습니까?',
      '빠져 있다고 느끼는 기능이 있습니까?',
      '카드가 너무 많다고 느끼십니까, 아니면 적절합니까?',
      '자주 사용할 기능이 앞에 배치되어 있습니까?',
    ],
  },
  {
    id: 'forum',
    title: '게시글 관리',
    situation:
      '커뮤니티에 올라온 게시글을 관리하는 메뉴입니다. 요청 목록이 있고 상태별로 필터링할 수 있으며, 각 요청에 대해 승인하거나 반려할 수 있습니다.',
    checkItems: [
      '"포럼 관리"라는 이름을 보고 어떤 기능인지 바로 이해되었습니까?',
      '요청 목록에서 어떤 요청이 대기 중인지 쉽게 구분됩니까?',
      '상태 필터(대기/승인/반려)를 찾기 쉬웠습니까?',
      '승인/반려 버튼이 직관적으로 배치되어 있습니까?',
    ],
    thinkItems: [
      '이 기능이 약국 운영에 실제로 필요합니까?',
      '"포럼 관리"보다 더 이해하기 쉬운 이름이 있을까요?',
      '한 번에 여러 요청을 처리할 수 있으면 좋겠습니까?',
      '요청자 정보가 충분히 표시됩니까?',
    ],
  },
  {
    id: 'content',
    title: '콘텐츠·공지 관리',
    situation:
      '공지사항과 뉴스 등 콘텐츠를 작성하고 관리합니다. "콘텐츠 관리"에서는 유형(공지/뉴스)과 상태(초안/게시/보관)로 필터링할 수 있고, "공지사항" 메뉴에서는 고정, 게시/비게시 설정이 가능합니다.',
    checkItems: [
      '"콘텐츠 관리"와 "공지사항" 메뉴가 따로 있는데, 차이가 명확합니까?',
      '공지사항을 작성하려면 어떤 메뉴를 눌러야 할지 바로 알겠습니까?',
      '초안과 게시됨의 구분이 명확합니까?',
      '공지사항 고정 기능이 직관적입니까?',
      '콘텐츠를 매장에 복사하는 기능을 찾을 수 있겠습니까?',
    ],
    thinkItems: [
      '두 메뉴가 하나로 합쳐져 있으면 더 편하겠습니까?',
      '"콘텐츠"라는 표현이 약사에게 자연스럽습니까?',
      '상태(초안/게시/보관) 구분이 필요하다고 느끼십니까?',
      '이 기능을 자주 사용할 것 같습니까?',
    ],
  },
  {
    id: 'docs',
    title: '자료실',
    situation:
      '약국 운영에 필요한 자료를 등록하고 관리합니다. 자료는 규정, 서식, 매뉴얼, 기타 자료로 분류되며, 파일을 업로드하고 다운로드 현황을 확인할 수 있습니다.',
    checkItems: [
      '"자료실"이라는 이름만 보고 어떤 곳인지 바로 이해되었습니까?',
      '분류(규정/서식/매뉴얼/자료)가 직관적으로 느껴집니까?',
      '자료를 찾을 때 검색 기능이 눈에 잘 보입니까?',
      '파일 크기와 다운로드 횟수가 유용한 정보입니까?',
    ],
    thinkItems: [
      '실제로 어떤 자료를 올리고 싶습니까?',
      '분류 항목이 적절합니까, 추가하거나 바꾸고 싶은 것이 있습니까?',
      '자료실의 위치(HUB 안에 있는 것)가 자연스럽습니까?',
      '다른 약사가 올린 자료를 보고 싶을 때 쉽게 찾을 수 있겠습니까?',
    ],
  },
  {
    id: 'membership',
    title: '가입 요청·서비스 신청',
    situation:
      '조직 가입 요청과 서비스 신청을 관리합니다. "가입 요청 관리"에서는 가입/역할 요청 목록이 페이지별로 표시되고, "서비스 신청 관리"에서는 서비스를 선택한 뒤 상태별(신청/승인/반려)로 필터링할 수 있습니다.',
    checkItems: [
      '"가입 요청 관리"와 "서비스 신청 관리"의 차이가 이해됩니까?',
      '요청 목록에서 어떤 요청이 대기 중인지 쉽게 구분됩니까?',
      '승인/반려 처리 흐름이 직관적입니까?',
      '서비스 선택 드롭다운이 이해됩니까?',
      '메모를 남길 수 있는 기능이 유용합니까?',
    ],
    thinkItems: [
      '두 메뉴가 하나로 합쳐져 있으면 더 편하겠습니까?',
      '이 기능을 자주 사용할 것 같습니까?',
      '요청이 많아졌을 때 관리가 편할 것 같습니까?',
      '메뉴 이름이 더 쉽게 바뀌면 좋겠습니까?',
    ],
  },
  {
    id: 'education',
    title: '강의 관리',
    situation:
      '교육 콘텐츠를 관리합니다. 강좌 목록이 카테고리와 수준(초급/중급/고급)으로 필터링되며, 각 강좌의 수강 현황과 수료 정보를 확인할 수 있습니다.',
    checkItems: [
      '"강의 관리"라는 이름을 보고 어떤 기능인지 이해되었습니까?',
      '강좌를 카테고리나 수준별로 찾기 쉽겠습니까?',
      '수강 현황을 확인하는 방법이 직관적입니까?',
      '수료증 관련 기능이 있다면 쉽게 찾을 수 있겠습니까?',
    ],
    thinkItems: [
      '실제로 이 기능을 통해 어떤 교육을 하고 싶습니까?',
      '약사 보수교육과 연결되면 유용하겠습니까?',
      '초급/중급/고급 구분이 적절합니까?',
      '이 기능이 없어도 문제가 없을 것 같습니까?',
    ],
  },
  {
    id: 'groupbuy',
    title: '공동구매',
    situation:
      '약국에서 필요한 물품을 함께 구매할 수 있습니다. 상태별(예정/진행/종료/취소) 탭으로 구분되며, 상품 정보와 할인율을 확인하고 구매 이력을 볼 수 있습니다.',
    checkItems: [
      '"공동구매"라는 이름을 보고 어떤 기능인지 바로 이해되었습니까?',
      '상태별 탭(예정/진행/종료)이 직관적입니까?',
      '상품의 원가, 공동구매가, 할인율이 명확히 표시됩니까?',
      '마감일이 쉽게 확인됩니까?',
      '구매 이력을 찾기 쉬웠습니까?',
    ],
    thinkItems: [
      '공동구매로 어떤 물품을 구매하고 싶습니까?',
      '이 기능이 HUB에 있는 것이 자연스럽습니까?',
      '공동구매 참여 약국이 많으면 유용하겠습니까?',
      '마감일 알림이 있으면 좋겠습니까?',
    ],
  },
  {
    id: 'ai',
    title: 'AI 리포트',
    situation:
      'AI가 약국 운영 데이터를 분석해서 보고서를 만들어줍니다. 기간(7일/30일/90일)을 선택하면 KPI 요약, 추세 그래프, 품질 신호를 볼 수 있습니다.',
    checkItems: [
      '"AI 리포트"라는 이름을 보고 어떤 기능인지 이해되었습니까?',
      'KPI 요약 숫자들이 무엇을 의미하는지 이해됩니까?',
      '추세 그래프를 보고 운영 상태를 판단할 수 있겠습니까?',
      '기간 선택(7일/30일/90일)이 적절합니까?',
      '품질 신호가 무엇을 알려주는지 이해됩니까?',
    ],
    thinkItems: [
      'AI 분석 보고서에서 어떤 정보를 가장 보고 싶습니까?',
      '이 기능이 실제 약국 운영에 도움이 될 것 같습니까?',
      '"AI 리포트"보다 더 와닿는 이름이 있을까요?',
      '보고서를 얼마나 자주 확인할 것 같습니까?',
    ],
  },
];

/* ─── 관리자 전용 섹션 ─── */

const ADMIN_SECTIONS: TestSection[] = [
  {
    id: 'admin-org',
    title: '조직 관리',
    isAdmin: true,
    situation:
      '조직의 전체 현황을 한눈에 보여주는 화면입니다. 분회 수, 회원 수, 승인 대기, 공동구매 현황 등이 요약되어 있고, 정책 개요와 미처리 항목 경고도 표시됩니다.',
    checkItems: [
      '이 화면에 들어왔을 때 가장 먼저 어떤 정보가 눈에 들어옵니까?',
      '숫자로 표시된 현황이 이해됩니까? (예: 분회 수, 회원 수)',
      '정책 개요가 어떤 의미인지 이해됩니까?',
      '미처리 항목 경고가 보인다면, 무엇을 해야 하는지 알겠습니까?',
      '하단의 바로가기 목록이 유용합니까?',
    ],
    thinkItems: [
      '이 화면은 일반 운영자에게도 보여야 할까요, 관리자만 봐야 할까요?',
      '표시되는 정보가 너무 많거나 적다고 느껴집니까?',
      '이 기능이 별도 페이지에 있으면 더 좋겠습니까?',
    ],
  },
  {
    id: 'admin-members',
    title: '회원 관리',
    isAdmin: true,
    situation:
      '회원 목록과 가입 신청을 탭으로 나눠서 관리합니다. 회원 목록에서는 상태(활성/정지/탈퇴/대기)별로 필터링하고 역할을 변경할 수 있습니다. 가입 신청 탭에서는 새로운 가입 요청을 승인하거나 반려합니다.',
    checkItems: [
      '회원 목록 탭과 가입 신청 탭의 구분이 명확합니까?',
      '회원 상태(활성/정지/탈퇴/대기)를 보고 바로 이해됩니까?',
      '회원의 역할을 변경하는 방법을 찾기 쉽겠습니까?',
      '가입 신청에 메모를 남기는 기능이 유용합니까?',
      '회원 검색이 편리하게 느껴집니까?',
    ],
    thinkItems: [
      '회원 관리가 일반 운영자에게도 필요한 기능일까요?',
      '회원 상태를 변경할 때 실수할 위험이 있어 보입니까?',
      '이 기능이 없어지면 문제가 될까요?',
    ],
  },
  {
    id: 'admin-forum-structure',
    title: '포럼 구조 관리',
    isAdmin: true,
    situation:
      '커뮤니티 게시판의 구조(카테고리)를 관리합니다. 게시판 생성 요청을 검토하거나, 직접 새 게시판을 만들 수 있습니다. 운영 영역의 "게시글 관리"와는 다른 기능입니다.',
    checkItems: [
      '"포럼 구조 관리"라는 이름을 보고 "게시글 관리"와의 차이를 알겠습니까?',
      '게시판 생성 요청을 검토하는 흐름이 이해됩니까?',
      '직접 게시판을 만드는 방법이 직관적입니까?',
      '생성 요청의 승인/반려 처리가 쉽게 느껴집니까?',
    ],
    thinkItems: [
      '"포럼 구조 관리"와 "게시글 관리"가 같은 곳에 있으면 더 편하겠습니까?',
      '이 기능은 반드시 관리자만 사용해야 할까요?',
      '게시판이 너무 많아지면 관리가 어려울 것 같습니까?',
    ],
  },
  {
    id: 'admin-policy',
    title: '정책·약관 관리',
    isAdmin: true,
    situation:
      '이용약관과 개인정보처리방침을 탭으로 나눠서 편집합니다. 각 탭에서 내용을 수정하고 저장할 수 있습니다.',
    checkItems: [
      '이용약관 탭과 개인정보처리방침 탭의 구분이 명확합니까?',
      '약관을 수정하는 방법이 직관적입니까?',
      '수정한 내용을 저장하는 버튼을 쉽게 찾을 수 있습니까?',
      '수정 전 미리보기가 가능하다면 유용하겠습니까?',
    ],
    thinkItems: [
      '약관을 수정할 일이 실제로 얼마나 자주 있을까요?',
      '이 기능이 HUB에 있는 것이 자연스럽습니까?',
      '약관 수정이 관리자만의 영역인 것이 적절합니까?',
    ],
  },
  {
    id: 'admin-stewards',
    title: '간사 관리',
    isAdmin: true,
    situation:
      '각 조직이나 기능 영역(포럼, 교육, 콘텐츠)에 간사를 배정합니다. 간사 목록을 조직별, 범위별로 필터링하고 새로운 간사를 지정할 수 있습니다.',
    checkItems: [
      '"간사 관리"라는 이름을 보고 어떤 기능인지 이해되었습니까?',
      '간사를 배정하는 흐름이 직관적입니까?',
      '조직별, 범위별 필터가 유용합니까?',
      '"간사"라는 표현이 자연스럽습니까?',
    ],
    thinkItems: [
      '이 기능을 자주 사용할 것 같습니까?',
      '"간사"보다 더 이해하기 쉬운 명칭이 있을까요?',
      '이 기능이 없어도 문제가 없을 것 같습니까?',
    ],
  },
  {
    id: 'admin-audit',
    title: '활동 기록',
    isAdmin: true,
    situation:
      '누가 어떤 작업을 했는지 기록이 남는 화면입니다. 회원 상태 변경, 역할 변경, 가입 심사, 콘텐츠 작성/수정/삭제 등의 활동이 시간순으로 표시됩니다.',
    checkItems: [
      '"감사 로그"라는 이름을 보고 어떤 기능인지 이해되었습니까?',
      '활동 기록에서 누가, 무엇을 했는지 쉽게 파악됩니까?',
      '유형별, 대상별 필터가 유용합니까?',
      '기록의 시간 표시가 적절합니까?',
    ],
    thinkItems: [
      '이 기록을 얼마나 자주 확인할 것 같습니까?',
      '"감사 로그"보다 "활동 기록"이 더 이해하기 쉽겠습니까?',
      '이 기능이 일반 운영자에게도 보이면 좋겠습니까?',
    ],
  },
];

const SECTIONS = [...OPERATOR_SECTIONS, ...ADMIN_SECTIONS];

/* ─── Component ─── */

export default function TestHubPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [expandedTree, setExpandedTree] = useState<Record<string, boolean>>({});

  const toggleTreeItem = (id: string) => {
    setExpandedTree((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSection = (id: string) => {
    const parentId = SECTIONS.find((s) => s.id === id)?.id ?? id;
    setActiveSection(parentId);
    setIsMobileSidebarOpen(false);
    const el = sectionRefs.current[parentId];
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
            <span className="text-base font-semibold text-slate-900">약국 HUB 테스트</span>
          </div>
          <button
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            onClick={() => window.open('https://neture.co.kr/forum/test-feedback', '_blank')}
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
            expandedTree={expandedTree}
            onSelect={scrollToSection}
            onToggle={toggleTreeItem}
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
                expandedTree={expandedTree}
                onSelect={scrollToSection}
                onToggle={toggleTreeItem}
              />
            </nav>
          </div>
        )}

        {/* 우측 콘텐츠 */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 overflow-y-auto">
          {/* 안내 */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-8">
            <p className="text-sm text-violet-900 leading-relaxed m-0">
              아래는 현재 약국 HUB의 각 메뉴에 대한 테스트입니다.
              실제 HUB 화면을 열어두고 비교하면서 진행하시면 더 좋습니다.
            </p>
          </div>

          {/* 운영 영역 섹션 */}
          {OPERATOR_SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="mb-10 scroll-mt-[72px]"
            >
              <SectionContent section={section} index={SECTIONS.indexOf(section)} />
            </div>
          ))}

          {/* 관리자 영역 구분 */}
          <div className="my-10 border-t-2 border-slate-300 pt-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-slate-700 text-white text-xs font-semibold rounded-full">
                관리자 영역
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              아래는 HUB에서 "관리자 전용"으로 분류된 메뉴에 대한 테스트입니다.
              이 메뉴들이 일반 운영 메뉴와 적절히 구분되어 있는지, 관리자에게만 필요한 기능인지 살펴보십시오.
            </p>
          </div>

          {/* 관리자 영역 섹션 */}
          {ADMIN_SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="mb-10 scroll-mt-[72px]"
            >
              <SectionContent section={section} index={SECTIONS.indexOf(section)} />
            </div>
          ))}

          {/* 완료 안내 */}
          <div className="text-center py-10 bg-violet-50 border border-violet-200 rounded-xl mb-8">
            <p className="text-base font-semibold text-violet-800 mb-2">
              약국 HUB 테스트를 모두 살펴보셨습니다
            </p>
            <p className="text-sm text-violet-600 mb-4">
              위 질문들에 대한 생각을 정리하여 의견을 남겨주세요.
            </p>
            <button
              className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
              onClick={() => window.open('https://neture.co.kr/forum/test-feedback', '_blank')}
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
  expandedTree,
  onSelect,
  onToggle,
}: {
  activeSection: string;
  expandedTree: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const operatorItems = TREE.filter((t) => !t.isAdminSection);
  const adminItems = TREE.filter((t) => t.isAdminSection);

  return (
    <div className="py-4">
      <div className="px-5 pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        약국 HUB 구조
      </div>
      {operatorItems.map((item) => (
        <TreeItemButton
          key={item.id}
          item={item}
          activeSection={activeSection}
          expandedTree={expandedTree}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}

      {/* 관리자 영역 구분 */}
      <div className="mx-4 my-3 border-t border-slate-200" />
      <div className="px-5 pb-2 pt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px]">Admin</span>
        관리자 영역
      </div>
      {adminItems.map((item) => (
        <TreeItemButton
          key={item.id}
          item={item}
          activeSection={activeSection}
          expandedTree={expandedTree}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function TreeItemButton({
  item,
  activeSection,
  expandedTree,
  onSelect,
  onToggle,
}: {
  item: TreeItem;
  activeSection: string;
  expandedTree: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isActive = activeSection === item.id;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedTree[item.id] ?? isActive;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(item.id);
          if (hasChildren) onToggle(item.id);
        }}
        className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center gap-1.5 ${
          isActive
            ? 'bg-violet-50 text-violet-700 font-semibold border-r-[3px] border-violet-600'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        {hasChildren && (
          <span className="text-[10px] text-slate-400 w-3 flex-shrink-0">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-3 flex-shrink-0" />}
        {item.label}
      </button>
      {hasChildren && isExpanded && (
        <div className="ml-5 border-l border-slate-100">
          {item.children!.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect(item.id)}
              className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionContent({ section, index }: { section: TestSection; index: number }) {
  return (
    <>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 ${
          section.isAdmin ? 'bg-slate-700' : 'bg-violet-600'
        }`}>
          {index + 1}
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">{section.title}</h2>
        {section.isAdmin && (
          <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-semibold rounded">
            Admin
          </span>
        )}
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
