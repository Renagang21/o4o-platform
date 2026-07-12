# IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1

> 상태: 조사 완료 (read-only) · 작성일 2026-07-12
> 대응 WO: `docs/work-orders/WO-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`
> 기준 정책(SSOT): `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`
> 성격: **조사·설계 전용 IR (역사·불변)**. 코드/DB/QR/배포 무변경. 운영 규칙은 Guide/Registry에서, 구현은 후속 WO에서 수행한다.
> 선행 참조: `IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2.md`(2026-07-09), `IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md`, `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md`(F12), `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md`

---

## 1. 조사 목적

새로 확정된 `O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1`(구매 지원 목적 · 제품 신뢰 판매요소 · 로그인 전용 열람 · 제작/비제작 범위 · 공급자 제작원 자동 표시 · 매장 자체 콘텐츠 구분)이 **현재 코드·DB·기존 문서와 어떻게 연결되는지** read-only로 조사한다. 구현·DB write·migration·deploy는 하지 않는다.

조사 방법: 5개 read-only 병렬 조사(A+D 저장 계층 / B+C 공급자 조직·제작원 / E+F+G 인증·노출·QR / H+I 일반식품·화장품 / J+K 건기식 실행문서·문서 충돌). 모든 주장에 `file:line` 근거를 부여한다.

---

## 2. 결론 요약 (Executive Summary)

| # | 정책 요구 | 현재 구현 상태 | 판정 | 후속 |
|---|---|---|---|---|
| A | O4O 공통·공급자·매장 3 콘텐츠 유형 구분 | O4O·공급자는 **같은 테이블(SPD)**, `source_type` enum으로만 구분. 매장 자체는 별도 테이블이나 SPD로 유입 가능 | ⚠️ **부분** | 메타데이터 보강 |
| D | O4O 공통 설명서 작성주체 메타데이터 충분성 | SPD에 **조직 소유 컬럼 없음**(`created_by`=user). `SUPPLIER_STORE` 타입 정의됐으나 **write 경로 0** | ⚠️ **불충분** | 스키마/시드 보강 |
| B | 공급자 업체명·연락처가 회원·조직 등록에 존재 | `organizations.name` + `neture_suppliers.contact_*`(visibility 플래그) **이미 존재** | ✅ **충족** | 신규 입력 UI 불필요 |
| C | 공급자 제작원 렌더러 자동 표시 | 링크 체인·조직정보 존재하나 **공개 read model이 source_type/org를 제거**, 렌더러에 credit 슬롯 없음 | ⚠️ **최소 API 확장 필요(방식 2)** | 후속 WO |
| E | 로그인 사용자만 설명서 본문 열람 | 설명서 API `GET /public/product-landings/:key` **완전 무인증** — 로그인 전용 정책 **미구현** | ❌ **미구현·정반대** | 후속 WO(핵심) |
| F | 일반 공개 인터넷 비노출 | 본문은 **server-auth·noindex 어느 쪽으로도 차단 안 됨**. sitemap 미포함·SPA·publish gate 뿐 | ❌ **노출 위험** | 후속 WO |
| G | 상품 기본 QR vs 사업용 QR 구분 | `product_landings`(기본·동적 QR) vs `store_qr_codes`(사업용·저장·org) **명확 분리** | ✅ **충족** | 변경 없음 |
| H | 기존 일반식품 설명서 보존 | 저장·조회 전부 **카테고리 무관** 공통 배관. "신규 중단"은 **코드 영향 0** | ✅ **보존 안전** | 문서만 정비 |
| I | 화장품 O4O 직접 제작 금지 | 화장품 canonical 생성 흐름 **없음**(정책 일치). 단 generic 컨트롤러에 **카테고리 가드 없음**(잠재 code-conflict) | ⚠️ **가드 gap** | 후속 WO(가드) |
| J | 건기식 실행문서 정렬 | 목적·신뢰·언어(ko+en)·사진/정본 구분 정렬됨. 단 **R1~R10 규칙 SSOT 끊김**, 이중게이트 누락 | ⚠️ **Active 문서 정비 필요** | 문서 정비 |
| K | 기존 문서 충돌 정리 | 대부분 정렬. general-food/AGENT-KICKOFF Legacy 미표기 등 소수 Active 충돌 | ⚠️ **소수 정비** | 문서 정비 |

**핵심 판단 3줄**
1. **저장·QR 계층은 대체로 완비**(SPD + product_landings + store_qr_codes)되어 있고, 일반식품 보존과 상품 기본 QR/사업용 QR 구분은 **정책과 이미 일치**한다.
2. **가장 큰 격차는 "로그인 전용 열람"(E/F)** — 현재 설명서는 **의도적으로 공개·무인증**으로 설계·배포되어 있어 정책과 정반대다. 이는 F12 baseline(공개 `/r/{id}`)과 shipped code(공개 `/p/{key}`) **양쪽과 충돌**하므로, 구현 이전에 **baseline 결정**이 필요하다.
3. **공급자 제작원 자동 표시(C)는 스키마 변경 없이 "최소 API 확장(방식 2)"으로 가능**하다. 업체명·연락처는 이미 등록정보에 있고 콘텐츠→조직 링크 체인도 연결돼 있다.

---

## 3. A. 콘텐츠 저장·소유권 맵

### 3.1 세 콘텐츠 유형 → 저장 테이블 → 구분 컬럼 → 판정

| # | 콘텐츠 유형 | 물리 저장 테이블 | 구분 컬럼 | 구분 가능? |
|---|---|---|---|---|
| 1 | **O4O 공통 설명서** | `shared_product_descriptions`(SPD) | `source_type` ∈ {operator, ai, drug_extension, mfds_*, migration, manual} + `status='canonical'` | ⚠️ 부분 — "O4O 작성"을 나타내는 **양성 플래그 없음**. "공급자/매장이 아닌 나머지"로만 정의 |
| 2 | **공급자 제작 설명서** | `shared_product_descriptions`(**동일 테이블**) | `source_type='supplier'` + `source_ref_id`→`supplier_product_offers.id` | ⚠️ 부분 — `source_type`만으로 구분. `description_type='SUPPLIER_STORE'` 축은 **어떤 코드도 write하지 않음**. 조직 컬럼 없음 |
| 3 | **약국·매장 자체 콘텐츠** | **별도**: `store_multilingual_product_content_groups/pages`(org-scoped) · legacy `store_product_profiles.description` · Store Production Material(`kpa_store_contents` 등) | `organization_id`(소유 org) + `source_type='store_created'` | ✅ 물리 분리. 단 SPD 내 `source_type='store_contribution'` 존재 → 공통 풀 유입 가능(위험 3) |

**근거 파일**
- SPD `source_type` union: `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts:34-55`
- SPD `description_type` union/기본값 STORE: 동 `:79-89`
- 공급자 시드 → SPD(`descriptionType` 미지정 → STORE 기본): `apps/api-server/src/modules/neture/services/shared-product-description.service.ts:325-363`(특히 `:351-359`)
- 매장 다국어 콘텐츠 엔티티: `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-group.entity.ts:22-25,37,62-63` · `-page.entity.ts:31-92`
- 매장 자체 콘텐츠 링크 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts:25,79-154`

### 3.2 콘텐츠 해석 순서(소비자)

`O4O-CONTENT-TYPE-TAXONOMY-V1.md:10-46` 및 `store-public-utils.ts`가 SSOT로 정의하는 소비자 본문 해석 순서:
```
COALESCE( SPD.content[canonical]
        → store_product_profiles.description[legacy]
        → supplier_product_offers.consumer_detail_description )
```
매장 자체/생산자산은 "Content / Production Material"로 분류되며 **명시적으로 상품설명(SPD)이 아니다**.

---

## 4. D. shared_product_descriptions 실제 저장 구조

### 4.1 컬럼 인벤토리
(엔티티 `SharedProductDescription.entity.ts:91-165`; DDL `20261114000000-CreateSharedProductDescriptions.ts:22-49`)

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `id` | UUID PK (`gen_random_uuid()`) | Resource ID |
| `master_id` | UUID NOT NULL → `product_masters(id)` ON DELETE CASCADE | **ProductMaster 연결 키**. 단방향 nullable ManyToOne(F12 #6) |
| `content` | TEXT NOT NULL | 설명서 본문(HTML) |
| `summary` | TEXT nullable | 요약 |
| `source_type` | VARCHAR(32) NOT NULL | **작성 주체/출처 클래스**(supplier/operator/ai/store_contribution/drug_extension/mfds_*/migration/manual) |
| `description_type` | VARCHAR(32) NOT NULL DEFAULT `'STORE'` | 사용 축 B2B/B2C/STORE/SUPPLIER_STORE |
| `source_ref_id` | UUID nullable | 원본 레코드 id(offer_id/ai_content_id/user) |
| `status` | VARCHAR(32) NOT NULL DEFAULT `'candidate'` | candidate/canonical/hidden/needs_review/deprecated |
| `language` | VARCHAR(16) nullable DEFAULT `'ko'` | 언어 코드 |
| `quality_score` | NUMERIC(5,4) nullable | 품질 점수 |
| `curated_by` / `curated_at` | UUID / TS | 큐레이터 **user** id / 시각 |
| `created_by` / `updated_by` | UUID | 작성 **user** / 최종 편집 **user** id |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | 타임스탬프 + soft-delete |

**존재하지 않는 컬럼**(엔티티+전체 migration 검색): `author_organization`, `owning_organization`, `supplier_id`, `author_role`, `canonical`(boolean), `origin` — **없음**. 작성 주체는 `source_type` enum + user-level UUID로만 표현.

### 4.2 canonical 유일성 (DB 레벨 강제)

부분 유니크 인덱스로 강제, 3개 migration으로 진화:
1. `20261114000000...:62-66` — `(master_id)` WHERE `status='canonical' AND deleted_at IS NULL`
2. `20261223000000-AddDescriptionTypeToSharedProductDescriptions.ts:47-52` — `(master_id, description_type)`
3. `20261228000000-CanonicalPerMasterTypeLanguage.ts:42-47` — **현재**: `(master_id, description_type, COALESCE(language,'ko'))` WHERE `status='canonical' AND deleted_at IS NULL`

**현재 규칙 = (master_id, description_type, language)당 canonical 1건.** 앱 레이어(`setCanonical`)도 동일 type+language의 기존 canonical만 demote(`shared-product-description.service.ts:223-256`). → **canonical 유일성은 DB 레벨로 강제**(F12 #2 일치).

### 4.3 작성 주체 메타데이터 충분성 — **판정: 정책 대비 불충분**

- 공급자/O4O/매장 작성 주체는 `source_type` **출처 enum**으로만 표현 가능(값은 각각 존재). 그러나 **조직 단위 소유 컬럼이 없다.** `created_by`/`curated_by`/`updated_by`는 **user UUID이지 조직이 아니다**.
- **공급자 제작원(조직명·연락처)은 SPD 단독으로 렌더 불가.** `source_ref_id`→`supplier_product_offers`→공급자 조직 join이 필요(시드가 `source_ref_id=offer.id` 설정, `:355`). SPD에 denormalized 공급자 org/contact 필드 없음.
- **`SUPPLIER_STORE` 타입은 사실상 dead**: 엔티티(`:79-89`)와 admin generic API(`product-master-description.controller.ts:49`)에서 허용되나 **어떤 write/seed도 이 값을 설정하지 않음**(`grep SUPPLIER_STORE` = 엔티티/컨트롤러 allow-list/migration 주석뿐, 시드 0). 공급자 offer는 `source_type='supplier'` + `description_type='STORE'`(기본)로 시드 → 공급자-store와 O4O-store가 **둘 다 `description_type='STORE'`**, `source_type`로만 분리.
- IR-...ARCHITECTURE-V1 §13-1(:276)이 "SUPPLIER_STORE를 독립 타입으로 둘지 / STORE+origin=supplier로 둘지"를 **미결(open)**로 남겼고, 현재 코드는 **어느 쪽도 깔끔히 채택하지 않음**.

---

## 5. B. 공급자 회원·조직 등록정보

| 항목 | 값 / 근거 |
|---|---|
| 조직 엔티티/테이블 | `Organization` → `organizations` — `packages/organization-core/src/entities/Organization.ts:29` |
| 조직명 필드 | `name` varchar(255) — 동 `:44-45` (SSOT) |
| 공급자 판정 | `organizations.type='supplier'`(엔티티 union 우회 raw SQL write) — `supplier.service.ts:1030`, `operator-registration.service.ts:204-205`; code prefix `neture-{slug}`, `metadata.serviceKey='neture'` |
| 활성 상태 | `isActive` boolean — `Organization.ts:129-130` |
| 연락처(조직) | migration으로 추가된 실컬럼 `business_number`, `address`, `address_detail`, `phone` — `getOrgDataBatch()` `supplier.service.ts:1172`; `NetureSupplier.entity.ts:85-88` 주석("organizations로 이관, getOrgDataBatch로 read") |
| 공급자 레코드 | `NetureSupplier` → `neture_suppliers`; `user_id`(`:189`) + `organization_id`(`:203-204` "Bridge to organizations") |
| 공식 공개 연락처 | `NetureSupplier.contactPhone/contactEmail/contactWebsite/contactKakao` + **각 public/partners/private visibility 플래그**(`:59-81`); `contact_email` 기본 PUBLIC, `contact_phone` 기본 PRIVATE(`:71-75`) |
| user↔org 멤버십 | `OrganizationMember` → `organization_members`(role admin/manager/member/moderator, isPrimary) — `OrganizationMember.ts:31` |

**판정**: 업체명(`organizations.name`)과 공식 공개 연락처(`neture_suppliers.contact_*`, 기본 email=public)는 **이미 등록정보에 존재**한다. **설명서별 신규 연락처 입력 UI는 불필요**하다. 콘텐츠→조직 연결 경로(아래 C3)도 완전 연결돼 있다.

---

## 6. C. 공급자 제작원 자동 표시 가능성

### 6.1 렌더러 / 공개 read model 현황
- 정본 렌더러: `packages/content-editor/src/components/ContentRenderer.tsx:236`, 상품 설명 경로 = `variant="store-description"`(`:269-278`, 스코프 `sd-*` CSS `:137-225`). 소비 표면: `services/web-neture/src/pages/ProductLandingPage.tsx:216`, KPA `StoreDescriptionViewModal`.
- **credit/author/source 슬롯 없음**: `ContentRenderer` props = `html/className/style/variant`뿐(`:41-55`), `dangerouslySetInnerHTML`(`:275`). 단 **소형 푸터 CSS 훅 존재**: `.sd-foot`(`:204`).
- **공개 read model이 출처를 제거**: `getPublicLanding()`이 SPD에서 `content, summary, description_type`만 select(`product-landing.service.ts:177,192-197`), 응답에 `sourceType`/`sourceRefId`/공급자 org **미포함**(`product-landing.controller.ts:32-37`). admin/operator review API는 `sourceType`/`sourceRefId` 노출(`service.ts:521-522,552-559`)하나 소비자 landing은 아님.
- **조직 변경 자동 반영 가능(방식 2)**: 저장 `content`는 순수 sanitized 본문(sanitizer가 `<style>` 제거)이라 업체명·연락처가 **HTML에 박혀 있지 않음** → 렌더 시 org id 조회하면 이후 `organizations.name`/`contact_*` 변경이 자동 반영.
- 콘텐츠→조직 링크 체인: `SPD.source_type='supplier'` + `source_ref_id`→`supplier_product_offers.id`(`:47-52`)→`.supplier_id`→`neture_suppliers.organization_id`(`:203-204`)→`organizations`. **완전 연결.**

### 6.2 판정 — **B. 최소 API 응답 확장 필요**

구조적 전제는 모두 존재(스키마 충분·링크 온전)하나, **공개 read model이 작성 조직 정보를 노출하지 않고** 렌더러에 credit 슬롯이 없다.

- 필요한 최소 확장: (1) `getPublicLanding()`이 `source_type`/`source_ref_id`도 select하고, supplier 출처면 offer→supplier→organization join하여 `credit: {orgName, contact} | null`(visibility 준수) 반환 — `product-landing.service.ts:177-197`. (2) `ProductLandingPage.tsx:216` 뒤에 `.sd-foot` 스타일의 소형 푸터를 `ContentRenderer` 형제 요소로 렌더(`콘텐츠 제작: {orgName}` / `문의: {contact}`). 선택적으로 `ContentRenderer`에 `credit` prop 추가.
- 면제 처리 자연스러움: `source_type='supplier'`일 때만 credit 방출 → 매장 자체(`store_contribution`/`operator`)는 자동 skip(정책의 "매장 자체 콘텐츠 제작원 표시 제외" 충족).

### 6.3 방식 비교

| | 방식 1: 본문 HTML에 업체명·연락처 직접 저장 | 방식 2(정책 권고): 작성 조직 ID 기준 렌더 시 자동 표시 |
|---|---|---|
| 데이터원 | SPD.content 안 frozen 리터럴 | `source_ref_id`→offer→supplier→`organizations` 렌더 시 조회 |
| 조직 변경 반영 | ❌ 재편집 전까지 stale | ✅ 자동 |
| 등록정보 자동 사용 | ❌ 설명서별 재입력(정책 위반) | ✅ 기존 등록에서 가져옴 |
| 면제 처리 | 설명서별 수동 누락 위험 | ✅ `source_type` 구조적 구동 |
| 다국어/canonical 중복 | 언어 행마다 중복 | ✅ 단일 조회, 언어 독립 |
| 작업량 | 에디터+write 경로 변경, sanitizer whitelist | API select+join + 푸터 1요소 |
| 현재 가능? | 가능하나 정책 위배 | ✅ 링크·필드 이미 존재, read-model 노출+푸터만 |

**→ 방식 2가 현재 구조로 실현 가능**하며 스키마 변경·신규 연락처 입력 UI 불필요.

---

## 7. E. 로그인 전용 설명서 열람  ⚠️ (가장 큰 격차)

### 7.1 실제 존재하는 것
- **상품 페이지 = Product Landing `/p/{public_key}`** (F12의 `/r/{id}` permalink는 **미구현**). 프론트 route `services/web-neture/src/App.tsx:668`; 페이지 `ProductLandingPage.tsx:92,216`.
- 설명서 API: `GET /api/v1/public/product-landings/:publicKey` — 컨트롤러 `apps/api-server/src/modules/neture/controllers/product-landing.controller.ts:34-55`; read model `product-landing.service.ts:142-230`(`getPublicLanding`, 본문 `:194-225`); route mount `bootstrap/register-routes.ts:454`.
- `/r/:id` resolver: **아예 없음**(grep 확인; `IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1.md:87` "미구현").

### 7.2 인증 상태 — **완전 무인증(PUBLIC)**
- 공개 컨트롤러(`:34-55`)에 `authenticate`/`requireRole` **없음**. 동일 파일 admin 컨트롤러는 `router.use(authenticate); router.use(requireRole(ADMIN_ROLES))`(`:62-63`) — 대조.
- route mount(`register-routes.ts:454`)에 미들웨어 없음. 프론트 `/p/:publicKey`는 `RoleGuard`/`ProtectedRoute` 바깥(`App.tsx:668`).
- **비로그인 응답에 본문 포함**: `getPublicLanding`이 `status='active' AND exposure_state='ok'`이면 `description.content`(전체 본문) 반환. `blocked:true`면 본문 생략 — 그러나 이는 **publish/moderation gate이지 auth gate 아님**(기본값 `active`/`ok`, `20261225000000-CreateProductLandings.ts:23-24`).
- **returnUrl**: 앱 일반에는 존재(`App.tsx:603,615-619`)하나 `/p/:publicKey`에는 **미연결** → 설명서에는 로그인 리다이렉트·복귀 라운드트립 **없음**.
- **역할 제한 없음**: 소비자·비로그인·모든 역할이 동일 출력.

### 7.3 판정
정책의 "로그인 사용자만 열람 / 비로그인은 로그인·가입 후 원래 URL 복귀"는 **전혀 구현되어 있지 않다.** 현재 `/p/{key}`는 `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1.md:54`에서 **의도적으로 "공개·무인증"**으로 설계·배포됨.

---

## 8. F. 검색엔진·공개 노출 상태

핵심 질문 — 비로그인에게 본문이 **server-auth**로 막히는가 **noindex**로만 막히는가? **답: 둘 다 아니다(막혀 있지 않다).** SEO 표면은 접근이 아니라 발견성만 낮춘다.

- **sitemap**: `services/web-neture/public/sitemap.xml` — 정적 마케팅 URL 9개뿐. `/p/`·`/r/` 상품/설명서 URL **없음**(열거 불가).
- **robots.txt**: `services/web-neture/public/robots.txt` — `Allow: /`; `/admin/`·`/mypage/`·**`/qr/`(:13)** disallow, 그러나 **`/p/`는 disallow 안 함** → 크롤 허용. `/p/` 대상 `noindex` meta 없음.
- **Meta/OG**: `services/web-neture/index.html:8-13` 사이트 수준 정적 description/og만. per-product OG·본문 meta **없음**(SPA, per-route SSR meta 주입 없음).
- **SSR HTML**: 없음(SPA). 본문은 서버 HTML에 없고 client-side **무인증 API**로 전달.
- **public cache header**: 컨트롤러에 명시 `Cache-Control` 없음(static-only, 런타임 미검증).
- **공개 검색 API**: 해당 경로는 단일 key lookup(검색/목록 아님) — 본문 열거 엔드포인트 미발견.

**Net**: 본문은 (i) sitemap 미포함 (ii) SPA client-render (iii) publish `blocked` gate로만 보호됨. `GET /api/v1/public/product-landings/{key}` 직접 호출이나 JS 렌더 크롤러(Googlebot 등)는 **로그인 없이 전체 본문 취득**. **server auth 없음.**

> 런타임 caveat: SPA/SSR 판정·cache header·실크롤러 동작은 static-only, 프로덕션 미호출.

---

## 9. G. 상품 기본 QR vs 사업용 QR

두 트랙은 **테이블·라우트·도메인·게이팅이 분리**되어 있고 **혼재하지 않는다.**

**트랙 1 — 상품 기본 QR (Product Landing)**
- 테이블 `product_landings`(`20261225000000-CreateProductLandings.ts`). master당 1건 — `UNIQUE INDEX uniq_product_landings_master`(`:34-38`), idempotent mint(`product-landing.service.ts:92-124`).
- 공개 URL `neture.co.kr/p/{public_key}`(`:24-26`).
- **QR 이미지 비저장·런타임 동적 생성**(`getLandingQr`→`generateQrSvg`, `:130-135`; 주석 "F12 #4"). **F12 불변식 ④ 일치.**
- 설명서 변경 무관: QR은 안정 `/p/{key}` URL 인코딩, 본문은 요청 시 SPD에서 live 해석(`:194-201`).
- ProductMaster↔Landing: 단방향 `product_landings.product_master_id`→`product_masters`(역FK 없음). **F12 불변식 ⑥ 일치.**

**트랙 2 — 사업용 / 매장 QR**
- 엔티티/테이블 `store_qr_codes`(`apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts:21-71`). **org-scoped**(`organization_id` NOT NULL), 전역 유니크 `slug`(`:49-51`), `landing_type`+`landing_target_id`(`:43-47`), 저장 rows + 스캔 추적(`store_qr_scan_events`).
- 공개 resolver `GET /qr/public/:slug` — **공개**(`store-qr-landing.controller.ts:110-111`), 관리 route는 `requireAuth`(`:317,373,438,489`).
- 도메인: `qrPublicOrigin(serviceKey)` per-store(**neture.co.kr 아님**, `:506`).
- operator 템플릿은 별도 `operator_qr_templates`에서 `store_qr_codes`로 copy-import.

**혼재?** 없음. `product_landings` vs `store_qr_codes`, `/p/{key}` vs `/qr/{slug}`, neture.co.kr vs per-store, 동적/비저장 vs 저장/스캔추적. 문서도 "계층 1 vs 계층 2"로 명시(`IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md:140`).

---

## 10. H. 기존 일반식품 설명서 보존

- **저장**: 일반식품도 SPD에 저장. **SPD에는 food-type 컬럼 없음**. 카테고리는 `ProductMaster.category_id`→`product_categories(slug='general-food')`(seed `20260323700000-SeedProductCategories.ts:32`) 또는 `regulatoryType`/`tags`로 식별. 일반식품 설명서 식별 = `shared_product_descriptions → product_masters → product_categories(slug='general-food')` join.
- **samples/**: `docs/guides/products/general-food/README.md:30-32`가 가리키는 `samples/` = **커밋된 자립 HTML 10개**(ko + `.zh` 쌍: damrokwon-heukyeomso, elamor-liposome-collagen, coolman-cheonmundong, manpower-poten). 제품 토큰(`damrokwon`/`elamor`/`coolman`/`heukyeomso`/`liposome`)은 **두 general-food 문서에만 등장, `apps/api-server/src` 전체 grep 0** → **DB 시드 아님**. 커밋 HTML = 디자인/톤 참고 산출물. 프로덕션 DB에 동일 제품 SPD 행이 존재하는지는 **Cloud SQL 확인 필요**(§16).
- **연결**: 전부 카테고리 무관 공통 배관 — SPD→master 단방향(`SharedProductDescription.entity.ts:104-106`), `/p/{key}` landing + 동적 QR(`product-landing.service.ts:24-26,130-135`), `store_product_description_selections`(태블릿/매장) 모두 master/description id로 generic 참조.
- **"신규 제작 중단"의 코드 영향 — 판정: 0.** 일반식품 전용 생산 코드 경로·feature flag·category-gated 엔드포인트·배치 스크립트가 **없다**. 생산은 generic admin 컨트롤러 + 수동 photo→HTML 에이전트 워크플로로만 발생 → "중단"은 에이전트/운영자가 general-food에 대해 실행하지 않는 것뿐. 조회는 카테고리 무관이므로 기존 행은 변경 없이 계속 렌더. soft-delete(`deletedAt`)라 자동 삭제 없음.
- **문서 충돌 1건**(§13 참조): `general-food/AGENT-KICKOFF.md`가 Legacy 배너 없이 여전히 신규 생산 지시(`:11,:24,:41-44`) — README(`:3`)·DOCUMENT-INDEX(`:45`) Legacy 표기와 불일치. **코드 아님, 문서만.**

---

## 11. I. 화장품 직접 제작 정책 충돌

- **화장품 canonical 설명서 생성 흐름 없음**(정책 일치): 자동/배치 canonical 생산자는 drug(OTC)·건기식 스크립트뿐(`apps/api-server/src/scripts/drug-otc-*`, `drug-shared-description-bulk-canonical-job.ts`, `easy-drug-shared-description-derive-job.ts`). SPD `source_type` union에 `cosmetics` 없음. `ProductCandidateDescriptionDraft`에 화장품 0.
- **화장품 콘텐츠 저장 = SPD와 분리**(`cosmetics_` prefix, CLAUDE.md §9): (1) `cosmetics_contents`(K-Cos Resource→Content→Store, member-authored `created_by`/`author_name`, `reusable_policy` restricted/platform) — `cosmetics-content.entity.ts:26,78-89`; (2) signage 화장품 확장(`signage_cosmetics`: CosmeticsBrand/BrandContent/ContentPreset/TrendCard, Global Content + Clone, `source:'cosmetics-brand'` 고정) — `COSMETICS-EXTENSION-README.md:12-20,110-138`. 둘 다 **브랜드/공급자 작성 → 매장 clone** = 정책의 "공급자·브랜드 제작 / O4O 저장·연결·배포" 일치. `partner-ai-builder`도 파트너/공급자 도구.
- **CODE-CONFLICT(중간 확신) 1건**: generic admin 설명서 컨트롤러가 화장품 master에 O4O가 canonical 설명서를 작성할 수 있게 **카테고리 가드 없이** 허용.
  - `product-master-description.controller.ts:33-44` — `ADMIN_ROLES`에 `'cosmetics:admin'`·`'cosmetics:operator'` 포함.
  - `POST /:id/store-descriptions`(`:14-21`, handler `:71~`)가 **임의 `master_id`(화장품 카테고리 포함)**에 canonical SPD를 upsert. `regulatory_type='cosmetics'` write-block **없음**(서비스는 list filter `shared-product-description.service.ts:490-492`만 제공).
  - → "O4O 직접 제작 금지"와 상충하는 **잠재 코드 능력**. generic(모든 서비스 공유 allowlist)이라 화장품 전용 기능이 아닌 **가드 누락**. 완화 = write 경로 카테고리 가드(또는 화장품 operator를 브랜드 대리로 보는 명시적 예외).
- **Active 문서 충돌 없음**: Active 가이드는 일관되게 화장품=공급자 제작(`O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md:104,146`; AGENT-GUIDE `:41,:169`). WO의 검색어 리스트(`WO-...AUDIT-V1.md:29,96`)는 조사 지시이지 주장 아님 → 수정 대상 아님.

---

## 12. J. 건강기능식품 실행 문서 정렬

SSOT·AGENT-GUIDE·HFF README는 **정책과 정렬**(구매 지원 최우선·신뢰 판매요소·ko+en·사진/정본 구분·3가지 단정만 금지). 정비 필요는 **실행 문서 2건**에 집중.

**J-1 HFF README** — 정렬됨. 최우선=구매 지원(`README.md:19`), 신뢰=판매요소(`:21`), 주의사항 종속(`:32`). `[Active-KEEP]`

**J-2 HFF AGENT-KICKOFF** — `[Active-수정 후보]`
- **J-2a (최우선) 규칙 SSOT 끊김**: `:5`·`:145`가 "규칙 SSOT(R1~R10·R6-a~e) = general-food/README.md" 인데, general-food README가 Legacy stub(`:3`)로 재작성되어 **R 규칙이 0개**(grep `R1…R10` 무매치). KICKOFF §4~§5 전반이 인용하는 R1/R2/R6-b/R6-c/R8/R9/R10 가드 어휘가 **죽은 SSOT를 가리킴**. (참고: KICKOFF 본문 자체는 §4에서 과잉 제한을 능동 정정하고 "3가지 단정만" 금지로 축소 — 내용은 정책 정렬. 문제는 **규칙 어휘의 소재(SSOT) 상실**.)
- **J-2b 이중게이트 누락**: §6(`:97-108`)이 `POST .../store-descriptions`로 바로 canonical 저장, **승인/이중게이트 언급 없음**; §7 `:113` "STORE canonical 있으면 done"; 원장은 "무승인 Auto 모드"(J-3c). AGENT-GUIDE `:141`("승인·이중게이트") 및 SSOT §6.1과 상충. (단 저장 API는 admin 로그인 필요 — 무인증은 아님. 누락된 것은 **승인 워크플로**.)
- 정렬된 부분(수정 불요): 언어 ko+en(`:48-52`), 사진 임시/식약처 정본 구분(`:15,:21`), 과잉 제한 정정(`:57,:62`), 식약처 기능성을 소구 근거로(`:43`).

**J-3 PROCESSED-LEDGER** — 헤더(L1~L12)는 Active 가이드, 배치 rows는 history.
- **J-3a**(헤더 `[Active-수정 후보]`): `:3` "정본 예제: byeonenjang-probiotics.responsive.html" 인데 KICKOFF §5 `:77`이 그 파일을 deprecated 처리(정본=`byeonenjang.semantic.html`).
- **J-3b**(헤더 `[Active-수정 후보]`): `:10` 존재가드 앵커 `#4-존재-가드…` 깨짐(현재 §4는 "분류 판정+지뢰 가드", 존재가드는 §7) + "zh canonical 있으면 skip"이 ko+en 정책과 상충(→ en). `:96` 반복.
- **J-3c**(rows `[IR/CHECK-history-수정 금지]`): `:26` "자동 완주(무승인)", `:34` "Auto 모드 40/40" — history이나 J-2b의 게이트 누락을 **입증**.

**J-4 examples/** — `byeonenjang.semantic.html`·`hongsam-red-ginseng.semantic.html`=현재 정본형(sd-*, `<style>` 없음). `byeonenjang-probiotics.responsive.html`=deprecated 보관. `lacto-balance-...zh.html`=legacy ko+zh 샘플(현 ko+en과 불일치, 보관 샘플) — `[legacy 샘플, 저우선]`.

---

## 13. K. 기존 문서 충돌 분류

| 문서(docs/…) | 분류 | 사유 | 대표 line |
|---|---|---|---|
| `guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` | **Active-KEEP** | 새 SSOT 본체 | :11, :104 |
| `guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md` | **Active-KEEP** | SSOT 상속, 이중게이트 명시 | :141, :164 |
| `guides/products/health-functional-food/README.md` | **Active-KEEP** | 구매 우선·신뢰 판매요소 | :19, :21 |
| `guides/products/health-functional-food/AGENT-KICKOFF.md` | **정책충돌·수정 필요 + 새 SSOT 링크 필요** | R1~R10 SSOT 끊김(J-2a); 이중게이트 누락(J-2b) | :5, :61, :145 |
| `guides/products/health-functional-food/PROCESSED-LEDGER.md` | **새 SSOT 링크 필요(헤더)** / **history 수정 금지(rows)** | 정본 예제 stale·앵커 깨짐·"zh skip"(J-3a/b) | :3, :10 |
| `guides/products/general-food/README.md` | **Legacy 표기 완료** | 이미 Legacy stub. 단 HFF가 이를 R1~R10 SSOT로 인용(J-2a 근원) | :3, :11 |
| `guides/products/general-food/AGENT-KICKOFF.md` | **Legacy 표기 필요** | 여전히 신규 생산 kickoff(samples/ 저장)·"약사 등" 고정 프레임, Legacy 배너 없음 | :11, :24 |
| `guides/common/DOCUMENT-INDEX.md` | **Active-KEEP** | 9-a SSOT, 9-c general-food Legacy 정확 라우팅 | :43, :45 |
| `architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md` | **새 SSOT 링크 필요** | "공통 제작 골격"(:70)이 제품군 분리 이전, 새 SSOT 링크 없음(직접 모순은 아님) | :70 |
| `guides/content-authoring/CONTENT-AUTHORING-PRINCIPLES.md` | **Active-KEEP(drug-scoped)** / 링크 확인 권장 | `:11` "올바른 선택 > 안전한 사용 > …"는 **drug 트랙 우선순위**. HFF를 지배하지 않으나 AGENT-GUIDE `:5`가 "공통 원칙"으로 인용 → HFF 구매우선을 덮지 않는지 확인 | :11 |
| `guides/products/drug/knowledge/CONSUMER-WRITING-PATTERNS.md` | **Active-KEEP** | drug=명시적 유지 트랙, "약사에게 상담" 정당 | :16 |
| `work-orders/WO-...POLICY-CODE-AND-DOC-AUDIT-V1.md` | **history 수정 금지** | 검색어 리스트=조사 지시(주장 아님) | :29, :99, :100 |
| `investigations/IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1.md` | **history 수정 금지** | 구현 서술적 IR | :24 |
| `checks/CHECK-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1.md` | **history 수정 금지** | store-asset preset PASS 기록 | :5 |

**충돌 신호 무발견**: "일반식품/화장품 신규·O4O 제작"의 *명령형*(금지·history에만 등장); "모든 제품 고정 상담 문구"; "정보 안내가 최우선"/"안전한 사용이 구매 지원보다 우선"(HFF Active 가이드엔 없음 — 유일한 "안전한 사용" 우선순위는 sanctioned drug 트랙). "B2C 규제 프레임 미적용"은 HFF KICKOFF `:61`에만, 매장 맥락 표현 재량으로 한정(전역 규제해제 아님).

---

## 14. 코드·API·스키마 gap 종합

| Gap | 성격 | 근거 | 영향 정책 |
|---|---|---|---|
| G1 | 설명서 열람 **인증 게이트 부재** — `/p/{key}` API 무인증 | 코드(핵심) | `product-landing.controller.ts:34-55` | E |
| G2 | 로그인 후 **returnUrl 복귀** 설명서 경로 미연결 | 코드 | `App.tsx:668` (RoleGuard 밖) | E |
| G3 | 공개 노출 차단(sitemap/robots `/p/`/OG/`noindex`/cache) 부재 | 코드/설정 | `robots.txt:13`, `index.html:8-13` | F |
| G4 | 공개 read model이 **공급자 org/credit 미노출** + 렌더러 credit 슬롯 없음 | 코드(최소 API) | `product-landing.service.ts:177-197`; `ContentRenderer.tsx:41-55` | C |
| G5 | SPD **조직 소유·작성주체 메타데이터 부족**(`SUPPLIER_STORE` dead, org 컬럼 없음) | 스키마/시드 | `SharedProductDescription.entity.ts:34-89` | A/D |
| G6 | 화장품 등 **카테고리 write 가드 부재**(generic 컨트롤러) | 코드(가드) | `product-master-description.controller.ts:33-44` | I |
| G7 | 매장 자체 콘텐츠가 SPD 공통 풀 **유입 가능**(`store_contribution`→canonical) | 코드(가드) | `shared-product-description.service.ts:81-104` | A |

**F12 baseline 결정 필요(구현 선행)**: F12 불변식 ③은 Resource에 **공개 `/r/{id}`**를 규정하고, V2 amendment는 이를 **공개·무인증 `/p/{key}`**로 대체했다. 새 정책의 **로그인 전용 열람**은 이 둘과 정면 충돌한다. 따라서 G1~G3 구현 전에 **Product Resource Architecture baseline(F12/V2)에 "열람 인증 정책" 결정을 반영하는 baseline 개정 WO**가 선행되어야 한다(단순 구현 WO로 착수하면 Frozen baseline 위반).

---

## 15. Active 문서 수정 후보 (이번 WO는 후보 제시 — 실제 수정은 최소 한도)

> WO §9: 단순 링크 오류·명백한 진입점 오류만 최소 수정 가능, 수정 시 CHECK에 기록. 아래 중 실제 반영분은 CHECK에 명기한다. IR·CHECK·WO·원장 rows는 **수정 금지**.

| # | 문서 | 수정 성격 | 근거 |
|---|---|---|---|
| M1 | `health-functional-food/AGENT-KICKOFF.md:5,:145` | 규칙 SSOT 대상 재지정(general-food R1~R10 소실) | J-2a |
| M2 | `health-functional-food/AGENT-KICKOFF.md §6-§7` | 저장 절차에 승인·이중게이트 명문화 | J-2b |
| M3 | `health-functional-food/PROCESSED-LEDGER.md:3,:10` | 정본 예제 포인터·§앵커·"zh→en" 헤더 수정 | J-3a/b |
| M4 | `general-food/AGENT-KICKOFF.md` | Legacy/신규중단 배너 + 새 SSOT 링크 | H4/K |
| M5 | `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md:70` | 새 SSOT 링크 추가(제품군 분리 반영) | K |

**주의**: M1은 "단순 링크 오류"가 아니라 **규칙 콘텐츠 자체가 소실**된 실질 gap이다(대체 SSOT 신설 결정 필요) → 이번 WO에서 자동 수정하지 않고 **후속 문서 WO로 분리**한다. M3·M4의 링크/앵커/배너는 최소 수정 후보이나, 본 WO의 read-only 원칙 유지를 위해 **일괄 문서 정비 WO(F6)**로 넘기고 이번엔 후보만 확정한다.

---

## 16. DB 검증 SQL (미실행 — Cloud Console SQL Editor 전용)

> 이 노트북은 Cloud SQL 5432 아웃바운드가 차단(`34.64.96.252:5432` TcpTest 실패, memory `o4o-laptop-cloudsql-5432-blocked`)되어 `gcloud sql connect`가 연결 단계에서 무한 대기한다. 아래 SELECT는 **Cloud Console → SQL → Query Editor**(HTTPS 서버측 실행)로만 확인한다. 전부 read-only.

```sql
-- (D-1) 작성주체(source_type) × 사용축(description_type) × status 분포 — 혼재/구분 규모
SELECT source_type, description_type, status, count(*)
FROM shared_product_descriptions WHERE deleted_at IS NULL
GROUP BY source_type, description_type, status ORDER BY 1,2,3;

-- (D-2) SUPPLIER_STORE 실사용 여부 (기대: 0)
SELECT count(*) FROM shared_product_descriptions WHERE description_type='SUPPLIER_STORE';

-- (D-3) 매장 자체 콘텐츠의 공통 풀 유입 여부 (위험 A/G7)
SELECT status, count(*) FROM shared_product_descriptions
WHERE source_type='store_contribution' AND deleted_at IS NULL GROUP BY status;

-- (H-1) 일반식품 설명서 건수 (status×type×language)
SELECT spd.description_type, spd.status, spd.language, count(*) cnt
FROM shared_product_descriptions spd
JOIN product_masters pm    ON pm.id = spd.master_id
JOIN product_categories pc ON pc.id = pm.category_id
WHERE pc.slug='general-food' AND spd.deleted_at IS NULL
GROUP BY 1,2,3 ORDER BY 1,2;

-- (H-2) 일반식품 canonical 건수
SELECT count(*) FROM shared_product_descriptions spd
JOIN product_masters pm ON pm.id=spd.master_id
JOIN product_categories pc ON pc.id=pm.category_id
WHERE pc.slug='general-food' AND spd.status='canonical' AND spd.deleted_at IS NULL;

-- (H-3) 일반식품 master의 landing/QR 연결 (landing 테이블명 스키마 확인 후 실행)
SELECT count(DISTINCT pm.id) masters_with_desc,
       count(DISTINCT pl.product_master_id) masters_with_landing
FROM product_masters pm
JOIN product_categories pc ON pc.id=pm.category_id
JOIN shared_product_descriptions spd ON spd.master_id=pm.id AND spd.deleted_at IS NULL
LEFT JOIN product_landings pl ON pl.product_master_id=pm.id
WHERE pc.slug='general-food';

-- (I-1) 화장품 master에 O4O가 작성한 SPD가 있는지 (정책상 0 기대; 가드 gap 실측)
SELECT spd.source_type, spd.status, count(*)
FROM shared_product_descriptions spd
JOIN product_masters pm ON pm.id=spd.master_id
JOIN product_categories pc ON pc.id=pm.category_id
WHERE pc.slug LIKE 'cosmetic%' AND spd.deleted_at IS NULL
GROUP BY 1,2;
```

---

## 17. 최소 후속 WO 분리안

> 각 항목은 본 IR의 조사 결과를 근거로 하며, 한 WO에 묶지 않는다. 우선순위는 정책 위험도 순.

| 우선 | WO(가칭) | 목적 | 근거 | 선행 |
|---|---|---|---|---|
| P0 | `WO-O4O-PRODUCT-LANDING-VIEW-AUTH-POLICY-DECISION-V1` | F12/V2 baseline에 "설명서 열람 인증 정책" 결정 반영(공개→로그인 전용) | §14 G1, F12 ③/V2 충돌 | — |
| P1 | `WO-O4O-PRODUCT-DESCRIPTION-LOGIN-GATE-V1` | `/p/{key}` API·페이지 인증 게이트 | E, G1 | P0 |
| P1 | `WO-O4O-PRODUCT-LANDING-RETURNURL-V1` | 로그인 후 원래 상품 URL 복귀 | E, G2 | P1 |
| P1 | `WO-O4O-PRODUCT-DESCRIPTION-PUBLIC-EXPOSURE-BLOCK-V1` | sitemap/robots `/p/`·OG·noindex·cache 차단 | F, G3 | P0 |
| P2 | `WO-O4O-SUPPLIER-CREDIT-AUTO-DISPLAY-V1` | 방식 2: read model org join + `.sd-foot` 푸터 credit | C, G4 | — |
| P2 | `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` | 작성주체·소유조직 메타(SUPPLIER_STORE 채택 or origin 컬럼) + store_contribution 유입 가드 | A/D, G5, G7 | — |
| P3 | `WO-O4O-COSMETICS-DESCRIPTION-WRITE-GUARD-V1` | 화장품 등 카테고리 write 가드(또는 브랜드 대리 예외 명시) | I, G6 | — |
| P3 | `WO-O4O-HFF-EXECUTION-DOC-REALIGN-V1` | HFF KICKOFF/LEDGER 규칙 SSOT 재지정·이중게이트·정본예제·언어 | J, M1-M3 | — |
| P3 | `WO-O4O-GENERAL-FOOD-LEGACY-DOC-BANNER-V1` | general-food AGENT-KICKOFF Legacy 표기 | H/K, M4 | — |

---

## 18. 조사 범위·한계

- **read-only 준수**: DB write 0 · 코드 변경 0 · migration 0 · deploy 0.
- **DB 수치 미확정**: 노트북 5432 차단으로 §16 SQL 미실행 → 일반식품/SPD/화장품 실건수는 Cloud Console 확인 대상(후속).
- **런타임 미검증**: E/F의 SPA/SSR·cache·실크롤러 동작은 정적 코드 근거(프로덕션 미호출).
- **본 IR은 역사·불변**: 운영 규칙 변경은 Guide/Registry, 구현은 §17 후속 WO에서 수행한다.
