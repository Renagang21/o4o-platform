/**
 * GuideIntroStructurePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */
import { GuideIntroStructurePage as Shared, kpaGuideIntroStructureProps } from '@o4o/shared-space-ui';

export function GuideIntroStructurePage() {
  return <Shared {...kpaGuideIntroStructureProps} />;
}
