# CHECK-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1

> **WO**: [`WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1`](../work-orders/WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md)
> **상태**: IMPLEMENTED — 구현·검증 완료, production migration/deploy 및 smoke 는 §14~§16 (push 후 갱신)
> **날짜**: 2026-09-17 · **작성**: Claude Code (Opus 5)
> **원칙**: 검증하지 않은 것을 PASS 로 쓰지 않는다. 기존 회원 acceptance backfill 0 · 개인정보/role/membership 변경 0.

---

## 1. 시작 Git 상태

- 착수 HEAD `3f9bcb7e2`(약관 원문 DRAFT 등록) == origin/main. 작업 중 타 세션이 같은 작업트리에서 WO-2A(`ae2e7fe32` · migration `1789648511051` + expected state 6)를 커밋·push → 이 WO 의 migration 은 **그 뒤 순서(7번째 incremental)** 로 등록했다. 타 세션 파일 접촉 0.
- 로컬 유일 잔여: `apps/main-site/` 디렉터리(git 미추적 잔존물 · `main-site-full-source-deletion.spec` 로컬 FAIL 원인 · 이 WO 무관 · 삭제하지 않음).

## 2. Migration / schema

| 항목 | 값 |
|---|---|
| 파일 | `apps/api-server/src/database/migrations/1789649959243-CreateUserPolicyAcceptances.ts` (`CreateUserPolicyAcceptances1789649959243`) |
| manifest | `INCREMENTAL_MIGRATIONS[6]` (WO-2A `1789648511051` 뒤) |
| expected state 7 | `dfc42b8e72e3672b132bf5cb8106d6707d15de3d7a4f3961d5a876475ecddbd4` · 5745 lines — 격리 PostgreSQL 15.19(docker `postgres:15`) fresh bootstrap + incremental 1..6 (`npx tsx src/migrate.ts`) 산출 |
| 검증 | fresh DB: `INCREMENTAL_EXECUTED = 6` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS` / 같은 DB 재실행: `PREFIX 6/6` · `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · `INCREMENTAL_PENDING = 0` · SUCCESS / `down()` = `DROP TABLE` (트랜잭션 내 실행·ROLLBACK 확인) |
| 계약 검사 | `node scripts/db/check-migration-contract.mjs` 21 pass / 0 fail (C10 orphan 0 · C22 lockstep 7/7) · classifier jest 29/29 (실 PG) |
| 금지 준수 | users 컬럼 삭제 0 · backfill 0 · role/membership 변경 0 · 기존 policy document 변경 0 |

## 3. `user_policy_acceptances` 최종 구조

```text
id                 uuid PK DEFAULT gen_random_uuid()
user_id            uuid NOT NULL  FK → users(id)                     (RESTRICT · cascade 미적용)
service_key        varchar(50) NOT NULL
policy_document_id uuid NOT NULL  FK → service_policy_documents(id)  (RESTRICT)
document_type      varchar(50) NOT NULL          ('terms')
version            integer NOT NULL
content_hash       char(64) NOT NULL             (sha256 hex · 원문 그대로)
acceptance_kind    varchar(20) NOT NULL DEFAULT 'agreement'  CHECK IN ('agreement','acknowledgement','consent')
accepted_at        timestamptz NOT NULL DEFAULT now()
created_at         timestamptz NOT NULL DEFAULT now()
UNIQUE (user_id, service_key, policy_document_id) · INDEX (user_id) · INDEX (policy_document_id)
```

FK delete policy 판정: users 하드 삭제는 이미 FK 위반 시 `isActive=false` 폴백(`AdminUserController.deleteUser`) → 동일 거동. policy document 는 물리 삭제 없음(archive 만). 격리 PG 에서 승낙된 문서·사용자 DELETE 가 FK 로 차단됨을 확인.

## 4. Published policy immutability 판정

- **이전**: `PUT /api/v1/admin/services/:key/policies/:id` 가 published 문서의 content · version · effective_date 를 그대로 덮어썼다(archived 만 차단).
- **수정**: published 문서에 content/version/effectiveDate 변경 요청 → `409 PUBLISHED_POLICY_IMMUTABLE`. title/slug/changeReason 은 허용. 변경은 새 draft → 새 version → publish(기존 publish 흐름이 구 published 를 draft 로 내려 row 보존).
- acceptance row 에 `content_hash` 저장 → 승낙 당시 본문 동일성 검증 가능. public policy DTO 에 `id` · `contentHash` 추가.

## 5. 신규 가입 acceptance 흐름 (§9 · §10)

- DTO `policyDocumentId?` · `policyVersion?` 추가(`register.dto.ts`).
- `AuthRegisterController.register`: 해당 serviceKey 의 **현재 published terms** 를 DB 로 조회 → `checkSignupTermsDocument`: published 있음 + id 누락 → `400 TERMS_DOCUMENT_REQUIRED` · 다른 문서/버전 → `409 TERMS_DOCUMENT_MISMATCH` · published 없음(게시 전 · 4 서비스 외 키) → 요구하지 않음(legacy `tos` 불리언 흐름).
- 승낙 저장은 **user 생성/membership 생성과 같은 `AppDataSource.transaction`** 안(`recordAcceptance(…, manager)`) — 신규 사용자·기존 사용자 서비스 추가 두 경로 모두. 실패 시 전체 rollback.
- PH `POST /pharmacy-hub/join` 은 body 를 그대로 `register` 에 넘기므로 동일 계약.

## 6. PharmacyHub 수정

`JoinPage.tsx`: `tos: true` · `privacyAccepted: true` 하드코딩 **제거**. 약관 동의 fieldset 신설 — 이용약관(`/terms` 새 탭 링크) · 개인정보 처리방침(`/privacy`) 필수 체크박스 2개, 미체크 시 버튼 비활성 + 제출 차단. `usePublishedPolicyDocument('pharmacy-hub','terms')` 로 id/version 을 payload 에 실음(`...terms.signupFields`).

## 7. K-Cosmetics 수정

`RegisterPage.tsx`: 기존 체크박스에 `/terms` · `/privacy` 실제 `<Link>` 추가(새 탭). terms id/version payload 연결. `PolicyDocumentPage.loadPolicy` export.

## 8. Neture / KPA 연결

- Neture `RegisterModal.tsx`: 링크 기존 유지 · id/version payload 연결 · 버전 표시.
- KPA `RegisterModal.tsx`: 링크(`/policy`) 기존 유지 · id/version payload 연결. `lib/legalDocument.ts` 에 legacy fallback 없는 canonical `loadPolicy` 추가(승낙 대상은 `service_policy_documents` row 여야 하므로).

## 9. 기존 회원 pending 판정 (§15)

`PolicyAcceptanceService.getPendingForUser`: published terms(서비스별 `DISTINCT ON` 최신 1건 · 60s 캐시) × 사용자 membership(status ∈ {active, pending}) − 승낙 row. **published 0 → acceptance 테이블 미조회** → 게시 전에는 아무도 차단되지 않고 migration 전 코드 배포도 안전. 사용자별 "pending 없음" 만 60s 캐시(부정 결과 미캐시 → 다른 인스턴스에서 승낙해도 즉시 통과).

정책 결정(구현 시 확정): 4 서비스 본문이 동일한 통합약관이므로 **경로→서비스 매핑 없이 pending 이 하나라도 있으면 차단**하고, 프론트 재동의 화면이 pending 전부를 한 번의 동의로 제출한다(cross-service 경로 `lms/forum/store` 는 경로만으로 서비스를 신뢰할 수 없음).

## 10. 프론트 재동의 UX (§17)

- `@o4o/auth-react` `useServiceAuth`: `pendingPolicyAcceptances`(로그인·/auth/me raw 응답에서 `toUser` 와 무관하게 보존) · `acceptPendingPolicies()`(pending 순서대로 `POST /auth/policy-acceptances` → `refresh()`), logout 시 초기화. `readPendingPolicyAcceptances` export.
- `@o4o/shared-space-ui` `PolicyAcceptanceGate`: pending 있으면 children 대신 **닫을 수 없는** 화면(`role=dialog aria-modal`) — 약관 전문(public API · id 대조, 불일치 시 "갱신됨·새로고침" 안내로 동의 차단) · 필수 체크 · [동의하고 계속하기] · [로그아웃] · [전문 새 탭]. `allowPaths`(`/terms` `/privacy` · KPA `/policy`)만 예외. `usePublishedPolicyDocument` 훅(가입 화면).
- 4 서비스: `TermsAcceptanceGate` wrapper(서비스 AuthContext + loader 주입) 로 `<Routes>` 전체를 감쌈(PH·KCos·Neture·KPA). AuthContext 4곳에 `pendingPolicyAcceptances` · `acceptPendingPolicies` 노출.

## 11. 서버 gate · allowlist (§18 · §19 · §22)

- `common/auth/terms-acceptance.policy.ts`(순수) + `authentication.middleware.ts` `enforceTermsAcceptance` — `requireAuth` · `requirePlatformUser` 두 곳, `enforceAccountAccess` 직후(Core 접촉 = import 1 + 호출 2줄). 판정 SSOT 는 DB, JWT 미사용.
- pending + allowlist 외 → `428` `{ code: 'TERMS_ACCEPTANCE_REQUIRED', pendingPolicyAcceptances: [...] }`.
- allowlist(METHOD + 정확 경로): `/api/v1/auth/me` `verify` `status` `logout` `logout-all` `resend-verification` `services` · legacy `/api/auth/*` 동일 · `GET|POST /api/v1/auth/policy-acceptances` · 서비스별 가입 상태 4경로(restricted allowlist 와 동일). public 경로·refresh·비밀번호 재설정·공개 문의는 requireAuth 를 거치지 않으므로 자동 허용.
- prefix 예외 `/api/v1/admin/` `/api/admin/`(플랫폼 관리 콘솔 · §22): role guard 가 별도로 지켜 일반 회원에게는 403 → 우회 경로 아님. 서비스 운영자 콘솔(`/kpa/operator/**` 등)은 예외 아님.
- 판정 DB 오류 = fail-open + warn(인증 hot path 500 방지 · 계정 차단은 기존 fail-closed 유지).

## 12. API 계약

| 경로 | 인증 | 요청 | 응답 |
|---|---|---|---|
| `GET /api/v1/auth/policy-acceptances` | requireAuth | — | `{ success, data: { pending: PendingPolicyAcceptance[] } }` |
| `POST /api/v1/auth/policy-acceptances` | requireAuth | `{ serviceKey, policyDocumentId, version? }` | `{ success, data: { accepted: { serviceKey, documentType, policyDocumentId, version, created }, pending } }` · 거부: 400 VALIDATION_ERROR · 403 MEMBERSHIP_NOT_FOUND/NOT_ACTIVE · 404 POLICY_NOT_FOUND · 409 POLICY_TYPE_MISMATCH / POLICY_NOT_PUBLISHED / POLICY_SERVICE_MISMATCH / POLICY_NOT_CURRENT / POLICY_VERSION_MISMATCH |
| `POST /api/v1/auth/login` · `GET /api/v1/auth/me` | — | — | `user.pendingPolicyAcceptances: [{ serviceKey, documentType, policyDocumentId, version, title }]` (본문 없음) |
| `GET /api/v1/public/services/:key/policies/:type` | public | — | 기존 + `id` · `contentHash` |
| `PUT /api/v1/admin/services/:key/policies/:id` | admin | published 의 content/version/effectiveDate 변경 | `409 PUBLISHED_POLICY_IMMUTABLE` |
| 인증 API 전반 | requireAuth | pending 상태 | `428 TERMS_ACCEPTANCE_REQUIRED` |

mount: `app.use('/api/v1/auth/policy-acceptances', …)` (register-routes · Core `auth.routes.ts` 불변).

## 13. 기존 acceptance backfill 0

migration 은 CREATE TABLE/INDEX 만. `users.tos_accepted_at` 은 유지되며 판정에 쓰지 않는다(승낙 시 갱신만). 기존 회원 row 생성 경로 = `POST /auth/policy-acceptances` 명시 제출뿐.

## 14. tests / build

| 항목 | 결과 |
|---|---|
| api-server tsc `--noEmit` | 0 error |
| api-server jest `terms-acceptance-gate.spec` | **24/24** (순수 판정 · 서비스 스텁 · requireAuth 428/allowlist/승낙 후 통과/내부 관리자 0 차단/fail-open) |
| api-server jest `terms-acceptance-isolated-pg.spec` (실 PG15 · `O4O_ISOLATED_PG_URL`) | **2/2** (DISTINCT ON · ANY(uuid[]) · ON CONFLICT 멱등 · 새 버전 재발생 · FK RESTRICT) · env 없으면 skip |
| api-server jest 회귀 `restricted-account-access` · `service-legal` · classifier | pass |
| api-server jest 전체 | 로컬 `main-site-full-source-deletion.spec` 2건 FAIL — `apps/main-site/` 로컬 잔존 디렉터리 원인(이 WO 무관 · CI 에는 없음). 그 외 §16 갱신 |
| api-server eslint(변경 파일) | 신규 error 0 (기존 warning 2 그대로) |
| `@o4o/auth-react` vitest | **49/49** (+5: pending 보존 · 형태 오류 [] · accept→refresh · 409 결과 · logout 초기화) · tsc 0 |
| `@o4o/shared-space-ui` vitest | 전체 pass (+6 `PolicyAcceptanceGate.test`) · tsc 0 |
| 4 서비스 `tsc -b` | PH · KCos · Neture · KPA 모두 0 error |
| PH `vite build` | 성공 |
| eslint(4 서비스 변경 파일) | 신규 error 0 (기존 exhaustive-deps warning 2 그대로) |

## 15. production migration / deploy

(push 후 갱신)

## 16. production smoke

(deploy 후 갱신)

## 17. 개인정보 / role / membership 변경

- 개인정보 처리방침 · 개인정보 필드(`privacy_accepted_at` · `marketing_accepted`) 변경 0. 이용약관 acceptance 와 혼합 저장 0(§14).
- role_assignments · service_memberships 변경 0.

## 18~20. commit · push · 최종 Git 상태

(push 후 갱신)

## 21. 통합약관 v1 게시 가능 여부

(§15·§16 후 판정)
