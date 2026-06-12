# IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1

> **유형**: Investigation / Shared Package & Orphaned Schema State Audit (read-only)
> **목적**: Phase 1 cleanup 이후에도 `interactive-content-core`(icc)·`lms_template_*` orphaned migration 에 남은 template → store-content → analytics 미완성 라인의 상태를 조사하고 **활성화 / 제거 / 보류** 를 판정.
> **성격**: 코드/DB/schema/migration/API/UI **무변경**. read-only.
> **상위**: `IR-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1` · `CHECK-O4O-LMS-CONTENT-ANALYTICS-DEAD-CODE-CLEANUP-V1` · `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1`
> **작성일**: 2026-06-12

---

## 1. 요약 판정 (컴포넌트별)
| 컴포넌트 | 상태 | 판정 |
|----------|------|:---:|
| **StoreContent / StoreContentBlock / ContentAnalytics** (icc entity) + 그 orphaned migration(Phase1 삭제됨) | live 경로 0(Phase1 후 icc 자체 미마운트 StoreContentService + connection.ts 등록만), kpa_store_contents 로 대체 | **B 제거** (icc 내부 수술, lms-core 무영향) |
| **lms_template_*** orphaned migration + `Template` entity(icc) + `/lms/templates*` route + lms `TemplateService` | route **마운트됨**·frontend 소비자 **0**·테이블 미적용. operator template/curation 로드맵 가능성 | **B 제거 (확정)** — product 결정 2026-06-12: 미사용 확정 |
| **lms_instructor_applications** orphaned migration + `InstructorApplication`(lms-core) | InstructorController **마운트**(apply/applications)이나 frontend 는 `/kpa/qualifications`(별개 live) 사용. 단 동 컨트롤러가 live course/enrollment 도 담당 | **얽힘 → 별도 audit** (clean cleanup 아님) |

> 즉 **store-content/analytics 라인 = 제거 가능**, **template library = 로드맵 결정 보류**, **instructor application = live 컨트롤러와 얽혀 단독 정리 부적합**. 단일 A/B/C 아님 — 라인별로 분리 권고.

## 2. 배경 (Phase 1 이후 잔여)
- Phase 1(`CHECK-...-DEAD-CODE-CLEANUP-V1`): `/api/v1/lms` 의 store-content/analytics dead route + api-server modules/lms controller·service 2 + orphaned migration 012/013/014 제거.
- 잔여(본 IR 대상): icc `entities/store/StoreContent`·`StoreContentBlock`·`entities/analytics/ContentAnalytics`·`entities/templates/Template`·`services/StoreContentService`·`index.ts initStoreContentService/routes()`; api-server connection.ts 등록; `lms_template_*`·`lms_instructor_applications` orphaned migration; lms `TemplateService`/`TemplateController`(/lms/templates 마운트).

## 3. lms_template_* / lms_instructor_applications orphaned migration 상태
- class: `CreateTemplateTables1771200000010` · `CreateTemplateLibraryTables1771200000011` · `SeedContentTemplates1771200000022`(seed, E) · `AddInstructorRoleSupport1739500000000`.
- 생성 테이블: `lms_templates`, `lms_template_versions/blocks/categories/tags/category_map/tag_map`(+enum 다수), `lms_instructor_applications`.
- **scanned `database/migrations` 커버 = 0**(6개 테이블 전부 grep 0) → orphaned 미적용 → **prod 미생성 고확신**(o4o_payments 패턴, synchronize=false).
- `SeedContentTemplates`(022)는 **seed** → E(운영 데이터 멱등성) — 단독 삭제 금지, 설계 필요.

## 4. interactive-content-core / Template 라인 runtime 상태
- **icc routes() / initStoreContentService 는 api-server 에 마운트 안 됨**: api-server 는 icc 를 `@o4o/interactive-content-core/entities`(entity) 만 import. icc 자체 `routes(dataSource)`(initStoreContentService/initTemplateService 포함)를 `app.use`/module-loader 로 마운트하는 코드 **0건**. → icc 의 자체 `StoreContentService` 는 **dead(미마운트)**.
- lms `TemplateService` → icc `Template` entity 사용, `/lms/templates*`(`register-routes.ts:140` 경유) **마운트됨**. 그러나 **frontend `/lms/templates` 호출 0건**(services src grep) → mounted-but-frontend-less.
- StoreContent/StoreContentBlock/ContentAnalytics(icc) Phase1 후 소비자: icc 자체 미마운트 StoreContentService + connection.ts 등록뿐(다른 grep 매칭은 전부 `KpaStoreContent`=live).

## 5. api-server entity registration 상태
- `connection.ts` 에 `StoreContent`·`StoreContentBlock`·`ContentAnalytics`·Template 계열 entity 등록(2곳, `from '@o4o/interactive-content-core/entities'`). 등록되어 있으나 **live consumer 0**(store/analytics) / **frontend 0**(template). TypeORM 등록만으로 무해(테이블 미생성, synchronize off).

## 6. route / frontend 소비자 조사
- `/lms/templates*` route: 마운트 ✅ / frontend 소비자 ❌(0).
- `/lms/instructor/apply`·`/applications`: 마운트 ✅(InstructorController) / frontend 는 **`/kpa/qualifications/*`** (kpa_instructor_qualification, **live·별개**) 사용 — lms_instructor_applications 직접 호출 frontend ❌.
- icc store-content/analytics: route 자체가 Phase1 에서 제거됨.

## 7. live 보호 범위 (재확인 — 무관·별개)
```
kpa_store_contents / KpaStoreContent / store-content.controller(createStoreContentController) / asset-snapshot / published-assets / store-pop / store-library-feed
kpa_instructor_qualification + /kpa/qualifications/* (frontend instructor/qualification 흐름)
icc Survey / ContentBundle / Course / Lesson / Assignment (lms-core 가 재노출·live)  ← icc 패키지는 살아있음
Neture B2B / PaymentCore / o4o_payments / operator_action_dismissals
```
- `StoreContent`(icc) ≠ `kpa_store_contents`(live). substring 오탐 분리 완료.
- **icc 패키지 자체는 제거 대상 아님** — Survey/ContentBundle/Course/Lesson 으로 live. 제거 후보는 icc 내 **store/analytics(+검토 후 template) 하위 entity·service** 뿐.

## 8. 활성화 / 제거 / 보류 비교
- **활성화(A)** 근거: store-content/analytics 는 kpa_store_contents 로 이미 대체 → 활성화 불요. template library 는 *가능성 있음*(operator 자료등록/큐레이션 UX, Non-Approval UX Baseline) 이나 **현 frontend·기획 확정 없음**.
- **제거(B)** 근거: store/analytics = 마운트 0·소비자 0·테이블 미생성·대체 존재 → 제거 적합. icc 내부 + connection.ts 만 건드리며 lms-core 무영향(재노출 안 함).
- **보류(C)** 근거: template = **마운트된 실 route**(dead route 아님)·near-term 로드맵 가능 → blind 제거 위험. 로드맵 확인 후 활성화/제거.

## 9. 최종 판정
1. **store-content/analytics icc 라인 → 제거(B)**. blast radius: icc `entities/store/*`·`entities/analytics/ContentAnalytics`·`services/StoreContentService`·`index.ts initStoreContentService`·`entities/index.ts`·`entities/store/index.ts`·`entities/analytics/index.ts` 배럴 + api-server `connection.ts` 등록. **lms-core 재노출 없음 확인**(Survey/ContentBundle/Course/Lesson 만). Shared Module Change Protocol 적용(icc 소비처 = api-server + lms-core, 후자 무영향).
2. **template library(lms_template_* + Template entity + /lms/templates + lms TemplateService) → 제거(B, 확정)**. ~~보류(C)~~ → **product 결정(2026-06-12): 미사용 확정**(frontend 0·운영 화면 0·테이블 미적용·활성화 기획 없음). store/analytics 와 동일 패턴으로 함께 제거. lms_template_* orphaned migration(010/011) + Template entity(icc) + lms TemplateService/TemplateController + /lms/templates route 제거. `SeedContentTemplates`(022, seed=E)는 별도 취급.
3. **lms_instructor_applications → 별도 audit**. InstructorController 가 live course/enrollment 도 담당 → application 부분만 떼는 건 라우트 수술. frontend 는 kpa qualification 사용(중복). 단독 IR(`IR-O4O-LMS-INSTRUCTOR-APPLICATION-STATE-V1`) 권고.
4. **SeedContentTemplates(022) → E**(seed) 단독 삭제 금지.

## 10. 후속 WO
1. **`WO-O4O-LMS-STORE-CONTENT-ANALYTICS-CORE-ENTITY-CLEANUP-V1`**(제거 확정분) — icc store/analytics entity·service·배럴 + connection.ts 등록 제거 + `CreateStoreContentTables/AddStoreContentUsageFields/CreateContentAnalyticsTable` 는 Phase1 에서 이미 삭제됨(추가 migration 없음). api-server·icc·lms-core 빌드/tsc. **단, Phase1 에서 이미 store/analytics migration 은 삭제됐으므로 본 WO 는 entity 잔재 정리에 집중.**
2. **(product 결정 후)** `WO-O4O-LMS-TEMPLATE-LIBRARY-DEAD-CODE-CLEANUP-V1`(미사용 확정 시) 또는 `WO-O4O-LMS-TEMPLATE-LIBRARY-ROUTE-WIRING/FRONTEND-V1`(활성화 시). lms_template_* orphaned migration 처리 포함.
3. `IR-O4O-LMS-INSTRUCTOR-APPLICATION-STATE-V1` — lms_instructor_applications vs kpa qualification 중복 정리.
4. (별도) `CHECK-O4O-NETURE-B2B-...-SMOKE-V3`(Toss).

## 11. 핵심 질문 답변
1. lms_template_* prod 필요? **아니오(미적용·frontend 0)** — 단 로드맵 가능성으로 보류. 2. Template route/controller/service 마운트? **예(/lms/templates), frontend 0**. 3. frontend template library 화면? **없음**. 4. icc StoreContentService/initStoreContentService/routes() 사용? **미마운트(dead)**. 5. StoreContent/Block/Analytics entity api-server 등록 외 소비자? **icc 자체 미마운트 service 뿐**(lms-core 재노출 X). 6. copyTemplate 의존 entity? **icc Template/TemplateVersion/TemplateBlock**. 7. lms_template_* prod 올릴 필요? **현재 근거 없음**. 8. 활성화 vs dead? **store/analytics=dead, template=보류, instructor=얽힘**. 9. 제거 시 무엇? **icc 하위 entity/service + connection.ts(template 은 +route/lms service)**. 10. kpa_store_contents 충돌? **없음(별개)**.

## 12. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. 파일 삭제·이동·실행 없음. prod SQL 미수행(방화벽). 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · read-only · 코드/DB 무변경 · store-content/analytics icc 라인=제거(B, lms-core 무영향), template library=보류(C, 로드맵 결정), lms_instructor_applications=별도 audit(live InstructorController 얽힘). icc 패키지 자체는 Survey/ContentBundle/Course 로 live·보존. live kpa_store_contents·kpa qualification 별개·보호.*
