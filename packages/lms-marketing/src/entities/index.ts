/**
 * LMS Marketing Entities
 *
 * 모든 Entity는 Core ID 참조 방식
 * Core Entity 재정의 금지
 */

export { ProductContent, ProductContentStatus } from './ProductContent.js';
export type { ProductTargeting } from './ProductContent.js';

export {
  QuizCampaign,
  CampaignStatus,
} from './QuizCampaign.js';
export type { CampaignTargeting, CampaignReward } from './QuizCampaign.js';

export { SurveyCampaign } from './SurveyCampaign.js';

// Entity list for TypeORM registration
export const LmsMarketingEntities = [
  ProductContent,
  QuizCampaign,
  SurveyCampaign,
] as const;

// Re-import for entity list
import { ProductContent } from './ProductContent.js';
import { QuizCampaign } from './QuizCampaign.js';
import { SurveyCampaign } from './SurveyCampaign.js';
