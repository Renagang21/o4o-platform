/**
 * createUserDetailApiAdapter — Axios 인스턴스를 UserDetailApiAdapter 로 감싸는 공통 팩토리
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * KPA / K-Cosmetics / Neture 의 회원 상세 wrapper 3곳에 완전히 동일한 26 LOC 의
 * `{ get, put, post, patch, delete }` 언랩 어댑터가 각각 복제돼 있었다.
 * 동작(응답 `data` 언랩)은 그대로 두고 정의만 공통으로 옮긴다.
 *
 * 주입 대상은 `authClient.api` 또는 서비스 `apiClient` 등 axios 호환 인스턴스다
 * (`get/put/post/patch/delete` 가 `{ data }` 를 resolve 하면 충족).
 */

import type { UserDetailApiAdapter } from './user-detail.types';

/** axios 호환 최소 인터페이스 — 서비스별 client 가 이 형태를 만족한다. */
export interface UserDetailAxiosLike {
  get(path: string): Promise<{ data: any }>;
  put(path: string, body?: any): Promise<{ data: any }>;
  post(path: string, body?: any): Promise<{ data: any }>;
  patch(path: string, body?: any): Promise<{ data: any }>;
  delete(path: string): Promise<{ data: any }>;
}

export function createUserDetailApiAdapter(api: UserDetailAxiosLike): UserDetailApiAdapter {
  return {
    get: async (path: string) => {
      const { data } = await api.get(path);
      return data;
    },
    put: async (path: string, body?: any) => {
      const { data } = await api.put(path, body);
      return data;
    },
    post: async (path: string, body?: any) => {
      const { data } = await api.post(path, body);
      return data;
    },
    patch: async (path: string, body?: any) => {
      const { data } = await api.patch(path, body);
      return data;
    },
    delete: async (path: string) => {
      const { data } = await api.delete(path);
      return data;
    },
  };
}
