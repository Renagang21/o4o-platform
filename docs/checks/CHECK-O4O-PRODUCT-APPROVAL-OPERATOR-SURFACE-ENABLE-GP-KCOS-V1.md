# CHECK-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1

> **WO:** WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 (+ -RESUME)
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — Phase 1-5 구현 + 5개 패키지 tsc PASS + 정적 가드 PASS. Browser smoke 는 배포 후 권장(§9).

## 1. 목적

KPA 에만 있던 `product_approvals` 운영자 승인 surface 를 GlycoPharm / K-Cosmetics 운영자에게 확장.
KPA 컨트롤러를 serviceKey/scope 로 일반화 → GP/KCos 마운트 + 공통 콘솔 + thin wrapper + 메뉴.
approve 는 `ProductApprovalV2Service.approveServiceProduct(activateListing:true)` (per-store 단건 OPL active).

## 2. 선행 Decision / 선결 작업

| 작업 | commit | 결과 |
|------|--------|------|
| Phase 1 — backend controller 일반화 | `677a9e61c` | serviceKey/scope 파라미터화, KPA 무영향 |
| IR — GP service_key 라벨링 audit | `2570a4b78` | GP apply 가 service_key 미전송 → 'kpa-society' 오염 가능, frontend 수정이 정답 |
| CHECK — 오염 count | `395789457` | **오염 count = 0** → backfill 불필요 |
| WO — GP frontend service_key fix | `7225f37a4` | GP apply/getCatalog `service_key:'glycopharm'` 명시 전송 |

선결 완료로 GP 도 `serviceKey='glycopharm'` 기준 빈목록/누수 없이 surface 개방 가능.

## 3. Phase 1 — backend controller 일반화 (선행 `677a9e61c`)

`createOperatorProductApplicationsController(dataSource, requireAuth, requireScope, actionLogService?, options?)`.
`options { scope, serviceKey }` — 미지정 시 'kpa:operator'/전체(KPA 현행 보존), 지정 시 list/stats/approve/reject/delete/batch 전부 serviceKey 격리(`inServiceScope` IDOR 가드, CLAUDE.md §7).

## 4. Phase 2 — GP/KCos backend route mount (`face32609`)

| 서비스 | mount | scope | serviceKey |
|--------|-------|-------|-----------|
| GlycoPharm | `/api/v1/glycopharm/operator/product-applications` | `glycopharm:operator` | `glycopharm` |
| K-Cosmetics | `/api/v1/cosmetics/operator/product-applications` | `cosmetics:operator` | `k-cosmetics` |

- KPA 공유 컨트롤러 재사용(cross-route import, 기존 qualification.controller 선례).
- KCos 는 audit parity 위해 `new ActionLogService(dataSource)` 주입. GP 는 기존 `actionLogService`.
- approve = `approveServiceProduct(id, by, { activateListing:true })`. **activateOfferListings 미사용** (offer-wide 일괄 금지).
- 지원: list / stats / approve / reject / batch-approve / batch-reject / delete / batch-delete.

## 5. Phase 3 — frontend 공통 콘솔 추출 (`3500d1215`)

`@o4o/operator-core-ui` 에 `modules/product-applications`:
- `ProductApplicationManagementConsole` — KPA 페이지 본문 이관(동작/UX 동일).
- `ProductApplicationsApi` 어댑터(list/stats/approve/reject/batch*/remove/batchDelete + optional `aiSummarize`) — service 측 주입.
- `ProductApplicationsConfig` — `title / description / orgLabel / accent('blue'|'teal'|'pink') / tableId`.
- AI 요약 버튼은 `api.aiSummarize` 제공 시에만 노출(GP/KCos 미제공 → 숨김).
- `@o4o/types` 의존 추가(`OperatorActionType`) + root/subpath export. pnpm-lock 은 workspace link 만(`--frozen-lockfile` PASS, 이후 pre-commit hook 재생성).

## 6. Phase 4 — GP/KCos operator pages 추가 (`3500d1215`)

| 페이지 | accent | orgLabel | BASE | api |
|--------|--------|----------|------|-----|
| KPA (전환) | blue | 약국 | `/operator/product-applications` | KPA apiClient (aiSummarize 유지) |
| GlycoPharm (신규) | teal | 약국 | `/glycopharm/operator/product-applications` | authClient `api` (axios) |
| K-Cosmetics (신규) | pink | 매장 | `/cosmetics/operator/product-applications` | authClient `api` (axios) |

- KPA: 제목 '상품 판매 신청 관리'/설명/accent=blue/tableId='kpa-product-applications' 기존값 유지 → **UX 무회귀**.
- GP/KCos: 제목 '공급 상품 신청 승인', `toError` 친절 메시지, res.data 언랩 어댑터.

## 7. Phase 5 — GP/KCos route/menu 노출 (`3500d1215`)

- GP/KCos `App.tsx`: `<Route path="product-applications" ... />` (operator lazy import).
- GP/KCos `operatorMenuGroups` `approvals` 그룹에 **'공급 상품 신청 승인'** → `/operator/product-applications` (매장 승인 / 이벤트 오퍼 승인과 **별도 항목**).
- KCos 는 `UNIFIED_MENU.approvals` (sibling 이벤트오퍼 항목과 동일 shape → 동일 노출). 판매자모집/B2B/B2C 문구 미사용.
- **KPA 메뉴 노출은 미수행** (별도 WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1). KPA 기존 route/page 유지.

## 8. 제외/무변경 항목

DB schema / migration 0건. ProductApprovalV2Service approve 정책 무변경. `activateOfferListings` 활성화 0건 / offer-wide 일괄 활성화 0건. storefront/channel/OPC, checkout/order/cart, EventOffer approval, Neture offer_service_approvals, 유통참여형 펀딩·Market Trial, KPA sidebar menu — 전부 무변경.

## 9. 검증 결과

**Typecheck (5):**
| 패키지 | 결과 |
|--------|------|
| `@o4o/api-server` | ✅ 0 errors |
| `@o4o/operator-core-ui` | ✅ 0 new (1 pre-existing: `error-handling/useApiErrorHandler` `import.meta.env` — standalone tsc 한정, stash 대조로 baseline 확인) |
| `glycopharm-web` | ✅ 0 errors |
| `@o4o/web-k-cosmetics` | ✅ 0 errors |
| `@o4o/web-kpa-society` | ✅ 0 errors (**회귀 없음**) |

**정적 가드:**
- `activateOfferListings: true` → **0건**.
- product-applications surface(콘솔/GP/KCos wrapper) 내 `판매자 모집` / `B2B 승인` / `B2C` → **0건** (판매자모집 18건은 pre-existing `web-glycopharm/src/pages/business/*`, 본 WO 범위 외).
- product-applications mount/route/menu 참조 10건 확인.

**Browser smoke (권장, 배포 후):**
- GP/KCos `/operator/product-applications` 진입 + 메뉴 '공급 상품 신청 승인' 노출 + 목록/empty/승인·거절 버튼 렌더.
- KPA regression: 기존 화면 정상 렌더.
- pending 0 시 write smoke 생략. production write 는 명시 승인 없이 미수행.

## 10. 완료 판정

✅ **완료.** GP/KCos backend route mount + scope 격리 + 공통 콘솔 + wrapper + route/menu. approve=activateListing:true(per-store 단건). KPA 무회귀, 메뉴 노출 별도 WO 유지. DB/migration 0, storefront/checkout 0. 5개 tsc PASS. Browser smoke 만 배포 후 권장.

## 11. 후속 작업

1. `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1` — KPA 승인 화면 사이드바 노출.
2. `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` — OPL active vs storefront channel gate 분리 문서화.
3. `WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1` — 운영자 end-to-end 가이드.
4. (선택) GP/KCos operator AI 요약 endpoint 도입 시 wrapper 에 `aiSummarize` 주입 → 버튼 자동 노출.

---
*End of CHECK-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1*
