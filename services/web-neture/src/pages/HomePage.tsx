import { HeroSection, FeatureSection, CoreValueSection, UsagePreviewSection, CTASection } from '../components';

/**
 * Neture Home 페이지
 * Phase 2-E: 전자상거래 판매자 지원 서비스
 */

const heroContent = {
  headline: '다중 판매채널을 운영하는 판매자를 위한 지원 서비스',
  subHeadline: '상품 등록부터 배송 요청, 운영 관리까지 한 흐름으로 정리합니다',
  supportText: '판매자는 판매에 집중하고, 반복 운영은 시스템이 맡습니다',
};

const coreValues = [
  {
    title: '판매 운영의 분산을 하나의 흐름으로 묶습니다',
    description: '여러 판매처의 주문·요청 관리 부담을 줄이고\n전체 흐름을 놓치지 않도록 정리합니다.',
  },
  {
    title: '반복 업무를 자동화하여 대응 부담을 낮춥니다',
    description: '배송 요청, 리뷰 대응, 정산·기록 등 반복 작업을 자동화해\n판단과 판매 활동에 집중할 수 있게 합니다.',
  },
  {
    title: '공급자 자료를 판매 현장에서 바로 활용',
    description: '공급자 제공 자료를 채널 상황에 맞게 활용하도록\n정리하고 공유 흐름을 단순화합니다.',
  },
];

const usageSteps = [
  {
    title: '판매할 상품을 선택합니다',
    description: '공급자 등록 상품과 자료를 검토해 채널에 맞게 활용합니다.',
  },
  {
    title: '판매가 이루어지면 흐름을 연결합니다',
    description: '주문 이후 배송 요청과 처리를 끊김 없이 이어갑니다.',
  },
  {
    title: '운영 상황을 정리하고 대응합니다',
    description: '결과와 상태를 한곳에서 확인하며 대응합니다.',
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
      <FeatureSection />
      <CoreValueSection items={coreValues} />
      <UsagePreviewSection steps={usageSteps} />
      <CTASection
        buttonText="판매자 지원 서비스 살펴보기"
        buttonType="explore"
      />
    </div>
  );
}
