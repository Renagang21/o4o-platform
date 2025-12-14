/**
 * Partner AI Builder DTOs
 *
 * @package @o4o/partner-ai-builder
 */

// Re-export types from services
export type {
  AllowedIndustry,
  ProductMetadata,
  RoutineStep,
  GeneratedRoutine,
  RoutineGenerationRequest,
  RoutineGenerationResult,
} from '../services/AiRoutineBuilderService.js';

export type {
  ProductScore,
  RecommendationRequest,
  RecommendationResult,
} from '../services/AiRecommendationService.js';

export type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from '../services/AiContentService.js';
