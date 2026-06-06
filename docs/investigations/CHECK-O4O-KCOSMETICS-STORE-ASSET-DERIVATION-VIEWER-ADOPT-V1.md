# CHECK-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1

> **최종 판정: PASS** (구현·배포·tsc·엔드포인트·페이지 렌더 검증. live POP 행 관측은 데이터 부재로 미관측 — §7)
> **WO**: `WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1` · **commit** `8aeebddc3`
> **선행**: viewer 추출(KPA PASS) + GlycoPharm adopt(PASS)
> **작성일**: 2026-06-06

## 1. Summary
K-Cosmetics 제작 자료 화면에 공통 `StoreAssetDerivationViewer`(@o4o/store-ui-core)를 **복붙 없이** 적용. kcos api client로 `fetchDerivations` adapter 주입(`/cosmetics/store/asset-derivations`), POP 행(usageType='pop')에 "원본 보기" 노출. KPA/GlycoPharm·공통 viewer·백엔드 무변경.

## 2. Changed Files
- `services/web-k-cosmetics/src/pages/store/StoreProductionMaterialsPage.tsx` (1 file): import(viewer+api) + derivTarget state + fetchDerivations adapter + AssetRow onViewSource(POP 한정) + viewer 렌더 + viewSourceBtn 스타일. (GlycoPharm adopt와 동형, prefix만 `/cosmetics`)

## 3. derivedKind / derivedId
- POP: `derivedKind='pop_pdf'`, `derivedId = store_execution_asset.id`(목록=execution_assets → 정합). QR/블로그/통합목록 병합 미포함(후속).

## 4. API adapter (endpoint 미인지)
```ts
const res = await api.get('/cosmetics/store/asset-derivations', { params: { derivedKind, derivedId } });
return { items: res.data?.data?.items ?? res.data?.items ?? [] };
```
viewer 내부에 `/cosmetics` literal 없음. 공통 viewer 무수정.

## 5. 미변경 확인
KPA·GlycoPharm 미수정 · 공통 viewer 무변경 · 백엔드/API/DB/migration 무변경.

## 6. TypeScript
- web-k-cosmetics tsc -b: **0 errors** (pre-existing vite.config TS18003 제외).

## 7. Browser Smoke — PASS (k-cosmetics-web `00657-bx7`, 2026-06-06)
kcos store_owner(renagang21) 로그인 → `/store/library/production-materials`:

| 항목 | 결과 |
|---|---|
| 페이지 렌더(import/변경 무파손) | ✅ 정상(empty list 상태) |
| 엔드포인트 live + auth(cosmetics store_owner) | ✅ `GET /cosmetics/store/asset-derivations` **200** (renagang21 토큰) |
| 콘솔 critical | ✅ 0 errors |

**데이터 한계**: renagang21의 kcos 매장에 POP/제작 자료 행 없음 → live "원본 보기" 버튼/모달 직접 관측 불가(GlycoPharm과 동일). 버튼/모달 신뢰 근거: ① 버튼 trivial 조건부 JSX(tsc), ② 모달은 KPA byte-identical 공통 컴포넌트(KPA live PASS), ③ 엔드포인트 200, ④ derivedId 정합.

## 8. 3-서비스 정렬 완료
KPA(viewer 추출+적용, live PASS) → GlycoPharm(adopt, PASS) → **K-Cosmetics(adopt, PASS)** — 공통 `StoreAssetDerivationViewer` 3서비스 정렬 완료.

## 9. 후속
- (선택) 각 서비스 매장에 POP 생성 후 populated 관측.
- (이후) ResultKind/다중소스 통합목록 + 활용하기 dropdown 공통화 여부 판단.
