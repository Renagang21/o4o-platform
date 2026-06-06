# CHECK-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1

> **WO**: `WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1`
> **목적**: KPA `StoreProductionMaterialsPage`의 인라인 "원본 보기" 모달을 공통 컴포넌트 `StoreAssetDerivationViewer`(@o4o/store-ui-core)로 추출하고, **KPA에 먼저 재적용**해 회귀 0 확인.
> **작성일**: 2026-06-06
> **선행**: `IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-COMPONENT-DESIGN-V1`
> **연관 규칙**: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`

---

## 1. Summary

KPA 원본 보기 모달(상태머신 + 조회 + 모달 JSX + source_kind 라벨 + derivedKind 매핑 + 모달 스타일)을 공통 컴포넌트로 승격. KPA 페이지는 **대상(target)만 보유**하고, viewer가 fetch/loading/empty/list를 자체 처리한다. viewer는 endpoint를 모르고 서비스가 `fetchDerivations`를 주입한다. **이번 WO는 viewer 추출 + KPA 재적용만** — Glyco/KCos 미적용, ResultKind/다중소스/활용하기 공통화는 후속.

## 2. Scope

- 포함: `@o4o/store-ui-core`에 `StoreAssetDerivationViewer` + `StoreAssetDerivationItem`/`StoreResultKind` + `resultKindToDerivedKind` 추가; KPA 페이지를 공통 viewer로 교체.
- 제외: GlycoPharm/K-Cosmetics 적용, 전체 페이지 공통화, ResultKind/다중소스 통합목록, 활용하기 dropdown, 백엔드/API/DB/migration.

## 3. Changed Files

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/components/StoreAssetDerivationViewer.tsx` | **신규** 공통 viewer 컴포넌트(제로-의존: peerDeps만, inline CSSProperties, KPA theme hex 인라인) |
| `packages/store-ui-core/src/index.ts` | 신규 export 추가(기존 export 무변경) |
| `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` | 인라인 모달/상태/조회/모달스타일/SOURCE_KIND_LABELS 제거 → 공통 viewer 사용. fetchDerivations adapter 주입 |

## 4. derivedKind Mapping (공통 helper)

`resultKindToDerivedKind(kind)`: `material|pop → pop_pdf`, `qr → qr_code`, `blog → blog_post`. KPA는 `derivTarget.kind`로 호출.

## 5. UI Behavior (회귀 0 설계)

- 모달 마크업·문구·스타일을 **그대로 이관** (KPA theme hex `#2563EB`/`#1E293B`/… 인라인 → 픽셀 동일).
- 동작: 행의 "원본 보기" 클릭 → `setDerivTarget+setDerivOpen` → viewer가 `open` 시 `fetchDerivations` 호출 → loading → (relation 있으면 목록 / 없으면 empty "연결된 원본 정보가 없습니다").
- source_kind 라벨 기본 맵을 viewer로 이관(content_*→'콘텐츠', library_resource/store_execution_asset→'자료', production_material→'매장 제작 자료'). KPA는 기본 맵 사용(동일 라벨).
- 승인/삭제 등 mutation 없음 — 조회 전용. POP/QR/블로그 트리거(행 버튼/드롭다운)는 무변경.

## 6. TypeScript Result

- `@o4o/store-ui-core` tsc --noEmit: **0 errors**
- `web-kpa-society` tsc -b: **0 errors** (pre-existing vite.config TS18003 제외 — 다른 세션 산출물, 본 WO 무관)

## 7. Browser Smoke Result

- 정적 검증: 마크업/스타일/로직 동일 이관 + 타입 0 errors.
- 라이브 smoke: kpa-society-web 배포 후 `/store/library/production-materials`에서 POP/QR/블로그 원본 보기 + empty + 기존 출력/활용하기/삭제/열기 회귀 확인 — **배포 파이프라인 통과 후 수행 항목**(본 문서에 결과 추기 예정). 추출이 충실해 회귀 위험 낮음.

## 8. Regression Check

- KPA 화면: 모달 마크업/문구/색상 동일 → 화면 변화 없음.
- 트리거(POP 드롭다운 / QR·블로그 "원본 보기" 버튼) 무변경.
- 제거된 것은 전부 모달 내부 전용(상태 derivItems/Loading/Error, SOURCE_KIND_LABELS/sourceKindLabel, 모달 스타일, X/Loader2 아이콘) — TS noUnusedLocals로 잔여 미사용 0 확인.

## 9. Consumer Impact (Shared Module Change Protocol)

| 소비처 | 1차 영향 | 검증 |
|---|---|---|
| `@o4o/store-ui-core` | 신규 export 추가(기존 계약 불변) | tsc 0 errors |
| web-kpa-society | 인라인 → 공통 viewer 교체 | tsc 0 errors + (배포 후) smoke |
| web-glycopharm | **영향 없음**(미사용, 후속 adopt WO) | — |
| web-k-cosmetics | **영향 없음**(미사용, 후속 adopt WO) | — |
| 그 외(neture/admin/operator 등) | 미사용 | — |

## 10. Out of Scope / Follow-ups

- `WO-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1` — glyco fetcher(axios) 주입 + POP 행 적용.
- `WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1`.
- (이후) ResultKind/다중소스 통합목록 + 활용하기 dropdown 공통화.
