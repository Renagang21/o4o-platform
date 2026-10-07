/**
 * K-Cosmetics 이식 화면용 AuthContext — web-store 의 AuthProvider 를 그대로 쓴다(CHECK-O4O-URL-FIRST-CENSUS-V1 §21-15).
 * 이식 화면이 쓰는 것은 `useAuth().user.roles` 와 `getAccessToken` 뿐이다.
 */
export { useAuth, getAccessToken } from '../../../contexts/AuthContext';
