/**
 * Work Scope V0 — 공개 표면
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0
 */

export type {
  Workspace,
  ExecutionMode,
  WorkScope,
  WorkScopeStatus,
  WorkScopeReason,
  WorkScopeCapability,
  WorkspaceAccessRule,
} from './types';
export { WORKSPACE_ACCESS } from './types';
export {
  resolveWorkspaceFromPath,
  ROUTE_WORKSPACE_RULES,
  DEFAULT_WORKSPACE,
} from './routeWorkspaceMap';
export { resolveWorkScope, type ResolveWorkScopeInput } from './resolveWorkScope';
