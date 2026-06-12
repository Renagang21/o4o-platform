# CHECK-O4O-LMS-CONTENT-ANALYTICS-DEAD-CODE-CLEANUP-V1

> `/api/v1/lms` 아래 마운트돼 있었으나 소비자·백킹 테이블·활성화 기획이 없던 미완성 `store_contents` / `store_content_blocks` / `content_analytics` 라인(api-server 측)을 제거.
> **결과: PASS (Phase 1)** — api-server dead line(controller/service×2/route 14개) + orphaned migration 3종 제거, tsc 0. live `kpa_store_contents` 무변경. **entity/connection.ts 등록 제거는 core 패키지·lms_template_* 결합으로 DEFERRED**(WO §7 중단 조건 준수).
> 상위: `IR-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1` · `CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1` — 2026-06-12

---

## 1. 판정 요약
- IR 판정 = CLEANUP. 본 WO 는 **api-server 측 dead line + orphaned migration** 을 제거(Phase 1).
- **entity(StoreContent/StoreContentBlock/ContentAnalytics) + connection.ts 등록 제거는 미수행(DEFERRED)** — 조사 결과 해당 entity 가 **interactive-content-core 패키지 자체 `StoreContentService`** 에서도 import 되고(`packages/interactive-content-core/src/services/StoreContentService.ts`, 패키지 `routes()`의 `initStoreContentService`), `StoreContentService.copyTemplate` 가 **lms_template_***(B) 와 결합. WO §7 중단 조건("entity 가 다른 곳에서 import 됨") + §3.4(template 결합 시 분리) 에 따라 **별도 IR/WO 로 분리**.

## 2. 변경 (9 파일 — 삭제 6 / 수정 3)
### 2.1 삭제 (git rm)
| 파일 | 성격 |
|------|------|
| `modules/lms/controllers/StoreContentController.ts` | dead controller (lms.routes 외 소비처 0) |
| `modules/lms/services/StoreContentService.ts` | dead service (StoreContentController 만 사용) |
| `modules/lms/services/ContentAnalyticsService.ts` | dead service (〃) |
| `migrations/1771200000012-CreateStoreContentTables.ts` | orphaned(미스캔)·미적용 |
| `migrations/1771200000013-AddStoreContentUsageFields.ts` | 〃 |
| `migrations/1771200000014-CreateContentAnalyticsTable.ts` | 〃 |

### 2.2 수정 (export/route 제거)
| 파일 | 변경 |
|------|------|
| `modules/lms/routes/lms.routes.ts` | `StoreContentController` import 1줄 + dead route 14개(`/content/:slug`, `/store-contents*`, `/store-content-blocks/:blockId`, `/content-analytics/*`) 및 섹션 헤더 제거. **Template/Operator/Course 등 정상 LMS route 보존** |
| `modules/lms/controllers/index.ts` | `StoreContentController` export 제거 (TemplateController 보존) |
| `modules/lms/services/index.ts` | `StoreContentService` · `ContentAnalyticsService` export 제거 (TemplateService 보존) |

> orphaned migration 잔여 32 → **29**.

## 3. 절대 보호 — live `kpa_store_contents` 무변경 (검증)
- live 경로 `routes/o4o-store/controllers/store-content.controller.ts`(`createStoreContentController`, **KpaStoreContent=kpa_store_contents**) 및 KPA/Glyco/Cosmetics `/{service}/store-contents` 마운트 **무변경**.
- 삭제 후 잔여 `StoreContentController` substring grep = **`createStoreContentController`**(live 함수, 별개) 뿐 → 우리가 제거한 클래스/서비스 참조 **0**.
- `published-assets.controller.ts` 의 `sc` JOIN = `LEFT JOIN kpa_store_contents`(live) — 무관·무변경.
- frontend `web-kpa-society/api/assetSnapshot.ts` 의 `/store-contents`(서비스 prefix) 호출 = kpa_store_contents 대상, 무영향.

## 4. 무회귀 (범위 밖 무변경)
```
kpa_store_contents / KpaStoreContent / asset-snapshot / published-assets / store-pop / store-library-feed : 무변경
Neture B2B cart/payment/checkout/bridge · PaymentCore/o4o_payments · operator_action_dismissals : 무변경
LMS course/lesson/certificate/enrollment/template route : 무변경(보존)
```

## 5. DEFERRED (entity·core 패키지 — 후속 IR/WO)
미수행 — 다른 곳에서 import 되어 §7 중단 조건 해당:
- entity: interactive-content-core `entities/store/StoreContent`·`StoreContentBlock`·`entities/analytics/ContentAnalytics` (배럴 `entities/index.ts`)
- api-server `connection.ts` entity 등록(2곳, `from '@o4o/interactive-content-core/entities'`)
- interactive-content-core 자체 `services/StoreContentService.ts` + `index.ts` `initStoreContentService` (패키지 routes())

→ **`IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1`** 와 함께 판정(template→store-content→analytics 가 하나의 미완성 라인). entity 제거는 core 공유 패키지 변경이므로 Shared Module Change Protocol 적용.
- 영향: entity 가 connection.ts 에 등록된 채 남으나 **api-server 소비자 0**(무해, TypeORM 등록만). prod 테이블 미생성 상태 유지.

## 6. 검증
- **api-server tsc 0** (삭제·export 제거 후 dangling 참조 0, `pnpm --filter @o4o/api-server exec tsc --noEmit`).
- **grep**: `StoreContentController`/`ContentAnalyticsService`/modules/lms `StoreContentService` runtime 참조 0(문서·dist·live createStoreContentController 제외).
- **staged 분리**: 본 WO 파일 9개만 path-specific 커밋. **다른 세션 WIP(legal footer 계열: shared-space-ui / 각 web Footer / CHECK-...-LEGAL-FOOTER) 는 index 에 staged 돼 있었으나 본 커밋에서 제외**(pathspec).
- **route smoke**: 코드 경로상 제거 확정(tsc 통과). 배포 후 live probe(아래 §6.1)로 확인 권장.

### 6.1 배포 후 probe (권장)
```
GET /api/v1/lms/store-contents        → 기대: 404/Not Found (route 제거됨; 기존 401→이제 404)
GET /api/v1/lms/courses               → 기대: 기존과 동일(정상/auth-first) — LMS 본체 무회귀
GET /api/v1/{kpa|glycopharm}/store-contents → 기대: 기존 auth-first/정상 — live kpa_store_contents 무회귀
```

## 7. 완료 기준 체크 (WO §9)
1(migration 3 삭제) ✅. 2(StoreContentController 삭제) ✅. 3(StoreContentService 삭제) ✅. 4(ContentAnalyticsService 삭제) ✅. 5(lms store-content/analytics route 제거) ✅. 6(service/controller export 제거) ✅. 7(entity export+등록 제거) **⏸ DEFERRED**(§5 — §7 중단 조건/template 결합, 별도 WO). 8(kpa_store_contents 무변경) ✅. 9(Neture B2B/PaymentCore/operator_action_dismissals 무변경) ✅. 10(tsc 통과) ✅. 11(grep runtime 참조 0) ✅. 12(route smoke — 코드 경로 검증 ✅, live probe §6.1 배포후 권장) ◐. 13(CHECK) ✅. 14(path-specific commit) ✅. 15(다른 세션 WIP 무접촉 — index staged 분리) ✅.

## 8. 후속
- **`WO/IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1`** — lms_template_* + entity(StoreContent/StoreContentBlock/ContentAnalytics) + interactive-content-core 자체 StoreContentService/routes() 동반 판정·제거(§5 DEFERRED 포함).
- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss sandbox).

## 9. 수정하지 않은 것
```
entity / connection.ts 등록 / interactive-content-core 패키지 (§5 DEFERRED)
kpa_store_contents 계열 / Neture B2B / PaymentCore / operator_action_dismissals
LMS course/lesson/certificate/enrollment/template route
다른 세션 WIP(legal footer) — 커밋 제외
```

---

*Date: 2026-06-12 · Status: PASS (Phase 1). api-server LMS content-analytics dead line(파일 6 삭제 + export/route 정리) 제거, orphaned migration 3종 삭제, tsc 0. live kpa_store_contents 무변경. entity/core 패키지 제거는 lms_template_* 결합으로 IR-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1 로 분리.*
