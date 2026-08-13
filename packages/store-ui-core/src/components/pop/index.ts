/**
 * POP Composer 공통 단위 — WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 */

export { StorePopComposerView } from './StorePopComposerView';
export type { StorePopComposerViewProps } from './StorePopComposerView';

export { usePopComposer } from './usePopComposer';
export type { UsePopComposerOptions, PopComposerState } from './usePopComposer';

export { PopSupplierItemSelector } from './PopSupplierItemSelector';
export type { PopSupplierItemSelectorProps } from './PopSupplierItemSelector';
export { PopLocalProductSection } from './PopLocalProductSection';
export type { PopLocalProductSectionProps } from './PopLocalProductSection';
export { PopAiContentPanel } from './PopAiContentPanel';
export type { PopAiContentPanelProps } from './PopAiContentPanel';
export { PopLayoutTemplateSection } from './PopLayoutTemplateSection';
export type { PopLayoutTemplateSectionProps } from './PopLayoutTemplateSection';
export { PopQrSelector } from './PopQrSelector';
export type { PopQrSelectorProps } from './PopQrSelector';
export { PopGenerateBar } from './PopGenerateBar';
export type { PopGenerateBarProps } from './PopGenerateBar';
export {
  PopLoadingBlock,
  PopErrorBlock,
  PopEmptyBlock,
  PopInlineLoading,
  PopInlineError,
} from './PopStateBlocks';

export {
  htmlToPlainText,
  parsePopPrefillState,
  normalizeLocalProductForPop,
  isPopNotFoundError,
  popAiContentToHtml,
  buildPopGeneratePayload,
} from './popHelpers';

export {
  popPageStyle,
  popSectionStyle,
  popSectionHeaderStyle,
  popBackBtnStyle,
  popRefreshSmallBtnStyle,
  popRetryBtnStyle,
  popSaveContentBtnStyle,
  popAiPreviewStyle,
  popStepBadgeStyle,
  popGenerateBtnStyle,
  popSelectableStyle,
} from './popStyles';

export type {
  PopSupplierItem,
  PopLocalProductItem,
  PopLocalProductRaw,
  PopAiContent,
  PopLayout,
  PopTemplateOption,
  PopQrOption,
  PopGeneratePayload,
  PopAccentTheme,
  PopComposerLabels,
  PopComposerApi,
  PopComposerNotify,
} from './types';
