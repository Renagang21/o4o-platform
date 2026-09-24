// Authentication context exports
export * from './AuthContext';
export * from './AuthProvider';
export * from './SessionManager';
export * from './AdminProtectedRoute';
export * from './adminRouteAccess';
// WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1: 계정/권한 **표시** 계약
//   (인가는 adminRouteAccess/hasRequiredRoles 가 roles[] 로 한다 — 아래는 문자열만 만든다)
export * from './accountDisplay';
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   CookieAuthProvider · SSOAuthProvider 는 은퇴한 CookieAuthClient(/auth/cookie/login) 전용이었다.