/**
 * diabetes-pharmacy
 *
 * DiabetesCare Pharmacy Extension App
 * 혈당관리 세미프랜차이즈 약국 운영 실행 App
 *
 * @package @o4o/diabetes-pharmacy
 */

// Manifest
export { diabetesPharmacyManifest } from './manifest.js';

// Extension
export {
  diabetesPharmacyExtension,
  type DiabetesPharmacyContext,
  type PharmacyRoleValidationResult,
} from './extension.js';

// Lifecycle
export * from './lifecycle/index.js';

// Backend
export * from './backend/index.js';

// Types (re-export for convenience)
export type {
  ActionType,
  ActionStatus,
  ActionDto,
  ActionListResponseDto,
  ActionExecuteRequestDto,
  ActionExecuteResponseDto,
  DashboardSummaryDto,
  PatientSummaryDto,
} from './backend/dto/index.js';
