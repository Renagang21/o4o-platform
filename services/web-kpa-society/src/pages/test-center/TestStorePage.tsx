/**
 * TestStorePage - 약국 매장관리 트리 기반 테스트
 *
 * WO-KPA-A-TEST-CENTER-PHASE5-STORE-STRUCTURE-EXPANSION-V1
 *
 * 실제 매장관리(Pharmacy) 라우트 16개 기준으로 확장:
 * - 좌측: depth 3 까지 반영하는 트리 네비게이션
 * - 우측: 고객 관점 + 사장 시선 테스트 문장
 *
 * 운영 영역 (11개 섹션):
 *   대시보드, 매장 설정, 콘텐츠/자산 관리, B2B 관리,
 *   B2C 판매 관리, 서비스 관리, 템플릿 관리, 레이아웃 빌더,
 *   승인 신청, 태블릿 관리, 블로그 관리
 *
 * 고객 화면 (3개 섹션):
 *   매장 홈, 블로그 목록, 매장 내 태블릿 화면
 *
 * 핵심 관점: "고객이 보는 화면을 관리하는 사장 시선"
 * 권한: 비로그인 접근 가능
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── Tree & Content Data ─── */

interface TreeChild {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface TreeItem {
  id: string;
  label: string;
  children?: TreeChild[];
  isPublicSection?: boolean;
}

interface TestSection {
  id: string;
  title: string;
  situation: string;
  checkItems: string[];
  thinkItems: string[];
  isPublic?: boolean;
}

/**
 * 실제 매장관리(Pharmacy) 라우트 16개 기준 트리
 *
 * 운영 영역 (11):
 *   /pharmacy/dashboard, /pharmacy/settings, /pharmacy/assets,
 *   /pharmacy/sales/b2b, /pharmacy/sales/b2c, /pharmacy/services,
 *   /pharmacy/template, /pharmacy/layout-builder, /pharmacy/approval,
 *   /pharmacy/tablet-requests, /pharmacy/blog + /pharmacy/kpa-blog
 *
 * 고객 화면 (3):
 *   /store/:slug, /store/:slug/blog, /tablet/:slug
 */
const TREE: TreeItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    children: [
      { id: 'dashboard-kpi', label: '매출 요약' },
      { id: 'dashboard-signals', label: '상태 요약' },
      { id: 'dashboard-quick', label: '빠른 이동' },
    ],
  },
  {
    id: 'settings',
    label: '매장 설정',
    children: [
      { id: 'settings-info', label: '기본 정보' },
      { id: 'settings-hours', label: '운영 시간' },
      { id: 'settings-edit', label: '약국 정보 수정' },
    ],
  },
  {
    id: 'assets',
    label: '콘텐츠/자산 관리',
    children: [
      { id: 'assets-list', label: '콘텐츠 목록' },
      {
        id: 'assets-edit',
        label: '콘텐츠 편집',
        children: [{ id: 'assets-edit-detail', label: '개별 콘텐츠 수정' }],
      },
      { id: 'assets-exposure', label: '노출 관리' },
    ],
  },
  {
    id: 'b2b',
    label: 'B2B 관리',
    children: [
      { id: 'b2b-suppliers', label: '공급업체 목록' },
      {
        id: 'b2b-supplier-detail',
        label: '공급업체 상세',
        children: [{ id: 'b2b-supplier-products', label: '공급 상품 목록' }],
      },
      { id: 'b2b-orders', label: '주문 관리' },
    ],
  },
  {
    id: 'b2c',
    label: 'B2C 판매 관리',
    children: [
      { id: 'b2c-products', label: '판매 상품' },
      { id: 'b2c-history', label: '판매 내역' },
    ],
  },
  {
    id: 'services',
    label: '서비스 관리',
    children: [
      { id: 'services-list', label: '가입 서비스 목록' },
      { id: 'services-apply', label: '신청 관리' },
      { id: 'services-status', label: '승인 상태' },
    ],
  },
  {
    id: 'template',
    label: '템플릿 관리',
    children: [
      { id: 'template-select', label: '템플릿 선택' },
      { id: 'template-preview', label: '미리보기' },
    ],
  },
  {
    id: 'layout-builder',
    label: '레이아웃 빌더',
    children: [
      { id: 'layout-blocks', label: '블록 배치' },
      { id: 'layout-save', label: '저장/적용' },
    ],
  },
  {
    id: 'approval',
    label: '승인 신청',
    children: [
      { id: 'approval-status', label: '신청 상태' },
      { id: 'approval-retry', label: '재신청' },
    ],
  },
  {
    id: 'tablet-mgmt',
    label: '태블릿 관리',
    children: [
      { id: 'tablet-requests', label: '태블릿 요청' },
      { id: 'tablet-orders', label: '주문 내역' },
    ],
  },
  {
    id: 'blog',
    label: '블로그 관리',
    children: [
      { id: 'blog-general', label: '일반 블로그' },
      { id: 'blog-kpa', label: 'KPA 블로그' },
      { id: 'blog-write', label: '게시글 작성' },
    ],
  },
  // ─── 고객 화면 영역 ───
  {
    id: 'storefront',
    label: '매장 홈',
    isPublicSection: true,
    children: [
      { id: 'storefront-layout', label: '화면 구성' },
      { id: 'storefront-products', label: '상품 표시' },
      { id: 'storefront-info', label: '약국 소개' },
    ],
  },
  {
    id: 'public-blog',
    label: '블로그 목록',
    isPublicSection: true,
    children: [
      {
        id: 'public-blog-list',
        label: '글 목록',
        children: [{ id: 'public-blog-detail', label: '블로그 상세' }],
      },
    ],
  },
  {
    id: 'kiosk',
    label: '매장 내 태블릿 화면',
    isPublicSection: true,
    children: [
      { id: 'kiosk-browse', label: '상품 탐색' },
      { id: 'kiosk-order', label: '주문 요청' },
      { id: 'kiosk-confirm', label: '주문 확인' },
    ],
  },
];

/* ─── 운영 영역 섹션 (사장 시선) ─── */

const OPERATOR_SECTIONS: TestSection[] = [
  {
    id: 'dashboard',
    title: '대시보드',
    situation:
      '매장관리에 처음 들어오면 보이는 화면입니다. 현재 매장의 채널 수, 상품 수, 콘텐츠 수 등이 숫자로 요약되어 있고, 운영 신호(알림/경고)가 표시됩니다. B2B/B2C 현황이 구분되어 있고, 노출 상태(홈/사이니지/프로모션)가 카드로 보이며, 자주 쓰는 기능 바로가기가 있습니다.',
    checkItems: [
      '화면에 표시된 숫자들(채널 수, 상품 수, 콘텐츠 수)이 한눈에 파악됩니까?',
      '알림이나 경고 표시가 보인다면, 무엇을 해야 하는지 이해됩니까?',
      '바로가기 버튼들의 이름을 보고 어떤 기능인지 알겠습니까?',
      'B2B(도매)와 B2C(소매) 현황이 구분되어 표시되는 것이 유용합니까?',
      '노출 상태 카드(홈 게시, 사이니지 게시, 프로모션 게시)가 이해됩니까?',
      '이 화면만으로 매장 상태를 파악할 수 있겠습니까?',
    ],
    thinkItems: [
      '이 화면에서 가장 먼저 확인하고 싶은 정보는 무엇입니까?',
      '표시된 항목 중 불필요하다고 느끼는 것이 있습니까?',
      '빠져 있다고 느끼는 정보가 있습니까?',
      '매일 이 화면을 확인할 의향이 있습니까?',
    ],
  },
  {
    id: 'settings',
    title: '매장 설정',
    situation:
      '고객에게 보여줄 매장 화면의 기본 설정을 관리합니다. 매장 이름과 기본 정보, 운영 시간, 장치 채널(B2C 몰/태블릿/키오스크)을 확인할 수 있습니다. 화면에 표시할 구성 요소(배너, 카테고리, 추천상품 등) 8가지를 켜거나 끌 수 있고, 디자인 테마와 색상을 선택할 수 있습니다. 오른쪽에는 변경 결과를 장치별로 미리 볼 수 있습니다.',
    checkItems: [
      '매장 기본 정보(이름, 주소 등)를 수정하는 방법이 직관적입니까?',
      '운영 시간 설정이 쉽게 이해됩니까?',
      '장치 채널(B2C 몰, 태블릿, 키오스크) 카드를 보고 역할이 이해됩니까?',
      '화면 구성 요소 8개의 켜기/끄기가 직관적입니까?',
      '필수 항목과 선택 항목의 구분이 명확합니까?',
      '디자인 테마(표준/컴팩트/비주얼/미니멀)를 보고 차이가 상상됩니까?',
      '색상 선택(기본/따뜻한/자연/우아한/모던/부드러운)이 직관적입니까?',
      '오른쪽 미리보기에서 변경 결과가 바로 반영됩니까?',
    ],
    thinkItems: [
      '설정을 변경하기 부담스럽지 않습니까?',
      '미리보기가 실제 고객 화면과 비슷할 것 같습니까?',
      '디자인 선택지가 충분합니까, 아니면 너무 많습니까?',
      '이 설정을 혼자서 할 수 있겠습니까?',
    ],
  },
  {
    id: 'assets',
    title: '콘텐츠/자산 관리',
    situation:
      '매장에 노출할 콘텐츠(CMS 공지, 사이니지 등)를 통합 관리합니다. 상단에 노출 현황 카드 4개(홈 게시/사이니지 게시/프로모션 게시/강제노출)가 있고, 전체/CMS 콘텐츠/사이니지 탭으로 분류됩니다. 상태(초안/게시/숨김/강제), 채널(홈/사이니지/프로모션)별 필터와 정렬 기능이 있습니다. 각 콘텐츠의 게시 상태를 변경하거나 편집할 수 있고, 강제 노출 항목에는 만료일이 표시됩니다.',
    checkItems: [
      '노출 현황 카드 4개(홈 게시, 사이니지 게시, 프로모션 게시, 강제노출)가 이해됩니까?',
      '전체/CMS 콘텐츠/사이니지 탭 분류가 직관적입니까?',
      '상태 필터(초안/게시/숨김/강제)로 원하는 콘텐츠를 쉽게 찾을 수 있겠습니까?',
      '콘텐츠의 게시 상태를 변경하는 방법이 직관적입니까?',
      '강제 노출 항목과 일반 항목의 구분이 명확합니까?',
      '만료 임박 경고가 보인다면, 무엇을 해야 하는지 알겠습니까?',
      '개별 콘텐츠 편집 화면에서 수정 후 저장/취소가 명확합니까?',
    ],
    thinkItems: [
      '"자산"이라는 표현이 이해되십니까?',
      '이 기능이 고객 화면 관리에 도움이 될 것 같습니까?',
      '강제 노출 기능이 필요하다고 느끼십니까?',
      '관리할 콘텐츠가 많아지면 복잡해질 것 같습니까?',
    ],
  },
  {
    id: 'b2b',
    title: 'B2B 관리',
    situation:
      '도매 구매를 관리하는 화면입니다. 서비스별(의약품/건강식품/용품) 공급업체 카드가 있고, 공동구매 현황(참여율/최소수량/마감일)이 표시됩니다. 전체 공급업체 목록에서 검색·필터를 사용해 찾을 수 있으며, 각 공급업체를 선택하면 상세 정보와 공급 상품 목록을 볼 수 있습니다. 시장 동향 정보도 확인할 수 있습니다.',
    checkItems: [
      '서비스별(의약품/건강식품/용품) 구분이 이해됩니까?',
      '공급업체 카드를 보고 어떤 업체인지 파악됩니까?',
      '공동구매 현황(참여율, 최소수량, 마감일)이 직관적입니까?',
      '공급업체 상세에서 상품 목록을 쉽게 확인할 수 있습니까?',
      '검색/필터로 원하는 공급업체를 빠르게 찾을 수 있겠습니까?',
      '시장 동향 정보가 도움이 됩니까?',
    ],
    thinkItems: [
      'B2B(도매)라는 표현이 자연스럽습니까?',
      '공동구매 기능을 실제로 사용할 것 같습니까?',
      '공급업체가 많아지면 관리하기 어려울 것 같습니까?',
      '이 화면에서 실제 발주를 하겠습니까?',
    ],
  },
  {
    id: 'b2c',
    title: 'B2C 판매 관리',
    situation:
      '소매 판매를 관리하는 화면입니다. 두 개 탭으로 나뉩니다. "판매 신청" 탭에서는 신규 상품을 등록하고 심사 상태(대기/승인/거절)를 확인합니다. "매장 진열" 탭에서는 승인된 상품의 활성/비활성을 전환하고, 채널별(웹/태블릿/키오스크/사이니지) 노출 설정을 합니다. 상품별 수량 제한도 설정할 수 있습니다.',
    checkItems: [
      '판매 신청 → 심사 → 승인 흐름이 직관적입니까?',
      '심사 상태(대기/승인/거절) 구분이 명확합니까?',
      '진열 상품의 활성/비활성 전환이 쉽게 느껴집니까?',
      '채널별(웹/태블릿/키오스크/사이니지) 노출 설정이 이해됩니까?',
      '상품별 판매 수량 제한을 설정하는 방법을 찾을 수 있겠습니까?',
    ],
    thinkItems: [
      'B2C(소매)라는 표현이 자연스럽습니까?',
      '채널별 노출 설정이 너무 복잡하다고 느끼십니까?',
      '실제로 어떤 상품을 판매하고 싶습니까?',
      '판매 관리가 부담스럽지 않겠습니까?',
    ],
  },
  {
    id: 'services',
    title: '서비스 관리',
    situation:
      '약국이 가입하여 이용 중인 서비스 목록을 관리합니다. 현재 이용 중인 서비스와 신청 가능한 서비스가 표시되며, 각 서비스의 상태(활성/비활성/신청중)를 확인할 수 있습니다. 신규 서비스를 신청하거나, 기존 서비스의 설정을 변경할 수 있습니다.',
    checkItems: [
      '"서비스 관리"라는 이름을 보고 어떤 기능인지 이해되었습니까?',
      '현재 이용 중인 서비스와 신청 가능한 서비스 구분이 명확합니까?',
      '서비스 상태(활성/비활성/신청중) 표시가 직관적입니까?',
      '신규 서비스 신청 방법을 찾을 수 있겠습니까?',
      '승인 상태를 확인하는 곳을 쉽게 찾을 수 있습니까?',
    ],
    thinkItems: [
      '이 화면이 왜 필요한지 이해가 됩니까?',
      '"서비스"라는 개념이 직관적입니까?',
      '서비스 관리를 자주 사용할 것 같습니까?',
      '서비스 종류가 많아지면 복잡해질 것 같습니까?',
    ],
  },
  {
    id: 'template',
    title: '템플릿 관리',
    situation:
      '고객에게 보여줄 매장 화면의 전체 틀을 선택합니다. 4가지 템플릿(기본형/판매중심/콘텐츠중심/미니멀)이 카드로 표시되며, 각 템플릿마다 특징 설명과 포함되는 블록 구성이 안내됩니다. 현재 선택된 템플릿이 표시되고, 변경 후 저장할 수 있습니다.',
    checkItems: [
      '4가지 템플릿의 차이를 이해할 수 있습니까?',
      '각 템플릿의 특징 설명이 충분합니까?',
      '현재 선택된 템플릿이 어느 것인지 명확합니까?',
      '템플릿 변경이 고객 화면에 어떤 영향을 미칠지 예상됩니까?',
    ],
    thinkItems: [
      '4가지 선택지가 충분합니까, 부족합니까?',
      '템플릿을 직접 선택하는 것이 편합니까, 추천받는 것이 나을까요?',
      '변경 전 미리보기가 필요하다고 느끼십니까?',
      '이 기능을 자주 사용할 것 같습니까?',
    ],
  },
  {
    id: 'layout-builder',
    title: '레이아웃 빌더',
    situation:
      '매장 화면을 구성하는 블록들의 순서와 설정을 관리합니다. 각 블록(배너, 상품 그리드, 블로그 미리보기 등)을 위/아래로 이동하거나, 켜기/끄기를 전환하고, 블록별 상세 설정(예: 상품 표시 개수)을 조정할 수 있습니다. 변경 후 저장/취소 버튼으로 적용합니다.',
    checkItems: [
      '블록 목록에서 각 블록의 역할을 이해할 수 있습니까?',
      '블록 순서를 바꾸는 방법(위/아래 버튼)이 직관적입니까?',
      '블록의 켜기/끄기 전환이 쉽게 느껴집니까?',
      '블록별 상세 설정(상품 개수 등)을 찾을 수 있겠습니까?',
      '저장/취소 버튼이 명확합니까?',
    ],
    thinkItems: [
      '"레이아웃 빌더"라는 이름이 직관적입니까?',
      '이 기능을 혼자서 사용할 수 있겠습니까?',
      '블록을 드래그해서 이동하는 것이 더 편할 것 같습니까?',
      '변경 결과를 미리 볼 수 있으면 좋겠습니까?',
    ],
  },
  {
    id: 'approval',
    title: '승인 신청',
    situation:
      '약국 서비스를 처음 시작하거나, 변경 사항이 있을 때 승인을 요청하는 화면입니다. 현재 승인 상태(대기/승인/반려)가 표시되며, 반려된 경우 사유를 확인하고 수정 후 재신청할 수 있습니다.',
    checkItems: [
      '현재 승인 상태가 한눈에 파악됩니까?',
      '승인이 대기 중일 때 기다려야 한다는 것이 명확합니까?',
      '반려 사유를 확인하는 방법이 직관적입니까?',
      '재신청 버튼을 쉽게 찾을 수 있습니까?',
    ],
    thinkItems: [
      '승인 과정이 너무 복잡하지 않습니까?',
      '승인에 얼마나 걸릴지 안내가 있으면 좋겠습니까?',
      '승인/반려 결과를 알림으로 받을 수 있으면 좋겠습니까?',
      '이 화면을 자주 방문할 것 같습니까?',
    ],
  },
  {
    id: 'tablet-mgmt',
    title: '태블릿 관리',
    situation:
      '매장 안에 설치된 태블릿에서 들어오는 고객 주문 요청을 실시간으로 관리합니다. 신규 요청이 카드로 표시되고(상품명, 고객명, 경과시간), 확인/처리/취소 버튼으로 응대합니다. 별도 태블릿 기기 신청 및 주문 내역도 확인할 수 있습니다.',
    checkItems: [
      '새로운 주문 요청이 들어왔을 때 바로 알아챌 수 있습니까?',
      '요청 카드의 정보(상품, 고객, 시간)가 충분합니까?',
      '확인/처리/취소 버튼이 직관적입니까?',
      '태블릿 기기 신청 방법을 찾을 수 있겠습니까?',
      '과거 주문 내역을 확인하기 쉽습니까?',
    ],
    thinkItems: [
      '실시간 알림이 업무에 방해가 되지 않겠습니까?',
      '태블릿 주문이 실제 약국 운영에 도움이 되겠습니까?',
      '동시에 여러 요청이 들어오면 관리할 수 있겠습니까?',
      '이 기능이 없어도 문제가 없을 것 같습니까?',
    ],
  },
  {
    id: 'blog',
    title: '블로그 관리',
    situation:
      '매장 블로그에 올릴 글을 작성하고 관리합니다. 두 종류의 블로그가 있습니다: 일반 블로그(약국 자체 소식)와 KPA 블로그(약사회 관련 소식). 각 블로그에서 초안/게시/보관 상태로 관리하며, 제목/본문/요약/슬러그를 입력하고 게시합니다.',
    checkItems: [
      '일반 블로그와 KPA 블로그의 차이를 이해할 수 있습니까?',
      '블로그 글 목록에서 상태(초안/게시/보관) 필터가 직관적입니까?',
      '글 작성 화면에서 입력할 항목들(제목, 본문, 요약)이 명확합니까?',
      '작성한 글이 고객에게 어떻게 보일지 미리 알 수 있겠습니까?',
      'KPA 블로그가 별도로 있는 이유가 이해됩니까?',
    ],
    thinkItems: [
      '실제로 약국 블로그에 어떤 글을 쓰고 싶습니까?',
      '두 종류의 블로그가 필요합니까, 하나로 합쳐도 될까요?',
      '이 기능을 자주 사용할 것 같습니까?',
      '블로그가 약국 운영에 도움이 될 것 같습니까?',
    ],
  },
];

/* ─── 고객 화면 섹션 (고객 시선) ─── */

const PUBLIC_SECTIONS: TestSection[] = [
  {
    id: 'storefront',
    title: '매장 홈 화면',
    isPublic: true,
    situation:
      '고객이 온라인에서 약국을 방문했을 때 처음 보는 화면입니다. 블록 기반으로 구성되어 있어, 사장님이 설정한 배너, 상품 목록, 추천 상품, 블로그 미리보기, 약국 소개 등이 순서대로 표시됩니다. 이 화면이 고객에게 어떤 인상을 줄지 살펴보십시오.',
    checkItems: [
      '이 화면을 처음 본 고객이 "이 약국에서 무엇을 할 수 있는지" 바로 이해하겠습니까?',
      '블록 구성(배너, 상품, 블로그, 소개)의 순서가 자연스럽습니까?',
      '상품이 보기 좋게 배치되어 있습니까?',
      '약국 소개 정보(위치, 연락처, 영업시간)를 쉽게 찾을 수 있습니까?',
      '전체적인 디자인이 신뢰감을 줍니까?',
      '모바일/태블릿에서도 보기 좋게 표시됩니까?',
    ],
    thinkItems: [
      '이 화면을 보고 실제로 상품을 구매하고 싶은 마음이 드십니까?',
      '고객이 혼란을 느낄 만한 요소가 있습니까?',
      '이 매장 화면을 고객에게 자신 있게 보여줄 수 있겠습니까?',
      '화면 구성이 너무 복잡하거나 너무 단순합니까?',
    ],
  },
  {
    id: 'public-blog',
    title: '매장 블로그',
    isPublic: true,
    situation:
      '고객이 약국 블로그를 방문한 화면입니다. 약사가 작성한 건강 정보, 약국 소식 등의 글이 카드 형태로 목록에 표시됩니다. 제목, 요약, 날짜, 썸네일이 보이고, 클릭하면 전체 내용이 표시됩니다. 페이지 하단에 페이지 이동 기능이 있습니다.',
    checkItems: [
      '블로그 글 목록이 깔끔하게 보입니까?',
      '글 제목과 요약만 보고 읽어볼 만한 글인지 판단됩니까?',
      '글 상세 화면에서 내용이 읽기 편합니까?',
      '다른 글로 이동하는 방법이 명확합니까?',
      '약국 블로그라는 느낌이 전달됩니까?',
    ],
    thinkItems: [
      '고객이 이 블로그를 보고 약국에 대한 신뢰가 높아지겠습니까?',
      '어떤 주제의 글이 고객에게 도움이 될 것 같습니까?',
      '블로그가 약국 매출에 도움이 될 것 같습니까?',
      '이 기능을 유지 관리할 여력이 있겠습니까?',
    ],
  },
  {
    id: 'kiosk',
    title: '매장 내 태블릿 화면',
    isPublic: true,
    situation:
      '매장 안에 설치된 태블릿(키오스크)에서 고객이 직접 사용하는 화면입니다. 전체 화면으로 표시되며, 상품을 탐색하고 장바구니에 담은 뒤 이름과 요청사항을 입력하여 주문합니다. 주문 후 접수 상태가 실시간으로 표시되고, 2분간 사용하지 않으면 자동으로 초기화됩니다.',
    checkItems: [
      '태블릿 화면이 고객 혼자서 사용할 수 있을 만큼 쉬워 보입니까?',
      '상품을 찾고 장바구니에 담는 과정이 직관적입니까?',
      '수량 조절(+/−)이 편리합니까?',
      '주문 후 접수 상태 표시가 명확합니까?',
      '버튼 크기가 손가락으로 누르기에 적절합니까?',
      '고령의 고객도 사용할 수 있을 것 같습니까?',
    ],
    thinkItems: [
      '실제 약국에 이런 태블릿을 놓으면 고객이 사용할 것 같습니까?',
      '2분 자동 초기화가 적절합니까?',
      '태블릿 주문이 약국 운영에 도움이 되겠습니까?',
      '이 기능이 없어도 문제가 없을 것 같습니까?',
    ],
  },
];

const SECTIONS = [...OPERATOR_SECTIONS, ...PUBLIC_SECTIONS];

/* ─── Component ─── */

export default function TestStorePage() {
  const [activeSection, setActiveSection] = useState('dashboard');
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
            <span className="text-base font-semibold text-slate-900">약국 매장관리 테스트</span>
          </div>
          <button
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
            <p className="text-sm text-emerald-900 leading-relaxed m-0">
              아래는 현재 약국 매장관리의 각 메뉴에 대한 테스트입니다.
              실제 매장관리 화면을 열어두고 비교하면서 진행하시면 더 좋습니다.
              고객에게 보여줄 화면을 관리한다는 관점으로 살펴보십시오.
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

          {/* 고객 화면 영역 구분 */}
          <div className="my-10 border-t-2 border-emerald-300 pt-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-700 text-white text-xs font-semibold rounded-full">
                고객 화면
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              아래는 고객이 실제로 보게 되는 화면에 대한 테스트입니다.
              고객 입장에서 이 화면이 신뢰감을 주는지, 사용하기 쉬운지 살펴보십시오.
            </p>
          </div>

          {/* 고객 화면 섹션 */}
          {PUBLIC_SECTIONS.map((section) => (
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
          <div className="text-center py-10 bg-emerald-50 border border-emerald-200 rounded-xl mb-8">
            <p className="text-base font-semibold text-emerald-800 mb-2">
              약국 매장관리 테스트를 모두 살펴보셨습니다
            </p>
            <p className="text-sm text-emerald-600 mb-4">
              위 질문들에 대한 생각을 정리하여 의견을 남겨주세요.
            </p>
            <button
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
  const operatorItems = TREE.filter((t) => !t.isPublicSection);
  const publicItems = TREE.filter((t) => t.isPublicSection);

  return (
    <div className="py-4">
      <div className="px-5 pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        약국 매장관리
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

      {/* 고객 화면 영역 구분 */}
      <div className="mx-4 my-3 border-t border-slate-200" />
      <div className="px-5 pb-2 pt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px]">Public</span>
        고객이 보는 화면
      </div>
      {publicItems.map((item) => (
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
          isActive ? 'font-semibold border-r-[3px]' : 'text-slate-600 hover:bg-slate-50'
        }`}
        style={isActive ? { backgroundColor: '#ecfdf5', color: '#047857', borderRightColor: '#059669' } : undefined}
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
            <div key={child.id}>
              <button
                onClick={() => onSelect(item.id)}
                className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {child.children ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-300">{'▸'}</span>
                    {child.label}
                  </span>
                ) : (
                  child.label
                )}
              </button>
              {/* depth 3 */}
              {child.children && (
                <div className="ml-4 border-l border-slate-50">
                  {child.children.map((grandchild) => (
                    <button
                      key={grandchild.id}
                      onClick={() => onSelect(item.id)}
                      className="w-full text-left px-4 py-1 text-[11px] text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {grandchild.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          section.isPublic ? 'bg-emerald-700' : 'bg-emerald-600'
        }`}>
          {index + 1}
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">{section.title}</h2>
        {section.isPublic && (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-semibold rounded">
            고객 화면
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
