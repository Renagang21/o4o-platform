/**
 * GuideFeatureSignagePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-SIGNAGE-MANUAL-V1
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureSignageProps } from '@o4o/shared-space-ui';

export function GuideFeatureSignagePage() {
  return <Shared {...kpaGuideFeatureSignageProps} />;
}
