/**
 * @o4o/operator-core-ui
 *
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1
 * 설계 기준: docs/architecture/OPERATOR-CORE-DESIGN-V1.md
 *
 * Operator 영역의 페이지 수준 모듈 컬렉션. `@o4o/operator-ux-core` (공유 UI 원시)
 * 위에 빌드된 페이지 모듈(Stores, Users, Forum Analytics 등)을 모은다.
 *
 * 본 패키지는 Operator 페이지 전용이며, OPERATOR-DATATABLE-POLICY-V1 §2.1 표준에 따라
 * `@o4o/operator-ux-core` 의 DataTable 만 사용한다.
 */

// Stores Module
export {
  OperatorStoresList,
  useStoresQuery,
} from './modules/stores';
export type {
  OperatorStoreBase,
  StoresApi,
  StoresConfig,
  StoresListParams,
  StoresListResponse,
  StoresListPagination,
  StoresListStats,
  StoresRowAction,
  OperatorStoresListProps,
  UseStoresQueryArgs,
  UseStoresQueryResult,
} from './modules/stores';

// Guide Contents Module
export { GuideContentsManager } from './modules/guide-contents';
export type {
  GuideSection,
  GuideContentsConfig,
  GuideContentsClient,
  GuideContentsManagerProps,
} from './modules/guide-contents';

// CMS Content Module (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1)
export { CmsContentManager } from './modules/cms-content';
export type { CmsContentManagerProps } from './modules/cms-content';

// Common EditUserModal (WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1)
export { CommonEditUserModal } from './modules/members';
export type {
  EditUserModalOption,
  EditUserModalConfig,
  ProfileClassificationConfig,
  ApiRequestFn,
  CommonEditUserModalProps,
} from './modules/members';

// KPA EditUserModal (WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1)
export { KpaEditUserModal } from './modules/members';
export type {
  KpaMemberStatus,
  KpaMemberBusinessInfo,
  KpaMemberForEdit,
  KpaEditUserModalProps,
} from './modules/members';
