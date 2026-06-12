# CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1

> `apps/api-server/src/migrations/`(러너 미스캔 orphaned dir) 잔재 중 **C(이미 커버된 중복) / D(폐기)** 로 확정된 파일만 보수적으로 정리.
> **결과: PASS** — 5개 삭제(C 중복 4 + D obsolete 1), api-server tsc 0, DB/스키마/migration 실행 무변경. B/E/UNKNOWN 무접촉.
> 상위: `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` · `CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-HIGH-RISK-VERIFY-V1` · `CHECK-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1` · `CHECK-O4O-OPERATOR-ACTION-DISMISSALS-MIGRATION-RELOCATE-V1` — 2026-06-12

---

## 1. 배경
- 확정 위험 orphaned(o4o_payments / operator_action_dismissals)는 이미 **relocate 완료**(migration #534/535/536 적용). 본 WO 는 그 이후 **잔재 정리(hygiene)** — runtime/스키마 무변경.
- 러너는 `src/database/migrations`(prod `dist/database/migrations/*.js`)만 스캔. `src/migrations/` 삭제는 **러너 결과에 영향 없음**(애초 미스캔).

## 2. 작업 전/후
| | orphaned 파일 수 (`src/migrations/*.ts`) |
|---|:---:|
| 작업 전 | **37** |
| 삭제 | 5 |
| 작업 후 | **32** |

## 3. 삭제한 파일 (C/D 확정)
| 파일 | class | 판정 | 근거 |
|------|-------|:---:|------|
| `1771200000006-CreateStoreBlogPosts.ts` | CreateStoreBlogPosts1771200000006 | **C 중복** | scanned dir 에 **동일 파일명·동일 class·byte-identical** 존재 + typeorm_migrations 적용(IR §3 applied 4) |
| `1771200000023-AddKpaMemberSubRole.ts` | AddKpaMemberSubRole1771200000023 | **C 중복** | 〃 (identical, applied) |
| `1771200000024-CreateKpaExternalExpertProfiles.ts` | CreateKpaExternalExpertProfiles1771200000024 | **C 중복** | 〃 (identical, applied) |
| `1771200000025-CreateKpaSupplierStaffProfiles.ts` | CreateKpaSupplierStaffProfiles1771200000025 | **C 중복** | 〃 (identical, applied) |
| `1771200000021-CreateCareActions.ts` | CreateCareActions1771200000021 | **D 폐기** | `care_actions` 만 생성. scanned dir `20260601000000-DropCareTables` 가 해당 테이블 DROP(기능 제거). runtime 참조 0 |

### 3.1 삭제 안전성 (WO §2 5조건 — 5개 모두 충족)
1. **orphaned-only**: 5개 모두 `src/migrations/` 에만 존재(care_actions 는 scanned 에 Drop 만 존재).
2. **커버/폐기**: C 4개 = scanned dir 에 동일 class 적용(byte-identical `diff -q` IDENTICAL 확인). D 1개 = DropCareTables 로 폐기.
3. **orphaned class 참조 0**: 5 class 모두 `apps/api-server/src · services · packages`(migrations 제외) **non-migration refs = 0**.
4. **러너 결과 불변**: 미스캔 dir 삭제 → typeorm_migrations / dist 대상 무영향.
5. **C/D 확정**: 상위 IR §6 / HIGH-VERIFY 분류 기준.
- 부가: `care_actions` runtime 테이블 참조도 0(`grep care_actions` non-migration = NONE) → obsolete 확정.

## 4. 삭제하지 않은 것 (보수적 보존)
### 4.1 E — seed/bootstrap (단독 삭제 금지, 설계 필요)
`BootstrapCoreSchema1733750000000` · `SeedNetureData1736611201000` · `SeedContentTemplates1771200000022`.

### 4.2 B — alignment 필요 (별도 IR/WO)
`CreateTemplateTables1771200000010`(lms_templates) · `CreateTemplateLibraryTables1771200000011`(lms_template_*) · `AddInstructorRoleSupport1739500000000`(lms_instructor_applications) · `CreateCommunityHubTables1771200000015`(community_ads/sponsors).

### 4.3 정책 결정 필요 (content analytics — 후속 IR/WO)
`CreateStoreContentTables1771200000012` · `AddStoreContentUsageFields1771200000013` · `CreateContentAnalyticsTable1771200000014` — `ContentAnalyticsService`(현재 unwired) 결정 전까지 보존.

### 4.4 UNKNOWN_KEEP — scanned dir 커버 file-level 미확정 → 삭제 금지 (WO §6.4)
IR §4 에서 C 후보로 거론됐으나 **scanned dir CREATE 매칭 0 또는 file-level 커버 미확정** + data-migration 성격이라 보수적 보존:
- scanned 매칭 0 확인: `forum_categories`(CreateForumTables) · `glycopharm_featured_products` · `glycopharm_billing_invoices`(+AddInvoiceDispatchFields) · `platform_store_policies` · `platform_store_payment_configs`.
- data/normalization migration(스키마 아님, 멱등·이력 추적 가치): `BackfillPlatformStoreSlugs1771200000001` · `KpaBRoleDataNormalization1771200000009` · `PrefixUnprefixedRoles1771200000019`.
- 기타 보류(table 일부만 grep 확인 — file-level 미확정): CreateNetureTables · AddProductInfoFields · AddImagesToGlycopharmProducts · CreateGlycopharmFeaturedProducts · CreateGlycopharmBillingInvoices · AddForumPostPerformanceIndexes · AddCoursePaidFields · CreatePlatformStoreSlugsTables · AddRequestedSlugToApplications · CreatePlatformStorePolicies · CreatePlatformStorePaymentConfigs · AddTemplateProfileToPharmacies · AddStorefrontBlocksToPharmacies · AddDescriptionFieldsToOffer · OfferDistributionTypeV1 · AddCourseServiceKey · EventOfferCoreReform.

> 원칙(WO §6.4): UNKNOWN 이면 삭제하지 않는다. 본 WO 는 **file-level 로 커버/폐기가 증명된 5개만** 정리. 나머지 C 후보는 별도 후속에서 prod 실재 확인 후 일괄 정리.

## 5. 검증
- **api-server tsc 0** (orphaned migration 은 runtime import 없음 → compile 무영향, 신규 오류 0).
- **staged = 삭제 5개 only** (`git diff --cached --name-status` D×5, 코드/문서 외 파일 없음).
- DB/스키마/migration **실행 없음**. scanned dir / dist 대상 변경 0.
- 작업 후 orphaned 32개(B/E/UNKNOWN — 후속 결정 대상).

## 6. 후속
- `IR/WO-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1` (ContentAnalyticsService + store_contents/blocks/content_analytics).
- `IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1` (lms_templates/lms_template_*/lms_instructor_applications).
- `WO-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V2`(선택) — UNKNOWN C 후보(§4.4) prod 실재 확인 후 정리.
- E(seed/bootstrap) 단독 cleanup IR.
- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss sandbox).

## 7. 완료 기준 체크 (WO §9)
1(작업 전 수 기록=37) ✅. 2(삭제 후보 C/D 한정) ✅. 3(runtime class 참조 0) ✅. 4(커버/폐기 근거) ✅. 5(B/E/UNKNOWN 미삭제) ✅. 6(path-specific git rm) ✅. 7(staged=삭제 대상만) ✅. 8(tsc 0) ✅. 9(작업 후 수 기록=32) ✅. 10(CHECK) ✅. 11(path-specific commit) ✅. 12(다른 세션 무접촉) ✅.

## 8. 수정하지 않은 것
```
코드 동작 / DB 스키마 / runtime 테이블 / migration 실행·작성 무변경.
B(lms_template*, lms_instructor_applications, community_*) / E(BootstrapCoreSchema, Seed*) / 정책(content analytics) / UNKNOWN C 후보 무삭제.
다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · Status: PASS (orphaned C 중복 4 + D obsolete 1 = 5 삭제, 37→32. file-level 증명된 것만 보수적 정리. tsc 0, 스키마/러너 무영향).*
