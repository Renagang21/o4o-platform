/**
 * 공통 UX 상태 컴포넌트 — WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1
 *
 * 4상태 계약(loading / error / empty / ready) + 접근 거부 + 404 표시 계약을
 * 서비스별 복제 대신 Design Core 한 곳에서 관리한다.
 */
export { AccessDenied, ACCESS_DENIED_TITLE, ACCESS_DENIED_MESSAGE } from './AccessDenied';
export type { AccessDeniedProps } from './AccessDenied';
export { LoadError, LOAD_ERROR_TITLE, LOAD_ERROR_DESCRIPTION } from './LoadError';
export type { LoadErrorProps } from './LoadError';
export { NotFound, NOT_FOUND_TITLE, NOT_FOUND_DESCRIPTION } from './NotFound';
export type { NotFoundProps } from './NotFound';
