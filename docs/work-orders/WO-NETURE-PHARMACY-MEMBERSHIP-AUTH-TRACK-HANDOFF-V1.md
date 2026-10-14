# WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1

> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §13
> **인계 주체**: Store/Commerce 트랙 → **인증 · 가입 트랙**
> **코드 위치**: PR #308 branch `wo/neture-pharmacy-store-commerce-refactor-v1` (main 통합 전 — 통합 후 이 문서의 경로가 main 기준이 된다)

Neture 약국 기본 가입(가입 원장 · 신청/승인 · role 발급 · 승인 orchestration)은 Store 트랙이 먼저 구현했다. 책임 결정(2026-10-05)에 따라 **인증 · 가입 트랙이 소유를 넘겨받는다.** 이 WO 는 새 기능 구현이 아니라 소유 이전 · 연결 계약 · 남은 정리 항목을 고정한다. **같은 승인 · role · 조직 생성 로직을 다시 만들지 않는다.**

---

## 1. 넘기는 것 (인증 · 가입 트랙 소유)

| 대상 | 파일 / 객체 | 비고 |
|---|---|---|
| 가입 원장 | 테이블 `neture_pharmacy_memberships` (migration `CreateNeturePharmacyCommerce1791200000000`) | 컬럼: 약국명 · 사업자번호(진행 중 UNIQUE) · 약사 면허번호 · 상태 · 결정자/일시/사유 · `organization_id UNIQUE` |
| 상태 전이 규칙 | `apps/api-server/src/modules/neture-pharmacy/constants.ts` `nextMembershipStatus` · `canReapply` · `MEMBERSHIP_ACTIONS` | 약국 협력사업 가입(Store 소유)도 같은 함수를 쓴다 — 바꿀 때 Store 트랙과 함께 |
| 신청 · 재신청 · 목록 · 운영자 처리 | `.../services/pharmacy-membership.service.ts` | `apply` · `findMine` · `list` · `decide` |
| 승인 orchestration · role | `.../services/pharmacy-store-provisioner.ts` | 활성: `service_memberships('neture')` ensure + role `neture:store_owner` → Store 계약 `activatePharmacyStore`. 정지 · 종료: role 회수 → `deactivatePharmacyStore` |
| API | `.../neture-pharmacy.routes.ts` 의 `GET/POST /api/v1/neture/pharmacy/membership` · `GET /api/v1/neture/operator/pharmacy-memberships` · `POST .../:id/:action` | 라우트 파일 분리는 인계 후 자유 |
| role 등록 | `apps/api-server/src/types/roles.ts` `neture:store_owner` | F9 role registry |
| 화면 | web-store `/start-pharmacy` (`services/web-store/src/pages/neture-pharmacy/PharmacyMembershipPage.tsx`) · web-neture `/operator/pharmacy-memberships` (`services/web-neture/src/pages/operator/PharmacyMembershipReviewPage.tsx`) | 인증 트랙의 공통 가입 · 추가정보 흐름에 편입할 때 이 화면 · 서비스를 확장한다 |
| 테스트 | `.../__tests__/neture-pharmacy-rules.spec.ts`(전이 · 입력 규칙) · `.../__tests__/neture-pharmacy-commerce.integration.spec.ts` "기본 가입 · 매장 게이트" 블록 | 통합 테스트는 격리 PostgreSQL 에서만(`NETURE_PHARMACY_IT_DATABASE_URL`) |

## 2. Store 트랙이 계속 소유하는 것 · 연결 계약

`apps/api-server/src/modules/neture-pharmacy/services/pharmacy-store-link.ts`

```text
createPharmacyStoreOrganization(exec, userId, profile) → organizationId   신청 트랜잭션 안에서 호출
updatePharmacyStoreProfile(exec, organizationId, profile)                  재신청 시
activatePharmacyStore(ds, {organizationId, pharmacyName})                  active 전이 후(멱등)
deactivatePharmacyStore(ds, organizationId)                                정지 · 종료 후
```

- Store 는 원장의 `organization_id` · `status='active'` 만 읽는다(매장 판정 `store-organization.resolver.ts` `kpa` 후보 · 매장 목록 `service-tenant.resolver.ts` · 계약 게이트 · 커뮤니티 접근 · 약국 협력사업 승인 전제).
- 판정 의미(active = 매장 이용 가능)를 바꾸려면 Store 트랙과 함께 바꾼다. 그 밖의 컬럼 · 입력 항목 · 화면은 인증 트랙이 바꿀 수 있다.

## 3. 불변식 (회귀 금지)

1. 약국 1 = 원장 1 = 조직 1 = 내 매장 1. 사용자당 owner 약국 1개 · 진행 중 사업자번호 1건.
2. 기존 kpa-society 가입 · `kpa_members` · `kpa_pharmacist_profiles` 를 자격 근거로 재해석하지 않는다(자동 전환 없음).
3. 기본 가입 승인은 약국 협력사업 가입을 만들지 않는다.
4. 원장이 판정 SSOT — role 표식 동기화 실패가 판정을 바꾸지 않는다. `service_memberships('neture')` 는 공급자 축과 공유될 수 있어 정지 시 건드리지 않는다.
5. 승인 · 정지는 서버 API 에서 판정한다(neture:operator).

## 4. 인증 트랙으로 넘기는 정리 항목 (미완료)

| 항목 | 현재 | 할 일 |
|---|---|---|
| KPA 회원 승인 시 매장 생성 코드 | `apps/api-server/src/routes/kpa/controllers/member.controller.ts` 2곳(승인 시 `ensureKpaStoreOrganization`) · `routes/kpa/services/kpa-store-organization.provisioning.ts` · F10 `MembershipApprovalService` 의 `kpa:store_owner` 분기 | 새 매장 게이트에서 실효 없음(매장 권한 0). 호출 제거 · 관련 spec(`kpa-store-organization.provisioning.test.ts` · `store-slug-store-id-axis.spec.ts` census) 정리. KPA 회원 승인 흐름 · F10 승인 엔진과 함께 다룬다 |
| 공통 가입 흐름 편입 | 기본 가입은 로그인 후 별도 화면(`/start-pharmacy`) | Google 가입 · 추가정보 · 약관 흐름과 연결할지 결정 · 구현 |
| 운영 화면 위치 | web-neture `/operator/pharmacy-memberships` | 운영 콘솔 IA 정합 |

## 5. 완료 조건

- 위 §1 대상의 소유 · 리뷰 책임이 인증 트랙 WO 에 등재되고, Store 트랙 파일과의 경계가 §2 계약대로 유지된다.
- §4 항목은 인증 트랙 WO 에서 완료 · 보류를 판정한다(Store 트랙은 판정하지 않는다).
