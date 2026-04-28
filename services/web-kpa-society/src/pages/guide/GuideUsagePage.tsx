/**
 * GuideUsagePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */
import { GuideUsagePage as Shared, kpaGuideUsageProps } from '@o4o/shared-space-ui';

export function GuideUsagePage() {
  return <Shared {...kpaGuideUsageProps} />;
}
