/**
 * Operator Service Switcher Module — WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1
 * 1 Operator : N Services — 출처는 /work-scope/operator-services 하나, 진입은 기존 /auth/handoff.
 */
export { OperatorServiceSwitcher } from './OperatorServiceSwitcher';
export type { OperatorServiceSwitcherProps } from './OperatorServiceSwitcher';
export {
  createOperatorServicesApi,
  selectOperatorServices,
  defaultOperatorEntryPath,
} from './createOperatorServicesApi';
export type {
  OperatorServicesApi,
  OperatorServicesHttp,
  OperatorServiceMembership,
  OperatorServicesSelection,
  OperatorScopeLevel,
  OperatorServiceWorkspaceMode,
} from './createOperatorServicesApi';
