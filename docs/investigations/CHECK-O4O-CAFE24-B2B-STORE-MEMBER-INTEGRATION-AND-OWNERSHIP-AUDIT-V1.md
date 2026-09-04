# CHECK-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1

**IR**: IR-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1
**일자**: 2026-09-04
**성격**: read-only 조사 — 코드/DB/migration/배포/scope 변경 **0건**
**판정**: **B2B_STORE_MEMBER_INTEGRATION = READY_FOR_PILOT** (§13 · 미결 정책확인 3건은 Pilot 착수를 막지 않는다)

---

## 0. 결론 요약

| 축 | 판정 | 근거 |
|---|---|---|
| Cafe24 회원 식별 (별도 가입 없이) | **REUSE_AS_IS** | Cafe24 가 `쇼핑몰 회원 인증(Customer Access Token)` 을 공식 제공. 문서가 명시적으로 "회원정보 이용 시스템에 회원가입/로그인" 용도로 정의 |
| Cafe24 화면(마이페이지) 삽입 | **ADAPTER_ONLY** | ScriptTags API + 화면코드 + 모듈 앵커로 프론트 임의 화면에 앱 UI 삽입 가능. 대상 화면코드는 실몰에서 확정 |
| Cafe24 scope | **POLICY_CONFIRMATION_REQUIRED** | `mall.read_customer_identifier` 추가 필요 (회원 동의 scope — 운영자 scope 목록과 별개). **이번 조사에서 변경하지 않음** |
| O4O identity 축 | **NEW_IDENTITY_AXIS_REQUIRED** | Cafe24 는 email/이름을 주지 않는다. 현행 `users.email` 은 NOT NULL + UNIQUE. 외부 identity 매핑 축이 없다 |
| O4O Store(=organizations) | **REUSE_AS_IS** | QR/Tablet/Signage/설명서/자료함 **전 축이 `organization_id` 기준**. 조직만 만들면 전부 그대로 동작 |
| 자동 매장 프로비저닝 | **REUSE_AS_IS** | `PharmacyHubStoreProvisioningService` 가 동일 문제(가입 UI 없이 매장 주체 생성)를 이미 해결한 canonical 선례 |
| QR / Tablet Screen Set / Signage | **REUSE_AS_IS** | 소유 컬럼이 전부 `organization_id`. 신규 ownership 축 불필요 |
| 설명서 3계층 | **ADAPTER_ONLY** | SPD(공통) / SPD `created_by_supplier_id`(사업자) / `kpa_store_contents`(매장) 로 이미 분리돼 있다 |
| 상품 범위(타 공급처 포함) | **REUSE_AS_IS** | SPD 는 master 기준, 매장 자산은 org 기준. B2B 주문이력과 구조적 결합 없음 |
| Cafe24 앱 심사 · O4O 홍보 | **POLICY_CONFIRMATION_REQUIRED** | 심사기준에 "다른 서비스로 유도" / "사전 협의되지 않은 광고·홍보 요소" 조항 존재 |

**한 줄 결론**: Cafe24 쪽은 공식 계약이 이미 존재하고, O4O 쪽은 매장 자산 전 축이 `organizations` 하나로 수렴하므로
**신규 ownership 축을 만들 필요가 없다.** 필요한 신규 구조는 `(mall, shop, user_identifier) → O4O user` **매핑 1개뿐**이다.

---

## 1. Cafe24 회원 인증 계약 (§3-a · 공식 문서 실측)

출처: [인증 프로세스 안내](https://developers.cafe24.com/app/front/app/develop/customeraccesstoken/process) ·
[인증코드 요청](https://developers.cafe24.com/app/front/app/develop/customeraccesstoken/oauthcode) ·
[액세스 토큰 발급](https://developers.cafe24.com/app/front/app/develop/customeraccesstoken/token) ·
[회원 고유 식별자 조회](https://developers.cafe24.com/app/front/app/develop/customeraccesstoken/customeridentifier)

Cafe24 는 이 흐름을 **"회원정보 제공 쇼핑몰 → 회원정보 이용 시스템"** 이라고 부르며,
프로세스 문서 Step 3 이 그대로 이렇게 끝난다:

> 반환된 고유 식별자 정보를 통해 **회원정보 이용 시스템에 회원가입/로그인** 합니다.

즉 §1 의 목표(별도 O4O 가입 없이 Cafe24 회원을 외부 시스템 사용자로 연결)는 **Cafe24 가 공식 지원하는 용도**다.

### 1-1. 3단계 계약

| Step | 요청 | 핵심 |
|---|---|---|
| 1 인증코드 | `GET https://{mall 대표도메인}/api/v2/oauth/authorize?response_type=code&client_id=…&state=…&redirect_uri=…&scope=mall.read_customer_identifier` | 브라우저 환경. 미로그인 시 **Cafe24 로그인창 자동 표시**. "이용자 고유 식별자, 회원 아이디" 정보제공 **동의** 필요. **코드 유효 1분** |
| 2 토큰 | `POST /api/v2/oauth/token` (`grant_type=authorization_code`, Basic `client_id:secret`) | access 2시간 · refresh 2주 · 몰당 동시 15개 상한 |
| 3 식별자 | `GET /api/v2/customers/identifier` (Authorization: 발급 토큰) | `{ identifier: { shop_no, user_identifier } }` |

### 1-2. `user_identifier` 의 성질 — 이 조사에서 가장 중요한 사실

문서 정의: **"고유 식별자. (몰ID + 샵NO + client_id + 회원ID) 를 묶은 유니크 식별자"**

여기서 파생되는 제약은 전부 설계에 직접 영향을 준다.

1. **앱 스코프 가명 식별자다.** 회원 아이디 원문이 아니며, 다른 앱과 공유되지 않는다.
2. **`client_id` 가 식별자 입력에 포함된다** → 앱을 재발급하거나 client_id 를 교체하면 **모든 매장 연결이 끊긴다.**
   운영 규칙으로 못박아야 한다(§9 결정사항).
3. **email · 이름 · 연락처를 주지 않는다.** 회원 정보 본문이 필요하면 별도 scope(`mall.read_customer`)와
   운영자 권한 축이 필요하며, 이는 심사 기준의 "지나치게 많은 쇼핑몰 권한" 항목과 충돌 가능 → **요구하지 않는 설계가 옳다.**
4. `shop_no` 가 함께 반환된다 → 멀티샵 몰에서 샵 단위 분리가 가능하다.

### 1-3. 부수 확인 — 이미 반영된 결함

토큰 응답 샘플의 `"expires_at": "2023-02-01T18:49:18.000"` 은 **offset 표기가 없는 KST 벽시계 문자열**이다.
이것이 `WO-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1`(commit `2a197b31a`)에서 고친 결함의 원문 근거다.
회원 인증 토큰도 **동일한 형식**을 쓰므로, 구현 시 `parseCafe24Timestamp()` 를 그대로 재사용한다(새 파서 금지).

---

## 2. 마이페이지 · 화면 삽입 가능성 (§3-b)

출처: [화면 코드 확인](https://developers.cafe24.com/app/front/app/develop/script/screencode) ·
[모듈의 개념 이해](https://developers.cafe24.com/app/front/app/develop/script/module)

- 쇼핑몰 프론트의 각 화면에는 **화면코드**가 부여된다(예: `PRODUCT_DETAIL`). ScriptTags API 는
  `POST https://{mallid}.cafe24api.com/api/v2/admin/scripttags` 로 **지정 화면에 스크립트를 설치**한다.
- 화면 내 위치는 **모듈명**(`xans-` prefix)이나 HTML element id 를 앵커로 잡아 `after()` 삽입한다.
- 화면코드 목록은 문서에 나열돼 있지 않고 **쇼핑몰 어드민 > 사이트 환경 설정 > 화면 경로**에서 확인하는 방식이다.
  → **마이페이지 화면코드는 실제 도매몰에서 확인해야 확정된다** (추측하지 않는다).

**판정**: 구조적으로 가능(ADAPTER_ONLY). "마이페이지에 O4O 매장 판매지원 진입 버튼" 은 스크립트 삽입으로 구현 가능하며,
로그인 회원 한정 노출은 §1 의 인증코드 흐름(미로그인 시 로그인창) 으로 자연히 성립한다.
모바일 대응 여부는 화면코드가 PC/모바일 별도인지 실몰에서 함께 확인한다 — **미확인 항목**.

---

## 3. 필요한 scope (§3-c)

출처: [Scope 안내](https://developers.cafe24.com/app/front/app/develop/api/scope)

- 문서 명시: **"쇼핑몰 운영자 사용 권한과 쇼핑몰 회원 사용 권한의 Scope 목록은 상이합니다."**
- 회원 인증 흐름이 요구하는 scope 는 **`mall.read_customer_identifier`** 하나다(인증코드 문서 파라미터 표 · 샘플 응답 모두 이 값).
- 회원 **정보 본문**(이름/이메일/등급)은 `mall.read_customer` 이며, **이번 설계에는 필요 없다.**

| 현재 | 추가 필요 | 비고 |
|---|---|---|
| `mall.read_product` (운영자 축) | `mall.read_customer_identifier` (회원 동의 축) | 최소권한. `mall.read_customer` 는 요구하지 않는다 |

**이번 조사에서 scope 변경은 수행하지 않았다** (§3-c 지시 · §12 제외범위).
scope 는 [개발자 어드민 > 앱 기본정보 등록 > 권한관리] 에 등록된 값과 정확히 일치해야 하며,
불일치 시 `invalid_scope` 로 인증코드 발급 자체가 실패한다.

---

## 4. O4O 현재 ownership 실측 (§4)

### 4-1. 매장 자산은 전부 `organization_id` 한 축으로 수렴한다

| 자산 | 테이블 | 소유 컬럼 | 근거 |
|---|---|---|---|
| QR | `store_qr_codes` | `organization_id UUID NOT NULL REFERENCES organizations(id)` | [CreateStoreQrCodes](../../apps/api-server/src/database/migrations/20260304120000-CreateStoreQrCodes.ts#L17) |
| Tablet Screen Set | `store_tablet_screen_sets` | `origin='store' → organization_id NOT NULL` (CHECK 강제) | [AddScreenSetOwnerScopeModel](../../apps/api-server/src/database/migrations/20270210000000-AddScreenSetOwnerScopeModel.ts) |
| Signage | `signage_media` 등 | `(serviceKey, organizationId)` 복합 인덱스 | [SignageMedia.entity.ts](../../packages/digital-signage-core/src/backend/entities/SignageMedia.entity.ts) |
| 매장 콘텐츠/자료함 | `kpa_store_contents` | `organization_id` | [kpa-store-content.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts) |
| 기능 on/off | `store_capabilities` | `UQ(organization_id, capability_key)` | [store-capability.entity.ts](../../apps/api-server/src/modules/store-core/entities/store-capability.entity.ts) |
| 공개 매장 주소 | `platform_store_slugs` | `(store_id, service_key)` | [platform-store-slug.entity.ts](../../packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts) |
| 매장 자체 상품 | `store_local_products` | `organization_id` | 프로비저닝 서비스 주석의 실측 목록 |

`organizations` 가 곧 O4O Store 다 ([organization-store.entity.ts](../../apps/api-server/src/modules/store-core/entities/organization-store.entity.ts)
— `@Entity('organizations')` 확장 뷰 엔티티. `code` UNIQUE / `type` / `metadata` jsonb / `created_by_user_id` 보유).

**결정적 사실**: `PharmacyHubStoreProvisioningService` 헤더가 이 축을 이미 SSOT 로 명문화하고 있다.

> 공통 매장 API 는 전부 `resolveStoreAccess()` → `organization_members` 로 organizationId 를 얻으므로,
> 이 row 가 없는 Pharmacy-Hub 경영자는 **매장 기능 전량이 실행 불가**였다.

즉 **organization 없이 매장 기능을 쓰는 경로는 존재하지 않는다.**

### 4-2. 접근 해석기

[`store-organization.resolver.ts`](../../apps/api-server/src/utils/store-organization.resolver.ts) —
`organization_members`(role ∈ owner/admin/manager, `left_at IS NULL`) + **서비스 귀속 판정**
(`organization_service_enrollments.status='active'` ∪ `platform_store_slugs.is_active`).
후보 0 → `none`, 2 이상 → `ambiguous`(임의 선택 금지).

### 4-3. 자동 프로비저닝 선례 — 재발명 금지

[`PharmacyHubStoreProvisioningService`](../../apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts) 가
"가입 폼 없이 매장 주체를 만든다" 는 **동일 문제**를 이미 푼다.

- SSOT 고정: 매장정보=`organizations` / 소유=`organization_members` / 가입=`service_memberships` /
  역할=`role_assignments` / 공개주소=`platform_store_slugs` — **서비스 전용 조직 테이블을 만들지 않는다.**
- 결정적 code (`ph-pharm-{userId 12hex}`, GlycoPharm 은 `gp-pharm-…`, KPA 는 `kpa-pharm-{사업자번호}`)
  → `ON CONFLICT (code)` 로 **멱등**.
- 추측 생성 금지: 후보 모호 시 HOLD(`AMBIGUOUS_ORGANIZATION` 등), 승인은 롤백하지 않는다.

Cafe24 축의 결정적 code 는 자연스럽게 **`cafe24-{mall_id}-{shop_no}-{user_identifier 앞 12hex}`** 형태가 된다.

### 4-4. 기존 external identity 선례 — 있으나 그대로는 못 쓴다

| 선례 | 내용 | Cafe24 적용 가능성 |
|---|---|---|
| `linked_accounts` ([LinkedAccount.ts](../../apps/api-server/src/entities/LinkedAccount.ts)) | `UQ(userId, provider, providerId)` — 정확히 필요한 형태 | provider 가 **DB enum `['email','google','kakao','naver']`** → `'cafe24'` 추가는 **ALTER TYPE**(schema 변경). `email` 컬럼도 NOT NULL |
| `socialAuthService` | 외부 provider 로 사용자 신규 생성, **`password: ''`** (비밀번호 없는 사용자 선례 존재) | email 을 provider 가 준다는 전제. Cafe24 는 **email 을 주지 않는다** |
| Handoff SSO ([handoff.controller.ts](../../apps/api-server/src/modules/auth/controllers/handoff.controller.ts)) | 서비스 간 단일사용 토큰 교환 + `service_memberships.status='active'` 검증 | O4O **내부** 서비스 간 이동용. 외부 IdP 진입점이 아니다 |

### 4-5. 막히는 지점 — `users.email`

[`User.ts`](../../apps/api-server/src/modules/auth/entities/User.ts): `@Index(['email'], { unique: true })`,
`email` NOT NULL, `password` NOT NULL(값은 `''` 허용 선례 있음).
저장소 전체에 **합성 email 을 생성해 사용자 row 를 만드는 선례는 0건**이다(전수 grep).

→ Cafe24 회원은 email 이 없으므로 **users row 생성 방식에 대한 결정이 1건 필요하다**(§9 결정사항 D1).

### 4-6. serviceKey

[`service-keys.ts`](../../apps/api-server/src/constants/service-keys.ts) / [`service-catalog.ts`](../../apps/api-server/src/config/service-catalog.ts)
는 닫힌 화이트리스트다(`platform_services.code` 등록 필요). `pharmacy-hub` · `kpa-branch` 가 **additive 등록 선례**이므로
Cafe24 축도 동일 절차로 키 1개를 추가하면 된다(구조 변경 아님).

---

## 5. Ownership 모델 A / B / C 비교 (§5)

| 기준 | **A. 기존 Store/Organization 생성** | **B. External Store Identity 신규 축** | **C. B2B 사업자 하위 Capability** |
|---|---|---|---|
| QR 재사용 | 그대로 (`organization_id` 충족) | `store_qr_codes.organization_id` **NOT NULL FK** → 스키마 변경 필수 | 조직이 없으면 A 와 같은 벽 |
| Tablet 재사용 | 그대로 | `CHK_stss_owner_scope` 가 store 브랜치에서 org NOT NULL 강제 → CHECK 재작성 | 동일 |
| Signage 재사용 | 그대로 | `(serviceKey, organizationId)` 조회 전면 수정 | 동일 |
| 자료함/설명서 | 그대로 | `kpa_store_contents.organization_id` 수정 | 동일 |
| 접근 해석기 | `resolveStoreAccess` 그대로 | 병행 해석기 신설 → 이중 축(F6 Boundary 위반 위험) | 사업자 조직에 매장 자산이 섞임 → 매장 자체 설명서 소유권 붕괴(§7) |
| 신규 테이블 | **1개** (Cafe24 ↔ user 매핑) | 다수 (external_store + 자산별 adapter) | 1개(sponsorship) + 자산 소유 재정의 |
| 거래관계 종료 시 매장 자산 | 매장 조직에 남는다 (§7 목표 충족) | 정의 필요 | **사업자에 귀속 → §7 위반** |
| Freeze 충돌 | 없음 (F3/F6/F11 준수) | F6 Boundary Policy 정면 충돌 | F11 User/Operator 축 혼탁 |
| 실코드 제약 판정 | **성립** | **성립하지 않음 (사실상 재작성)** | **성립하지 않음** |

**채택**: **A + B 의 얇은 조각**.
A(조직 생성)를 본체로 하고, B 에서 **identity 매핑 1개만** 가져온다.
C 는 §7(매장 자체 설명서는 매장 소유) 과 원리적으로 충돌하므로 채택하지 않는다.
단 C 의 사업 의도(**B2B 사업자가 이용권을 sponsor 한다**)는 소유권이 아니라
**`store_capabilities.source`** 로 표현하면 A 위에서 그대로 성립한다 (기존 컬럼 재사용, 스키마 변경 0).

### 권장 최소 구조

```text
Cafe24 회원 로그인 (mall_id, shop_no, user_identifier)
        │  ← mall.read_customer_identifier 동의 1회
        ▼
[신규 매핑 1개]  cafe24_store_members
        (mall_id, shop_no, user_identifier) UNIQUE → user_id
        │
        ▼  최초 1회 · 멱등 (PharmacyHub 프로비저닝 선례 재사용)
users  →  service_memberships(cafe24축, active)  →  role_assignments(store_owner)
        →  organizations(code='cafe24-{mall}-{shop}-{hash12}')
        →  organization_members(owner)
        →  platform_store_slugs / organization_service_enrollments
        →  store_capabilities (사업자 sponsor 시 source 로 표기)
        │
        ▼  이후 전부 기존 코드
QR · Tablet Screen Set · Signage · 자료함 · 매장 설명서  (변경 0)
```

**신규 구조는 표 1개와 serviceKey 1개뿐이다.** 나머지는 전부 기존 축 재사용이다.

---

## 6. 상품 범위 (§6)

구조적으로 **B2B 주문이력과 결합돼 있지 않다.**

- SPD(`shared_product_descriptions`)는 `master_id` 기준 canonical이며 organization/주문 컬럼이 없다
  ([SharedProductDescription.entity.ts](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts)).
- 매장 자산(`kpa_store_contents`, `store_local_products`, `store_qr_codes`)은 `organization_id` 기준이며
  주문·거래 테이블을 참조하지 않는다.

→ 해당 B2B 구매 상품 / 타 공급자 구매 상품 / O4O ProductMaster 미등재 상품 모두 **동일하게 지원 가능**하다.
ProductMaster 매칭은 §6 지시대로 **편의기능**이며 Gate 로 쓰지 않는다(현행 코드도 Gate 로 쓰지 않는다).

---

## 7. 설명서 ownership 3계층 (§7)

현행 구조가 이미 3계층을 분리해 표현한다. **신규 축 불필요.**

| 계층 | 저장 위치 | 소유/식별 | 매장의 수정 권한 |
|---|---|---|---|
| ① O4O 공통 설명서 | `shared_product_descriptions` (SPD) | `master_id` canonical (`(master, resourceType, descriptionType, language)` 유일) | **불가** — 읽기/사용 |
| ② B2B 사업자 제공 설명서 | 동일 SPD, `created_by_supplier_id` NOT NULL + 운영자 검수 상태 | 공급자 저작 자산 | **불가** — 배포/제공 대상 |
| ③ 매장 자체 설명서 | `kpa_store_contents` (Store Production Material) | `organization_id` | **가능** — 매장 소유 |

- **덮어쓰기 없음**: ①②는 SPD 축, ③은 매장 축으로 물리적으로 분리돼 있다.
- **가져오기 = 사본**: `store_asset_derivations` 가 provenance 를 남기는 기존 계약이다(원본→사본 가드).
  따라서 ①②를 매장이 "가져와" 편집하면 **③의 사본**이 되고 원본은 불변이다.
- **거래관계 종료 후**: ③은 `organization_id` 소유이므로 매장 조직에 그대로 남는다.
  ②의 사용 중단은 SPD 노출 정책으로 처리되며 ③을 회수하지 않는다. → §7 원칙 그대로 성립.

F12 Product Resource Architecture(계층1 Product Resource / 계층2 Store Production Material)와도 정합한다.

---

## 8. 정책 확인사항 (§3-d · §10)

출처: [심사 승인](https://developers.cafe24.com/app/front/app/launch/examine) ·
[운영 시 고려사항](https://developers.cafe24.com/app/front/app/operate/caution)

**확인된 조항 (원문)**

| 구분 | 조항 | 영향 |
|---|---|---|
| 심사 · 서비스 제공정책 | "카페24가 제공하는 부가서비스와 연계되지 않고 **다른 서비스로 유도**하는지 확인합니다" | §10 의 "O4O 독립 이용 문의" 안내가 직접 걸린다 |
| 심사 · 지침위반 요소 | "앱 내에 **사전에 협의되지 않은 광고/홍보 요소**가 포함되어 있지 않은지" | `Powered by O4O` 표기도 사전 협의 대상 |
| 심사 요청 고려사항 ⑦ | "입점하는 서비스가 카페24의 **경쟁업체 및 관련서비스**, 사업을 영위하는 범위가 충돌되는 경우 심사반려될 수 있습니다" | O4O 매장 판매지원의 포지셔닝 설명이 필요 |
| 심사 · 유해성 | "앱의 실행과 **무관하게 지나치게 많은 쇼핑몰 권한**을 요구하지 않는지" | `mall.read_customer` 를 요구하지 않는 §3 설계가 유리 |
| 운영 · 마케팅 금지사항 | "앱 상세페이지에 **제휴사의 링크 또는 제휴사를 광고하는 것을 금지**" | 앱 스토어 상세페이지에는 O4O 홍보를 넣지 않는다 |
| 운영 · 마케팅 금지사항 | "앱 서비스와 **무관한 데이터를 무단으로 수집**하지 않습니다" | 식별자 외 회원정보 미수집 원칙과 일치 |

**미확인 (추측하지 않음)**

- 마이페이지 영역의 **정확한 화면코드** 및 PC/모바일 분리 여부 → 실몰 어드민에서 확인
- **B2B 회원이 타 공급처 상품까지 사용하는 것**에 대한 Cafe24 명시 제약 → 문서상 조항 **발견되지 않음**.
  없다고 단정하지 않고 스토어 운영팀 확인 대상으로 남긴다.
- "Powered by O4O + 문의 메일" 수준의 표기가 **사전 협의로 승인 가능한지** → 스토어 운영팀 확인 필요

**§10 권장**: 앱 내 하단/도움말에 한 줄 표기까지만 검토하고, **앱 스토어 상세페이지에는 넣지 않는다.**
별도 O4O 가입 유도는 §1·§2 원칙상으로도, 심사기준상으로도 하지 않는다.

---

## 9. §11 — 반드시 답할 11개 질문

| # | 질문 | 답 |
|---|---|---|
| ① | 별도 O4O 가입 없이 Cafe24 B2B 회원 식별 가능한가 | **가능**. `mall.read_customer_identifier` → `GET /api/v2/customers/identifier`. Cafe24 가 "외부 시스템 회원가입/로그인" 용도로 공식 정의 |
| ② | 마이페이지/공통화면에 자연스럽게 넣을 수 있는가 | **가능**(ScriptTags + 화면코드 + 모듈 앵커). 대상 화면코드는 실몰 확인 필요 |
| ③ | 추가 scope 가 필요한가 | **필요**. `mall.read_customer_identifier` 1개. `mall.read_customer` 는 불필요 |
| ④ | canonical key 는 무엇인가 | **`(mall_id, shop_no, user_identifier)`**. `user_identifier` 자체가 (몰ID+샵NO+client_id+회원ID) 해시. **client_id 교체 시 전량 재연결 필요** |
| ⑤ | O4O Store/Organization 생성이 필수인가 | **필수**. 매장 자산 전 축이 `organization_id` NOT NULL/FK. 우회 경로 0 |
| ⑥ | A/B/C 중 최소 구조는 | **A + identity 매핑 1개**. B 는 자산 전 축 스키마 재작성(F6 충돌), C 는 §7 소유권과 충돌. 사업자 sponsor 는 `store_capabilities.source` 로 표현 |
| ⑦ | QR/Tablet/Signage 재사용 정도 | **전량 재사용**. organization 만 확보되면 코드 변경 0 |
| ⑧ | 사업자 설명서 ↔ 매장 자체 설명서 분리 | SPD(`created_by_supplier_id`) ↔ `kpa_store_contents`(`organization_id`) 로 **이미 분리**. 가져오기는 `store_asset_derivations` 사본 계약 |
| ⑨ | 타 공급처 상품 사용의 구조적/정책적 문제 | **구조적 문제 없음**(주문이력 비결합). 정책은 Cafe24 문서상 조항 미발견 → 확인 대상 |
| ⑩ | 심사/홍보에서 확인 필요한 정책 | §8 표 3건: "다른 서비스로 유도" / "사전 미협의 광고·홍보" / "경쟁·관련서비스 충돌" |
| ⑪ | 다음 Pilot 범위 | §10 |

### 결정사항 (사용자 판단 필요 — 구현 착수 전)

| # | 항목 | 내용 |
|---|---|---|
| **D1** | `users` row 생성 방식 | Cafe24 는 email 을 주지 않는데 `users.email` 은 NOT NULL UNIQUE 이고 **합성 email 선례가 0건**이다. (ⅰ) 결정적 합성 주소 (ⅱ) email nullable 전환(Core F10 변경 → WO 필요) (ⅲ) 최초 1회만 email 입력받기(§2 금지 UX 에 근접) 중 택1 |
| **D2** | serviceKey | Cafe24 축 신규 키(`cafe24` 등) 등록 여부 및 명칭. `platform_services.code` 등록 필요 |
| **D3** | client_id 불변 운영규칙 | client_id 가 식별자 입력에 포함되므로 **앱 재발급 = 전 매장 연결 상실**. 운영 문서에 못박을지 |

---

## 10. 다음 Pilot WO 권장 범위

**WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 (제안)**

포함:
1. `mall.read_customer_identifier` scope 등록 + 회원 인증 3단계 구현
   (`parseCafe24Timestamp()` 재사용 · 토큰 암호화 저장은 기존 `cafe24-token-crypto` 재사용)
2. 매핑 테이블 1개 + 멱등 프로비저닝 서비스 (PharmacyHub 선례 구조 이식)
3. 매장 진입 1개 화면(내 매장 홈)까지만 — QR/Tablet/Signage 는 **기존 화면 그대로 노출**만 확인
4. 실 도매몰 1곳에서 마이페이지 화면코드 확인 + ScriptTags 진입 버튼 1개

제외:
- 회원정보 본문 조회(`mall.read_customer`) · Cafe24 write API · 주문/결제/배송 연동
- 설명서 신규 구현 · ProductMaster 수정 · QR/Tablet/Signage ownership 변경
- 앱 스토어 심사 제출 (D1~D3 결정 및 정책 확인 이후)

선행: **D1 · D2 결정** + 실 도매몰 `mall_id`/`shop_no`
(같은 선행조건이 `WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1` 에도 걸려 있다 — 함께 해소하는 것이 효율적이다)

---

## 11. 이번 조사에서 변경한 것

| 항목 | 결과 |
|---|---|
| 코드 | **0건** |
| DB schema / migration / 데이터 | **0건** |
| Cafe24 scope · 앱 설정 | **0건** |
| 배포 | **0건** |
| 신규 문서 | 본 CHECK 1건 |

§15 지시대로 **이 조사 결과 이전에 B2B 매장회원용 앱 구현을 시작하지 않았다.**

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§10)
