/**
 * K-Cosmetics 이식 화면용 API client — web-store 의 단일 client 를 그대로 쓴다(CHECK-O4O-URL-FIRST-CENSUS-V1 §21-15).
 * 같은 localStorage 토큰 · 선택 매장 헤더(X-Store-Organization-Id) interceptor 를 공유한다.
 */
export { API_BASE_URL, authClient, api } from '../../../lib/apiClient';
