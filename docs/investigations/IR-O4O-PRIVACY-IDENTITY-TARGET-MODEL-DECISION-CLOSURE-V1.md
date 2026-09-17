# IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1

> **성격**: Phase 1 Target Model 의 **Decision Closure 기록** — 설계 결정 D1~D7 을 닫고 Architecture 정본 승격 가능 여부를 판정한다. 219 필드 재매핑 · Census 재실행 · 구현 · migration · 정본 승격 없음.
> **WO**: [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1`](../work-orders/WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md)
> **기존 IR(덮어쓰지 않음)**: [`IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1`](IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md)(Phase 1, `0e119389d`) · [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](IR-O4O-PRIVACY-DATA-CENSUS-V1.md)(`ef9265810`)
> **조사 방식**: 저장소 코드 · migration · 정본 문서 read-only 교차 확인. 프로덕션 DB · 개인정보 실값 조회 0.

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| D1 Minimal users | **확정** — 필수 = `id · status · created_at · updated_at`. `email/name/nickname/phone` = 선택 프로필. 물리 제약(`email NOT NULL UNIQUE` · `password NOT NULL` · `name NOT NULL default`) 완화는 auth-core F10 예외 → REVIEW-8 |
| D2 Credential SSOT | **확정** — 논리 SSOT = O4O Professional Credential Domain / 초기 물리 저장소 = `kpa_pharmacist_profiles`. KPA 영구 소유 아님 |
| D3 Business ≠ Store | **확정(별도 row)** — 기존 IR "1:1 = 같은 row" **변경**. 4 시나리오 중 3개(다점포 · 양도 · 이전)에서 같은 row 는 ID 불안정. 기존 정본 계약(Boundary `organizationId`/`storeId` · 1 Store : N Services) 과 **충돌 없음** — Store row 가 지금의 row 를 그대로 잇고 Business row 를 그 위에 둔다. 남는 것 = provisioning 코드 `code = kpa-pharm-{bizno}` 의 재설계 → REVIEW-9 |
| D4 Kakao 채널 | **확정** — `users.kakao_*` · `neture_suppliers.contact_kakao` = Public Contact Channel. 기존 IR "두 번째 메신저가 생길 때만 connected_channels" **폐기** → Authenticated Connected Channel 은 Kakao 단독이어도 별도 인증 연결 구조가 필요(구현은 Phase 7) |
| D5 `refresh_tokens` | **`DEAD_RETIRE`** — writer 0 · 유일 reader(`getSessions/deleteSession`) 는 어떤 route 에도 등록되지 않음 · refresh family SSOT = `users.refreshTokenFamily`(stateless JWT) · 테스트도 users 슬롯만 검증. 기존 IR 의 AUTH_IDENTITY 2 판정 **변경**(→ DELETE) |
| D6 Consent | **확정** — 3 컬럼 = 초기 구현. Target 개념 = `consent_type · policy_version · accepted_at · withdrawn_at`. 보존정책과 충돌 없음 |
| D7 사업자등록증 | **확정** — 기본 미수집 · 공식 조회 우선 · 예외 시 증빙. `kyc_documents.business_registration` = 예외 검증 수단. 현행 Neture `getMissingSaleFields()` 가 PDF 를 판매 전 필수로 요구 → Phase 5 변경 대상(계약 충돌 아님). 공식 조회 API 도입은 외부 서비스 승인 → REVIEW-10 |
| §3 접근 규칙 | **확정** — `접근 = Role ∧ Credential 조건 ∧ Relationship 조건`. Role lifecycle ≠ Credential lifecycle |
| **정본 승격 판정** | **`APPROVE_WITH_REVIEW`** — 결정 7건 모두 닫힘. REVIEW 는 승격을 막지 않고 Phase 2~7 구현 시 F10/organization-core 예외 WO 로 처리 |

기존 IR 과 결론이 달라진 항목 = **D3 · D4 · D5** (변경 이유는 §1 Decision Table 에 기록).

---

## 1. Decision Table

| Decision | 기존 IR | 최종 결정 | 구현 영향 | 정본 승격 반영 |
|---|---|---|---|---|
| **D1** Minimal users | users 잔존 10(`email·name·nickname·phone`·동의 3·kakao 2·refreshTokenFamily). "필수/선택" 경계 미명시 | 필수 = `id · status · created_at · updated_at`. `email/name/nickname/phone` = 선택 프로필·연락. Google 가입 = `linked_accounts(provider=google, providerId=sub)` 1 row 만으로 성공. `email/name/phone` 은 Identity Key 아님. `phone` 은 목적 발생 시 수집 | Phase 2: `users.email` NOT NULL UNIQUE · `password` NOT NULL · `name` NOT NULL default 완화 필요(User.ts `@Index(['email'],{unique})` · `register.dto.ts` `@IsEmail` 필수) — auth-core 변경 = F10 예외 (REVIEW-8). 로그인·`/auth/me`·`getDisplayName()`(`name ?? email`) fallback 정리 | Architecture 에 "가입 필수 4 · 그 외 선택" 명문화. `users.email` 은 중복 식별 보조 인덱스일 뿐 Identity Key 아님 |
| **D2** Credential SSOT | 정본 = `kpa_pharmacist_profiles`(REVIEW-3: status enum · verification_method · 암호화) | **논리 SSOT = O4O Professional Credential Domain** / **초기 물리 저장소 = `kpa_pharmacist_profiles`**. KPA 서비스는 물리 저장소의 현재 host 일 뿐 O4O 전문자격의 영구 소유자가 아님. 중립 구조로 승격 시 Credential Domain 계약(필드·상태·검증 방법)은 불변, 물리 위치만 이동 | 지금 0. Phase 3 에서 REVIEW-3(status enum · verification_method · credential_type) 은 "Credential Domain 계약" 이름으로 정의하고 `kpa_pharmacist_profiles` 에 적용. 서비스는 Claim(`credential.pharmacist.status`) 만 읽음 | Architecture 는 **논리 객체명**(Professional Credential) 으로 쓰고 물리 테이블은 "현재 저장소" 로 별기 |
| **D3** Business ≠ Store ≠ User | Business·Store 모두 `organizations`. **1 매장 약국 = 같은 row**, 다점포만 parent/child | **별도 논리 객체 · 별도 row 우선** — Business row(`type=business`, business_number 보유) 위에 Store row(`type=pharmacy|store`, `parentId=Business`). 1 매장이어도 분리. 근거 = §2 4 시나리오(같은 row 는 2·3·4 에서 ID 불안정, 별도 row 는 4/4 안정). **변경 이유**: 기존 IR 은 row 수 최소화를 우선했으나, 현행 provisioning 이 `code = kpa-pharm-{사업자번호}` 로 Store row 정체성을 사업자번호에 묶어 양도·다점포 시 store id 가 바뀌거나 충돌한다(§2-2) | Phase 3: (a) 기존 pharmacy/store row = **Store row 로 그대로 유지(id 불변)** · (b) Business row 신규 생성 + `business_number` 이동 · (c) `ensureKpaStoreOrganization` code 체계 재설계(Business=`kpa-biz-{bizno}` · Store=별도 slug/uuid 기반) · (d) `organization_members` owner 는 Business·Store 양쪽에 각각 · (e) `ensureOrganization` 이 `level=0·path=/code` 고정 → parent 반영 필요. 기존 계약 충돌 없음(§2-3) — 단 organization-core `type` union(REVIEW-2) 과 code 체계(REVIEW-9) 는 F10/organization-core 예외 | Architecture: Business(법적 주체·사업자번호 unique) ≠ Store(운영 단위·`organizationId`/`storeId` 경계) ≠ User. Store 는 Business 의 child. Boundary Policy 의 `organizationId`·`storeId` = **Store row id** 로 명시 |
| **D4** Kakao 채널 | `users.kakao_*` 2 + `neture_suppliers.contact_kakao` = CONNECTED_CHANNEL 3. "**두 번째 메신저가 생길 때만** `connected_channels`" | 세 컬럼 = **Public Contact Channel**(공개 연락 URL · 위치 유지 · 판정 CONTACT 성격). **Authenticated Connected Channel** = `user_id ↔ 외부 메신저 사용자 식별자` 의 인증 연결(AI 작업 요청·업무 명령·결과 통지) — Kakao 단독이어도 별도 구조 필요. 기존 "두 번째 메신저" 조건 **폐기**. **변경 이유**: 공개 URL 은 누구나 아는 값이라 명령 채널의 신원 근거가 될 수 없음 | 지금 0. Phase 7(로그/AI/외부전송) 에서 Connected Channel 설계 WO. Kakao OAuth/Login legacy(`socialAuthService` kakao 분기 · OAuth 구성) 는 DELETE_CANDIDATE 그대로 — Connected Channel 자산과 혼동 금지 | Architecture 에 두 개념을 별도 객체로 기재: Public Contact Channel(users/suppliers 컬럼) · Authenticated Connected Channel(미구현 · 요구 발생 시 별도 테이블) |
| **D5** `refresh_tokens` | `token·deviceId` = AUTH_IDENTITY(세션) · `userAgent·ipAddress` = DELETE | **`DEAD_RETIRE`** — 4 컬럼 전부 DELETE. 근거 §3. **변경 이유**: 기존 IR 은 "세션 계층이 있어야 한다" 는 구조 판단으로 되살렸으나 현행 auth flow 는 stateless JWT + `users.refreshTokenFamily` 단일 슬롯이고 테이블 writer 가 없음 | Phase 5: entity `RefreshToken.ts` · `User.ts` OneToMany · `entities.ts` 등록 · `user.controller.ts` 미등록 2 메서드 · auth-core manifest `refresh_tokens` · spec 2건(`rbac-baseline…` · `auth-core-dead-lifecycle…`) · `canonical-schema-baseline` · migration `DeleteOrphanKpaUsers` 의 DELETE 줄 → auth-core Core Freeze 예외(F10) 필요 = REVIEW-11. 기기별 세션·다기기 logout 이 실제 요구되면 **그때 새로 설계**(현 테이블 재사용 아님) | Session 객체 = `users.refreshTokenFamily` 1 슬롯 + JWT. `refresh_tokens` 는 Target Entity Matrix 에서 제거 |
| **D6** Consent | users 동의 3 컬럼 유지 · `consents` 테이블 불필요 | 3 컬럼 = **초기 구현(허용)**. Target 개념 = `consent_type · policy_version · accepted_at · withdrawn_at`. 정책 버전 변경·이력 요구 발생 시 이력 구조로 확장(그 전까지 테이블 신설 없음). 보존정책 V1 은 동의 컬럼을 언급하지 않아 충돌 없음 | 지금 0. writer = `auth-register.controller.ts`/`register.dto.ts` 만. 확장 시점 = 처리방침 v1.0 게시 후 첫 개정 | Architecture 는 Consent 를 개념 4 필드로 정의하고 "현재 물리 = users 3 컬럼(초기)" 로 별기 |
| **D7** 사업자등록증 | `kyc_documents.documentType/fileUrl/fileName` = BUSINESS(business_registration 만) | 기본 = 파일 미수집 · 우선 = 사업자번호·사업자정보 공식 조회/운영자 확인 · 예외 = 공식 검증 실패 시 제한적 증빙. `kyc_documents.business_registration` = **예외 검증 수단**. 기존 파일·테이블 삭제 없음 | Phase 5: Neture `supplier.service.ts:1595 getMissingSaleFields()` 가 `businessRegistrationDocument` 를 판매 전 필수로 요구 → "공식 검증 통과 또는 증빙" 으로 조건 변경. `neture_suppliers.business_registration_document_id` FK 는 nullable 유지. 보존정책 V1 에 KYC 항목 없음 → 충돌 없음. 공식 조회 API(국세청 등) 도입 = 외부 서비스 승인 (REVIEW-10) | Architecture: Business 검증 = 공식 조회 우선 · 증빙 파일 = 예외 · `id_card` 등 다른 documentType 은 DELETE(기존 IR 유지) |

---

## 2. D3 — Business / Store ID 안정성 4 시나리오

### 2-1. 현행 구조(코드 확인)

- 매장 row 는 `ensureKpaStoreOrganization()` 이 `organizations(type='pharmacy', code='kpa-pharm-{사업자번호}')` 로 생성하고 `ON CONFLICT (code)` 로 멱등 처리한다(`routes/kpa/services/kpa-store-organization.provisioning.ts:84-89` · `modules/organization/services/organization-ops.service.ts:82-89`). 즉 **Store row 의 정체성(code) = 사업자번호**.
- 공급자는 `code='neture-{slug}', type='supplier'` (`neture/services/supplier.service.ts:1387-1394`) — 사업자 단위 row 이며 매장 없음.
- `ensureOrganization` 은 `parentId` 를 받지만 `level=0 · path='/'+code` 로 고정 저장한다(트리 계산 없음).
- 매장 자산 경계 = `organizationId`(Store Ops) · `storeId`(Commerce) — 둘 다 이 row 의 `id` (`platform_store_slugs.storeId = orgResult.id` · Boundary Policy §Store Ops/Commerce · ROLE-WORKSPACE §3 "Store 자산 경계는 `organizationId`").
- 운영자 매장 목록은 `o.type IN ('pharmacy','store','branch')` 로 필터(`StoreConsoleController.ts:85,164`).

### 2-2. 시나리오 비교

| # | 시나리오 | 같은 row (기존 IR) | 별도 row (Business ⊃ Store) |
|---|---|---|---|
| 1 | 사업자 1 + 매장 1 | ○ row 1개. 문제 없음 | ○ row 2개(Business + Store). Store id = 기존 row id 그대로 |
| 2 | 동일 사업자가 두 번째 매장 추가 | **✗** code 가 `kpa-pharm-{bizno}` 로 unique → 두 번째 매장 생성 시 `ON CONFLICT` 로 **첫 매장 row 가 반환**되어 별도 매장이 만들어지지 않음. parent/child 로 바꾸려면 첫 row 를 Business 로 승격하고 매장 2개를 child 로 옮겨야 하는데 그 순간 첫 매장의 `organizationId` 가 Business id 와 겹침(Store Ops 경계 오염) | ○ Business row 1 + Store row 2. 각 Store 의 `organizationId` 독립. business_number 는 Business 에만 |
| 3 | 기존 매장이 다른 사업자로 양도 | **✗** 사업자번호가 바뀌면 code 가 바뀌어야 함 → 새 row 생성(매장 콘텐츠·태블릿·slug·enrollment·members 가 옛 id 에 남음) 또는 code 를 UPDATE(정체성 규칙 위반) | ○ Store row 의 `parentId` 만 새 Business 로 변경. Store id · slug · 자산 경계 불변 |
| 4 | 사업자 유지 · 매장 폐점/이전 | △ 폐점 = row `isActive=false` 하면 **사업자(정산·세금계산서·공급자 관계)도 함께 비활성**. 이전 = address UPDATE 는 가능하나 폐점 후 신규 개설 시 같은 code 충돌 | ○ Store row 만 비활성/신규 생성. Business row 와 관계(정산·세금계산서) 유지 |

**판정: 별도 row 채택.** 같은 row 는 시나리오 1 에서만 안정하고, 이는 현행 코드가 이미 그 상태여서 문제가 안 보였을 뿐이다.

### 2-3. 기존 계약 충돌 여부

| 계약 | 충돌 | 근거 |
|---|---|---|
| Boundary Policy `organizationId`/`storeId` (F6) | **없음** | 두 키 모두 Store row id. 기존 row 가 Store row 로 남으므로 값 불변 |
| ROLE-WORKSPACE 1 Store : N Services · `organization_service_enrollments` | **없음** | enrollment 는 Store row 기준 유지. Business row 는 enrollment 없음(공급자 org 는 지금도 사업자 단위 enrollment — Business=supplier 는 예외적으로 enrollment 보유, 현행 그대로) |
| organization-core `Organization.type: 'division'\|'branch'` (F10) | **REVIEW-2 그대로** | 런타임은 이미 `pharmacy/store/supplier/group` 문자열을 씀. `business` 추가도 같은 예외 범위 |
| `ensureOrganization` path/level 고정 | 구현 수정 필요(계약 아님) | parent 있는 Store row 는 `level=1 · path=/{biz}/{store}` 계산 필요. organization-core 의 트리 서비스 재사용 여부는 Phase 3 |
| `StoreConsoleController` `type IN ('pharmacy','store','branch')` | **없음** | Business row(`type=business`) 는 자연히 매장 목록에서 제외 |
| `kpa_members.organization_id` (분회 또는 약국) | **없음** | 약국 = Store row 유지 |
| `neture_suppliers.organization_id` | **없음** | supplier org = Business row(매장 없음) — Business 개념과 일치 |
| provisioning `code = kpa-pharm-{bizno}` | **REVIEW-9** | 코드 체계 재설계 필요. Business = `kpa-biz-{bizno}`(unique 보장) · Store = uuid/slug 기반 |

중지 조건 "별도 row 가 기존 정본 계약과 직접 충돌" → **해당 없음**.

---

## 3. D5 — `refresh_tokens` 교차 확인

| 경로 | 확인 결과 | 위치 |
|---|---|---|
| entity / repository | `RefreshToken.ts`(auth-core Frozen) · `User.ts:195 @OneToMany` · `entities.ts:554` 등록. `getRepository(RefreshToken)` 호출 = `user.controller.ts` 2곳뿐 | `modules/auth/entities/RefreshToken.ts` |
| token issue writer | **0건.** `generateRefreshToken()` 은 JWT 서명만 반환(`utils/token.utils.ts:124-141`). login(`auth-login.service.ts:273`) · handoff(`handoff.controller.ts:286`) · social(`socialAuthService.ts:128`) · `persistRefreshTokenFamily()`(`auth-context.helper.ts:66-69`) 모두 **`users.refreshTokenFamily` 만 UPDATE**. `INSERT INTO refresh_tokens` · `.save(RefreshToken)` 없음 | 전 저장소 grep(`refresh_tokens` / `RefreshToken)`) |
| refresh route/service reader | **0건.** `refreshTokens()` 는 JWT verify → `users` 조회 → `user.refreshTokenFamily === payload.tokenFamily` 비교 → 새 JWT(family 승계). 테이블 접근 없음 | `auth-token-session.service.ts:41-158` |
| revoke / logout writer | **0건.** `logout()`/`logoutAll()` = `users.refreshTokenFamily = null` | `auth-token-session.service.ts:160-186` |
| `users.refreshTokenFamily` | **refresh family SSOT.** 사용자당 단일 슬롯. 새 로그인 = 새 family · handoff/refresh = 승계 · logout = null · mismatch = null(도난 대응) | 동상 · `refreshTokenFamilyContract.test.ts` 계약 주석 |
| 테스트 | `refreshTokenFamilyContract.test.ts` = users 슬롯만 검증(DB mock). `rbac-baseline…spec:63` 은 baseline 테이블 목록에 이름 포함, `auth-core-dead-lifecycle…spec:101,109` 는 entity 파일 존재 확인 — **런타임 사용 증명 아님** | `services/auth/__tests__/` · `__tests__/` |
| 현재 auth flow | stateless JWT + family 1 슬롯. 유일 reader `getSessions/deleteSession`(`user.controller.ts:247-315`) 은 **어떤 routes 파일에도 등록되지 않음**(`UserController.getSessions` 참조 0 · `/sessions` 경로 0) · 프론트 호출 0. Census 가 적은 `GET /users/me/sessions` 는 현재 dead code | grep 결과 |
| 기타 참조 | `DeleteOrphanKpaUsers` migration 의 `DELETE FROM refresh_tokens`(빈 테이블 정리) · auth-core manifest 소유 목록 · reset SQL · `canonical-schema-baseline` DDL | 스키마 선언만 |

**판정: `DEAD_RETIRE`.** 활성 login/refresh/logout 경로 어디에서도 읽거나 쓰지 않는다. "런타임 사용 여부 코드로 확정 불가" 중지 조건 → **해당 없음**(writer 0 은 코드로 확정된다). 기존 IR 의 `token·deviceId` AUTH_IDENTITY 판정을 **DELETE 로 정정**한다. 기기별 세션 관리가 실제 요구되면 그때 별도 설계한다(현 테이블·컬럼을 재활용하지 않는다).

물리 제거는 auth-core Freeze(F10) 예외 — entity · manifest · spec 2 · baseline DDL · migration 을 함께 다뤄야 하므로 **REVIEW-11** 로 Phase 5 WO 에 넘긴다(본 WO 에서 삭제 0).

---

## 4. Credential / Role / Relationship 접근 규칙 (확정)

```text
Credential   = 현재 자격 상태     (Professional Credential Domain · 초기 물리 kpa_pharmacist_profiles)
Role         = 서비스 권한 할당 기록 (role_assignments · RBAC F9 SSOT · 예: glycopharm:store_owner)
Relationship = 소속·관계           (organization_members · branch_memberships)

실제 접근 허용 = Role 존재
              ∧ 정책이 요구하는 Credential 조건 충족 (예: credential.pharmacist.status = verified)
              ∧ 정책이 요구하는 Relationship 조건 충족 (예: Store row 의 owner/manager)
```

1. Role 은 `credential.pharmacist.status != verified` 상태에서도 **존재할 수 있다**. 자격을 요구하는 경로는 Role 이 있어도 **거부**한다.
2. Credential 상태 변화(만료·취소·미검증)만으로 `role_assignments` row 를 **자동 삭제하지 않는다**. Role lifecycle ≠ Credential lifecycle.
3. Relationship 이 끊긴 경우(`organization_members.leftAt` · 매장 비활성) 도 Role 을 자동 삭제하지 않는다 — 해당 Relationship 을 요구하는 경로에서 거부한다.
4. 세 축은 합치지 않는다. `role_assignments` 는 Authorization SSOT 로 유지하고 Credential/Relationship 을 그 안에 넣지 않는다.
5. 서비스는 세 축의 **Claim** 만 받는다(기존 IR §3-8). 판정은 guard 가 Claim 조합으로 한다 — 구현은 Phase 4(Role/Guard 코드 변경은 본 WO 제외).

---

## 5. 남은 REVIEW

기존 IR REVIEW-1~7 은 유지. 본 WO 에서 추가:

| # | 내용 | 범위 | 승격 차단 여부 |
|---|---|---|---|
| REVIEW-8 | D1 물리 제약 — `users.email` NOT NULL UNIQUE · `password` NOT NULL · `name` NOT NULL default '운영자' 완화. `register.dto.ts` email 필수. auth-core 변경 | F10 예외 (REVIEW-1 확장) | 아니오 — Phase 2 WO |
| REVIEW-9 | D3 provisioning code 체계 — `kpa-pharm-{bizno}` 를 Business 코드로 옮기고 Store 코드 별도. `ensureOrganization` parent/level/path 계산. 기존 row 분리 backfill(Business row 생성 · business_number 이동) | organization-core 예외(REVIEW-2 와 묶음) · migration | 아니오 — Phase 3 WO |
| REVIEW-10 | D7 공식 조회 수단 — 사업자등록번호 진위확인 API(외부 서비스 승인 · 키 관리) 또는 운영자 수동 확인 절차 | 외부 서비스 승인 | 아니오 — Phase 5 |
| REVIEW-11 | D5 `refresh_tokens` 물리 제거 — entity · `User.ts` 관계 · manifest · spec 2 · baseline DDL · `DeleteOrphanKpaUsers` 줄 · 미등록 컨트롤러 2 메서드 | F10 예외 · migration | 아니오 — Phase 5 |
| REVIEW-12 | D4 Connected Channel 설계 — 인증 연결 방식(메신저 사용자 식별자 검증 · 연결 해제 · 명령 권한 범위) | Phase 7 설계 WO | 아니오 |

중지 조건 4종(별도 row 계약 충돌 · refresh_tokens 판정 불가 · 보존정책 충돌 · 동결 Core 없이 표현 불가) 은 **모두 해당 없음**. 동결 Core 관련 항목은 표현(Architecture) 은 가능하고 **구현** 시 예외 WO 가 필요한 것이라 REVIEW 로 남긴다.

---

## 6. 문서 정합

- 발견 1건(기존): `O4O-IDENTITY-ARCHITECTURE-V2` L2 `service_credentials.password_hash` ↔ Google 단일 로그인 충돌 — 기존 IR §6 에서 별도 WO 제안 완료, 본 WO 에서 재제안하지 않음.
- 신규 발견 0건. SUPERSEDED 표기 0 · 링크 수정 0.
- Census `GET /api/v1/users/me/sessions` "dead(DELETE_CANDIDATE)" 기록은 정확하나 route 자체가 미등록임을 본 IR 이 보완(기록물이므로 수정 없음).

---

## 7. 완료 보고 — 8 질문

1. **Google 가입 직후 필수 개인정보** — 없음. 필수 = `users.id · status · created_at · updated_at` + `linked_accounts(google, sub)`. email/name/phone 은 선택이며 Identity Key 가 아니다. 물리 제약 완화는 REVIEW-8.
2. **`kpa_pharmacist_profiles`** — 초기 물리 저장소. 논리 SSOT 는 O4O Professional Credential Domain 이며 KPA 는 영구 소유자가 아니다. `professional_credentials` 테이블은 지금 만들지 않는다.
3. **Business / Store** — 별도 row(같은 `organizations` 테이블 · Store `parentId` = Business). 1 매장이어도 분리. 기존 정본 계약과 충돌 없음, 기존 매장 row 의 id 는 불변. 기존 IR 결론 변경.
4. **Kakao** — `users.kakao_*` · `contact_kakao` = Public Contact Channel(위치 유지). AI Command 용 Authenticated Connected Channel 은 `user_id ↔ 메신저 식별자` 인증 연결로 별도 구조가 필요하며 "두 번째 메신저 때만" 조건은 폐기. 구현 없음.
5. **`refresh_tokens`** — `DEAD_RETIRE`. writer 0 · 등록된 reader 0 · family SSOT = `users.refreshTokenFamily`. 기존 IR 의 AUTH_IDENTITY 2 → DELETE.
6. **users 동의 3 컬럼** — 임시(초기 구현). Target 개념 = `consent_type · policy_version · accepted_at · withdrawn_at`. 이력 요구 발생 시 확장, 지금 테이블 신설 없음.
7. **사업자등록증 파일** — 예외 수집. 기본 = 공식 조회/운영자 확인. `kyc_documents.business_registration` = 예외 검증 수단. Neture 의 판매 전 PDF 필수 조건은 Phase 5 에서 변경. 파일·테이블 삭제 없음.
8. **Credential ↔ Role 충돌** — Role 이 있어도 요구 Credential(또는 Relationship) 미충족이면 접근 거부. Credential 변화로 Role row 자동 삭제 없음. `접근 = Role ∧ Credential ∧ Relationship`.

### 정본 승격 판정

**`APPROVE_WITH_REVIEW`**

- 설계 결정 7건 전부 닫힘. 기존 IR 과 다른 결론(D3 · D4 · D5) 은 변경 이유 기록 완료.
- REVIEW-1~12 는 **구현 시 F10/organization-core 예외 WO** 로 처리할 사항이지 Architecture 표현을 막지 않는다.
- 다음 WO 제안: **`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1`** — 본 IR §1 Decision Table + 기존 IR §2/§3 을 `docs/architecture/` Architecture 정본으로 승격(Target Entity Matrix 에서 `refresh_tokens` 제거 · Business/Store 별도 row · Credential 논리/물리 분리 · Contact vs Connected Channel · Consent 개념 4 필드 · 사업자 검증 원칙 · §4 접근 규칙 수록). `O4O-IDENTITY-ARCHITECTURE-V2` L2 절 SUPERSEDED 처리 여부는 그 WO 에서 판단. 구현·migration 은 그 다음 Phase 2 부터.

---

*작성: 2026-09-17 · 상태: COMPLETE — 판정 `APPROVE_WITH_REVIEW` · 사용자 검토 대기 · 구현 0 · migration 0 · 개인정보 이동 0 · 정본 승격 없음 · 프로덕션 조회 0*
