# CHECK — WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1 (Phase 2 — KPA web UI)

> KPA 다국어 상품 콘텐츠 HUB-FLOW 파일럿의 **web UI (Phase 2)**.
> 운영자 작성 → KPA Store Hub 노출 → 매장 가져오기(=복사) → target 연결 → resolve 검증.
> backend contract 는 Phase 1 결과(`WO-...-HUB-FLOW-PILOT-V1`, commit a15c5c8af)를 그대로 사용 — backend 무변경.

**대상:** KPA Society only (web-kpa-society). GlycoPharm / K-Cosmetics web 무변경.

---

## 1. 신규 web 파일

| 파일 | 역할 |
|------|------|
| `src/api/operatorMultilingualContent.ts` | 운영자 CRUD client (`/api/v1/kpa/operator/multilingual-product-contents/groups` + pages). getAccessToken+authFetch (operatorBlog 패턴) |
| `src/api/multilingualProductContentStore.ts` | store-owner client: `hub` 탐색 / `import` / 내 매장 목록 / `resolve` |
| `src/pages/operator/multilingual-product-content/OperatorMultilingualContentListPage.tsx` | 운영자 원본 목록 (상태 필터 / 발행 언어 / publish·archive) |
| `src/pages/operator/multilingual-product-content/OperatorMultilingualContentWritePage.tsx` | 운영자 작성·수정 — 그룹 메타 + **언어 탭(ko/en/zh/ja/vi/th/id)** RichTextEditor, 언어별 저장/발행/상태토글 |
| `src/pages/pharmacy/HubMultilingualContentLibraryPage.tsx` | Store Hub 진열 카드(지원 언어 표시) + 가져오기 모달(targetKind local/listing + 상품 선택 → import) |
| `src/pages/pharmacy/StoreMultilingualContentsMyPage.tsx` | 내 매장 가져온 콘텐츠 + **resolve(en/zh/ja) fallback 검증** UI |

## 2. 수정 파일 (additive)

| 파일 | 변경 |
|------|------|
| `src/routes/OperatorRoutes.tsx` | import + `/operator/multilingual-product-contents` `new` `:id` 3 route |
| `src/config/operatorMenuGroups.ts` | stores 그룹에 `매장 HUB 다국어 상품 콘텐츠` 메뉴 1개 additive |
| `src/App.tsx` | lazy import 2개 + `/store-hub/multilingual-product-contents`(+`/my`) 2 route |

## 3. 운영 흐름

```
운영자: /operator/multilingual-product-contents → 새 콘텐츠(그룹 생성) → 언어 탭별 ko/en 작성 → 발행
매장:   /store-hub/multilingual-product-contents → published 카드 → 가져오기(targetKind+상품 선택)
        → POST /import (store-scoped 사본 + source_type='operator_hub') → /my 로 이동
        → resolve(en) / resolve(zh fallback) 검증
```

- target 명칭: **매장 취급 상품**(local=store_local_products, `fetchLocalProducts`) / **O4O 주문 가능 상품**(listing=organization_product_listings, `getListings`). "내 매장 상품" 모호 표현 미사용.
- contentKey V1 = default 고정. 본문 포맷 V1 = html(RichTextEditor). 언어별 독립(동일성/자동번역 강제 없음).

## 4. 검증

### 4.1 정적
- `web-kpa-society` `npx tsc --noEmit` — **신규 오류 0** (전체 error TS 0건).
- backend 무변경 → api-server typecheck 불요.

### 4.2 UI smoke (배포 후)
```
운영자: /operator/multilingual-product-contents 진입 → 새 작성 → ko/en 저장 → publish
Hub:    /store-hub/multilingual-product-contents 카드 노출 → 가져오기 모달 target 선택
import: store copy 생성 → /my 에서 확인 → resolve en/zh fallback
회귀:   기존 operator blog/pop/qr · Store Hub content · 상품 목록 route 정상
```

### 4.3 인증 기능 smoke (실제 row)
KPA operator + store-owner 계정으로 §5 전체 흐름. 운영 흐름상 의미 있는 파일럿 데이터는 유지, 불필요 시 archived(물리 삭제 지양).

## 5. 안전

- backend 무변경. `connection.ts` / `services/mobile-app/*`(타 세션 WIP) 미접촉.
- 기존 메뉴/라우트 구조 재편 없음 — 신규만 additive.
- tailwind: 신규 파일 전부 web-kpa-society/src 내부 → 자체 config 스캔 범위, content 경로 추가 불요.
- 단일 commit(code+CHECK) — web deploy HEAD 단일 커밋 변경감지 대응.

## 6. 후속

```
WO-O4O-STORE-PRODUCT-MULTILINGUAL-BADGES-V1
WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1
WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-CROSS-SERVICE-ADOPTION-V1 (KPA 파일럿 안정화 후)
```

---

*Date: 2026-06-21 · Phase 2 KPA web UI · 운영자 언어탭 작성 + Hub 가져오기(target 선택) + resolve 검증 · backend 무변경(Phase 1 contract) · web-kpa typecheck 신규 오류 0 · KPA only(GP/KCos 무변경) · mobile-app 미접촉*
