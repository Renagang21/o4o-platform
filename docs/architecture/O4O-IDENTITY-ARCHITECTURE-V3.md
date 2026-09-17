# O4O Platform Identity Architecture V3 — Privacy · Identity Target Model

> **Canonical Identity & Privacy Baseline.** 본 문서는 O4O 의 **사용자 · 인증 Identity · 자격(Credential) · 사업자/매장 관계 · 권한 · Claim · 연락/연결 채널 · 동의 · 증빙 · 세션** 의 공식 기준 문서다. [V2](O4O-IDENTITY-ARCHITECTURE-V2.md) 의 "서비스별 password credential" 모델을 **Google 단일 로그인 + 최소 개인정보 User** 모델로 대체한다.

- **상태:** **CANONICAL** (Adopted) — 이후 모든 Identity · 개인정보 관련 IR / WO / 설계 판단은 본 문서를 기준으로 한다
- **채택일:** 2026-09-17 · **채택 WO:** [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1`](../work-orders/WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1.md)
- **승계 대상:** [O4O-IDENTITY-ARCHITECTURE-V2](O4O-IDENTITY-ARCHITECTURE-V2.md) (SUPERSEDED 2026-09-17) · [O4O-IDENTITY-ARCHITECTURE-V1](O4O-IDENTITY-ARCHITECTURE-V1.md) (Legacy → SUPERSEDED)
- **근거 조사(기록물 · 본 문서가 대체하지 않음):** [IR Census](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md) · [IR Phase 1 Target Model](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md) · [IR Decision Closure (D1~D7)](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md)
- **성격:** **방향 · 계약 문서**. 본 채택은 코드 · DB · migration · production 데이터 · API 계약을 변경하지 않는다. 구현은 §16 Phase 순서에 따른 별도 WO 의 책임이며, 동결 Core(F10 · F11) 와 organization-core 를 건드리는 항목은 각 Freeze 의 명시적 예외 승인 절차를 거친다.

---

## 0. 한 줄 요약

```text
O4O User(users.id, 최소 개인정보)
  ├─ Auth Identity      : Google sub → linked_accounts → users.id          (로그인 = Google 단일)
  ├─ Professional Cred. : O4O Professional Credential Domain (초기 물리 kpa_pharmacist_profiles)
  ├─ Relationship       : organization_members · branch_memberships · branch_officers · service_memberships
  ├─ Authorization      : role_assignments (SSOT)   —  접근 = Role ∧ Credential 조건 ∧ Relationship 조건
  ├─ Claim              : JWT 현행(roles[] · memberships[] · accountAccess) + 서버 내부 Claim Resolver
  ├─ Channel            : Public Contact(공개 URL) ≠ Authenticated Connected(user_id ↔ 메신저 식별자)
  ├─ Consent            : 현행 3컬럼(초기) · Target 개념 consent_type/policy_version/accepted_at/withdrawn_at
  ├─ Business Proof     : 공식 조회 → 운영자 확인 → 예외 증빙(kyc_documents.business_registration)
  └─ Session            : users.refreshTokenFamily (stateless JWT) · refresh_tokens = DEAD_RETIRE
Business ≠ Store ≠ User — organizations 공용이어도 별도 row
```

---

## 1. 4-Layer Identity Model (V3)

V2 의 4-Layer 골격은 유지하되 **L1 · L2 의 정의를 교체**한다.

| Layer | 책임 | 물리(현행/초기) | Key | V2 대비 |
|---|---|---|---|---|
| **L1 O4O User** | "이 계정은 누구인가" — 시스템 주체. 개인정보 원본이 아니다 | `users` | `users.id` | **변경** — V2 `email` 전역 키 폐기 |
| **L2 Google Auth Identity** | "어떻게 로그인하는가" — 외부 Identity ↔ User 연결 | `linked_accounts` (provider `google` · providerId = `sub`) | `(provider, provider_user_id)` unique | **변경** — V2 `service_credentials.password_hash` 폐기 |
| **L3 Service Membership** | "어느 서비스의 회원인가 · 어떤 상태인가" | `service_memberships` | `(user_id, service_key)` | 유지 (V2 그대로) |
| **L4 Role Assignment / Authorization** | "무엇을 할 수 있는가" | `role_assignments` | `(user_id, role, is_active)` | 유지 (V2 · F9 그대로) |

L1 만 L2/L3/L4 의 부모다(FK). L2/L3/L4 사이에 직접 FK 는 없다. 본 문서는 여기에 Layer 밖의 **Credential(§4) · Business/Store(§5) · Relationship(§6) · Channel(§9) · Consent(§10) · Business Proof(§11) · Session(§12)** 정의를 더한다.

### 1-1. V2 에서 승계하는 것 / 폐기하는 것

| V2 내용 | V3 처리 |
|---|---|
| 원칙 2 서비스 = 독립 사업자 · 원칙 3 회원의 서비스 범위 독립 · 원칙 5 Role 의 서비스 범위 독립 | **승계** |
| 원칙 1 `1 Email = 1 Identity` | **폐기** → `1 users.id = 1 User`, `1 Google sub = 1 Auth Identity`. 이메일은 Identity Key 가 아니다(§2) |
| 원칙 4 Credential 의 서비스 범위 독립(서비스별 password) | **폐기** → 로그인 자격은 Google 단일. 서비스 독립성은 L3/L4 로 충분히 성립한다 |
| §7.4 Handoff 정책 — Identity transport · target `service_memberships.status='active'` 필수 · generate/exchange 양쪽 검증 · Join 과 분리 | **승계** (해석 A 확정. Google 단일 로그인에서는 해석 B 의 근거가 소멸) |
| §8 Switcher "가입 시 신규 password 입력" | **폐기** — 서비스 가입은 password 없이 L3 row 생성 |
| §9 Freeze 영향(F10 · F11 명시적 예외 승인 절차) | **승계** — 절차는 그대로, 대상 항목만 §13 표로 교체 |
| V1 §3-§8 · §10-§15 (서버/JWT/쿠키/Handoff 메커니즘/Switcher/Account Center/CORS/도메인 3축) | **구조적으로 유지** (V2 와 동일) |
| `service_credentials` 테이블 · dual-read 로그인 | **전환 기간 한정 잔존** — Google 연결 완료 계정부터 의미 상실, Phase 2 마지막 단계(password 폐기)에서 `users.password` 와 함께 정리(§13 REVIEW-8) |

---

## 2. A. 최소 User (L1)

- `users` 의 **필수 컬럼은 `id · status · created_at · updated_at`** 뿐이다. **필수 개인정보는 없다.**
- `email · name · nickname · phone` 은 **optional profile / contact** 다. **Identity Key 가 아니며** 로그인 · 계정 동일성 · 병합 판단에 쓰지 않는다.
- Google 가입 직후 **추가 개인정보 입력 없이 계정이 성립**한다. 프로필 · 연락처는 서비스가 필요할 때 사용자가 채운다.
- 현행 물리 제약(`users.email NOT NULL UNIQUE` · `password NOT NULL` · `name NOT NULL default`) 은 본 정의와 어긋난다 → §13 REVIEW-8 (auth-core F10 예외 WO). 제약 완화 전까지 운영 코드는 현행대로 동작한다.
- V2 L1 의 "사람의 정체성(이메일·이름·전화)" 정의는 폐기한다. `users` 는 **시스템 주체 row** 이지 개인정보 원본 저장소가 아니다.

## 3. B. Authentication Identity (L2)

- **O4O 로그인 = Google 단일 로그인.** 외부 Identity 기준은 **Google `sub`** 다.
- 연결 경로: `Google ID token 검증 → sub 로 linked_accounts 조회 → users.id → 세션 발급`.
- **이메일로 Identity 를 판정하지 않는다.** `sub` miss 일 때 이메일로 기존 `users` 를 찾아 붙이는 **자동 병합은 금지**한다(현행 `socialAuthService` 의 이메일 자동 병합은 Phase 2 첫 제거 대상).
- 기존 email+password 사용자는 **로그인 상태에서 본인이 Google 을 명시 연결**한다(재인증 후 `linked_accounts` insert). 연결 완료 계정부터 password 를 NULL 처리한다.
- `linked_accounts` 를 **초기 Auth Identity 물리 구조로 재사용**한다: provider = `google` 고정, providerId = `sub`, `(provider, providerId)` unique. email/displayName/profileImage/providerData 스냅샷 컬럼은 저장하지 않는다(자동 병합 유혹 제거). 테이블 rename 은 요구하지 않는다.
- **Kakao · Naver 등 다른 소셜은 로그인 Identity 대상이 아니다.** KakaoTalk / LINE / WhatsApp 은 §9 의 업무 채널이다.
- JWT `sub` 는 `users.id` 를 유지한다. Google `sub` 는 토큰에 싣지 않는다.

## 4. C. Professional Credential

- **논리 정본 = O4O Professional Credential Domain** (플랫폼 공통 자격 영역). **초기 물리 저장소 = `kpa_pharmacist_profiles`**. 두 층위를 문서 · 코드에서 명시 구분하며, `kpa_pharmacist_profiles` 는 **KPA 서비스의 영구 소유가 아니다**(물리 이전은 이 정본을 바꾸지 않는다).
- **약사면허번호는 단일 정본 원칙** — 플랫폼에 1곳만 보관하고 다른 테이블은 참조 · 파생만 한다(Census 4곳 → 1곳).
- **면허증 이미지는 수집하지 않는다.**
- 서비스에는 면허번호 원본 대신 **Claim(예: `pharmacist_verified`)** 을 제공하는 것을 기본으로 한다.
- 초기 verification method 로 **`operator_review`(운영자 확인)** 를 허용한다. 외부 조회 연동은 후속.
- Credential 은 Authorization 이 아니다(§7). Credential 상실은 접근 판정 조건을 바꿀 뿐 role row 를 자동 삭제하지 않는다.

## 5. D. Business ≠ Store ≠ User

- **불변 원칙: `Business ≠ Store ≠ User`.** 사업자(법적 주체) · 매장(운영 장소 · 서비스 소비 단위) · 사용자(계정)는 서로 다른 개체다.
- Business 와 Store 는 `organizations` 테이블을 **공유해도 반드시 별도 row** 로 둔다(Business row ⊃ Store row A/B…). **단일 매장 사업자도 분리**한다.
- **Store 의 정체성은 사업자번호로 결정되지 않는다.** 매장 추가 · 양도 · 폐점 · 이전이 있어도 `storeId` / `organizationId` 의 의미는 안정해야 한다. 현행 provisioning 의 `code = kpa-pharm-{bizno}` 처럼 Store 정체성을 사업자번호에 묶는 방식은 Target 에 반하며 → §13 REVIEW-9.
- 사업자번호의 **단일 정본 = `organizations.business_number`**(Business row). Census 8곳(물리 7 + 가상 1)은 참조 · 파생으로 정리한다.
- 기존 매장 row 는 그대로 Store row 가 되고(id 불변), Business row 를 그 위에 둔다. Boundary Policy(F6) 의 `organizationId` / `storeId` 계약 · `1 Store : N Services` 계약과 충돌하지 않는다.

## 6. E. Relationship (사용자 ↔ 조직 · 매장 · 분회 · 서비스)

| 관계 | 물리 |
|---|---|
| 사용자 ↔ Business / Store | `organization_members` |
| 사용자 ↔ 분회 | `branch_memberships` |
| 분회 임원 | `branch_officers` |
| 사용자 ↔ 서비스 회원 (L3) | `service_memberships` |

- **Relationship("어떤 조직/매장/서비스와 관계가 있는가") ≠ Authorization("무엇을 할 수 있는가")**. Relationship row 는 권한을 부여하지 않고, 접근 판정의 **조건**으로만 쓰인다.
- 관계 테이블에 개인정보 원본을 두지 않는다(면허번호 · 사업자번호는 §4 · §5 정본 참조).

## 7. F. Authorization · 접근 판정

- **`role_assignments` = Authorization SSOT** (F9 RBAC Freeze 그대로). Credential · Relationship 과 합치지 않는다.
- **접근 = Role ∧ (필요한 Credential 조건) ∧ (필요한 Relationship 조건)**
  1. Role 이 없으면 거부.
  2. Role 이 있어도 요구 Credential(예: 약사 인증) 미충족이면 거부.
  3. Role 이 있어도 요구 Relationship(예: 해당 매장 `organization_members`) 미충족이면 거부.
  4. Credential · Relationship 이 변해도 **role row 를 자동 삭제하지 않는다** — 판정 시점에 조건으로 평가한다.
  5. 조건이 필요 없는 route 는 Role 만으로 판정한다(현행 guard 유지).
- guard 변경 · Claim Resolver 는 Phase 4 의 구현 대상이며 본 문서는 판정식만 정한다.

## 8. G. Claim

- **JWT 는 현행 유지**: `roles[]` · `memberships[]` · `accountAccess` (+ `userId/sub=users.id · email · role · tokenType:'user'`).
- **Credential · Relationship 원본을 JWT 에 추가하지 않는다.** 필요 시 **서버 내부 Claim Resolver** 가 정본(§4 · §6)을 조회해 판정한다.
- **개인정보 원본(면허번호 · 사업자번호 · 전화 등)을 서비스 JWT 에 넣지 않는다.**

## 9. H. Public Contact Channel ≠ Authenticated Connected Channel

| 구분 | 정의 | 물리(현행) | 용도 |
|---|---|---|---|
| **Public Contact Channel** | 사용자가 공개하는 연락 표시 URL | `users.kakao_open_chat_url` · `users.kakao_channel_url` · `neture_suppliers.contact_kakao` | 상담 유도 · 공개 연락 |
| **Authenticated Connected Channel** | `O4O user_id ↔ 외부 메신저 사용자 식별자` 의 **인증된 연결** | (없음 — Phase 7 별도 설계) | AI 작업 요청 · 업무 자동화 명령 · 결과 전달 |

- KakaoTalk / LINE / WhatsApp 은 **로그인 Identity 가 아니라 업무 채널**이다(§3 참조).
- Connected Channel 은 **Kakao 단독이어도 별도 구조**가 필요하다. **Public URL 을 Connected Identity 로 쓰지 않는다**(공개 URL 은 본인 확인이 아니다).
- 현행 Kakao OAuth/Login 구성(legacy)은 Connected Channel 자산이 아니다 — 폐기 후보이며 Connected Channel 설계에 재사용하지 않는다.

## 10. I. Consent

- 현행 `users` 의 3 컬럼(약관 · 개인정보 · 마케팅 동의)은 **초기 구현으로 인정**한다.
- **Target 개념**은 최소 `consent_type · policy_version · accepted_at · withdrawn_at` 을 표현할 수 있어야 한다(버전 · 이력 표현 가능).
- 별도 consent 테이블은 **지금 요구하지 않는다**. 처리방침 버전이 바뀌어 재동의가 필요해질 때 Phase 5 이후 WO 로 판단한다.
- 보유기간은 [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) 이 정한다(본 문서와 충돌 없음).

## 11. J. Business Verification Documents

- **사업자등록증 파일은 기본 수집 대상이 아니다.**
- 검증 우선순위: **① 공식 조회 / API → ② 운영자 확인 → ③ 예외 증빙 파일**.
- `kyc_documents.business_registration` = **예외 검증 수단**이지 판매 전 필수 항목이 아니다. 현행 Neture `getMissingSaleFields()` 가 PDF 를 필수로 요구하는 것은 Phase 5 변경 대상(계약 충돌 아님).
- 공식 조회 API 도입은 외부 서비스 승인 사항 → §13 REVIEW-10.

## 12. K. Session / Refresh

- refresh 는 **stateless JWT + `users.refreshTokenFamily` 단일 슬롯**이 runtime 기준이다(새 로그인 = 새 family, handoff/refresh = 승계, logout/mismatch = null).
- **`refresh_tokens` 테이블 = `DEAD_RETIRE`** — writer 0, 등록된 reader 0(`getSessions/deleteSession` 은 어떤 route 에도 등록되지 않음). Target Entity Matrix 의 **Session SSOT 가 아니다**.
- 물리 삭제(entity · auth-core manifest · spec · baseline DDL 동시 처리)는 후속 Core 예외 WO → §13 REVIEW-11.

---

## 13. Implementation Review (Architecture blocker 아님 · 후속 WO 입력)

| # | 내용 | 후속 배치 |
|---|---|---|
| **REVIEW-8** | auth-core `users` 물리 제약(`email NOT NULL UNIQUE` · `password NOT NULL` · `name NOT NULL default`) 이 §2 와 충돌. `service_credentials` · `users.password` 정리 포함 | Phase 2/5 — F10 예외 WO |
| **REVIEW-9** | organization-core — Business/Store 별도 row · `Organization.type` 확장 · parent/level/path · `business_number` unique · provisioning `code=kpa-pharm-{bizno}` 변경 | Phase 3 — organization-core 예외 WO |
| **REVIEW-10** | 사업자 공식 검증 — 외부 조회/API 사용 가능 여부 · 운영계약 확인. 파일 기본수집 금지는 확정 | Phase 5 |
| **REVIEW-11** | `refresh_tokens` DEAD_RETIRE 물리 제거 — entity/manifest/spec/baseline DDL 동시 | F10 예외 WO(시점 자유) |
| **REVIEW-12** | Authenticated Connected Channel — Kakao AI Command Channel 개발 시 별도 설계·구현. Public Contact 와 혼합 금지 | Phase 7 |

Phase 1 IR 의 REVIEW-1~7 은 [IR Phase 1 §7](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md) 에 보존한다(REVIEW-6 Identity V2 L2 drift 는 본 문서로 해소).

## 14. Freeze · 기존 정본과의 관계

| 정본 | 관계 |
|---|---|
| [`O4O-CORE-FREEZE-V1`](O4O-CORE-FREEZE-V1.md) (F10) | §5-A 의 "Identity V2 명시적 예외 승인 절차" 는 **V3 구현 WO 에 그대로 적용**된다. 대상 항목은 `service_credentials` 신설이 아니라 REVIEW-8 · REVIEW-11 · 자동 병합 제거 · Google 연결 흐름이다. F10 본문 정정은 별도 WO |
| [`USER-OPERATOR-FREEZE-V1`](USER-OPERATOR-FREEZE-V1.md) (F11) | 3축(`users` · `service_memberships` · `role_assignments`) 은 V3 에서도 그대로다. §10 의 L2 = `service_credentials` 해석은 V3 에서 L2 = `linked_accounts`(기존 테이블) 로 바뀌므로 **신규 테이블 추가 없음**. F11 Forbidden Pattern 전부 유지. §10 본문 정정은 별도 WO |
| [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) (F9) | 충돌 없음 — `role_assignments` SSOT 유지(§7) |
| [`O4O-BOUNDARY-POLICY-V1`](O4O-BOUNDARY-POLICY-V1.md) (F6) | 충돌 없음 — `organizationId` / `storeId` = Store row id 유지(§5) |
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | 충돌 없음 — Service Identity(카탈로그) · Community Identity 는 본 문서의 User Identity 와 다른 축. `1 Store : N Services` 유지 |
| [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) | 충돌 없음 — 보유기간은 그 문서, 구조는 본 문서 |
| [`USER-DOMAIN-SSOT-V1`](../baseline/USER-DOMAIN-SSOT-V1.md) | `users = Identity SSOT` · `service_memberships = SSOT` 유지. `users.password` 를 포함한 컬럼 나열은 현행 기록이며 Phase 2/5 후 정정 |
| [`O4O-MYPAGE-CANONICAL-V1`](../baseline/O4O-MYPAGE-CANONICAL-V1.md) · [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) §3-3 | 서비스별 비밀번호 변경 UI/권한을 V2 근거로 기술 — **현행 runtime 기록으로는 유효**, Google 전환 완료 후 소멸. 정정은 Phase 2 실행계획 WO 에 포함 |

## 15. 문서 계층

| 계층 | 문서 |
|---|---|
| **Current Canonical** | 본 문서 (V3) |
| **Superseded Canonical** | [V2](O4O-IDENTITY-ARCHITECTURE-V2.md) (2026-05-23 채택 → 2026-09-17 SUPERSEDED) · [V1](O4O-IDENTITY-ARCHITECTURE-V1.md) (Legacy → SUPERSEDED) — 본문 불변, 역사 기록 |
| **Historical IR** | Census · Phase 1 Target Model · Decision Closure (수정하지 않음) |
| **WO** | Canonicalization WO(본 채택) · 이후 Phase 별 구현 WO |

## 16. Phase 순서 (구현은 각 Phase 의 별도 WO)

| Phase | 내용 | 비고 |
|---|---|---|
| 0 | CRITICAL 인증 우회 차단 | 완료 (service login RETIRE) |
| 1 | Target Model 설계 · Decision Closure · **정본 승격(본 문서)** | 완료 |
| **2** | **Google Identity 전환** — 첫 WO = "Identity V2/V3 정합 결과에 따른 Google Identity Migration 실행계획". 권장 순서: 자동 이메일 병합 제거 → `linked_accounts` Google `sub` 기준 정리 → 기존 로그인 사용자 명시 Google 연결 → 신규 Google 가입 → 계정별 password 폐기(`users.password` · `service_credentials`) | F10/F11 예외 절차 |
| 3 | 정본화 이동 — Business/Store 별도 row · 면허 · 사업자번호 단일 정본 | REVIEW-9 |
| 4 | Claim / Role 만 — Claim Resolver · guard 조건식 | §7 · §8 |
| 5 | 중복 제거 · consent 이력 · 사업자 증빙 정책 적용 | REVIEW-8 · REVIEW-10 |
| 6 | 운영자 권한 최소화 | |
| 7 | 로그 / AI / 외부전송 · Authenticated Connected Channel | REVIEW-12 |

---

*Created / Adopted: 2026-09-17 (`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1`)*
*Type: Architecture Canonical Baseline*
*Status: CANONICAL (Adopted) — 문서 승격만. 코드 · DB · migration · production 변경 0*
*Supersedes: O4O-IDENTITY-ARCHITECTURE-V2 (2026-05-23 ~ 2026-09-17) · O4O-IDENTITY-ARCHITECTURE-V1*
