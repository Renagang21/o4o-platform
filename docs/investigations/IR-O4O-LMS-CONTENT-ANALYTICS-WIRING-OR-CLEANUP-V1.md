# IR-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1

> **유형**: Investigation / Dead-code & Orphaned-schema Wiring Audit (read-only)
> **목적**: orphaned migration 감사 중 발견된 `modules/lms` store-content / content-analytics 잔재(`ContentAnalyticsService`, `store_contents` / `store_content_blocks` / `content_analytics`)가 실제 runtime 에 연결·소비되는지 확인하고 **활성화 vs cleanup** 을 판정.
> **성격**: 코드/DB/migration/API/UI **무변경**. read-only.
> **기준 한 줄**: *결제 흐름과 무관한 orphaned 잔재 정리 목적이다. 기능 활성화 필요성이 명확하지 않으면 cleanup 방향으로 판정한다.*
> **상위**: `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` · `CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-HIGH-RISK-VERIFY-V1` · `CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1`
> **작성일**: 2026-06-12

---

## 1. 판정 (요약)
**→ CLEANUP** (활성화 근거 없음). 단, **선행 CHECK 의 "unwired(import 0)" 전제는 부정확** — 라우트는 실제로 마운트되어 있다. 그럼에도 **소비자(frontend/job/event) 0 + 백킹 테이블 미생성 + graceful empty/zeros** 라 **기능적으로 dead** 이며 활성화 기획도 없으므로 cleanup 판정은 유지된다.

| 항목 | 사실 |
|------|------|
| 라우트 마운트 | ✅ `register-routes.ts:140` `app.use('/api/v1/lms', lmsRoutes)` → `lms.routes.ts` 에 `/store-contents*`, `/store-content-blocks/:id`, `/content-analytics/*`, `/content/:slug` 존재 |
| 컨트롤러 | ✅ `modules/lms/controllers/StoreContentController.ts` (live import) |
| 서비스 | ✅ `StoreContentService.ts`, `ContentAnalyticsService.ts` (StoreContentController 가 사용) |
| 엔티티 등록 | ✅ `StoreContent` / `StoreContentBlock` / `ContentAnalytics` (interactive-content-core) — `connection.ts` entity 목록 등록 |
| **백킹 테이블** | ❌ orphaned migration(012/013/014) 미적용 → **prod 미생성**(구조적, o4o_payments 패턴). 컨트롤러 `"Tables not found - returning empty/zeros"` graceful 핸들러가 부재를 전제·방증 |
| **소비자(frontend/job/event)** | ❌ **0** — `services/**`(src) 에서 `/lms/store-contents`·`/lms/content-analytics`·copyTemplate·getPublicContent 호출 **0건** |

> 즉 **라우트는 살아있으나 호출자가 없고 테이블도 없는 "스캐폴딩만 남은 미완성 서브시스템"**. 활성화하려면 (a) migration relocate + (b) frontend 신규 구축 + (c) 기획이 필요한데, 그 근거가 없음 → cleanup.

## 2. live store-content 시스템과의 구분 (절대 보호)
**`kpa_store_contents` 계열은 본 IR 대상이 아니며 절대 건드리지 않는다.**
- live 경로: `routes/o4o-store/controllers/store-content.controller.ts`(`createStoreContentController`) → **`KpaStoreContent` 엔티티 = `kpa_store_contents` 테이블**.
- 마운트: KPA/GlycoPharm/Cosmetics `*.routes.ts` 의 `router.use('/store-contents', createStoreContentController(...))` → `/api/v1/{service}/store-contents`.
- frontend 소비: `web-kpa-society/src/api/assetSnapshot.ts` 등이 `/store-contents`(서비스 prefix) 호출. pharmacy 편집 페이지(StoreContentEditPage 등) 모두 **kpa_store_contents** 대상(파일 주석 "upsert → kpa_store_contents" 명시).
- IR §4(이전 audit)의 `store_contents` substring 매칭 다수는 **`kpa_store_contents`** 였음(오탐). `content_analytics`/`store_content_blocks` 와는 무관.

→ **lms 서브시스템(`store_contents`/`store_content_blocks`/`content_analytics`)과 live `kpa_store_contents` 는 완전히 별개**다. cleanup 대상은 전자뿐.

## 3. CLEANUP 대상 (정밀 스코프 — 후속 WO 용)
> 사용자 제시 후보(ContentAnalyticsService + migration 3종)보다 **스코프가 큼**: 라우트가 마운트돼 있어 route/controller/service/entity-등록까지 함께 제거해야 데드링크/미사용 라우트가 남지 않음.

| 계층 | 파일/위치 | 비고 |
|------|----------|------|
| migration(orphaned) | `1771200000012-CreateStoreContentTables` · `1771200000013-AddStoreContentUsageFields` · `1771200000014-CreateContentAnalyticsTable` | 미적용. 삭제해도 러너 무영향(미스캔 dir) |
| service | `modules/lms/services/ContentAnalyticsService.ts` · `modules/lms/services/StoreContentService.ts` · `services/index.ts` export | StoreContentService = template→store-content copy |
| controller | `modules/lms/controllers/StoreContentController.ts` · `controllers/index.ts` export | |
| route | `modules/lms/routes/lms.routes.ts` 의 `/store-contents*`·`/store-content-blocks/:blockId`·`/content/:slug`·`/content-analytics/*` 엔트리(라인 385,392~436) | **마운트 제거 필요** |
| entity | interactive-content-core `entities/store/StoreContent` · `StoreContentBlock` · `entities/analytics/ContentAnalytics` + `connection.ts` entity 등록(2곳) | core 패키지 변경 — 신중(다른 소비 0 확인됨) |

### 3.1 결합 의존 (WO 분리 권고)
- `StoreContentService.copyTemplate()` 가 **TemplateBlock → StoreContentBlock** 복사 → **lms_template_*(B 카테고리, orphaned)** 와 결합. 즉 이 서브시스템은 *LMS 템플릿 라이브러리 → 매장 콘텐츠 복사 → 분석* 이라는 **하나의 미완성 라인**.
- 따라서 cleanup WO 는 `IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1`(lms_template_*) 와 **함께/연속** 판정 권장. 단독 제거 시 template-copy 의존만 남는 부분 정리가 되지 않도록 주의.

## 4. 활성화(반대안) 검토 — 기각 사유
- frontend 부재(신규 화면·API 클라이언트 전무) → 활성화 = 신규 기능 개발(기획 필요).
- live 매장 콘텐츠/분석 요구는 이미 `kpa_store_contents` + asset-snapshot/published-assets 계열이 담당 → 중복.
- 즉시 활성화 기획·요구 **없음** → 기준 한 줄에 따라 cleanup.

## 5. 보호/범위 밖 (삭제 금지 — 재확인)
```
kpa_store_contents 관련 코드/엔티티/migration (KpaStoreContent, store-content.controller, asset-snapshot, published-assets, store-pop, store-library-feed)
LMS template 계열(lms_template_*) — §3.1 결합이나 별도 IR/WO 판정
Neture B2B payment/cart/checkout/bridge
PaymentCore / o4o_payments
operator_action_dismissals
```

## 6. 검증 방식 / 한계
- 방식: src-only grep(라우트 마운트 추적 register-routes→lms.routes, 컨트롤러→서비스→엔티티, frontend 소비자 0, live kpa_store_contents 경로 분리), connection.ts entity 등록 확인.
- prod 테이블 실재는 방화벽으로 직접 SQL 미수행 — 단 orphaned 미적용 + synchronize=false + 컨트롤러 graceful "Tables not found" 핸들러로 **부재 고확신**(o4o_payments/operator_action_dismissals 와 동일 메커니즘).
- 한계: dist 번들 grep 제외(노이즈). 라우트 마운트는 register-routes.ts:140 로 확정.

## 7. 핵심 질문 답변
1. ContentAnalyticsService runtime 연결? **예(StoreContentController→lms.routes→/api/v1/lms 마운트)**. 단 소비자 0.
2. store_contents/blocks/content_analytics 소비? **frontend/job/event 0**, 테이블 미생성.
3. live 기능과 혼동? **아니오** — live 는 kpa_store_contents(별개).
4. 활성화 기획? **없음**.
5. 판정? **CLEANUP**(라우트 마운트까지 포함한 정밀 스코프 §3).
6. 즉시 단독 cleanup 가능? **migration 3종은 가능**, 그러나 route/controller/service/entity 까지 함께 제거해야 미사용 라우트가 안 남음 → WO 로.

## 8. 후속 WO 제안
1. **`WO-O4O-LMS-CONTENT-ANALYTICS-DEAD-CODE-CLEANUP-V1`** — §3 스코프(migration 3 + service 2 + controller 1 + lms.routes 엔트리 + entity 3 + connection.ts 등록) 제거. api-server/core 패키지 빌드·tsc 검증. path-specific.
2. **`IR-O4O-LMS-TEMPLATE-LIBRARY-SCHEMA-STATE-V1`** — §3.1 결합(lms_template_*) 동반 판정.
3. (별도) E(seed/bootstrap) cleanup IR, `CHECK-...-POSITIVE-SMOKE-V3`(Toss).

## 9. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. 파일 삭제·이동·실행 없음. prod SQL 미수행(방화벽). 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · read-only · 코드/DB 무변경 · 판정 CLEANUP(라우트 마운트되어 있으나 소비자 0·테이블 미생성·활성화 기획 없음). live kpa_store_contents 는 별개·보호. 정밀 스코프 §3, lms_template_* 결합 §3.1.*
