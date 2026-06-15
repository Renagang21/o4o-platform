# CHECK-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1

> **작업명:** WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1
> **유형:** 조회/merge 공통화 (부분) — `/store/library/production-materials` 정규화·병합 helper 추출. 테이블/DB/route/API **무변경**.
> **결과: PARTIAL PASS — GP/KCos 의 동일 정규화·병합 로직을 `@o4o/store-ui-core mergeProductionMaterials()` + 타입/라벨로 추출(behavior-preserving). QR/direct 소스 완성은 신규 client 필요·unsmokeable 로 보류(§5). KPA 미변경(richer). typecheck(4) 0 errors. GP/KCos 각 −80 줄.**
> 선행: `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1`(D) · `WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-V1` — 2026-06-15

---

## 1. 사전 조사 (조회/merge 구조)

| 서비스 | 페이지 | 병합 소스 | 비고 |
|--------|--------|----------|------|
| KPA | `pharmacy/StoreProductionMaterialsPage`(1039줄) | direct + executionAssets + qr + blog (4) | richer(삭제/bulk/derivation) |
| GP | `store-management/StoreProductionMaterialsPage`(273줄) | executionAssets + blog (2) | QR/direct 미구현 |
| KCos | `store/StoreProductionMaterialsPage`(273줄) | executionAssets + blog (2) | 동 |

- **GP ↔ KCos 페이지는 3줄(서비스명 doc 2 + `asset-derivations` 경로 `/glycopharm` vs `/cosmetics`) 외 byte-identical** — 정규화/병합/타입/라벨/AssetRow/styles 전부 중복.
- 병합 로직: 각 소스 `.catch→null`(부분 실패 안전) → `it→ProductionMaterialItem` 매핑 → `updatedAt` DESC 정렬. kind/usageType/assetType/status/derivedResultKind 태깅.

## 2. 적용 — 공통 helper 추출 (안전 핵심)

**신규** `packages/store-ui-core/src/utils/productionMaterials.ts` (순수 — API/JSX/서비스 의존 없음):
- `ProductionMaterialItem` / `ProductionMaterialKind`('material'|'blog'|'qr'|'direct') 타입.
- 라벨맵: `PRODUCTION_USAGE_LABELS` / `PRODUCTION_ASSET_TYPE_LABELS` / `PRODUCTION_KIND_BADGE` / `PRODUCTION_BLOG_STATUS_LABELS`.
- `mergeProductionMaterials({ executionAssets?, blogPosts?, qrCodes?, directContents? })` → 정규화 + `updatedAt` DESC 정렬. **각 소스 선택**(미주입 시 빈 배열) → QR/direct 미완성 GP/KCos 안전, 완성 시 인자만 추가.
- index.ts export.

**GP/KCos** 적용: 로컬 `ProductionMaterialItem`/`ResultKind`/4 라벨맵/inline 매핑·정렬 제거 → store-ui-core import + `mergeProductionMaterials({ executionAssets, blogPosts })`. AssetRow 라벨 참조 `PRODUCTION_*` 로 교체. **동작 동일**(execution+blog 매핑·정렬 불변).

> KPA 미변경 — 1039줄 richer 구현(삭제/bulk/sourceKind), 본 helper 와 shape 상이. 무리한 통합 시 props 과도(§중단 기준) → 제외.

## 3. 보류 — QR/direct 소스 완성 (§5, 중단 기준 적용)

| 소스 | backend(GP/KCos) | 프론트 client | 판단 |
|------|:---:|:---:|------|
| QR(`store_qr_codes`) | ✅ `/pharmacy/qr` GET 마운트(qr-landing, GP/KCos) | ❌ `getStoreQrCodes` 부재 | **보류** |
| direct(`kpa_store_contents`) | ✅ `/store-contents` 마운트(GP/KCos) | ❌ `directContentApi` 부재 | **보류** |

- backend 라우트는 GP/KCos 에 마운트됨 + 응답 shape 는 KPA 와 동일 컨트롤러(service-prefixed) → **완성 자체는 feasible**.
- 그러나 **GP/KCos 신규 client 생성**(getStoreQrCodes / directContentApi) + 새 item kind(qr/direct) UI 노출이 필요하며 **dev 서버/인증 guard 로 browser smoke 불가**. WO §5/§9: "client 부재·불확실 → 코드 변경 말고 보류".
- helper 는 `qrCodes`/`directContents` 인자를 **이미 지원** → 완성 WO 는 (1) 서비스별 client 추가 (2) `mergeProductionMaterials` 인자 추가 (3) 배포 후 smoke 만 하면 됨.

## 4. 검증

- **TypeScript 0 errors:** `store-ui-core` · `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society`(무영향) **각 0**.
- **정적:**
  - GP/KCos 로컬 `ProductionMaterialItem`/`ResultKind`/`USAGE_LABELS`/`KIND_BADGE` 등 **제거 0 잔존**(공통 import 로 대체).
  - `mergeProductionMaterials` 의 execution/blog 매핑·정렬 = GP/KCos 기존과 동일(behavior-preserving). qr/direct 는 additive(미주입).
  - **backend/API/route/DB/migration 변경 0.** KPA 미변경.
  - dedup: GP −80 / KCos −80 줄, 공통 helper 1개 신설(+export).
- **무변경:** 테이블/FK/snapshot 구조 · POP/QR/Blog 생성 · 편집기 · `/store-hub/*` 복사 · 회원 `/content` · AI.
- **browser smoke:** 미수행 — dev 서버·인증 guard. 매핑/정렬 불변(typecheck + 정적). 배포 후 GP/KCos `/store/library/production-materials` 목록(execution+blog) 정상 확인 권장.

## 5. 완료 판정

**PARTIAL PASS.** 조회/merge 정규화 공통화(`mergeProductionMaterials` + 타입/라벨) 완료 — GP/KCos 중복 −160줄, behavior-preserving. QR/direct 소스 완성은 신규 client·unsmokeable 로 보류(helper 는 완성 ready). KPA·backend·DB·route 무변경.

## 6. 후속

1. (선택) `WO-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1` — GP/KCos `getStoreQrCodes`/`directContentApi` client 추가 → `mergeProductionMaterials` 에 qr/direct 주입 + 배포 후 smoke. (backend·helper ready.)
2. (선택) `WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1` — GP/KCos near-identical 전체 페이지(AssetRow/styles/CTA 포함) 공통 컴포넌트 추출(stateful UI — smoke 동반). browse WO 동형.
3. (배포 후) GP/KCos `/store/library/production-materials` 목록 smoke.

---

*Date: 2026-06-15 · 조회/merge 공통화 PARTIAL PASS · mergeProductionMaterials helper(store-ui-core) 추출 + GP/KCos 적용(−160줄, behavior-preserving). QR/direct 완성·전체 page 추출 보류(unsmokeable). KPA/backend/DB/route 무변경. typecheck(4) 0.*
