/**
 * Partner AI Builder Services
 *
 * @package @o4o/partner-ai-builder
 */

export { AiRoutineBuilderService } from './AiRoutineBuilderService.js';
export { AiRecommendationService } from './AiRecommendationService.js';
export { AiContentService } from './AiContentService.js';

// Re-export types
export type {
  AllowedIndustry,
  ProductMetadata,
  RoutineStep,
  GeneratedRoutine,
  RoutineGenerationRequest,
  RoutineGenerationResult,
  AiRoutineConfig,
} from './AiRoutineBuilderService.js';

export type {
  ProductScore,
  RecommendationRequest,
  RecommendationResult,
  ProductCatalog,
  RecommendationConfig,
} from './AiRecommendationService.js';

export type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from './AiContentService.js';

// Service array for module registration
export const partnerAiBuilderServices = [
  'AiRoutineBuilderService',
  'AiRecommendationService',
  'AiContentService',
];
