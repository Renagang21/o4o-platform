# CHECK-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1

> WO: **WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1**
> 선행 IR: `docs/ir/IR-O4O-KPA-STORE-LIBRARY-CONTENT-ACTION-EDITABILITY-QR-SAFETY-V1.md`
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: `9d3711dd9`

## 작업 범위

KPA 매장 자료함 `/store/library/contents` 의 "매장 제작 자료"(origin='execution-asset', asset_type='content') 액션을 **열기 → 편집**으로 전환하고, 단건 편집기로 연결. 편집 저장은 같은 `store_execution_assets` row 를 update(id 불변) → 이 자산을 참조하는 QR(`library_item_id`)은 무변경.

- 포함: `origin='execution-asset'` (콘텐츠형). 피드가 `asset_type='content'` 로 필터하므로 이 목록의 execution-asset 은 모두 콘텐츠형.
- 제외: `origin='direct'`(이미 편집), `origin='snapshot'`(원본 kpa_contents 참조 → 후속 "복사해서 편집").

## 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../store-execution-assets.controller.ts` | `GET /store/assets/:id` 추가 (org 격리 read-only, 편집기 본문 로드용) |
| `services/web-kpa-society/src/App.tsx` | route `library/production-materials/:id/edit` 추가 |
| `.../pages/pharmacy/ProductionMaterialEditorPage.tsx` | 편집 모드(:id) 지원 — load(getStoreExecutionAsset) + save(updateStoreExecutionAsset, 같은 row) |
| `.../pages/pharmacy/StoreContentsSelector.tsx` | execution-asset href→`/edit`, 액션 라벨 열기→편집 |

## 액션 분기 변경

| origin | 변경 전 | 변경 후 |
|--------|--------|--------|
| direct | 편집 → `/store/content/direct/:id` | (유지) |
| execution-asset (content) | 열기 → production-materials 목록 | **편집 → `/store/library/production-materials/:id/edit`** |
| snapshot | 보기 → `/view/:id` | (유지) |

## QR 안전성 근거

- `store_qr_codes.library_item_id = store_execution_assets.id` (매장 사본 ID). DELETE 핸들러가 활성 QR 참조 시 삭제를 막는 것으로 코드 확증.
- 편집 = `PUT /store/assets/:id` → 같은 row update, id/organization_id/asset_type 보존 → QR 무영향.

## 운영 DB read-only 확인 (선행)

`library_item_id` 보유 QR 5건 전부 `store_execution_assets.id` 매칭(5/5), 4건 content / 1건 file(콘텐츠 피드 비노출).
편집 후 재확인: 대상 자산 `955581bf` 의 QR `slug=qr-1782366847019`, `landing_type=page`, `library_item_id=955581bf` **무변경**, `is_active=t`, JOIN asset_title 에 편집 마커 반영(updated_at 갱신) → **같은 row update + QR 무변경** 확정.

## 브라우저 smoke (kpa-society.co.kr, 테스트 약국 매장)

| Case | 내용 | 결과 |
|------|------|------|
| 1 | execution-asset 3건 액션 = **편집** + `/edit` 링크; snapshot = **보기** | ✅ PASS |
| 2 | 편집 진입 시 본문(htmlContent) 로드(GET /:id), 제목 수정→저장→**같은 id(955581bf)** 목록 반영, 새로고침 재로드 확인 | ✅ PASS |
| 3 | 공개 QR `/qr/qr-1782366847019` slug·library_item_id 무변경, 수정된 자산 콘텐츠 정상 렌더 | ✅ PASS |
| 4 | snapshot "해양 심층수 효능"(콘텐츠 허브) = **보기** 유지 | ✅ PASS |
| 5 | 비콘텐츠형(file/pop) execution-asset 은 피드 `asset_type='content'` 필터로 목록 비노출 → 편집 대상 아님(구조적) | ✅ PASS |

> smoke 마커(`[smoke0626]`)는 검증 후 제목 원복(동일 id) — 운영 데이터 정합 유지.

## 정적 검증

- `apps/api-server`: `tsc --noEmit` PASS
- `services/web-kpa-society`: `tsc --noEmit` PASS

## 후속

- snapshot 편집은 별도 `WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-COPY-BEFORE-EDIT-V1` (복사해서 편집 + QR 정책).
- GP/K-Cosmetics parity: 본 변경은 KPA mount(StoreContentsSelector)·공용 컨트롤러 기반. 컨트롤러 GET 은 3서비스 공통이나 액션 라벨/route 는 web-kpa-society 전용 → GP/KCos 무영향, parity 는 후속 후보.
