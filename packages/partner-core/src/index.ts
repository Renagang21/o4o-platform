/**
 * Partner Core
 *
 * O4O 플랫폼 파트너 프로그램 엔진
 *
 * 트래픽 → 클릭 → 전환 → 커미션 → 정산 전체 워크플로우를 관리합니다.
 *
 * @package @o4o/partner-core
 */

// ========================================
// Entities
// ========================================
export {
  Partner,
  PartnerLevel,
  PartnerStatus,
} from './entities/Partner.entity.js';

export {
  PartnerLink,
  LinkTargetType,
  PartnerLinkStatus,
} from './entities/PartnerLink.entity.js';

export { PartnerClick } from './entities/PartnerClick.entity.js';

export {
  PartnerConversion,
  ConversionStatus,
} from './entities/PartnerConversion.entity.js';

export {
  PartnerCommission,
  CommissionStatus,
} from './entities/PartnerCommission.entity.js';

export {
  PartnerSettlementBatch,
  SettlementBatchStatus,
} from './entities/PartnerSettlementBatch.entity.js';

export { partnerEntities } from './entities/index.js';

// ========================================
// Services
// ========================================
export { PartnerService } from './services/PartnerService.js';
export type {
  CreatePartnerDto,
  UpdatePartnerDto,
  PartnerFilter,
} from './services/PartnerService.js';

export { PartnerLinkService } from './services/PartnerLinkService.js';
export type {
  CreatePartnerLinkDto,
  PartnerLinkFilter,
} from './services/PartnerLinkService.js';

export { PartnerClickService } from './services/PartnerClickService.js';
export type {
  RecordClickDto,
  ClickFilter,
  ClickValidationResult,
} from './services/PartnerClickService.js';

export { PartnerConversionService } from './services/PartnerConversionService.js';
export type {
  CreateConversionDto,
  ConversionFilter,
} from './services/PartnerConversionService.js';

export { PartnerCommissionService } from './services/PartnerCommissionService.js';
export type {
  CreateCommissionDto,
  CommissionFilter,
} from './services/PartnerCommissionService.js';

export { PartnerSettlementService } from './services/PartnerSettlementService.js';
export type {
  CreateSettlementBatchDto,
  SettlementBatchFilter,
  PaymentInfo,
} from './services/PartnerSettlementService.js';

// ========================================
// Extension System
// ========================================
export type {
  PartnerVisibilityContext,
  PartnerVisibilityResult,
  PartnerCommissionContext,
  PartnerCommissionResult,
  PartnerSettlementContext,
  PartnerSettlementResult,
  ValidatePartnerVisibilityHook,
  BeforePartnerCommissionApplyHook,
  BeforePartnerSettlementCreateHook,
} from './partner-extension.js';

export {
  registerPartnerExtension,
  unregisterPartnerExtension,
  executeValidatePartnerVisibility,
  executeBeforePartnerCommissionApply,
  executeBeforePartnerSettlementCreate,
  clearAllPartnerExtensions,
  enableDefaultPartnerHooks,
  disableDefaultPartnerHooks,
  pharmaceuticalExclusionVisibilityHook,
  pharmaceuticalExclusionCommissionHook,
} from './partner-extension.js';

// ========================================
// Lifecycle Hooks
// ========================================
export {
  install,
  activate,
  deactivate,
  uninstall,
} from './lifecycle/index.js';

export type {
  InstallContext,
  ActivateContext,
  DeactivateContext,
  UninstallContext,
} from './lifecycle/index.js';

// ========================================
// Manifest
// ========================================
export { partnerCoreManifest } from './manifest.js';
