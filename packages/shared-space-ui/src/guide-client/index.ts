/**
 * Guide Client barrel — WO-O4O-GUIDE-CLIENT-EXTRACTION-V1
 *
 * 4 서비스 공통:
 * - createGuideClient(options) : guide_contents API client factory
 * - GuideEditableSection         : 운영자 inline 편집 컴포넌트 (Base)
 * - isOperatorOrAbove(roles)     : 표준 권한 판정 헬퍼
 */

export { createGuideClient } from './createGuideClient';
export type { GuideClient, GuideClientOptions } from './createGuideClient';

export { GuideEditableSection, isOperatorOrAbove } from './GuideEditableSection';
export type { GuideEditableSectionProps } from './GuideEditableSection';
