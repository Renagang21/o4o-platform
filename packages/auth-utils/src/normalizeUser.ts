import type { ApiUser } from './types.js';

/**
 * API user 객체에서 공통 필드 정규화
 * 서비스별 User 타입으로의 최종 변환은 각 서비스에서 수행
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1:
 *   `/auth/me` 는 nickname 을 내려주지만 여기서 탈락해,
 *   spread(`...apiUser`) 없이 이 결과만 쓰는 소비처(buildPlatformUser 경로)에서
 *   프로필 편집 폼의 nickname 이 빈 값으로 로드되고 저장 시 기존 nickname 이 지워졌다.
 *   ACCOUNT_CORE 공통 필드이므로 정규화 대상에 포함한다.
 */
export function normalizeUser(apiUser: ApiUser) {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: (apiUser.fullName ?? apiUser.name ?? apiUser.email) as string,
    status: (apiUser.status ?? 'active') as string,
    phone: apiUser.phone,
    nickname: apiUser.nickname as string | undefined,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  };
}
