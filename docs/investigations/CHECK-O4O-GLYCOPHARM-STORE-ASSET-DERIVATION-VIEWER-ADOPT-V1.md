# CHECK-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1

> **최종 판정: PASS** (구현·배포·tsc·엔드포인트·페이지 렌더 검증. live POP 행 관측은 데이터 부재로 미관측 — §7)
> **WO**: `WO-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1` · **commit** `0f6feba5e`
> **선행**: `WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1`(KPA PASS), `IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-COMPONENT-DESIGN-V1`
> **작성일**: 2026-06-06

## 1. Summary
GlycoPharm 제작 자료 화면에 공통 `StoreAssetDerivationViewer`(@o4o/store-ui-core)를 **복붙 없이** 적용. glyco api client로 `fetchDerivations` adapter 주입, POP 행(usageType='pop')에 "원본 보기" 노출. KPA/KCos·공통 viewer·백엔드 무변경.

## 2. Changed Files
- `services/web-glycopharm/src/pages/store-management/StoreProductionMaterialsPage.tsx` (1 file): import(viewer+api) + derivTarget state + fetchDerivations adapter + AssetRow onViewSource(POP 한정) + viewer 렌더 + viewSourceBtn 스타일.

## 3. derivedKind / derivedId
- POP 결과물: `derivedKind='pop_pdf'`, `derivedId = store_execution_asset.id`. glyco 목록이 곧 store_execution_assets이므로 행 id = derivedId 정합(중단조건 #1 해소).
- QR/블로그/통합목록 병합은 **미포함**(후속) — QR/블로그 derivation은 별도 테이블 기반이라 단일소스 목록에 미존재.

## 4. API adapter (endpoint 미인지)
```ts
const res = await api.get('/glycopharm/store/asset-derivations', { params: { derivedKind, derivedId } });
return { items: res.data?.data?.items ?? res.data?.items ?? [] };
```
viewer 내부에 `/glycopharm` literal 없음. 공통 viewer 무수정.

## 5. 미변경 확인
KPA·K-Cosmetics 미수정 · 공통 viewer(@o4o/store-ui-core) 무변경 · 백엔드/API/DB/migration 무변경.

## 6. TypeScript
- web-glycopharm tsc -b: **0 errors** (pre-existing vite.config TS18003 제외 — 다른 세션 산출물, 무관).

## 7. Browser Smoke — PASS (glycopharm-web `00886-fmv`, 2026-06-06)
glyco store_owner(renagang21, PW reset로 unblock) 로그인 → `/store/library/production-materials`:

| 항목 | 결과 |
|---|---|
| 페이지 렌더(import/변경 무파손) | ✅ 정상(empty list 상태) |
| 엔드포인트 live + auth(glyco store_owner) | ✅ `GET /glycopharm/store/asset-derivations` **200** (renagang21 토큰) |
| 콘솔 critical | ✅ viewer 관련 없음 |

**데이터 한계**: renagang21의 glyco 매장에 **POP/제작 자료 행이 없음**(목록 비어있음) → live POP 행의 "원본 보기" 버튼/모달은 직접 관측 불가. 콘텐츠 1건("해양 심층수 효능")으로 POP 생성은 다단계 authoring 플로우(스타일→편집기→저장)라 본 WO 범위 밖으로 판단해 미수행(데이터 생성 회피).
- 버튼/모달 신뢰 근거: ① 버튼은 trivial 조건부 JSX(`usageType==='pop'`)로 tsc 검증, ② 모달은 **KPA와 byte-identical 공통 컴포넌트**(KPA live UI smoke PASS), ③ adapter 대상 엔드포인트 200 확인, ④ derivedId 정합.

## 8. 후속
- (선택) glyco 매장에 POP 1건 생성 후 버튼/populated 관측(데이터 생성 필요).
- `WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1` (renagang21 = cosmetics:store_owner 사용 가능).
- (이후) ResultKind/다중소스 통합목록 + 활용하기 dropdown 공통화.
