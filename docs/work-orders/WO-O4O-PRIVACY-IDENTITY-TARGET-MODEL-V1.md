# WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1

> **성격**: **Phase 1 설계 조사 전용** — 구현 · migration · 데이터 이동 없음. 산출물은 IR 이며, 사용자가 검토 · 확정하기 전에는 Architecture 정본으로 승격하지 않고 Target Model 구현도 시작하지 않는다.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **선행 완료**: [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md)(COMPLETE_WITH_UNKNOWNS, `ef9265810`) · [`WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1`](WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1.md)(CLOSED · RETIRE, `44101be12`)
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)(auth-core · organization-core 동결) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md)(`role_assignments` SSOT) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)(역할 · 업무공간 경계) · CLAUDE.md §16(기준 문서 drift 는 보고).

---

## 1. 목표와 배경

개인정보 Census 에서 확인된 현재 구조를 바탕으로 O4O 전체의 **개인정보 · Identity · Credential · Relationship Target Model** 을 설계한다. 219 개 필드를 곧바로 옮기지 않고, 먼저 **"각 정보의 정본이 어디이고, 어떤 서비스가 원본을 볼 수 있는가"** 를 확정한다. 이후 Phase 2~7 의 migration 과 구현이 흔들리지 않도록 정본 모델과 경계를 먼저 고정하는 것이 목표다.

현재 확인된 주요 상태 (Census §0 · §3 · §4 · §7):

- 개인정보 관련 DB field **219 개 / 62 테이블**
- 개인정보 중복 저장 **9 클러스터** (면허번호 4곳 · 사업자번호 8곳 · 이메일 14곳 · 전화 9곳 · 이름 8곳 · 약국명/주소 4곳 · 대학/학년 2곳 · activity_type 2곳 · password 2곳)
- Relationship 전환 후보 **11 건**
- `users` 한 테이블에 Identity · Contact · Profile · Credential · Business · Social · Session/Lock · Consent 혼재
- `role_assignments` 는 역할 SSOT 로 성립
- 실제 로그인은 email+password 이며 Google Login 은 미구현(dead runtime, 0 %)
- 서비스별로 면허 · 사업자 · 매장 · 조직 정보가 중복 · 분산
- CRITICAL service token 발급 경로는 RETIRE 완료

**이번 Phase 에서는 코드를 수정하지 않는다.**

### 1-1. 확정 정책 (설계의 전제)

**인증**
- `O4O Login = Google 단일 로그인`. Google `sub` 를 외부 Identity 의 기준으로 한다.
- 기존 email+password 사용자는 향후 안전한 전환 절차를 거쳐 Google Identity 와 연결한다.
- **이메일 동일성을 근거로 자동 계정 병합하지 않는다.**

**외부 메신저**
- KakaoTalk · LINE · WhatsApp 등은 로그인 수단이 아니다. `Connected Channel` 로 관리한다.

**약사**
- 약사면허번호는 보관한다. **면허증 이미지는 받지 않는다.**
- 초기 약사 확인은 운영자가 이름 · 면허번호 · 전화번호 · 출신대학 · 지부/분회 등을 이용하여 수행할 수 있다.
- 서비스에는 원칙적으로 면허번호 원본이 아니라 **약사자격 Claim** 을 제공한다.

**사업자 · 매장 · 조직**
- 사업자 · 매장 · 분회/지부 · 직원 · 매장경영자 · 공급자 등은 `users` 고정 프로필이 아니라 **Relationship / Membership** 으로 표현한다.

**권한**
- 기존 `role_assignments` 를 역할 SSOT 로 유지한다.
- Credential / Relationship 과 Authorization 을 동일 개념으로 합치지 않는다.

## 2. 승인 범위

### 2-1. Target Entity 설계

최소 다음 객체의 **필요성 · 책임 · 정본 범위** 를 검토한다.

| Target | 책임 |
|---|---|
| `users` | 최소 O4O 내부 사용자 |
| `auth_identities` | Google 등 로그인 Identity |
| `user_contacts` | 이메일 · 휴대전화 등 필요 연락수단 |
| `professional_credentials` | 약사 등 전문자격 |
| `business_entities` | 사업자 정본 |
| `business_memberships` | 사용자 ↔ 사업자 관계 |
| `stores` | 매장 정본 |
| `store_memberships` | 사용자 ↔ 매장 관계 |
| `organizations` | 대한약사회 · 지부 · 분회 등 조직 |
| `organization_memberships` | 사용자 ↔ 조직 관계 |
| `connected_channels` | KakaoTalk · LINE · WhatsApp 등 |
| `consents` | 필요한 개인정보 · 서비스 동의 |
| `role_assignments` | 서비스 역할 · 권한 SSOT (기존 유지) |

필요 없는 객체를 억지로 생성하지 않는다. **기존 테이블로 충분한 경우 신규 테이블을 제안하지 않는다** (예: `organizations` · `organization_members` · `role_assignments` · `service_memberships` 가 이미 존재 — 신설이 아니라 정본 승격/정리로 표현할 수 있는지 먼저 본다).

### 2-2. 조사 방법

- 입력은 Census IR §2~§4 · §7 · §9 · §11 의 표를 그대로 사용한다(재-census 하지 않는다). Census 이후 변경(`44101be12` 의 service login RETIRE)만 반영한다.
- 정적 코드 · entity · migration · 계약 문서 기준. **프로덕션 데이터 실값은 조회 · 기록하지 않는다.** 분포 확인이 필요해 설계가 막히면 §5 대로 `REVIEW` 로 남긴다.

## 3. 실행 순서

```text
3-1 219 필드 전수 매핑 → 3-2 9 클러스터 정본 결정 → 3-3 최소 users → 3-4 Google Identity + 전환 정책
→ 3-5 Professional Credential → 3-6 Business/Store → 3-7 Organization → 3-8 Claim/Role 경계
→ 3-9 Connected Channel → 3-10 Access Boundary → IR 작성 → path-specific commit → push → 완료 보고
```

### 3-1. 219 개 개인정보 필드 전수 매핑

Census 의 219 개 필드 각각을 Target Model 에 매핑한다. 각 필드는 최소 다음 중 하나의 목적지를 가진다.

| 판정 | 의미 |
|---|---|
| `USER_MINIMAL` | 최소 `users` 에 유지 |
| `AUTH_IDENTITY` | Google Identity 등 인증 영역 |
| `CONTACT` | 연락정보 |
| `CREDENTIAL` | 약사 등 전문자격 |
| `BUSINESS` | 사업자 정본 |
| `BUSINESS_RELATIONSHIP` | 사용자 ↔ 사업자 |
| `STORE` | 매장 정본 |
| `STORE_RELATIONSHIP` | 사용자 ↔ 매장 |
| `ORGANIZATION` | 조직 정본 |
| `ORG_RELATIONSHIP` | 사용자 ↔ 조직 |
| `CONNECTED_CHANNEL` | 외부 업무채널 |
| `CONSENT` | 동의정보 |
| `ROLE` | 기존 `role_assignments` |
| `SERVICE_LOCAL` | 해당 서비스에만 정당하게 필요한 정보 |
| `DELETE` | 불필요 · 중복 · dead |
| `REVIEW` | 추가 정책판단 필요 |

**219 개 필드가 모두 어느 범주에 속하는지 추적 가능해야 한다** (합계 = 219).

### 3-2. 9 개 중복 클러스터의 정본 결정

다음 정보는 canonical owner 를 반드시 결정한다: 약사면허번호 · 사업자등록번호 · 이메일 · 휴대전화번호 · 이름 · 사업장/약국명 · 사업장 주소 · 지부/분회 · Census 에서 확인된 기타 클러스터(대학/학년 · activity_type · password · `BusinessInfo` 타입 2벌).

각 클러스터별로 다음을 정한다.

```text
Canonical Source → Reference / Relationship → Claim / Role → Service
```

동일 원본 개인정보를 서비스별 DB 에 반복 저장하는 모델을 Target 으로 삼지 않는다.

### 3-3. 최소 `users` 정의

목표 개념은 `users { id, status, created_at, updated_at }`. 실제 운영상 필요한 최소 필드가 더 있다면 근거와 함께 제안한다. 다음은 기본적으로 `users` 밖으로 분리하는 방향으로 검토한다: email · phone · license · business info · store info · organization · social provider · connected channel · consent.

기존 `users` 컬럼별로 **`유지 / 이동 / 삭제 / REVIEW`** 를 명시한다 (Session/Lock · password 계열 포함).

### 3-4. Google Identity Target 설계

`auth_identities { id, user_id, provider, provider_subject, status, linked_at, last_authenticated_at }` 수준의 최소 구조를 검토한다. `provider_subject` = Google `sub`. **Google email 은 Identity Primary Key 로 사용하지 않는다.**

**기존 email+password 사용자 전환** — Phase 2 구현 전 필요한 migration 정책을 설계한다.

```text
현재 로그인된 기존 사용자 → Google 인증 → 사용자가 명시적으로 기존 O4O 계정과 연결 → Google sub 등록
```

이메일 일치만으로 자동 병합하지 않는다. 다음 경우의 처리 방안을 설계한다: ① 기존 계정 이메일과 Google 이메일이 같음 ② 이메일이 다름 ③ 한 Google 계정을 이미 다른 O4O user 가 사용 중 ④ 기존 계정 접근이 불가능함 ⑤ 중복계정 발견. 이번 Phase 에서는 구현하지 않는다.

### 3-5. Professional Credential Target 설계

`professional_credentials { id, user_id, credential_type, license_number, status, verification_method, verified_by, verified_at, last_reviewed_at }` 를 검토한다. 필요 시 encrypted value / lookup hash 등 보안 구조를 설계 수준에서 검토한다(현행 `ENCRYPTION_KEY` 체계와의 관계 포함).

- 면허번호는 O4O 공통 자격영역에서 **한 번만** 보관. 개별 서비스에는 가능하면 `credential_type = pharmacist, status = verified` Claim 만 전달.
- 확인상태는 boolean 하나가 아니라 최소 `pending / verified / suspended / revoked(invalidated)`.
- 확인 방법을 별도 기록: `operator_review / official_registry / other_verified_source`. 초기 정책은 `operator_review` 허용.
- 면허증 이미지 저장 모델은 만들지 않는다.

### 3-6. Business / Store Target 설계

`Business Entity ≠ Store ≠ User` 를 명확히 분리한다 (예: ABC 사업자 ├ 매장 A └ 매장 B). 사용자가 사업자나 매장 자체가 되어서는 안 된다.

- **Business**: 사업자등록번호 · 상호 · 대표자 등 사업자 정본.
- **Business Membership** (`user ↕ business`): representative / owner / manager / employee / authorized_staff 등 — 정확한 vocabulary 는 기존 O4O 역할정책(RBAC · ROLE-WORKSPACE)과 충돌하지 않도록 조사.
- **Store Membership** (`user ↕ store`): 관계와 서비스 Authorization 을 구분. `store_owner relationship` 이 있다고 모든 서비스에서 자동으로 `store_owner role` 을 부여하는 모델을 만들지 않는다.
- 현행 `stores` · `organizations(type)` · `neture_suppliers` · `cosmetics_store_members` · `kpa_members` 등이 이 세 객체 중 무엇을 표현하고 있는지 매핑한다.

### 3-7. Organization Target 설계

대한약사회 → 시도약사회 → 분회 같은 **계층형 조직** 을 표현할 수 있어야 한다. 사용자의 분회는 `users.branch` 문자열이 아니라 Membership 으로 설계한다.

`organization_memberships { user_id, organization_id, membership_type, status, verified_by, verified_at, started_at, ended_at }` 을 예로 검토하고, 분회 이동 시 프로필 overwrite 보다 **관계 종료 + 신규 관계** 가 적절한지 검토한다. 기존 `organizations` / `organization_members`(organization-core, 동결) · `branch_memberships` · `kpa_members` 와의 관계를 명시한다.

### 3-8. Claim / Role 경계 설계

`role_assignments` SSOT 는 유지한다. 다음 셋을 분리한다.

```text
Credential      "이 사람은 약사인가?"
Relationship    "이 사람은 이 사업자/매장/분회와 어떤 관계인가?"
Authorization   "이 서비스에서 무엇을 할 수 있는가?"

professional_credentials(pharmacist=verified) + store_memberships(store_123=owner)
        → 정책 판단 → role_assignments(glycopharm:store_owner)
```

Credential/Relationship 자체를 `role_assignments` 로 대체하지 않는다. 반대로 모든 서비스가 원본 Credential/Relationship 을 직접 조회하도록 만들지도 않는다. **서비스별 Claim 계약 후보** 를 설계한다 (현행 JWT `roles[]` · `memberships[]` · `accountAccess` · 미삽입 `businessInfo` 와의 관계 포함).

### 3-9. Connected Channel 설계

`connected_channels { id, user_id, channel_type, external_identifier, status, linked_at, last_seen_at, metadata }` 를 검토한다. Kakao OAuth 로그인용 legacy 구성과 Kakao 업무채널 정보를 구분하고, **`users.kakao_*` 현행 필드를 전수 매핑** 한다.

Connected Channel 은 "누구인가?"(Identity) 가 아니라 **"어떤 외부 채널에서 O4O 에게 일을 요청하고 결과를 받을 것인가?"** 를 나타내는 Relationship 이다.

### 3-10. 개인정보 Access Boundary 설계

Target Model 에 개인정보를 집중시키면서 오히려 접근범위가 넓어지지 않도록 한다. 최소 다음 역할을 검토한다.

| 역할 | 면허번호 원본 | 전화 | 사업자 원본 | Claim |
|---|---:|---:|---:|---:|
| 일반 서비스 운영자 | 원칙 불가 | 필요시 제한 | 원칙 제한 | 가능 |
| 자격 확인 운영자 | 필요 | 필요 | 업무에 따라 | 가능 |
| 커뮤니티 운영자 | 불가 | 원칙 불가 | 불가 | 필요한 Claim |
| instructor | 불가 | 불가 또는 최소 | 불가 | 필요한 Role |
| store_owner | 타 사용자 원본 불가 | 업무상 필요한 범위 | 자기 관계 범위 | 필요한 Role |
| super_admin | **무조건 전부 열람 모델 금지** | | | |

정확한 권한모델은 Phase 6 구현 전 다시 검증할 수 있도록 설계근거를 남긴다.

## 4. 제외 범위

DB migration · 신규 테이블 생성 · `users` 컬럼 삭제 · 개인정보 실제 이동 · Google Login 구현 · password login 제거 · Kakao/Naver 코드 제거 · API response 변경 · Role 자동부여 로직 변경 · 개인정보 실제 삭제 · production 데이터 수정 · 나머지 SECURITY_FIX #3~#9 수정.

이번 작업은 **Target Model 과 migration 경계를 설계하는 조사** 다. Target Model 을 곧바로 정본 문서(`docs/architecture` · `docs/baseline`)로 확정하지 않는다 — IR 로 매핑 결과를 내고 사용자 검토 후 별도 WO 로 승격한다.

## 5. 중지 조건

다음 경우 임의 결정하지 않고 `REVIEW` 로 보고한다.

- 한 개인정보의 canonical owner 를 기존 계약 때문에 결정할 수 없음
- 현재 동일 개념에 두 개 이상의 canonical 타입/테이블이 존재
- 기존 서비스의 업무 의미를 확인하지 않고 Relationship 을 결정해야 하는 경우
- 법률상 보존기간 판단이 필요한 경우 (RETENTION-POLICY-V1 이 답하지 않는 항목)
- 기존 production 데이터 분포를 보지 않으면 migration 설계가 불가능한 경우
- 동결 Core(auth-core · organization-core)의 구조변경이 Target Model 상 불가피해 보이는 경우 — 변경 자체는 하지 않고 필요 범위만 기록

프로덕션 데이터 실값은 조회 · 기록하지 않는다.

## 6. 검증과 산출물

**산출물**: `docs/investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md` (조사 전용 — CHECK 문서 없음).

필수 포함 표:

- **Target Entity Matrix** — `Entity | 역할 | Canonical Data | 개인정보 여부 | 주요 Consumer`
- **Current → Target Field Mapping** — `Current Table | Current Field | Target Entity | Target Field/Concept | Disposition | 근거` — **Census 219 개 필드 전부** (판정별 소계 합 = 219)
- **Duplicate Cluster Resolution** — `정보 | 현재 저장 위치 | Target 정본 | 서비스 전달방식`
- **Relationship Mapping** — `현재 표현 | Target Relationship | 기존 Role 과 관계 | Migration 난이도`
- **Service Claim Matrix** — `Service | 필요한 Credential Claim | Relationship Claim | Role | 원 개인정보 필요 여부`
- **Google Migration Matrix** — `기존 사용자 상태 | Google 연결 방법 | 자동병합 여부 | 예외처리`
- **Delete / Retire Candidate** — `대상 | 현재 사용 여부 | Target 대체 | 삭제 Phase`

Git: `git fetch origin` → `git status -sb` → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. `--force` · `git add .` · stash 금지. 다른 세션의 dirty/untracked 파일 불가침.

## 7. 완료 보고

숫자:

- Census 219 field 중 Target 매핑 완료 수
- `users` Target 유지 필드 수 · Core/공통 정본으로 이동할 필드 수 · Relationship 전환 필드 수 · Claim-only 전환 대상 수 · Service-local 유지 수 · Delete 후보 수 · REVIEW 잔존 수

다음 질문에 명확히 답한다:

- **A.** O4O 사용자를 구성하는 최소 정보는 무엇인가?
- **B.** 약사면허번호의 유일한 정본은 어디인가?
- **C.** 사업자등록번호의 유일한 정본은 어디인가?
- **D.** 매장과 사업자를 어떤 객체로 분리하는가?
- **E.** 지부 · 분회를 어떻게 Membership 으로 표현하는가?
- **F.** 각 서비스는 어떤 개인정보 원본을 직접 볼 수 있는가?
- **G.** 각 서비스가 Claim 으로만 받아야 하는 정보는 무엇인가?
- **H.** 기존 email+password 사용자를 Google 단일 로그인으로 어떻게 안전하게 전환하는가?
- **I.** Kakao 관련 현행 데이터 중 무엇이 OAuth legacy 이고 무엇이 Connected Channel 자산인가?
- **J.** Phase 2~7 을 어떤 migration 순서로 실행해야 하는가?

마지막에 Phase 2 이후 WO 를 **실제 의존성 순서대로 재제안** 한다. 이번 조사 결과를 사용자가 검토 · 확정하기 전에는 Target Model 구현을 시작하지 않는다.

`HEAD == origin/main` · 작업트리 상태 · `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` 을 포함한다.

---

## 후속 (참고 · 사용자 확정 순서)

```text
0. CRITICAL 인증 취약점 차단 — CLOSED (44101be12)
1. 개인정보 Target Model 확정 — 본 WO (설계 조사 → 사용자 검토 → 정본 승격 WO)
2. Google 단일 로그인 전환 (user ↔ Google sub 연결 migration 먼저 · 이메일 자동 병합 금지)
3. Credential / Business / Store / Organization 정본화
4. 서비스에는 Claim / Role 만 제공 (role_assignments SSOT 유지)
5. 중복 · 불필요 개인정보 제거
6. 운영자 접근권한 최소화
7. 로그 / AI / 외부전송 정리
```

가장 중요한 결과 3가지: ① `users` 가 실제로 얼마나 작아질 수 있는가 ② 면허번호 4중 · 사업자번호 8중 저장이 각각 어떤 하나의 정본으로 수렴하는가 ③ 기존 사용자를 Google 계정으로 어떻게 옮기는가.

---

*작성: 2026-09-17 · 상태: DRAFT (핸드오프 · 실행 지시 대기)*
