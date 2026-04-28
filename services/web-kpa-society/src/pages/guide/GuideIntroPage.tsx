/**
 * GuideIntroPage — wrapper around shared component
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */
import { GuideIntroPage as Shared, kpaGuideIntroProps } from '@o4o/shared-space-ui';

export function GuideIntroPage() {
  return <Shared {...kpaGuideIntroProps} />;
}
