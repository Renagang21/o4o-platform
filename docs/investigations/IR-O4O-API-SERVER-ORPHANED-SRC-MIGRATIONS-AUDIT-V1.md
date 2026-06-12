# IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1

> **유형**: Investigation / Migration Drift Audit (read-only)
> **목적**: `apps/api-server/src/migrations/`(migration 러너 미스캔)에 남은 orphaned migration 전수 감사 → o4o_payments 같은 미적용 schema drift 추가 위험 식별.
> **성격**: 코드/DB/migration/API/UI **무변경**.
> **상위**: `IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1` · `CHECK-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1`
> **작성일**: 2026-06-12

---

## 1. 요약 판정
- **orphaned 파일 38개** (`src/migrations/*.ts`). migration 러너는 **`database/migrations` 만 스캔** 확인(미스캔 재확인).
- **class name 기준 prod `typeorm_migrations` 대조(applied 501건)**: **34개 미등록(=미적용)**, 4개만 등록(= scanned dir 동일 class 의 적용분).
- 그러나 **대부분의 대상 테이블은 prod 에 이미 존재**(neture_*/forum_*/templates 등 — 플랫폼이 그 위에서 동작). → 이들은 **scanned dir 의 다른 이름 migration 으로 schema 가 이미 생성된 stale 원본**(즉시 위험 아님).
- **진짜 위험(o4o_payments 패턴) = "scanned dir 어디에서도 생성 안 됨 + class 미적용 + runtime 참조 있음"** 인 소수:
  - 🔴 **`operator_action_dismissals`** (`CreateOperatorActionDismissals1771200000020`) — `action-queue.controller.ts` 참조(운영자 액션 큐 dismiss). scanned dir 미생성·미적용.
  - 🔴 **`store_contents` / `store_content_blocks` / `content_analytics`** (`CreateStoreContentTables...012` / `CreateContentAnalyticsTable...014`) — `ContentAnalyticsService.ts` 참조.
  - 🟠 `lms_templates`/`lms_template_*`(`CreateTemplateTables...010`/`CreateTemplateLibraryTables...011`/`SeedContentTemplates...022`), `lms_instructor_applications`(`AddInstructorRoleSupport...`) — runtime 참조 약하나 scanned 미생성.
- → **prod 실재 여부를 DB 로 확정(방화벽으로 본 IR 미수행)** 후, 부재 시 o4o_payments 처럼 relocate 필요. 존재 시 stale 정리.

> **결론**: o4o_payments 만큼 명백한 "확정 장애"는 추가로 단정하지 못했으나(=prod schema 직접 조회 불가), **runtime 참조가 있는 미적용·미커버 orphaned 가 최소 2그룹(operator_action_dismissals, store_contents/content_analytics) 존재** → **HIGH 우선 검증 대상**. 나머지는 stale/obsolete 로 cleanup.

## 2. migration 러너 스캔 경로 (재확인)
- `src/database/migration-config.ts:64-66` → `join(__dirname,'migrations',...)` = **src/database/migrations**.
- `src/migrate.ts:98` → `join(__dirname,'database','migrations','*.js')` = **dist/database/migrations**.
- `src/database/connection.ts:1077-1079` → `dist/database/migrations/*.js`(prod) / `src/database/migrations/*.ts`(dev).
- **`src/migrations/` 를 참조하는 migration 소스 0건** → orphaned 확정.

## 3. orphaned 38개 — class-applied 대조
- **applied(typeorm_migrations 등록) 4개** = scanned dir 에 동일 class 존재(exact duplicate, 정리 대상):
  `CreateStoreBlogPosts1771200000006` · `AddKpaMemberSubRole1771200000023` · `CreateKpaExternalExpertProfiles1771200000024` · `CreateKpaSupplierStaffProfiles1771200000025`.
- **미적용 34개** = typeorm_migrations 미등록(§아래 schema 대조로 위험 분류).

## 4. schema 커버리지 대조 (orphaned 대상 table → scanned dir 생성 여부 / runtime 참조)
| 대상 table | scanned dir 생성 | runtime 참조 | 분류 |
|------------|:---:|------|:---:|
| neture_suppliers / neture_supplier_products / neture_partnership_* | ✅ `1736950000000-CreateNetureTables`(다른 ts) | ✅(공급자/주문) | **C 커버됨**(stale 원본) |
| app_registry | ✅ `2026012200001-CreateAppRegistryTable` | ✅ | **C 커버됨** |
| store_blog_posts | ✅ scanned 동일 | ✅ | **C 중복** |
| kpa_external_expert_profiles / kpa_supplier_staff_profiles | ✅ scanned 동일 | ✅ | **C 중복** |
| care_actions | ❌ (오히려 `20260601000000-DropCareTables` 가 DROP) | — | **D OBSOLETE**(기능 제거됨) |
| **operator_action_dismissals** | ❌ 미생성 | ✅ `action-queue.controller.ts` | **A 🔴 HIGH**(미적용+미커버+live) |
| **store_contents / store_content_blocks** | ❌ 미생성 | ✅ `ContentAnalyticsService.ts` | **A 🔴 HIGH** |
| **content_analytics** | ❌ 미생성 | ⚠️(분석 서비스 인접) | **A/B 🔴 HIGH** |
| lms_templates / lms_template_versions/blocks/categories/tags/map | ❌ 미생성 | ⚠️ 약함 | **A/B 🟠 MED**(LMS 템플릿 라이브러리) |
| lms_instructor_applications | ❌ 미생성 | ⚠️ | **B/D 🟠 MED**(instructor 신청) |
| settings / users | (core, 별도 생성) | ✅ | **C**(core, 이미 존재) |
| community_ads / community_sponsors | (community-hub, graceful degrade) | ⚠️ | **B/D**(테이블 부재 시 빈배열 degrade — forum IR 참조) |

> 비고: scanned dir 생성 여부는 `CREATE TABLE` grep 기준 — `queryRunner.createTable()` 방식은 grep 누락 가능(app_registry 처럼 "referenced" 로 보정). HIGH 항목은 grep+runtime 양쪽에서 미커버·참조 확인된 것.

## 5. prod schema 실재 여부 (미확정 — 방화벽)
- prod DB 직접 SQL(`to_regclass`)은 firewall(`gcloud sql connect` 인터랙티브·psql 미설치)로 **본 IR 미수행**(§중단조건 해당).
- o4o_payments 는 runtime 오류로 부재가 드러났음. HIGH 항목(operator_action_dismissals, store_contents, content_analytics)도 **동일 방식 확정 필요**:
  - (a) `gcloud sql` 로 `to_regclass('public.<table>')`, 또는
  - (b) runtime 프로브: 해당 기능 API 호출 시 `relation "<table>" does not exist` 발생 여부.
- 대부분(neture_*/app_registry/forum/store_blog/kpa_*/settings)은 플랫폼 가동 사실로 **존재 확정**(C).

## 6. A~E 분류 결과
- **A NEEDS_RELOCATE(검증 후)** 🔴: operator_action_dismissals, store_contents, store_content_blocks, content_analytics — prod 부재 확인 시 o4o_payments 식 relocate.
- **B NEEDS_ALIGNMENT** 🟠: lms_templates 군, lms_instructor_applications, community_ads/sponsors — scanned 미생성이나 graceful/약참조. prod 실재·entity 정합 후 판단.
- **C DUPLICATED/COVERED**: neture_*(원본), app_registry, store_blog_posts, kpa_external_expert/supplier_staff, settings/users core — scanned 다른 migration 또는 동일 class 로 적용됨 → cleanup 대상.
- **D OBSOLETE**: care_actions(DropCareTables 로 제거) → 삭제 후보(코드 참조 0 확인 후).
- **E DO_NOT_RELOCATE_WITHOUT_DESIGN**: SeedNetureData/SeedContentTemplates(seed — 운영 데이터 멱등성/중복 위험), BootstrapCoreSchema(core 전체 — 적용 시 충돌 위험) → 단독 relocate 금지, 설계 필요.

## 7. HIGH 우선 검증 대상 (다음 액션)
```
1. operator_action_dismissals (action-queue.controller.ts)
2. store_contents / store_content_blocks / content_analytics (ContentAnalyticsService.ts)
```
→ `gcloud sql` to_regclass 또는 기능 API 프로브로 prod 실재 확인. 부재 시 즉시 relocate WO(o4o_payments 패턴, CREATE TABLE IF NOT EXISTS 안전).

## 8. 핵심 질문 답변
1. 잔여? **38**. 2. class name? §3·부록. 3. 미스캔 확실? **예**(§2). 4. typeorm_migrations 존재? **4 applied / 34 미등록**. 5. schema 존재? **대부분 존재(C), HIGH 3그룹 미확정(방화벽)**. 6. scanned 중복? **C 군 다수**. 7. runtime 참조 미적용? **operator_action_dismissals·store_contents·content_analytics**. 8. o4o_payments 식 추가 relocate? **HIGH 3그룹 — 검증 후 likely yes**. 9. 단순 삭제 잔재? **C(중복)·D(care_actions)**. 10. relocate 위험? **E(BootstrapCoreSchema·Seed*)**. 11. 우선순위? §7 HIGH → C/D cleanup → B alignment → E 설계.

## 9. 후속 WO 제안
1. **`WO-O4O-API-SERVER-ORPHANED-MIGRATION-HIGH-RISK-VERIFY-V1`** — HIGH 3그룹(operator_action_dismissals/store_contents+blocks/content_analytics) prod 실재 `gcloud sql` 확인 → 부재 시 relocate(o4o_payments 패턴), 존재 시 C 로 강등.
2. `WO-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1` — C(duplicate)·D(care_actions obsolete) orphaned 파일 제거(코드 참조 0 확인, path-specific).
3. `IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1` — lms_template* 군(B) prod 실재·기능 사용 여부.
4. (별도) `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss sandbox 수동).

## 10. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. migration 이동·삭제·실행 없음. prod SQL 미수행(방화벽). 다른 세션 WIP 무접촉.
```

## 11. 중단/한계
- **prod schema 직접 조회 미수행**(firewall) → HIGH 항목 실재 여부는 §9-1 후속에서 확정. 본 IR 은 "class-applied 대조 + scanned 커버리지 + runtime 참조"로 위험 후보를 좁히는 데까지.
- scanned 생성 여부 grep 은 `queryRunner.createTable()` 방식 누락 가능 — HIGH 후보는 후속에서 prod 실측으로 재확인 필요.

---

## 부록: orphaned 38 class name (분류)
- **C 커버/중복**: CreateNetureTables...(1736611200000), SeedNetureData...(E), BootstrapCoreSchema(E), CreateForumTables, AddProductInfoFields, AddImagesToGlycopharmProducts, CreateGlycopharmFeaturedProducts, CreateGlycopharmBillingInvoices, AddInvoiceDispatchFields, AddForumPostPerformanceIndexes, AddCoursePaidFields, CreatePlatformStoreSlugsTables, BackfillPlatformStoreSlugs, AddRequestedSlugToApplications, CreatePlatformStorePolicies, CreatePlatformStorePaymentConfigs, AddTemplateProfileToPharmacies, AddStorefrontBlocksToPharmacies, KpaBRoleDataNormalization, AddDescriptionFieldsToOffer, OfferDistributionTypeV1, PrefixUnprefixedRoles, AddCourseServiceKey, EventOfferCoreReform, CreateCommunityHubTables, + applied4(StoreBlogPosts/KpaMemberSubRole/KpaExternalExpert/KpaSupplierStaff). (각 prod 실재로 추정 — 후속 cleanup)
- **D obsolete**: CreateCareActions(care_actions DROP됨).
- **A/B 🔴🟠 검증 대상**: CreateOperatorActionDismissals, CreateStoreContentTables, AddStoreContentUsageFields, CreateContentAnalyticsTable, CreateTemplateTables, CreateTemplateLibraryTables, SeedContentTemplates, AddInstructorRoleSupport.

*Date: 2026-06-12 · read-only · 코드/DB 무변경 · 38 orphaned, 34 미적용. HIGH: operator_action_dismissals·store_contents·content_analytics(검증 후 relocate). prod 실재는 방화벽으로 후속 확정.*
