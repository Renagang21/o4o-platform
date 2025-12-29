import { HeroSection, CoreValueSection, UsagePreviewSection, CTASection } from '../components';

/**
 * K-Cosmetics Home 페이지
 * Phase 2-E: 화장품 매장 서비스
 */

const heroContent = {
  headline: '매장에서 경험하고, 집에서 이어집니다',
  subHeadline: '직접 써보고 결정하는 화장품 쇼핑을 가까운 매장에서 시작하세요',
  supportText: '체험과 상담이 가능한 매장 중심 화장품 서비스',
};

const coreValues = [
  {
    title: '직접 경험 후 선택',
    description: '사진과 설명만으로 고르지 않습니다.\n매장에서 실제 제품을 체험한 뒤 결정할 수 있습니다.',
  },
  {
    title: '매장 중심의 신뢰',
    description: '화장품을 잘 아는 매장이 안내합니다.\n판매보다 상담과 경험을 우선합니다.',
  },
  {
    title: '구매 방식의 유연함',
    description: '매장에서 결정하고 원하는 장소에서 받는 방식으로\n구매 부담을 줄입니다.',
  },
];

const usageSteps = [
  {
    title: '가까운 매장 방문',
    description: '일상에서 접근 가능한 매장에서 제품을 접합니다.',
  },
  {
    title: '체험과 상담',
    description: '피부 상태와 목적에 맞춰 직접 써보고 조언을 받습니다.',
  },
  {
    title: '결정 후 수령',
    description: '선택한 제품을 매장 또는 지정한 장소에서 받습니다.',
  },
];

export function HomePage() {
  return (
    <div>
      <HeroSection
        headline={heroContent.headline}
        subHeadline={heroContent.subHeadline}
        supportText={heroContent.supportText}
      />
      <CoreValueSection items={coreValues} />
      <UsagePreviewSection steps={usageSteps} />
      <CTASection
        buttonText="매장 기반 화장품 서비스 살펴보기"
        buttonType="explore"
      />
    </div>
  );
}
