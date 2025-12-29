import { HeroSection, CoreValueSection, UsagePreviewSection, CTASection } from '../components';

/**
 * GlycoPharm Home 페이지
 * Phase 2-E: 혈당관리 약국 서비스
 */

const heroContent = {
  headline: '혈당 관리를 돕는 전문 약국 서비스',
  subHeadline: '혈당 데이터를 해석해 약사가 관리에 참여합니다',
  supportText: '환자는 혼자가 아니고, 약국은 관리의 중심이 됩니다',
};

const coreValues = [
  {
    title: '데이터는 그대로, 활용만 바꿉니다',
    description: 'CGM와 외부 시스템에 있는 혈당 데이터를 저장하지 않고,\n약국과 환자가 이해하고 활용할 수 있는 정보로 해석합니다.',
  },
  {
    title: '약국이 혈당 관리에 참여합니다',
    description: '병원이 아닌 일상 공간에서,\n약사가 환자의 혈당 추세를 보고 상담과 조언을 제공합니다.',
  },
  {
    title: '변화와 흐름을 한눈에 보여줍니다',
    description: '숫자 나열이 아닌,\n이전과 지금의 차이와 관리 방향을 중심으로 보여줍니다.',
  },
];

const usageSteps = [
  {
    title: '혈당 흐름을 확인합니다',
    description: '환자는 자신의 혈당 상태와 최근 변화를 요약된 형태로 확인합니다.',
  },
  {
    title: '약사가 해석을 돕습니다',
    description: '약사는 혈당 패턴과 추세를 바탕으로 관리에 필요한 설명을 제공합니다.',
  },
  {
    title: '생활 속 관리로 이어집니다',
    description: '상담 결과를 바탕으로 일상에서 실천할 관리 방향을 정리합니다.',
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
        buttonText="혈당관리 약국 서비스 보기"
        buttonType="explore"
      />
    </div>
  );
}
