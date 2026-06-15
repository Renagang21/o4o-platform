# CHECK-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1

> **작업명:** WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1
> **유형:** 페이지 컴포넌트 추출 — GP/KCos `/store/library/production-materials` near-identical UI 공통화. backend/API/DB/route **무변경**.
> **결과: PASS — `@o4o/store-ui-core StoreProductionMaterialsView`(header/CTA/list/AssetRow/empty/derivation modal/styles) 추출. GP/KCos wrapper 는 fetch + service-specific derivations 경로만 보유. 기존 4소스(execution/blog/QR/direct) 표시·정렬·badge·원본보기 조건 유지. typecheck(store-ui-core + GP + KCos + KPA) 0 errors. GP/KCos 각 −194 줄.**
> 선행: `WO-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1` — 2026-06-15

---

## 1. 배경 / 사전 조사

선행 작업 후 GP/KCos `StoreProductionMaterialsPage` 는 **doc 2줄 + `asset-derivations` API 경로(`/glycopharm` vs `/cosmetics`)만 다르고 나머지 byte-identical**(header/CTA/list/AssetRow/styles/modal/fetchAll). → 공통 컴포넌트 추출 적격.

## 2. 변경 (4 파일)

| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/src/components/StoreProductionMaterialsView.tsx` | **신규** — presentational: header(breadcrumb/title/subtitle/GuideBackLink/refresh) + CTA(CROSS_CREATE, useNavigate 내부) + list/loading/error/empty + `AssetRow` + `StoreAssetDerivationViewer` modal(내부 state) + styles. props: `items/loading/error/onRefresh/fetchDerivations` |
| `packages/store-ui-core/src/index.ts` | `StoreProductionMaterialsView` + props 타입 export |
| `services/web-glycopharm/.../StoreProductionMaterialsPage.tsx` | thin wrapper — fetchAll(execution/blog/QR/direct + `mergeProductionMaterials`) + `fetchDerivations`(`/glycopharm/...`) → `<StoreProductionMaterialsView .../>`. **−194줄** |
| `services/web-k-cosmetics/.../StoreProductionMaterialsPage.tsx` | 동(`/cosmetics/...`). **−194줄** |

- **서비스별 config 로 남긴 차이:** derivations API 경로(`fetchDerivations` prop), fetch client(`@/api/*`), 서비스 doc. (용어는 본 화면에 "내 약국/내 매장" 직접 노출 없음 — breadcrumb "내 자료함" 공통.)
- **공통 컴포넌트로 이동:** header/CTA(/store/marketing/*·/store/content/blog 3서비스 공통 route)/AssetRow/badge·label/원본보기 조건/empty/styles/modal.
- CTA route 는 3서비스 공통이라 컴포넌트 내부 `useNavigate`(store-ui-core react-router-dom peer dep) 보유.

## 3. 검증

- **TypeScript 0 errors:** `store-ui-core` · `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society`(store-ui-core 소비처 — additive export, 무영향) **각 0**.
- **정적:**
  - GP/KCos wrapper = fetch + fetchDerivations + `<StoreProductionMaterialsView>` 만. 4소스 merge(`mergeProductionMaterials`) 인자 불변.
  - 공통 View 의 AssetRow/badge/원본보기 조건(material+pop / blog)/정렬(helper updatedAt DESC)/empty = **기존과 동일 마크업**(이동만).
  - **backend/API/route/DB/controller 변경 0.** KPA page 미변경(richer 자체 구현).
  - dedup: GP −194 / KCos −194 줄, 공통 View 1개 신설.
- **무변경:** 테이블/snapshot 구조 · QR/direct 소스 로직(선행 WO) · POP/QR/Blog 생성 · 편집기 · `/store-hub/*` 복사 · 회원 `/content` · AI.
- **browser smoke:** 미수행 — dev 서버·인증 guard. 마크업/로직 이동(behavior-preserving) + typecheck(4) 로 검증. **배포 후 권장:** GP/KCos `/store/library/production-materials` 렌더(header/CTA/목록/badge/원본보기/empty) + 4소스 표시 + 정렬 유지 확인.

## 4. 중단 기준 점검 (§7)

| 기준 | 해당 | 조치 |
|------|:---:|------|
| GP/KCos 차이 큼 | 아니오 | doc+derivations 경로만 차이 |
| props 과도 | 아니오 | 5 props(items/loading/error/onRefresh/fetchDerivations) |
| KPA 까지 묶어야 함 | 아니오 | KPA 미접촉(richer 별도) |
| 회귀 위험 큼 | 낮음 | 마크업 이동(behavior-preserving), typecheck 통과 |
| 타 세션 충돌 | 아니오 | path-specific |

→ 추출 진행 적합. 보류 불요.

## 5. 완료 판정

**PASS.** GP/KCos production-materials UI 를 `StoreProductionMaterialsView`(store-ui-core)로 추출, wrapper 는 fetch+derivations 경로만 보유. 기존 4소스 표시·동작 보존, KPA·backend·DB·route 무변경, typecheck(4) 통과. dedup −388줄.

## 6. 후속

1. (배포 후) GP/KCos `/store/library/production-materials` smoke — 렌더·4소스·정렬·원본보기 확인.
2. (선택) **기능별 제작 정비(POP / QR-code / 블로그 / 상품 설명)** 축 진입 — 기반 정리 완료.

---

*Date: 2026-06-15 · 페이지 컴포넌트 추출 PASS · StoreProductionMaterialsView(store-ui-core) 추출 + GP/KCos thin wrapper(−388줄). 4소스 표시·동작 보존. KPA/backend/DB/route 무변경. typecheck(4) 0. 배포 후 smoke 권장.*
