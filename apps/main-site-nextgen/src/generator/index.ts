/**
 * ViewGenerator Entry Point
 * Exports all public APIs
 */

export {
  generateView,
  generateViews,
  listGeneratedViews,
  loadView,
  deleteView,
} from './viewGenerator';

export { analyzeInput, extractParams } from './analyzer';
export { selectLayout } from './rules/layoutRules';
export { selectFunctionComponents } from './rules/componentRules';
export { generateFetchConfig } from './rules/fetchRules';
export { mapAIDesignToView, validateAIGeneratedView } from './rules/aiMappingRules';

export type {
  AnalyzedIntent,
  FetchConfig,
  ViewComponent,
  ViewSchema,
  LayoutType,
} from './types';
