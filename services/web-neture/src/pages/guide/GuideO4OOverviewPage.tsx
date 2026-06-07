/**
 * GuideO4OOverviewPage — O4O 개요 (모든 사업자 공통 진입)
 *
 * WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-PHASE1-V1 (Phase 1)
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideO4OOverviewProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/o4o-overview';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideO4OOverviewPage() {
  return <Shared {...netureGuideO4OOverviewProps} renderText={renderText} />;
}
