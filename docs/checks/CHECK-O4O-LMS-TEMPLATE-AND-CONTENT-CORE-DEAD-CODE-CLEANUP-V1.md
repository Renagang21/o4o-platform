# CHECK-O4O-LMS-TEMPLATE-AND-CONTENT-CORE-DEAD-CODE-CLEANUP-V1

> 제거 확정된 LMS Template Library + interactive-content-core(icc) store-content/content-analytics 미완성 라인 정리(공유 패키지 수술).
> **결과: PASS** — icc build 0 / lms-core build 0 / api-server tsc 0. live `kpa_store_contents`·Course/Lesson/Survey/ContentBundle·Neture B2B 무변경. DB schema/migration 실행 무변경.
> 상위: `IR-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1` · `IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1`(product 결정 = 제거 B) · `CHECK-O4O-LMS-CONTENT-ANALYTICS-DEAD-CODE-CLEANUP-V1`(Phase1) — 2026-06-12

---

## 1. 목적/판정
- Phase 1(이전 CHECK): api-server modules/lms store-content/analytics dead line + orphaned migration 012/013/014 제거.
- 본 WO(Phase 2): **icc 공유 패키지의 Template/StoreContent/ContentAnalytics entity·service·route + lms Template controller/service/route + connection.ts 등록 + orphaned migration 010/011** 제거. Template Library = product 결정(2026-06-12) 미사용 확정.
- Shared Module Change Protocol: icc 소비처 = api-server + lms-core. **lms-core 는 해당 심볼 재노출 안 함**(Survey/ContentBundle/Course/Lesson/Assignment 만) → 무영향 빌드로 확인.

## 2. 변경 (삭제 20 / 수정 5 = 25 파일, +CHECK)
### 2.1 삭제 (git rm 20)
**icc (16)**: `services/StoreContentService.ts` · `services/TemplateService.ts` · `controllers/TemplateController.ts` · `entities/store/StoreContent.ts`·`StoreContentBlock.ts`·`store/index.ts` · `entities/analytics/ContentAnalytics.ts`·`analytics/index.ts` · `entities/templates/{Template,TemplateBlock,TemplateCategory,TemplateCategoryMap,TemplateTag,TemplateTagMap,TemplateVersion,index}.ts`(8)
**api-server (4)**: `modules/lms/controllers/TemplateController.ts` · `modules/lms/services/TemplateService.ts` · `migrations/1771200000010-CreateTemplateTables.ts` · `migrations/1771200000011-CreateTemplateLibraryTables.ts`

### 2.2 수정 (export/route/등록 제거 5)
| 파일 | 변경 |
|------|------|
| icc `entities/index.ts` | Templates/Template Library/Store Content/Content Analytics export 섹션 제거(Quiz/Survey/ContentBundle/Course/Lesson/Assignment 보존) |
| icc `services/index.ts` | TemplateService·StoreContentService export 제거(ContentBundle/Quiz/Survey 보존) |
| icc `controllers/index.ts` | TemplateController export 제거(ContentBundle/Quiz/Survey 보존) |
| icc `src/index.ts` | initTemplateService·initStoreContentService import/호출 + createTemplateRoutes import + `router.use('/templates')` 제거(ContentBundle init/routes·health 보존) |
| api-server `modules/lms/controllers/index.ts`·`services/index.ts` | TemplateController·TemplateService export 제거 |
| api-server `modules/lms/routes/lms.routes.ts` | TemplateController import + `/templates*` route 전체(약 30개) 제거(course/lesson/cert/enrollment/operator/instructor 보존) |
| api-server `database/connection.ts` | import·entities array 에서 StoreContent/StoreContentBlock/ContentAnalytics/Template/TemplateVersion/TemplateBlock/TemplateTag/TemplateTagMap/TemplateCategory/TemplateCategoryMap 등록 제거(2곳) |

### 2.3 삭제하지 않음 (WO §3.5)
- `SeedContentTemplates1771200000022`(seed=E) · `AddInstructorRoleSupport1739500000000`(lms_instructor_applications, live InstructorController 얽힘) → 별도 audit.
- orphaned migration 잔여 29 → **27**.

## 3. 관계 얽힘 검증 (중단 조건 — 해당 없음)
- `TemplateBlock.bundleId` = 단순 `uuid` 컬럼(@Column nullable), **TypeORM relation 아님** → ContentBundle 무영향.
- ContentBundle/Course/Lesson/Assignment/Survey → Template/StoreContent **역참조 0**(grep).
- icc ContentBundleService/QuizService/SurveyService/ContentBundleController → Template/StoreContent 참조 0.
- lms-core → 삭제 심볼 참조 0(재노출 목록 = Survey/ContentBundle/Course/Lesson/Assignment 만).

## 4. 절대 보호 — 무변경 (검증)
```
live: kpa_store_contents/KpaStoreContent/createStoreContentController, KpaStoreTemplate(createKpaStoreTemplateController), assetSnapshot/published-assets/store-pop/store-library-feed
icc live: Survey/ContentBundle/Course/Lesson/Assignment/Quiz (lms-core 재노출·빌드 통과)
kpa_instructor_qualification · /kpa/qualifications
lms_instructor_applications/InstructorController(별도 audit) · SeedContentTemplates
Neture B2B/PaymentCore/o4o_payments/operator_action_dismissals
LMS course/lesson/certificate/enrollment/operator route
```
- 잔여 grep 매칭: icc index NOTE 주석, authorization.middleware JSDoc 예시, live `KpaStoreTemplate` — 모두 무관.

## 5. 검증 결과
- **build 순서**(메모리 rebuild order): `@o4o/interactive-content-core build` ✅ → `@o4o/lms-core build` ✅ → `@o4o/api-server tsc --noEmit` ✅. 신규 오류 0.
- **grep**: icc/lms-core/api-server 에 TemplateService/TemplateController/StoreContentService/ContentAnalytics/initTemplateService/initStoreContentService runtime 참조 0(주석·JSDoc·live KpaStoreTemplate 제외).
- **dist**: gitignored — dist churn 커밋 없음.
- **staged 분리**: 본 WO 파일 25 + CHECK 만 path-specific. **다른 세션 WIP(forum-core search, web-kpa Footer, OPERATOR-ORDER CHECK doc) 무접촉**.
- DB schema/migration 실행 없음.

### 5.1 배포 후 probe (권장)
```
GET /api/v1/lms/templates            → 기대: 404 (route 제거)
GET /api/v1/lms/courses              → 기대: 기존 동일(무회귀)
GET /api/v1/{kpa|glycopharm}/store-contents → 기대: 기존 동일(live kpa_store_contents 무회귀)
```

## 6. 완료 기준 체크 (WO §8)
1(제거 판정 반영) ✅. 2(api-server Template controller/service 제거) ✅. 3(/lms/templates* route 제거) ✅. 4(icc Template entity/service/routes 제거) ✅. 5(icc StoreContent/Block/ContentAnalytics 제거) ✅. 6(connection.ts 등록 제거) ✅. 7(orphaned 010/011 삭제) ✅. 8(Seed·Instructor 미삭제) ✅. 9(kpa_store_contents 무변경) ✅. 10(Course/Lesson/Assignment/Survey/ContentBundle 무변경) ✅. 11(icc typecheck/build) ✅. 12(lms-core typecheck/build) ✅. 13(api-server typecheck) ✅. 14(grep dead 참조 0) ✅. 15(CHECK) ✅. 16(path-specific commit) ✅. 17(다른 세션 WIP 무접촉) ✅.

## 7. 후속
- `IR-O4O-LMS-SEED-AND-INSTRUCTOR-ORPHANED-MIGRATION-AUDIT-V1` — SeedContentTemplates / AddInstructorRoleSupport / lms_instructor_applications(InstructorController 얽힘) 정리.
- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss sandbox).
- (빈 디렉터리) icc `entities/store`·`entities/analytics`·`entities/templates` 는 파일 0 — git 추적 무관.

## 8. 수정하지 않은 것
```
icc Survey/ContentBundle/Course/Lesson/Assignment/Quiz · lms-core 재노출 라인
kpa_store_contents / KpaStoreTemplate / kpa_instructor_qualification
lms_instructor_applications / InstructorController / SeedContentTemplates (별도 audit)
Neture B2B / PaymentCore / operator_action_dismissals
DB schema / migration 실행
다른 세션 WIP(forum-core / Footer / OPERATOR-ORDER CHECK)
```

---

*Date: 2026-06-12 · Status: PASS. LMS Template Library + icc store-content/analytics 미완성 라인 제거(삭제 20 + 수정 5). icc/lms-core build 0, api-server tsc 0. live kpa_store_contents·icc Survey/ContentBundle/Course·Neture B2B 무변경. Seed/Instructor 별도 audit.*
