import { HeroSection, CoreValueSection, UsagePreviewSection, CTASection } from '../components';

/**
 * KPA Society Home 페이지
 * Phase 2-E: 약사회 서비스
 */

const heroContent = {
  headline: '약사회를 위한 공식 업무 지원 서비스',
  subHeadline: '지부·분회 활동과 회원 업무를 한곳에서 확인하세요.',
  supportText: '공지, 교육, 신고, 공동구매를 일관된 흐름으로 제공합니다.',
};

const coreValues = [
  {
    title: '분산된 회원 업무의 일원화',
    description: '공지·교육·신상신고 등 흩어진 정보를\n하나의 흐름으로 확인할 수 있습니다.',
  },
  {
    title: '조직 기반 업무 구조',
    description: '본부–지부–분회 체계를 반영해\n필요한 정보만 정확히 볼 수 있습니다.',
  },
  {
    title: '약사의 일상 업무와 직결',
    description: '교육, 공동구매, 문서 확인 등\n실제 업무에 필요한 기능 중심으로 구성되어 있습니다.',
  },
];

const usageSteps = [
  {
    title: '필요한 정보를 한눈에 파악',
    description: '소속 기준 공지·일정·승인 상태를 확인합니다.',
  },
  {
    title: '교육·신고·참여 업무 처리',
    description: '연수교육, 신상신고, 공동구매 참여를 진행합니다.',
  },
  {
    title: '활동 기록과 최신 소식 확인',
    description: '처리한 업무와 알림을 연속적으로 확인합니다.',
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
        buttonText="로그인하기"
        buttonType="login"
      />
    </div>
  );
}
