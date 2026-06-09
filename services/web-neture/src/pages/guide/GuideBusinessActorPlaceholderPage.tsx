/**
 * GuideBusinessActorPlaceholderPage — 사업자별 사업 운영 안내 (placeholder)
 *
 * WO-O4O-MAIN-BUSINESS-ACTOR-CARDS-ROUTE-SCAFFOLD-V1
 *
 * Guide Home 의 사업자별 카드 → 전용 상세 페이지 진입점. 본 페이지는 1차 안내 구조만 두는
 * placeholder 다. 상세 사업 운영 문안은 추후 사용자가 정리해 주는 내용을 기준으로 채운다.
 * (기능 나열 · 추정 내용 · 성공사례 · 수익예측 금지 — 빈 구조 + /contact 상담 동선만.)
 */
import { GuideFeatureManualPage as Shared } from '@o4o/shared-space-ui';
import type { GuideFeatureManualPageProps } from '@o4o/shared-space-ui';

export function GuideBusinessActorPlaceholderPage({ title }: { title: string }) {
  const props: GuideFeatureManualPageProps = {
    hero: {
      eyebrow: 'O4O 기반 사업 운영 안내',
      title,
      description: `이 페이지는 "${title}"의 O4O 기반 사업 운영 방식을 안내할 예정입니다. 상세 안내는 준비 중이며, 지금은 아래 상담으로 먼저 확인할 수 있습니다.`,
      primaryAction: { label: '운영 방식 상담하기 →', to: '/contact' },
    },
    sections: [
      {
        step: '01',
        title: '안내 준비 중',
        description: '이 사업자 유형을 위한 O4O 기반 사업 운영 안내를 준비하고 있습니다. 상세 내용이 정리되면 이 페이지에 단계별로 채워집니다.',
        items: [
          { label: '상담 문의', detail: '내 사업에 맞는 O4O 활용 · 운영 방식이 궁금하면 /contact 에서 상담을 요청하세요.' },
        ],
      },
    ],
    bottomNav: {
      prev: { label: '← 이용 안내', to: '/guide' },
      home: { label: '홈으로', to: '/' },
    },
  };
  return <Shared {...props} />;
}
