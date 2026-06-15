# CHECK-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1

> **작업명:** WO-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1
> **유형:** 프론트 소스 연결 — GP/KCos `/store/library/production-materials` 에 QR/direct 소스 추가. backend/route/DB **무변경**.
> **결과: PASS — GP/KCos 에 `getStoreQrCodes`/`getStoreDirectContents` client 추가, `mergeProductionMaterials({executionAssets, blogPosts, qrCodes, directContents})` 4소스 병합으로 KPA 표시 범위 정합. 기존 execution+blog 동작 유지. typecheck(GP/KCos) 0 errors.**
> 선행: `WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1`(helper) — 2026-06-15

---

## 1. 배경

선행 WO 에서 `mergeProductionMaterials`(store-ui-core)가 `qrCodes`/`directContents` 인자를 이미 지원. GP/KCos 는 backend 마운트됨이나 프론트 client 부재로 QR/direct 미연결. 본 WO 가 client 추가 + 연결.

## 2. backend/API 확인 (코드 변경 없음)

| 소스 | 엔드포인트(GP/KCos 마운트) | 응답 shape(KPA 동일 컨트롤러) |
|------|---------------------------|------------------------------|
| QR | `GET /{svc}/pharmacy/qr` (store-qr-landing, GP routes:404 / KCos:168) | `{ success, data: { items: StoreQrCode[], page, limit, total } }` |
| direct | `GET /{svc}/store-contents` (store-content.controller:67, GP:393 / KCos:157) | `{ success, data: [{ id, sourceType, snapshotId, title, updatedAt }] }` |

- 권한: QR=`requirePharmacyOwner`, direct=`requireAuth`+org resolve. 비owner/무org → 403 → client `.catch(()=>[])` graceful.
- **direct 는 source_type 전체 반환** → client 가 **`sourceType==='direct'` 필터**(KPA 동일 의미; snapshot_edit 제외).

## 3. 변경 (4 파일)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/api/storeProductionSources.ts` | **신규** — `getStoreQrCodes`(`/glycopharm/pharmacy/qr`→items), `getStoreDirectContents`(`/glycopharm/store-contents`→sourceType='direct' 필터). `api`(@/lib/apiClient) 사용 |
| `services/web-k-cosmetics/src/api/storeProductionSources.ts` | **신규** — 동(`/cosmetics/...`) |
| `services/web-glycopharm/.../StoreProductionMaterialsPage.tsx` | fetchAll: `Promise.all` 에 `getStoreQrCodes`/`getStoreDirectContents` 추가(각 `.catch(()=>[])`) → `mergeProductionMaterials({..., qrCodes, directContents})` |
| `services/web-k-cosmetics/.../StoreProductionMaterialsPage.tsx` | 동 |

- 신규 client 는 **기존 마운트 엔드포인트 재사용** — backend/route/DB/controller 무변경.
- 각 소스 독립 `.catch` → 한 소스 실패해도 나머지 표시(기존 패턴 유지). 정렬은 helper `updatedAt` DESC.
- merge 결과 kind: execution=`material`, blog=`blog`, qr=`qr`(badge "QR 코드"), direct=`direct`(badge "직접 작성"). AssetRow 의 `canViewSource` 는 material(pop)/blog 한정 → qr/direct 는 원본 보기 미노출(정상).

## 4. 검증

- **TypeScript 0 errors:** `web-glycopharm` · `web-k-cosmetics` (store-ui-core helper 기존). 
- **정적:**
  - QR client `res.data?.data?.items ?? res.data?.items ?? []` 방어적 파싱. direct client `sourceType==='direct'` 필터 + 배열 가드.
  - 기존 execution(assetsRes.data.items)+blog(blogRes.data) 주입 **불변** → 회귀 없음.
  - **backend/route/DB/migration/controller 변경 0.** KPA page 무변경. 전체 page 컴포넌트 추출 안 함.
- **무변경:** 테이블/snapshot 구조 · POP/QR/Blog 생성 기능 · 편집기 · `/store-hub/*` 복사 · 회원 `/content` · AI.
- **browser smoke:** 미수행 — dev 서버·인증 guard. client 는 type-safe + 각 소스 `.catch(()=>[])` graceful-degrade(엔드포인트 미동작 시에도 기존 execution+blog 표시 유지, 크래시 없음). **배포 후 권장:** GP/KCos `/store/library/production-materials` 에서 QR/direct 항목 표시 + 정렬(updatedAt DESC) + 기존 execution/blog 유지 확인.

## 5. 완료 판정

**PASS.** GP/KCos production-materials 목록에 QR/direct 소스 연결(신규 client + helper 주입). KPA 와 표시 범위 정합. 기존 동작 보존, backend/DB/route 무변경, typecheck 통과. graceful-degrade 로 엔드포인트 거동 불확실성 흡수(배포 후 smoke 권장).

## 6. 후속

1. (배포 후) GP/KCos `/store/library/production-materials` smoke — QR/direct 항목 표시 확인.
2. (선택) `WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1` — GP/KCos near-identical 전체 페이지(AssetRow/styles/CTA) 공통 컴포넌트 추출(browse WO 동형).
3. (선택) 기능별 제작 정비(POP/QR/블로그/상품설명) 축 진입.

---

*Date: 2026-06-15 · 프론트 소스 연결 PASS · GP/KCos QR/direct client 추가 + mergeProductionMaterials 4소스 병합. backend/route/DB 무변경, 기존 execution+blog 보존, typecheck 0. 배포 후 smoke 권장.*
