# groupbuy-yaksa Phase 5 Pilot Operation Report

**Work Order ID**: `WO-GROUPBUY-YAKSA-PHASE5-PILOT-OPERATION`
**Date**: 2025-12-18
**Status**: Completed

---

## 1. Executive Summary

Phase 5 Pilot Operation & Access Hardening이 완료되었습니다.
- API 레벨 권한 미들웨어 구현
- 조직 스코프 검증 적용
- 모든 라우트에 권한 체계 적용

---

## 2. Implementation Summary

### 2.1 새로 생성된 파일

| 파일 | 역할 |
|------|------|
| `middleware/groupbuy-auth.middleware.ts` | 권한 검증 미들웨어 |
| `middleware/index.ts` | 미들웨어 export |

### 2.2 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `routes/groupbuy.routes.ts` | 권한 미들웨어 적용 |
| `backend/index.ts` | 미들웨어 export 추가 |

---

## 3. 권한 체계 (Access Control Matrix)

### 3.1 캠페인 API

| Endpoint | Method | 권한 | 미들웨어 |
|----------|--------|------|----------|
| `/campaigns` | GET | 소속 조직 멤버 | `loadMembership` + `requireOrgScope` |
| `/campaigns/:id` | GET | 캠페인 조직 멤버 | `loadMembership` + `requireCampaignAccess` |
| `/campaigns` | POST | 조직 관리자 | `loadMembership` + `requireOrgAdmin` |
| `/campaigns/:id` | PUT | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/campaigns/:id/activate` | POST | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/campaigns/:id/close` | POST | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/campaigns/:id/complete` | POST | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/campaigns/:id/cancel` | POST | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |

### 3.2 상품 API

| Endpoint | Method | 권한 | 미들웨어 |
|----------|--------|------|----------|
| `/campaigns/:campaignId/products` | GET | 캠페인 조직 멤버 | `loadMembership` + `requireCampaignAccess` |
| `/campaigns/:campaignId/products` | POST | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/products/:id` | GET | 인증된 사용자 | (외부 인증만) |
| `/products/available/:campaignId` | GET | 캠페인 조직 멤버 | `loadMembership` + `requireCampaignAccess` |

### 3.3 주문 API

| Endpoint | Method | 권한 | 미들웨어 |
|----------|--------|------|----------|
| `/orders/pharmacy/:pharmacyId` | GET | 약국 소속 멤버 | `loadMembership` + `requirePharmacyOwner` |
| `/orders/campaign/:campaignId` | GET | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |
| `/orders` | POST | 약국 소속 멤버 | `loadMembership` + `requirePharmacyOwner` |
| `/orders/:id/confirm` | POST | 인증된 사용자 | `loadMembership` |
| `/orders/:id/cancel` | POST | 인증된 사용자 | `loadMembership` |
| `/campaigns/:campaignId/summary` | GET | 캠페인 조직 멤버 | `loadMembership` + `requireCampaignAccess` |
| `/campaigns/:campaignId/participants` | GET | 캠페인 소유 조직 관리자 | `loadMembership` + `requireCampaignOwner` |

---

## 4. 미들웨어 상세

### 4.1 `loadMembership`

사용자의 조직 멤버십을 DB에서 조회하여 `req.groupbuyContext`에 저장합니다.

```typescript
interface GroupbuyContext {
  userId: string;
  memberships: OrganizationMembership[];
  primaryOrganizationId?: string;
  campaign?: GroupbuyCampaign;
}
```

### 4.2 `requireOrgScope`

요청의 `organizationId`가 사용자의 소속 조직인지 확인합니다.
- organizationId가 없으면 primary organization 사용
- 소속 조직이 아니면 403 반환

### 4.3 `requireOrgAdmin`

요청의 `organizationId` 조직에서 `admin` 또는 `manager` 역할인지 확인합니다.

### 4.4 `requireCampaignOwner`

캠페인 소유 조직에서 `admin` 또는 `manager` 역할인지 확인합니다.
- 캠페인 조회 후 `req.groupbuyContext.campaign`에 저장

### 4.5 `requireCampaignAccess`

캠페인 소유 조직의 멤버인지 확인합니다. (역할 무관)

### 4.6 `requirePharmacyOwner`

`pharmacyId`가 사용자의 소속 조직인지 확인합니다.
- pharmacyId = organizationId 가정

---

## 5. 에러 코드

| 코드 | 설명 |
|------|------|
| `GB-AUTH-001` | 인증 필요 |
| `GB-AUTH-002` | 조직 멤버십 필요 |
| `GB-AUTH-003` | 조직 관리자 권한 필요 |
| `GB-AUTH-004` | 조직 스코프 위반 |
| `GB-AUTH-005` | 캠페인 없음 |
| `GB-AUTH-006` | 캠페인 접근 거부 |
| `GB-AUTH-007` | 약국 접근 거부 |

---

## 6. 사용 방법

### 6.1 라우트 등록 (api-server)

```typescript
import { createGroupbuyRoutes } from '@o4o/groupbuy-yaksa/backend';
import { requireAuth } from './middleware/auth.middleware.js';

// 권한 검증 활성화 (Production)
app.use('/api/v1/yaksa/groupbuy', createGroupbuyRoutes(dataSource, {
  authMiddleware: requireAuth,
}));

// 권한 검증 비활성화 (Development Only)
app.use('/api/v1/yaksa/groupbuy', createGroupbuyRoutes(dataSource, {
  skipAuth: true,
}));
```

### 6.2 외부 인증 미들웨어 연동

`authMiddleware` 옵션으로 상위 인증 미들웨어를 주입할 수 있습니다.
이 미들웨어가 `req.user`에 사용자 정보를 설정해야 합니다.

```typescript
interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}
```

---

## 7. Pilot 시나리오 검증

### 7.1 캠페인 생성 시나리오

| 시나리오 | 기대 결과 | 검증 |
|---------|----------|------|
| 지부 관리자가 캠페인 생성 | 성공 | ✅ `requireOrgAdmin` |
| 일반 회원이 캠페인 생성 | 403 | ✅ `requireOrgAdmin` |
| 비회원이 캠페인 생성 | 401 | ✅ `loadMembership` |
| 타 조직 관리자가 캠페인 생성 | 403 | ✅ `requireOrgAdmin` |

### 7.2 캠페인 조회 시나리오

| 시나리오 | 기대 결과 | 검증 |
|---------|----------|------|
| 소속 조직 회원이 캠페인 목록 조회 | 성공 | ✅ `requireOrgScope` |
| 타 조직 회원이 캠페인 목록 조회 | 403 | ✅ `requireOrgScope` |
| 소속 조직 회원이 캠페인 상세 조회 | 성공 | ✅ `requireCampaignAccess` |

### 7.3 주문 시나리오

| 시나리오 | 기대 결과 | 검증 |
|---------|----------|------|
| 약국 회원이 주문 생성 | 성공 | ✅ `requirePharmacyOwner` |
| 타 약국으로 주문 생성 | 403 | ✅ `requirePharmacyOwner` |
| 약국 회원이 본인 주문 조회 | 성공 | ✅ `requirePharmacyOwner` |
| 캠페인 관리자가 전체 주문 조회 | 성공 | ✅ `requireCampaignOwner` |

---

## 8. Definition of Done 체크리스트

| 항목 | 상태 |
|------|------|
| API 권한/조직 스코프 미들웨어 구현 | ✅ |
| 캠페인 라우트에 권한 검증 적용 | ✅ |
| 주문 라우트에 조직 스코프 검증 적용 | ✅ |
| Pilot 시나리오 코드 검증 | ✅ |
| 빌드 정상 통과 | ✅ |

---

## 9. 후속 조치 (Phase 6+)

| 항목 | 우선순위 | 대상 Phase |
|------|---------|-----------|
| 본회 계정 Read-only 정책 구현 | Medium | Phase 6 |
| 주문 확인 권한 세분화 | Low | Phase 6 |
| 동시성 테스트 (실 환경) | Medium | Phase 6 |
| 성능 모니터링 | Low | Phase 7+ |

---

## 10. 결론

Phase 5 Pilot Operation & Access Hardening이 완료되었습니다.
- API 레벨 권한 검증 미들웨어 구현
- 조직 멤버십 기반 접근 제어
- 캠페인/주문 라우트에 권한 체계 적용
- 빌드 정상 통과

**Phase 5 상태**: ✅ **Completed**

---

*Generated: 2025-12-18*
*Author: Claude Code*
