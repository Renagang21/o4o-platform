import type { ApiUser } from './types.js';

/**
 * API user 객체에서 공통 필드 정규화
 * 서비스별 User 타입으로의 최종 변환은 각 서비스에서 수행
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1:
 *   1) `/auth/me` 는 nickname 을 내려주지만 여기서 탈락해,
 *      spread(`...apiUser`) 없이 이 결과만 쓰는 소비처(buildPlatformUser 경로)에서
 *      프로필 편집 폼의 nickname 이 빈 값으로 로드되고 저장 시 기존 nickname 이 지워졌다.
 *      ACCOUNT_CORE 공통 필드이므로 정규화 대상에 포함한다.
 *   2) 표시명 우선순위를 `displayName`(= users.name) → `name` → `fullName` 로 정정.
 *      canonical self-profile 계약(`PATCH /users/me/profile`)이 수정하는 표시명 정본은
 *      `users.name` 이고, `/auth/me` 는 이를 `displayName` 으로 내린다.
 *      `fullName` 은 `lastName + firstName` 파생 getter 라 name 수정이 반영되지 않아,
 *      프로필에서 이름을 저장해도 새로고침하면 옛 값으로 되돌아가 보였다.
 */
export function normalizeUser(apiUser: ApiUser) {
  const displayName = (apiUser.displayName ?? apiUser.name) as string | undefined;

  return {
    id: apiUser.id,
    email: apiUser.email,
    name: (displayName?.trim() || apiUser.fullName || apiUser.email) as string,
    status: (apiUser.status ?? 'active') as string,
    phone: apiUser.phone,
    nickname: apiUser.nickname as string | undefined,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  };
}
