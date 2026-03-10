import type { ApiUser } from './types.js';

/**
 * API user 객체에서 공통 필드 정규화
 * 서비스별 User 타입으로의 최종 변환은 각 서비스에서 수행
 */
export function normalizeUser(apiUser: ApiUser) {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: (apiUser.fullName ?? apiUser.name ?? apiUser.email) as string,
    status: (apiUser.status ?? 'active') as string,
    phone: apiUser.phone,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  };
}
