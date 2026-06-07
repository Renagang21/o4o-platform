/**
 * GuideForOperatorPage — 매장 네트워크 운영자 가이드
 *
 * WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-PHASE1-V1 (Phase 2)
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideForOperatorProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/for-operator';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideForOperatorPage() {
  return <Shared {...netureGuideForOperatorProps} renderText={renderText} />;
}
