/**
 * GuideFeatureContentPage — wrapper around shared component
 *
 * WO-O4O-GUIDE-CONTENT-MANUAL-V1
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureContentProps } from '@o4o/shared-space-ui';

export function GuideFeatureContentPage() {
  return <Shared {...kpaGuideFeatureContentProps} />;
}
