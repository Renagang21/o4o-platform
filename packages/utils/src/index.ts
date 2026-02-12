// @o4o/utils - Shared Utility Functions
// Export all utility functions here

export * from './helpers.js';
export * from './validators.js';
export * from './accessControl.js';

// Export pricing functions (excluding format functions that conflict with format.ts)
export {
  getRoleBasedPrice,
  getAllRolePrices,
  calculateDiscountPercentage,
  calculateSavings,
  calculateVolumeDiscount,
  calculatePrice,
  formatPriceDisplay,
  getRoleLabel,
  getCurrencySymbol,
  getCurrencyInfo,
  getDefaultPriceDisplayConfig,
  isBetterPrice,
  isPriceInRange,
  calculateUnitPrice,
  validatePrice,
  calculateCartTotal
} from './pricing.js';

// Export formatting functions from format.ts
export {
  formatCurrency,
  formatPrice,
  formatNumber,
  formatDate,  // Basic date formatting - returns string
  formatFileSize,
  formatPercentage,
  // formatRelativeTime,  // Removed - may cause issues
  formatDateFromNow,  // Re-exported for consumers expecting it
  formatPhoneNumber,
  formatBusinessNumber
} from './format.js';

// Export cn utility
export { cn } from './cn.js';

// Export specific string utilities to avoid conflicts
export {
  generateSlug,
  truncate,
  toTitleCase,
  randomString
} from './string.js';

// Export hooks
export {
  usePreset,
  clearPresetCache,
  clearPresetFromCache,
  type PresetType,
  type AnyPreset,
  type UsePresetResult
} from './hooks/usePreset.js';

export {
  usePresets,
  useFormPresets,
  useViewPresets,
  useTemplatePresets,
  type UsePresetsResult
} from './hooks/usePresets.js';

export {
  usePresetData,
  usePresetDataWithParams,
  type UsePresetDataResult,
  type PresetDataQueryParams
} from './hooks/usePresetData.js';

export {
  useInvalidatePresetCache,
  useInvalidatePresetData,
  usePresetMutations
} from './hooks/usePresetMutations.js';

// Export components
export {
  PresetRenderer,
  type PresetRendererProps
} from './components/PresetRenderer.js';

export {
  FormRenderer,
  type FormRendererProps
} from './components/FormRenderer.js';

export {
  TemplateRenderer,
  SimpleLayout,
  type TemplateRendererProps,
  type SimpleLayoutProps
} from './components/TemplateRenderer.js';
