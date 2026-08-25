/**
 * Operator Resources Module — Public API
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3 (lifecycle config)
 */

export { OperatorResourcesConsolePage } from './OperatorResourcesConsolePage';
export { ResourcesFormModal } from './ResourcesFormModal';
export {
  DEFAULT_RESOURCES_LIFECYCLE,
  SERVICE_LEDGER_RESOURCES_LIFECYCLE,
  CMS_CONTENTS_RESOURCES_LIFECYCLE,
} from './lifecycle';
export { DEFAULT_RESOURCES_NOUNS } from './types';
export type {
  OperatorResourcesConsolePageProps,
  ResourcesConsoleClient,
  ResourcesConsoleItem,
  ResourcesConsoleAiSlot,
  ResourcesConsoleListParams,
  ResourcesConsoleListResponse,
  ResourceStatus,
  ResourceSourceType,
  ResourceUsageType,
  ResourceReusablePolicy,
  ResourcesLifecycleConfig,
  ResourcesStatusDef,
  ResourcesTransitionActionDef,
  ResourcesTransitionIcon,
  ResourcesConfirmDef,
  ResourcesActionKey,
  ResourcesFieldCapabilities,
  ResourcesFormConfig,
  ResourcesFormFieldCapabilities,
  ResourcesFormValue,
  ResourcesNouns,
} from './types';
