# CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-06
> **근거 WO**: WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 (사용자 지시 2026-10-06 — 운영 promote 전 해결 대상 2건) · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` §17](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

Neture 약국 매장 commerce(PR #308 계열) 운영 전환 전 호환성 보강의 검증 기록 · 전환 계획이다.
**운영 DB · migration · 배포 · 변수 · LB · 도메인은 건드리지 않았다.** 아래 DB 검증은 모두 일회용 격리 PostgreSQL 이다.

## 1. 해결 대상

| # | 문제 | 해결 |
|---|---|---|
| A | migration 이 `idx_org_listing_unique_v2` 를 부분 UNIQUE 로 교체 → 구버전 API 의 `ON CONFLICT (organization_id, service_key, offer_id)` 실패 · 배포 중/롤백 시 공급 · 승인 · 진열 경로 장애 | 인덱스 교체를 2단계로 분리. 1단계는 전체 UNIQUE 유지 · 부분 인덱스가 필요한 이벤트 재신청은 API 가 `409 EVENT_REAPPLY_NOT_YET_SUPPORTED` 로 명시 거절 |
| B | 승인된 Neture 약국이 pharmacy.neture.co.kr(kpa-society) 에서 403 — kpa-society membership 이 없어서 | 이용 자격 = Neture 기본 가입 active ∧ pharmacy 세미프랜차이즈 가입 active. 직접 로그인 · handoff(발급 · 교환) · 화면 게이트에 같은 판정. 미충족은 상태별 안내 + 신청 링크 |

## 2. 1단계 임시 제한 범위

- 같은 세미프랜차이즈 운영 조직 · 같은 offer 로 **두 번째 이벤트 신청**(종료 후 재신청 · 동시 복수 이벤트) → 409 + 안내 문구. 500 이 아니다.
- 첫 이벤트 신청 · 승인 · 노출 · 주문 · 한도 · 취소 · 수량 복원은 그대로 동작.
- KPA/KCos 이벤트 · 일반 진열 행 유일성은 원래부터 전체 UNIQUE 이므로 영향 없음.

## 3. 격리 DB 검증 (PostgreSQL 15.17, docker 일회용, 검증 후 삭제)

| 항목 | 결과 |
|---|---|
| baseline fresh bootstrap + incremental 1..16 (`src/migrate.ts`) | SUCCESS · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · fingerprint `c8325ff5…` (6155 lines) — `expected-schema-states.ts` 갱신 |
| `idx_org_listing_unique_v2` 정의 | `(organization_id, service_key, offer_id)` · WHERE 없음(전체 UNIQUE) |
| [1단계] 구버전 `ON CONFLICT (cols) DO UPDATE` ×2 | 성공 · 1행 |
| [1단계] 신버전 `ON CONFLICT (cols) WHERE service_key <> 'neture-event-offer'` DO NOTHING / DO UPDATE | 성공 · 1행 유지 |
| [1단계] 같은 조직 · 이벤트 offer 두 번째 행 | `duplicate key` — API 가 409 로 사전 차단하는 범위 |
| [2단계 시뮬레이션, ROLLBACK] 부분 UNIQUE 교체 후 신버전 | 성공 |
| [2단계 시뮬레이션] 구버전 `ON CONFLICT (cols)` | `no unique or exclusion constraint matching the ON CONFLICT specification` — 2단계 이후 구버전 롤백 불가 근거 |
| [2단계 시뮬레이션] 이벤트 두 번째 행 | 성공 |
| 통합 spec `neture-pharmacy-commerce.integration` | 18/18 PASS — 기본 가입 · 세미프랜차이즈 · 공급 제안 · 이벤트(재신청 409) · 모집 · 장바구니 · 주문 · 테스트 결제 · 공급자 주문 · **pharmacy 호스트 이용 자격 SQL**(단계별 next · 정지 · 탈퇴 · kpa-society 재해석 금지) |

## 4. 단위 · 빌드 검증

| 대상 | 결과 |
|---|---|
| api-server jest (handoff 4 · 세미프랜차이즈 handoff 신규 · 로그인 eligibility · email/google auth · service-catalog 2 · community catalog · neture-pharmacy rules) | 11 suites · 326 PASS |
| api-server jest (schema drift classifier · auth migration guard · google-only cleanup) | 53 PASS · 4 skipped(기존) |
| api-server `tsc --noEmit` | 0 error |
| auth-react vitest | 106 PASS |
| web-kpa-society vitest (MembershipGate 세미프랜차이즈 신규 포함) | 40 PASS · `tsc` 0 · `vite build` 성공 |
| web-neture `tsc` | 0 error |

실브라우저 smoke 는 하지 않았다 — 운영 배포 전이고 Google 인증 약국 계정이 없다(§6 의 운영 검증 항목).

## 5. 전환 순서 (실행 안 함 — 사용자 승인 후)

1. 이 PR + PR #308 계열 main 통합(production 통합 큐 순서).
2. API 배포 = 1단계 migration 자동 실행(CI). 인덱스 불변이므로 배포 중 구 revision 과 신 revision 이 공존해도 쿼리 실패 없음.
3. web-kpa-society(pharmacy 호스트) · web-neture · web-store 배포. 화면이 API 보다 먼저 나가도 `service-access` 조회 실패 → 기존 membership 판정(차단 쪽)으로 닫힌다.
4. 운영 검증 흐름: **로그인 → 기본 가입 신청 → 운영자 승인 → pharmacy 세미프랜차이즈 신청 → 담당 운영자 승인 → pharmacy.neture.co.kr 직접 로그인 · store → pharmacy handoff 접근(MembershipGate 통과) → 내 매장 공급 옵션 → 장바구니 → 주문 → 테스트 결제**. 각 미충족 단계에서 안내 문구 · 신청 링크 확인.
5. 안정화 후 2단계 migration WO(부분 UNIQUE + 409 해제).

## 6. 롤백 가능 범위

| 시점 | API 롤백 대상 | 비고 |
|---|---|---|
| 1단계 배포 후 | migration 이전 API 까지 전부 가능 | 인덱스 불변 · 새 테이블/컬럼(nullable)은 구버전이 읽지 않음. `seller_recruitments` 유일성은 `semi_franchise_id` 포함 `NULLS NOT DISTINCT` 로 바뀌지만 구버전 쓰기(semi_franchise_id NULL)에는 기존과 같은 유일성이며 구버전 코드에 이 제약 대상 `ON CONFLICT` 없음. 단 새 API 가 세미프랜차이즈별 모집을 만든 뒤 롤백하면 구버전 화면에 같은 제품 · 공급자 모집이 여러 건 보일 수 있다(데이터 표시 차이, 쿼리 실패 아님) |
| 2단계 배포 후 | 1단계 이후 API 까지만 | 구버전 `ON CONFLICT (cols)` 실패(§3). 더 되돌리려면 인덱스를 전체 UNIQUE 로 먼저 복원해야 하며, 그 시점에 이벤트 중복 행이 있으면 복원 불가 |
| 화면 | 언제든 가능 | 구 화면은 kpa-society membership 만 보므로 세미프랜차이즈 약국이 다시 403 안내를 받을 뿐 |

## 7. 담당 경계 · 남은 사항

- **인증 · 가입 트랙 소유 파일을 이번에 수정했다**(사용자 지시 "직접 로그인과 handoff 에 동일하게 적용"): `services/auth/email-auth.service.ts` · `google-auth.service.ts` · `modules/auth/controllers/{email-auth,google-auth,handoff}.controller.ts` · `common/auth/service-login-eligibility.policy.ts` · `config/service-catalog.ts`(`semiFranchiseAccessKey`) · `packages/auth-react`(`serviceAccess` 노출) · web-kpa-society `MembershipGate` · `LoginModal` · `HandoffPage` · web-neture `home-entry.ts`. 변경은 kpa-society 대상 + `semiFranchiseAccessKey` 가 있을 때만 동작하는 추가 분기이고, 다른 서비스 · 기존 active membership 경로는 무변경(테스트로 고정). 인증 트랙 리뷰 대상.
- KPA forum 계열 backend 라우트는 kpa-society membership 을 요구 → 세미프랜차이즈 자격만 있는 약국은 그 화면 불가(공통 Forum 트랙 `WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`).
- PR #328 은 이 변경과 합치지 않았다. #328 CHECK 의 운영 전환 절(§9-5 · §9-7)에서 이 문서를 선행 조건으로 참조하도록 후속 갱신 필요.
- merge · promote · 변수 설정 · 운영 DB 변경 · 데이터 정리 · LB/도메인 변경 · 기존 PH 서버/도메인/인증서 변경: **0 건**.
