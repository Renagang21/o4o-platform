/**
 * StoreHubPage — GlycoPharm 매장 운영 허브 랜딩
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-PORT-V1
 * WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1: glycopharmConfig 기반 텍스트 치환
 *
 * StoreHubTemplate + GlycoPharm config.
 * GlycoPharm 전용 문구/링크/카드/단계는 glycoStoreHubConfig에만 위치한다.
 */

import { StoreHubTemplate, type StoreHubConfig } from '@o4o/shared-space-ui';
import { glycopharmConfig } from '@o4o/operator-ux-core';
import { GuideEditableSection } from '../../components/guide';

const { terminology, uiText } = glycopharmConfig;

// WO-O4O-SERVICE-INLINE-EDIT-PORT-GK-V1: 서비스 페이지 설명 영역 인라인 편집
const PAGE_KEY = 'store-hub';

function editable(sectionKey: string, defaultText: string) {
  return (
    <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultText} />
  );
}

// ─── GlycoPharm Config ────────────────────────────────────────────────────────

const glycoStoreHubConfig: StoreHubConfig = {
  serviceKey: 'glycopharm',

  heroTitle: terminology.storeHubLabel,
  heroDesc: editable('hero-description', `혈당관리 전문 플랫폼이 제공하는 상품·콘텐츠·사이니지를 탐색하고, ${terminology.myStoreLabel}으로 가져가 운영에 활용합니다.`),
  storeCta: {
    label: `${terminology.myStoreLabel} 관리 →`,
    href: '/store',
  },

  resourceSectionTitle: '자원 탐색',
  resourceSectionDesc: editable('resource-section-description', `플랫폼 자원을 탐색하고 ${terminology.myStoreLabel}으로 가져가세요`),
  resourceCards: [
    {
      icon: '🛒',
      title: 'B2B 상품 카탈로그',
      desc: '공급사 상품을 탐색하고 약국 취급을 신청합니다',
      href: '/store-hub/b2b',
      actionLabel: '상품 탐색',
    },
    {
      icon: '🖥️',
      title: '디지털 사이니지',
      desc: '혈당관리 관련 사이니지 미디어를 탐색해 매장에 추가합니다',
      href: '/store-hub/signage',
      actionLabel: '사이니지 탐색',
    },
    {
      icon: '📄',
      title: '콘텐츠/자료',
      desc: '플랫폼 콘텐츠를 탐색하고 내 매장에 복사합니다',
      href: '/store-hub/content',
      actionLabel: '콘텐츠 탐색',
    },
    {
      icon: '🛍️',
      title: '이벤트/특가',
      desc: 'GlycoPharm 이벤트 상품을 확인하고 신청합니다',
      href: '/store-hub/event-offers',
      actionLabel: '이벤트 보기',
    },
  ],

  aiBlock: {
    title: 'AI 맞춤 추천',
    badge: '준비 중',
    desc: '매장 운영 데이터를 기반으로 지금 필요한 상품·콘텐츠·사이니지를 자동으로 추천하는 기능을 준비 중입니다.',
    features: [
      '취급 신청 후 오래된 혈당 관련 상품 상태 안내',
      '미복사 콘텐츠 중 현재 시즌 혈당관리 관련 항목 제안',
      '사이니지 업데이트 주기 기반 교체 제안',
    ],
  },

  storeCtaBlock: {
    icon: '🏥',
    title: `${terminology.myStoreLabel}으로 이동`,
    desc: `탐색한 상품·콘텐츠·사이니지의 실제 설정과 운영은 ${terminology.myStoreLabel}에서 합니다`,
    buttonLabel: `${terminology.myStoreLabel} 관리 →`,
    href: '/store',
  },

  flowSectionTitle: '운영 흐름',
  flowSectionDesc: uiText.storeHubFlow,
  operationSteps: [
    {
      step: '1',
      title: '탐색',
      desc: '상품·사이니지·콘텐츠를 이곳에서 탐색합니다',
      where: terminology.storeHubLabel,
    },
    {
      step: '2',
      title: '복사 · 신청',
      desc: '"내 매장에 추가" 또는 "취급 신청"으로 가져옵니다',
      where: terminology.storeHubLabel,
    },
    {
      step: '3',
      title: '실행',
      desc: `${terminology.myStoreLabel}에서 게시, 스케줄, 판매 설정을 완료합니다`,
      where: `${terminology.myStoreLabel} (/store)`,
    },
  ],
};

// ─── Page Component ────────────────────────────────────────────────────────────

export function StoreHubPage() {
  return <StoreHubTemplate config={glycoStoreHubConfig} />;
}

export default StoreHubPage;
