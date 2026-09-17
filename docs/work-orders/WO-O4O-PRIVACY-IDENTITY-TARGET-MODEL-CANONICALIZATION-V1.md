# WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1

> **성격**: **문서 정본화 전용** — 사용자 승인된 개인정보·Identity Target Model 을 Architecture 정본으로 승격한다. 코드 · DB · migration · production data · API 계약 변경 없음.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **선행 완료**: [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md) · [`IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1`](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md)(`0e119389d`) · [`IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1`](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md)(`942ca7ae9`, 판정 **`APPROVE_WITH_REVIEW`** → 사용자 승인 2026-09-17) · [`WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1`](WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1.md)(CLOSED)
> **관련 정본**: [`O4O-IDENTITY-ARCHITECTURE-V2`](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md)(CANONICAL · **L2 password 충돌 해결 대상**) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md) · [`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) · CLAUDE.md §16.

---

## 1. 목표와 배경

Census → Phase 1 Target Model → Decision Closure(D1~D7) 로 설계 조사가 끝났다. 이 WO 는 그 결과를 **Phase 2 이후 모든 구현 WO 가 참조할 하나의 Architecture 기준**으로 승격한다.

핵심 제약: 현재 CANONICAL 인 `O4O-IDENTITY-ARCHITECTURE-V2` 의 `L2 = service_credentials.password_hash` 모델은 Google 단일 로그인 정책과 충돌한다. **충돌하는 CANONICAL 문서 두 개를 동시에 남기지 않는다** (§3).

```text
설계 조사 종료 → 본 WO: Architecture 정본 승격 + Identity V2 충돌 해결 → Phase 2 Google Identity 전환 실행계획 WO
```

## 2. 승인 범위

### 2-1. 새 Architecture 정본 작성

우선 후보 경로: `docs/architecture/O4O-PRIVACY-IDENTITY-ARCHITECTURE-V1.md`. 저장소 명명정책상 다른 canonical 경로가 더 적합하면 기존 architecture 체계(`O4O-IDENTITY-ARCHITECTURE-V1/V2` 계열)를 조사해 동일 계열 이름을 쓴다. `CANONICAL-INDEX` 등재는 §16-4 에 따라 보고 후 처리(본 WO 가 명시 WO 이므로 등재 허용).

새 정본 최소 내용 (A~K):

| 절 | 내용 |
|---|---|
| **A. 최소 User** | 필수 = `users.id · status · created_at · updated_at`. `email · name · nickname · phone` = optional profile/contact, Identity Key 아님. Google 가입 직후 추가 개인정보 없이 계정 성립 |
| **B. Authentication Identity** | Google 단일 로그인. `Google sub → linked_accounts → users.id`. 이메일로 Identity 판정 금지 · 이메일 동일성 자동 병합 금지 · 기존 email+password 사용자는 로그인 상태에서 Google 명시 연결 · `linked_accounts` 를 초기 Auth Identity 물리구조로 재사용 · Kakao/Naver 등은 로그인 Identity 대상 아님 |
| **C. Professional Credential** | 논리 정본 = O4O Professional Credential Domain / 초기 물리 = `kpa_pharmacist_profiles` (명시 구분 · KPA 영구 소유 아님). 면허번호 = 보관 · 단일 정본 · 면허증 이미지 미수집 · 서비스에는 원번호 대신 Claim. 초기 verification method `operator_review` 허용 |
| **D. Business / Store / User** | `Business ≠ Store ≠ User` 불변. `organizations` 공용이어도 **별도 row**(Business ⊃ Store A/B). 단일 매장도 분리. Store 정체성은 사업자번호로 결정되지 않음 → 추가 · 양도 · 폐점 · 이전에도 `storeId / organizationId` 의미 안정 |
| **E. Relationship** | Business/Store 관계 = `organization_members` · 분회 = `branch_memberships` · 임원 = `branch_officers`. Relationship("어떤 조직/매장과 관계") ≠ Authorization("어떤 권한") |
| **F. Authorization** | `role_assignments` = Authorization SSOT. `접근 = Role ∧ 필요 Credential ∧ 필요 Relationship`. Credential 변경으로 Role row 자동 삭제 없음 · Role 있어도 조건 미충족이면 거부 |
| **G. Claim** | JWT 현행 유지(`roles[] · memberships[] · accountAccess`). Credential/Relationship 원본은 JWT 에 추가하지 않고 서버 내부 Claim Resolver 로 필요 시 조회. 개인정보 원본을 서비스 JWT 에 넣지 않음 |
| **H. Public Contact vs Connected Channel** | Public Contact Channel = `users.kakao_open_chat_url · users.kakao_channel_url · neture_suppliers.contact_kakao`(공개 연락 표시). Authenticated Connected Channel = `O4O user_id ↔ 외부 메신저 사용자 식별자`(AI 작업 요청 · 업무 자동화 명령 · 결과 전달; KakaoTalk/LINE/WhatsApp 확장 계층). Kakao 단독이어도 별도 구조 필요 · Public URL 을 Connected Identity 로 쓰지 않음 |
| **I. Consent** | 현행 3 컬럼 = 초기 구현 인정. Target Concept 최소 `consent_type · policy_version · accepted_at · withdrawn_at`. 별도 테이블은 지금 요구하지 않음 |
| **J. Business Verification Documents** | 사업자등록증 파일 기본 미수집. 우선순위 `공식 조회/API → 운영자 확인 → 예외 증빙파일`. `kyc_documents.business_registration` = 예외 검증 수단 |
| **K. Session / Refresh** | `refresh_tokens` = `DEAD_RETIRE`, Target Entity Matrix 의 Session SSOT 아님. runtime 기준 = `users.refreshTokenFamily`. 물리 삭제는 후속 Core 예외 WO |

### 2-2. Implementation Review 절 (§4)

REVIEW-8~12 를 새 정본 안에 `Implementation Review` 항목으로 남긴다(Architecture blocker 아님).

## 3. 기존 정본과의 충돌 해결 — `O4O-IDENTITY-ARCHITECTURE-V2`

V2 의 `L2 = service_credentials.password_hash` 는 확정 정책과 충돌한다. **V2 전체 내용과 새 정본 범위를 먼저 비교**한 뒤 최소 문서 변경으로 하나를 택한다.

- **Option A — V3 승격**: V2 의 유효 내용을 보존할 필요가 크면 `O4O-IDENTITY-ARCHITECTURE-V3` 작성(최소 `L1 O4O User · L2 Google Auth Identity · L3 Service Membership · L4 Role Assignment/Authorization`) 후 V2 를 SUPERSEDED.
- **Option B — 새 정본이 V2 역할까지 대체**: 새 Privacy/Identity Architecture 가 V2 범위를 충분히 포함하면 V2 를 새 정본으로 SUPERSEDED.
- **금지**: `V2: service password canonical` 과 `신규: Google sub canonical` 을 동시에 CANONICAL 로 두는 것.

SUPERSEDED 표기는 §16-3 형식(`> **상태**: SUPERSEDED · **대체 문서**: <경로> · **표기일**: YYYY-MM-DD`, 본문 불변). `CANONICAL-INDEX` 상태 행 갱신은 본 WO 가 명시 WO 이므로 허용.

## 4. REVIEW 항목의 Architecture 표현

| # | 내용 | 후속 |
|---|---|---|
| REVIEW-8 | auth-core User 제약(`users.email NOT NULL UNIQUE` · `password NOT NULL` · name 제약) 가 Target 과 충돌 | Phase 2/5 F10 예외 WO |
| REVIEW-9 | organization-core — Business/Store 별도 row · type 확장 · parent/level/path · business_number unique · provisioning code 변경 | organization-core 예외 WO |
| REVIEW-10 | 사업자 공식 검증 — 외부 조회/API 사용 가능 여부 · 운영계약 확인. Target 은 파일 기본수집 금지 | Phase 5 |
| REVIEW-11 | `refresh_tokens` DEAD_RETIRE 물리 제거 — entity/manifest/spec/baseline DDL 동시 처리 | F10 예외 WO |
| REVIEW-12 | Authenticated Connected Channel — Kakao AI Command Channel 개발 시 별도 설계·구현, Public Contact 와 혼합 금지 | Phase 7 |

## 5. 제외 범위

Google 로그인 구현 · email/password 로그인 제거 · `linked_accounts` 코드 변경 · 자동 병합 코드 제거 · DB migration · users constraint 변경 · organizations row 생성 · Business/Store backfill · Credential schema 변경 · 면허번호 암호화 · Claim Resolver 구현 · Connected Channel 구현 · Consent History 구현 · `kyc_documents` 변경 · `refresh_tokens` 삭제 · role guard 변경 · production 데이터 조회/수정. **문서 정본 승격만 수행한다.**

## 6. 검증과 문서 정합

정본 작성 후 최소 교차 확인: `O4O-CORE-FREEZE-V1` · `O4O-IDENTITY-ARCHITECTURE-V2` · `RBAC-FREEZE-DECLARATION-V1` · `USER-OPERATOR-FREEZE-V1` · `O4O-PRIVACY-DATA-RETENTION-POLICY-V1` · `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` · `O4O-BOUNDARY-POLICY-V1`.

- 새 정본과 충돌하는 기존 CANONICAL 문장을 그대로 남기지 않는다(§16-3 인라인 허용 범위 밖이면 보고 + 본 WO 범위 안에서 처리 여부 판단).
- 문서 계층 `Current Canonical / Superseded Canonical / Historical IR / WO` 상태 명확화.
- Phase 1 IR · Decision Closure IR 은 수정하지 않는다(조사 기록 보존).
- Git: `git fetch origin` → `git status -sb` → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. `--force` · `git add .` · stash 금지. 다른 세션 dirty/untracked 파일 무접촉.

## 7. 완료 보고

1. 새 Architecture 정본 파일 2. 정본 문서명과 상태 3. 기존 Identity V2 처리(유지 / 부분 참조 / SUPERSEDED / V3 승격) 4. 최종 Identity 계층 5. 최소 User 정의 6. Professional Credential 논리/물리 정본 7. Business/Store 별도 row 원칙 8. Relationship/Credential/Role 접근식 9. Public Contact / Connected Channel 구분 10. Consent Target 11. Business document 정책 12. `refresh_tokens = DEAD_RETIRE` 반영 여부 13. REVIEW-8~12 후속 Phase 배치 14. 문서 간 충돌 0건 확인 15. `HEAD == origin/main` 16. 작업트리 상태 · `문서 정합:` 한 줄.

판정: **`Architecture Canonicalization: COMPLETE`** 또는 남은 충돌 시 **`BLOCKED`**.

`COMPLETE` 이면 다음 = **Phase 2 Google Identity 전환** 제안(구현 시작 없음). Phase 2 첫 작업은 코드보다 먼저 "Identity V2/V3 정합 결과에 따른 Google Identity Migration 실행계획" WO 작성. 권장 순서: 자동 이메일 병합 제거 → `linked_accounts` Google `sub` 기준 정리 → 기존 로그인 사용자 Google 연결 → 신규 Google 가입 → 계정별 password 폐기.

---

*작성: 2026-09-17 · 상태: **CLOSED — `Architecture Canonicalization: COMPLETE`** (2026-09-17) · 산출물: [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md)(CANONICAL · Option A 변형 = 새 Privacy/Identity 정본을 V3 로 작성, 문서 1개 추가) · [V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) · [V1](../architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) SUPERSEDED 한 줄 표기(본문 불변) · `CANONICAL-INDEX` §4 V3 행 등재 · 코드/DB/migration/production 0 · Phase 1 IR · Decision Closure IR 무수정 · 별도 WO 제안 1건(F10 §5-A · F11 §10 · MYPAGE · OPERATOR-DASHBOARD §3-3 · USER-DOMAIN-SSOT 의 V2/password 참조 정정 — Phase 2 실행계획 WO 에 포함 권장) · 다음 = Phase 2 Google Identity Migration 실행계획 WO*
