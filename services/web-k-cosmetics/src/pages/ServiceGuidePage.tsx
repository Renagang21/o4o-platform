// WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1
//
// /service-guide — K-Cosmetics 서비스 안내 (공개 페이지).
//   WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1 §12:
//   KPA / K-Cosmetics / GlycoPharm 의 서비스 안내 페이지가 동일 구조였으므로
//   공통 View(GuideServiceIntroPage) 로 수렴시키고, 서비스별 문구·아이콘·경로는
//   @o4o/shared-space-ui 의 copy config(kCosmeticsServiceIntroProps) 에서 주입한다.
//   문구는 공통화 전과 동일하다.
import { GuideServiceIntroPage, kCosmeticsServiceIntroProps } from '@o4o/shared-space-ui';

export default function ServiceGuidePage() {
  return <GuideServiceIntroPage {...kCosmeticsServiceIntroProps} />;
}
