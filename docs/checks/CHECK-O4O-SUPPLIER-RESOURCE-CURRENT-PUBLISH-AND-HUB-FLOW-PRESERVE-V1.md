# CHECK-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1

> WO: `WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1`
> 성격: 현재 게시·HUB 계약 보존 + 실단절만 최소 수정. **승인 체계·서비스 선택·신규 테이블·migration 0.**
> Date: 2026-07-23 · 코드 commit `0289608d1`(3파일) · Deploy API success · 프로덕션 smoke PASS

---

## 0. 결론 — ✅ PASS (실단절 3건 수정, 그 외 계약 보존 확인)

## 1. 현재 흐름 (코드 기준 재확인)

| 자원 | 작성 주체 | 원본 엔티티 | 게시 | HUB 조회 조건 | 매장 가져오기 | 승인 |
|---|---|---|---|---|---|---|
| **태블렛 Screen Set** | ACTIVE 공급자 | `store_tablet_screen_sets`(origin=supplier, org NULL) | `POST /kpa/supplier/screen-sets/:id/publish` draft→active (hub_target 필수+의약품 가드) | origin=supplier AND status=active AND service_key='kpa' AND deleted_at IS NULL AND hub_target 매칭(+비약국 의약품 제외) | `/store/screen-set-hub/supplier-templates/:id/import` — **값 복사** 독립 사본(origin=store)+provenance | **없음(직접 게시)** — 유지 |
| **일반 콘텐츠** | 공급자(supplierops UI) | `cms_contents`(authorRole=supplier, status=pending) + `kpa_approval_requests`(hub_content_submission) | 운영자 승인 → status=published | 매장 HUB cms 탭: serviceKey **정확일치** AND status=published | asset-snapshot Full Copy(`POST /kpa/assets/copy`) | **있음(KPA 전용 kpa_approval_requests)** — 유지 |
| **QR** | 매장 | `store_qr_codes` (landingType product/promotion/page/link/video/screen_set) | — (QR 자체 게시 개념 없음) | — | 운영자 QR 템플릿 import만(published 원본) | **없음** — QR은 연결 대상 정책을 따름. `/r/{id}`는 F12 목표(미구현), 상품 공개는 `/p/{key}` |
| **사이니지** | HQ/커뮤니티(운영자축) | `signage_media`/`signage_playlists` | HQ·community 게시 / 공급자 **캠페인 요청→운영자 승인**(signage_forced_content) | serviceKey AND source IN(hq,supplier,community) AND status=active AND scope=global | asset-snapshot Full Copy | 캠페인만 승인형 — 유지. **공급자 직접 게시 경로는 코드상 비존재**(requireSignageSupplier dead·공급자 UI 제거 = 의도된 canonical, 단절 아님) |

## 2. 발견한 실제 단절 (3건) 과 수정

| # | 단절 | 원인 | 수정 |
|---|------|------|------|
| B-1 | 공급자 일반 콘텐츠: **승인(published)돼도 매장 HUB 목록에 영원히 미노출** | 쓰기 `serviceKey='kpa-society'`(supplier-content.service.ts) vs 매장 HUB cms 탭 조회 `serviceKey='kpa'` 정확일치(HubContentLibraryPage·cms.ts 기본값) — 별칭 정규화 없음 | 쓰기측 상수 `'kpa'` 정렬. **운영 데이터 영향 0**(kpa-society 공급자 cms row 0건 — backfill/migration 불필요) |
| B-2 | **HUB 목록 게이트보다 가져오기 게이트가 약함** — ID만 알면 pending/draft/archived cms·비활성 signage도 매장 사본 생성 가능(승인 전 공급자 제출물 포함) | `KpaAssetResolver.resolveCms` 무게이트 / `resolveSignage` deletedAt만 | resolveCms `status='published'`, resolveSignage `status='active'` 추가 — 목록 게이트와 정합(resolveBlog/resolvePop 기존 패턴). serviceKey/scope는 기존 문서화된 listing-단 결정 유지 |
| C-1 | **video QR이 대상 공개 정책 미준수** — draft/archived 매장 동영상도 스캔 시 videoUrl 노출 | 공개 landing `store_videos` 조회에 status 조건 없음(다른 landing 타입은 각자 게이트 보유) | `AND status='published'` 추가 |

**수정 아님(보고만)**: ① Flow A 결함 0. ② Flow D 공급자 직접 게시 비존재=의도된 구조. ③ `resolveContent` status 미게이트=문서화된 의도적 결정(불변). ④ page-direct(`kpa_store_contents`)는 공개 lifecycle 컬럼 자체가 없어 따를 정책 없음(QR is_active 토글이 게이트). ⑤ CMS/사이니지 경로의 의약품 가드는 **기존에 정의된 적 없음** — "누락·우회"가 아닌 정책 부재이므로 새 게이트 신설은 새 정책 설계 = 범위 외(관찰 기록).

- 변경 파일: `supplier-content.service.ts` · `kpa-asset.resolver.ts` · `store-qr-landing.controller.ts` (3)
- DB migration: **0** · 승인/서비스 선택 신규 구현: **0**

## 3. 보존 확인

- **태블렛 KPA 고정**: mount `'kpa'`(kpa.routes.ts) · HUB `SUPPLIER_HUB_SERVICE_KEY='kpa'` 불변.
- **공급자 직접 게시**: publish 엔드포인트·상태 전이 불변. 공급자 UI 상태 라벨 = 게시 중/보관/작성 중 3종만(허위 '승인 대기'류 0). `hubTargetStoreType`=매장 유형(약국/비약국/전체) 유지 — 서비스 선택 아님.
- **KPA 일반 콘텐츠 기존 승인**: 제출→kpa_approval_requests→운영자 승인→published 흐름 무변경(serviceKey 상수만 정렬). `kpa_approval_requests` 공용화·개명 없음.
- **QR 기존 계약**: 승인 도메인 0(CONTENT_APPROVAL_ENTITY_TYPES 불변) · Screen Set QR archive→410/restore 계약 불변 · ProductMaster 고정 URL 계약 무접촉.
- **원본·매장 사본 독립성**: import=값 복사+provenance(코드 불변). 기존 매장 사본은 공급자 원본 수정·보관과 무관(Full Copy).
- **의약품 제한**: Screen Set 5중 가드(게시/대상변경/목록/상세/가져오기) 무접촉 유지.
- GP/K-Cosmetics: 변경 파일 3개 모두 KPA resolver·KPA 공급자 제출·매장 QR landing — GP/KCos 소비 경로 무접촉(resolveSignage/resolveCms는 sourceService='kpa' 분기 전용).

## 4. 검증

- **typecheck**: api-server 변경 3파일 오류 0.
- **프로덕션 smoke (renagang21, 2026-07-23)**:
  - A 대표 흐름: draft 생성(201)→블록 저장→publish **active**→HUB 목록 노출 **true**→상세 미리보기 200→archive→**목록 제외**→보관 원본 import **404 SUPPLIER_TEMPLATE_NOT_FOUND**(보관 자원 가져오기 차단). publish는 빈 세트 차단(EMPTY_SCREEN_SET) 정상 동작 확인. *(가져오기·사본 독립성·7언어·의약품 경계는 2026-07-22 최종 E2E PASS — 해당 경로 코드 무변경으로 유효)*
  - B-2: draft cms 복사 → **404 SOURCE_NOT_FOUND**(신규 게이트 라이브 실증) · published cms 복사 201 → 사본 삭제 200 (**net-0**).
  - C-1: store_videos 운영 0건 — 코드 게이트+tsc 검증(픽스처 조작 미수행).
- **잔여**: 보관된 검증용 공급자 세트 1건(soft-archived, 기존 동종 잔여와 동일 취급). 스냅샷 사본 0 · QR 0 · 매장 사본 0.

## 5. 중지 조건 점검 — 전부 미해당

신규 승인 테이블/상태 불필요 · 다중 서비스 선택 불필요 · KPA 고정 계약 유지 · kpa_approval_requests 공용화 불필요 · QR 승인 자원화 불필요 · 사이니지 구조 변경 불필요 · migration 0 · 의약품 정책: 기존 가드 전부 보존(신규 정책 설계는 범위 외로 관찰만) · 동시 작업 충돌 0.
