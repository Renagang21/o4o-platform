/**
 * GuideFeatureSurveyPage — wrapper around shared component
 *
 * WO-O4O-KPA-GUIDE-SURVEY-MANUAL-NEW-V1
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureSurveyProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/features/survey';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideFeatureSurveyPage() {
  return <Shared {...kpaGuideFeatureSurveyProps} renderText={renderText} />;
}
