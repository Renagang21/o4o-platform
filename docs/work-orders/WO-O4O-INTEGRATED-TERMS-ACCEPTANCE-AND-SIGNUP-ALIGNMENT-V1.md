# WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1

> **성격**: 구현 WO — [`O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0`](../baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md)(DRAFT) 의 **게시 선행조건 2건**(가입 UI 정비 · 약관 acceptance 이력 + 기존 회원 재동의 게이트)을 한 번에 완료한다.
> **상태**: IMPLEMENTED (2026-09-17) — 구현·로컬 검증 완료, production migration/deploy/smoke 는 CHECK [`CHECK-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1`](../checks/CHECK-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md) §15~§16
> **Migration 승인**: 이 WO 승인 자체가 `user_policy_acceptances` 신규 테이블 migration 승인이다(§2 · §24). 그 외 schema 변경 금지.
> **설계 확정(2026-09-17)**: ① acceptance history 신규 테이블 + `users.tos_accepted_at` 은 legacy snapshot 유지 · v1 소급 backfill 0 ② 재동의 게이트 = **하이브리드**(로그인 허용 · `pendingPolicyAcceptances` · 닫을 수 없는 재동의 화면 · 서버 `428 TERMS_ACCEPTANCE_REQUIRED` + allowlist). 테이블명은 `consents` 가 아니라 **`acceptances`**(개인정보 동의 consent 와 계약상 승낙 acceptance 구분).
> **선행**: [`IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1`](../investigations/IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1.md) §4(TIMESTAMP_ONLY) · §5 · §10 · 약관 원문 DRAFT `3f9bcb7e2`
> **후속**: 완료 → 약관 DRAFT → ACTIVE · `service_policy_documents` 4 서비스 `terms` v1 publish · 기존 회원 pending 재동의 시작 · CANONICAL-INDEX §7 등록
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)(auth-core 접촉 시 최소) · [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md)(serviceKey 는 경로에서만) · CLAUDE.md §8
> **법적 근거(사용자 제시)**: 약관규제법 §3(명시·설명) · 전자문서 및 전자거래 기본법 §4(전자문서 효력) · 개인정보보호법 §22(동의 구분)

---

## 1. 목적

O4O 통합 서비스 이용약관 v1.0 게시를 위한 두 선행조건을 한 번에 완료한다.

1. 활성 4서비스 가입화면의 약관 명시·동의 구조 정비
2. 약관 문서·버전별 동의 이력 및 기존 회원 재동의 게이트 구축

대상 서비스: neture · kpa-society · k-cosmetics · pharmacy-hub

## 2. Migration 승인

이번 WO는 신규 약관 acceptance history 저장구조를 위한 migration을 명시적으로 승인한다. 기존 schema에 억지로 저장하지 않는다.

신규 테이블명: **`user_policy_acceptances`**. `consents` 라는 이름은 사용하지 않는다 — 이용약관 = 계약상 acceptance / 개인정보 처리방침 = 고지·확인 / 마케팅 개인정보 처리 = consent 를 법적 성격상 구분하기 위함.

## 3. 신규 테이블 기본 구조

최소: `id · user_id · service_key · policy_document_id · document_type · version · content_hash · acceptance_kind · accepted_at · created_at`

- `user_id` 동의한 사용자 · `service_key` 동의가 이루어진 서비스(neture / kpa-society / k-cosmetics / pharmacy-hub)
- `policy_document_id` 실제 동의한 `service_policy_documents.id` · `document_type` 이번 WO 에서는 `terms` · `version` 실제 policy document version
- `content_hash` 사용자가 동의한 본문의 SHA-256 등 안정적인 hash
- `acceptance_kind` 이번 약관은 `agreement` · 향후 `acknowledgement` · `consent` 등 별도 의미로 확장 가능
- `accepted_at` 명시적 동의시각

## 4. 제약조건

최소 unique: `user_id + service_key + policy_document_id` (동일 문서 중복동의를 반복 저장하지 않는다).
FK: `user_id → users.id` · `policy_document_id → service_policy_documents.id`. 정확한 delete policy 는 기존 User/Policy lifecycle 을 확인해 결정한다. 무분별한 cascade 를 추측하여 적용하지 않는다.

## 5. Published 문서 무결성

동의 증빙은 "어느 문서에 동의했는가"가 유지되어야 한다. 확인: published policy 의 content 가 게시 후 직접 수정 가능한가 · version/effective date 를 동일 row 에서 변경 가능한가.
권고: published 문서는 내용 수정 불가. 변경 시 새 draft 생성 → 새 version → publish → 구 version 보존. 기존 published row 를 덮어쓰지 않는다. `content_hash` 도 acceptance row 에 저장하여 동의 당시 본문 동일성을 검증할 수 있게 한다.

## 6. 기존 `users.tos_accepted_at`

삭제하지 않는다. 하위호환용 legacy snapshot 으로 유지한다. 신규 약관 동의가 발생하면 `users.tos_accepted_at = 최근 terms acceptance 시각` 으로 갱신할 수 있다. 그러나 약관 동의의 SSOT 는 `user_policy_acceptances` 이다. `tos_accepted_at` 만으로 특정 버전 동의를 판정하지 않는다.

## 7. 기존 동의의 소급 인정 금지

기존 users 의 `tos_accepted_at` 을 이용하여 통합약관 v1 동의를 자동 생성하지 않는다(당시 published 통합약관 0 · 버전 추적 0 · 본문 입증 불가). **`BACKFILL_V1_ACCEPTANCE = 0`**. 기존 활성 회원은 v1 을 직접 열람하고 명시적으로 동의한다.

## 8. 서비스별 기록 원칙

통합약관 v1 본문은 4서비스 공통이지만 membership 과 이용계약 진입점은 서비스별로 관리된다. v1 에서는 acceptance 도 `user × serviceKey × policyDocument` 기준으로 기록한다. 향후 하나의 플랫폼 동의로 통합할 필요가 생기면 별도 정책으로 검토한다.

## 9. 신규 회원가입

활성 4서비스 회원가입은 모두 현재 published `terms` 문서를 조회한다. 회원가입 UI 가 보여준 약관과 실제 저장되는 acceptance 가 동일해야 한다. 프론트는 최소 `policyDocumentId · version` 을 알고 있어야 하고 가입 요청 시 서버로 전달한다. 서버는 클라이언트 값을 그대로 신뢰하지 않고 `service_key · document_type=terms · status=published · policy_document_id · version` 이 현재 published 약관과 일치하는지 재검증한다. 일치하지 않으면 가입을 완료하지 않는다.

## 10. 신규 회원 acceptance 저장

가입 성공 시 가능한 한 동일 트랜잭션 또는 원자성 있는 흐름에서 ① user 생성 ② service membership 생성 ③ terms acceptance 저장. 약관 동의 저장이 실패했는데 회원가입만 성공하는 partial state 를 남기지 않는다.

## 11. PharmacyHub 가입 UI 수정

현행 `tos: true` · `privacyAccepted: true` 하드코딩을 제거한다. 실제 UI 에 **필수**: O4O 통합 서비스 이용약관 링크(`/terms`) + 이용약관 동의 체크박스. 사용자가 직접 체크하지 않은 경우 회원가입 불가. 개인정보 처리방침 링크 `/privacy`. 개인정보 처리방침은 이용약관 acceptance 와 별도의 법적 문서다 — 기존 `privacyAccepted` 계약을 유지하더라도 이용약관 acceptance history 와 혼합 저장하지 않는다.

## 12. K-Cosmetics 가입 UI 수정

기존 체크박스는 유지하되 실제 문서 열람 링크를 추가한다(이용약관 → `/terms` · 개인정보 처리방침 → `/privacy`). 이용약관 checkbox 는 실제 terms document id/version 과 연결한다.

## 13. Neture / KPA 가입

이미 약관 링크가 존재하더라도 신규 acceptance history 를 위해 동일하게 정렬한다. Neture `/terms` · KPA Society 현재 canonical 약관 경로 `/policy`. 4서비스 모두 같은 backend acceptance 계약을 사용한다.

## 14. 개인정보 처리방침과 이용약관 분리

이번 테이블에 무조건 개인정보 처리방침 "동의"를 같이 기록하지 않는다. 개인정보 처리방침 확인 · 실제 개인정보 동의 · 마케팅 선택동의의 법적 성격을 구분한다. 이번 WO 의 mandatory acceptance 대상은 `document_type = terms · acceptance_kind = agreement`. 기존 개인정보 관련 필드는 이번 WO 에서 대규모 리팩토링하지 않는다.

## 15. 기존 회원 재동의 판정

로그인 성공 자체를 막지 않는다. 로그인 후 현재 진입 serviceKey 의 최신 published terms 를 조회하고, `user + service + policy_document_id` 가 일치하는 acceptance 가 없으면 `PENDING`, 있으면 `accepted`.

## 16. 로그인 응답

로그인 응답 및 필요 시 `/auth/me` 에 `pendingPolicyAcceptances` 를 추가한다.

```json
[{ "serviceKey": "kpa-society", "documentType": "terms", "policyDocumentId": "...", "version": 1, "title": "O4O 통합 서비스 이용약관" }]
```

본문 전체를 로그인 응답에 싣지 않는다. 프론트는 public policy API 를 이용해 본문을 연다.

## 17. 기존 회원 UX

`pendingPolicyAcceptances` 에 필수 terms 가 존재하면 서비스 shell 진입 직후 약관 동의 화면을 표시한다. 단순 dismiss 가능한 modal 로 만들지 않는다. 가능 동작: 약관 전문 보기 · 동의 · 로그아웃. 동의하지 않은 사용자가 뒤로가기·직접 URL 입력으로 보호 서비스 화면을 정상 이용할 수 없어야 한다.

## 18. 서버측 게이트

프론트 게이트만으로 끝내지 않는다. 공통 middleware/guard: `authenticate → service membership 확인 → required terms acceptance 확인 → route handler`. 필수 약관 미동의 시 `HTTP 428 · code = TERMS_ACCEPTANCE_REQUIRED`. 기존 API 오류계약과 더 적합한 status 가 있다면 일관성을 우선하되 코드값은 명시적으로 유지한다.

## 19. 게이트 Allowlist

약관 미동의 상태에서도 최소: 로그인 · 로그아웃 · refresh · `/auth/me` · public terms 조회 · public privacy 조회 · terms acceptance 제출 · 비밀번호 재설정·계정보안 경로 · 공개 문의/contact. 약관 동의를 위해 필요한 API 자체를 게이트가 막아서는 안 된다.

## 20. 약관 동의 API

공통 authenticated endpoint `POST /api/v1/auth/policy-acceptances`. 입력 최소값 `serviceKey · policyDocumentId`. 서버 검증: 현재 사용자 · 활성/허용된 service membership · document_type=terms · status=published · 해당 serviceKey · 현재 적용 약관 · version/content hash. 검증 성공 후 acceptance 저장. 클라이언트가 임의 policy document 를 acceptance 로 제출할 수 없어야 한다.

## 21. 동의하지 않는 경우

신규 가입: terms 동의 없으면 가입 불가. 기존 회원: 로그인 가능 · 약관 열람 가능 · 문의 가능 · 로그아웃 가능 · 보호 서비스 이용은 동의 전 제한. 자동동의로 처리하지 않는다.

## 22. 대상 계정

재동의 게이트는 실제 외부 서비스 이용자(일반회원 · 약사 · 약대생 · 매장 경영자 · 공급자 · 강사 · 외부 서비스 운영자)에게 적용한다. 내부 플랫폼 관리자 계정이 service membership 없이 admin dashboard 만 사용하는 경우 통합 서비스 약관 재동의 때문에 관리업무를 차단하지 않는다. 동일 계정이 일반 서비스 membership 도 가지고 있다면 해당 서비스 이용 시에는 일반 규칙을 적용한다.

## 23. 계정 상태

suspended/rejected/deleted 계정을 재동의시키기 위해 로그인 제한을 우회하지 않는다. 현재 account-access 정책을 그대로 우선한다. 계정이 정상 상태로 복구되어 실제 서비스를 이용할 때 필요한 terms acceptance 를 확인한다.

## 24. Migration

허용: `user_policy_acceptances` 신규 table · 필요한 index/FK/unique constraint.
금지: `users` 기존 consent 컬럼 삭제 · 기존 동의값 v1 acceptance 로 backfill · role/membership 변경 · 기존 policy document 변경 · unrelated schema cleanup.

## 25. 약관 게시 순서

이번 WO 가 완료될 때까지 통합약관 v1 을 production published 상태로 전환하지 않는다.

```text
1. migration → 2. acceptance API/backend → 3. 4서비스 signup UI → 4. 기존회원 pending gate → 5. production deploy → 6. regression → 7. 통합약관 DRAFT 최종 확인 → 8. 4서비스 terms v1 publish → 9. 기존 회원 pending 재동의 시작
```

약관이 published 되기 전에는 latest published terms 가 없으므로 재동의 게이트가 기존 회원을 임의 차단해서는 안 된다.

## 26. 테스트

- Migration: table 생성 · FK · unique · rollback 가능 여부
- 신규 가입(4서비스): terms 미체크 → 실패 · 체크 → 성공 · 정확한 policy_document_id 저장 · 다른 service 문서 제출 → 거부 · draft/archived 문서 제출 → 거부
- 기존회원: acceptance 없음 → pending · pending → protected API 제한 · terms/public/acceptance API 이용 가능 · acceptance 저장 → pending 제거 · 정상 이용
- 회귀: suspended/rejected login 정책 유지 · admin dashboard 내부 관리자 회귀 없음 · `/privacy` 4서비스 회귀 없음 · 기존 membership/role 변경 0

## 27. 기존 회원 실데이터 변경

migration 및 코드 배포 과정에서는 기존 회원의 acceptance row 를 임의 생성하지 않는다(`existing acceptance insert = 0`). 실제 row 는 회원이 명시적으로 v1 약관에 동의할 때 생성한다. 테스트계정으로 production smoke 를 수행하는 경우 해당 테스트 계정의 acceptance 생성 사실을 명확히 보고한다.

## 28. 완료조건

```text
user_policy_acceptances = production schema deployed
legacy tos_accepted_at = retained · v1 fake backfill = 0
PH hardcoded tos=true = 0 · PH terms checkbox/link = PASS · KCos terms/privacy links = PASS · Neture/KPA exact policy tracking = PASS
login allowed before reconsent · pendingPolicyAcceptances = correct · frontend blocking UX = PASS · server bypass = impossible · acceptance submit = PASS · accepted user service access = PASS
admin-only account regression = 0 · privacy policy regression = 0
```

## 29. 완료 보고

1 시작 Git 상태 · 2 migration/schema · 3 `user_policy_acceptances` 최종 컬럼·constraint · 4 published policy immutability 판정 · 5 신규 가입 acceptance 흐름 · 6 PH 수정 · 7 KCos 수정 · 8 Neture/KPA 연결 · 9 기존 회원 pending 판정 · 10 프론트 재동의 UX · 11 서버 gate 및 allowlist · 12 API 계약 · 13 기존 acceptance backfill 0 확인 · 14 tests/build · 15 production migration/deploy · 16 production smoke · 17 개인정보/role/membership 변경 여부 · 18 commit SHA · 19 push · 20 최종 Git 상태 · 21 통합약관 v1 게시 가능 여부

> 설계의 핵심: **"로그인은 되지만 약관을 무시하고 서비스를 계속 쓸 수는 없는 상태"**. 프론트 모달만 두면 API 직접 호출로 우회할 수 있고, 로그인 자체를 막으면 약관 열람·동의 제출·계정 복구가 복잡해진다.
