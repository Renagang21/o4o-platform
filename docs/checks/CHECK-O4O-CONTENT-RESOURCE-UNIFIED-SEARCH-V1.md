# CHECK-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1

Status: DONE — 코드 완료 + api/admin typecheck EXIT0 + 배포 + 프로덕션 브라우저 smoke PASS (2026-07-09)
WO: `WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1`

> media_assets 를 Metadata 기반으로 검색/필터. 기존 list API 확장(신규 엔드포인트 없음) + admin 검색바. **검색이 파일명(uuid/original_name)을 제외하고 metadata만 대상**임을 프로덕션 브라우저로 확증.

---

## 1. §12 인덱스 조사 (착수 전, read-only)

media_assets 기존 인덱스(마이그레이션/엔티티): `uploaded_by` · `asset_type` · `created_at DESC` · `service_key` · `folder`.
- **type 필터(asset_type)와 정렬(created_at DESC)은 기존 인덱스로 커버.**
- language/source/status/usage_type/tags/title 인덱스 **없음**.
- **판정: 신규 인덱스 미생성.** 테이블 31행(프로덕션) 소규모 → 인덱스 불필요. WO §12 "무조건 만들지 않음" 준수.
- 향후 권장(볼륨 증가 시): btree(language/source/status/usage_type), GIN pg_trgm(title/description ILIKE), GIN(tags @>). 이번 WO 범위 아님.

## 2. 구현 — 백엔드 (기존 list API 확장, additive)

`MediaLibraryService.list()` + `GET /platform/media-library` 확장(신규 엔드포인트 없음):
- **q**: `title/description/memo ILIKE` + `keywords::text/tags::text ILIKE`(jsonb→text). (§9)
- **정확 필터(AND)**: `language` / `source` / `usage_type` / `status` = equality.
- **type**: asset_type 필터(`type`/`assetType` alias).
- **URL/파일 속성 제외(§5.5)**: url/gcs_path/file_name/original_name 은 검색 대상 아님.
- 정렬 `created_at DESC`·pagination(limit 100) 기존 유지. `is_library_public=true` 유지.

## 3. 구현 — Admin UI (기존 목록 유지)

`MediaAssetsPage` 에 검색/필터 바 추가: 검색창(+검색 버튼/Enter) · Type/Language/Source select · UsageType/Status input · **초기화**. select onChange 즉시 재조회, 검색어는 버튼/Enter. `media-library.api.ts` `listMediaAssets` 에 q/type/language/source/usageType/status 파라미터 + `MediaAssetSearchParams` 타입.

## 4. 검색 정책 (§13)

모든 조건 **AND**. 예: type=image AND language=ko AND q ILIKE '%검증%' → 모두 만족.

## 5. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| api-server typecheck (media 변경) | **에러 0** (잔여는 병렬 drug-otc scripts, build 제외) |
| admin-dashboard typecheck | **EXIT 0** |
| Deploy API Server | **✓ success** |
| Deploy Admin Dashboard | **✓ success** |

## 6. 프로덕션 브라우저 smoke — PASS

admin.neture.co.kr, 2026-07-09, admin(sohae2100). `/content-resource/media-assets`:
1. 검색/필터 바 렌더 ✓ (검색창·Type/Language/Source select·UsageType/Status·초기화)
2. **q="검증" → 총 31→1건** ✓ — 결과 = title/tag 에 "검증" 있는 자산 1건. **파일명에 "검증"이 있는 문서([검증] derivation POP.pdf·[검증용] 저장 POP.pdf)는 매칭 안 됨** → **metadata-only 검색 확증(§5.5 파일명 검색 금지)**
3. **초기화 → 총 31건** 복원 ✓
4. **language=ko 필터 → 총 1건** ✓ (select onChange 즉시 재조회, AND equality)
5. 정렬(createdAt DESC)·pagination(limit 100)·기존 목록/메타편집 유지 ✓
6. **Console 에러 0**. 스크린샷 `wo-unified-search-filter.png`

## 7. 이번 WO에서 하지 않은 것 (§14 준수)

AI/Semantic/Vector/OCR/Image/Duplicate 검색 없음. Cross-Resource(Template/ExecutionAsset/SharedProductDescription) 검색 없음 — media_assets 한정. 신규 엔드포인트·신규 pagination 없음.

## 8. 변경 파일 / 커밋

- `apps/api-server/src/modules/media/services/media-library.service.ts` · `controllers/media-library.controller.ts`
- `apps/admin-dashboard/src/api/media-library.api.ts` · `pages/content-resource/MediaAssetsPage.tsx`
- 커밋 `cffe64017` (path-restricted, 4파일)

## 9. 완료 기준 대비 (WO §16)

| 기준 | 상태 |
|---|---|
| Metadata 검색 가능 | ✅ q(title/desc/memo/keywords/tags) browser PASS |
| Filter 동작 | ✅ type/language/source/usageType/status AND (browser PASS) |
| Pagination 유지 | ✅ limit 100·createdAt DESC 무변경 |
| 기존 기능 회귀 없음 | ✅ 목록/메타편집/업로드/삭제/folder 무변경 |
| typecheck/build | ✅ |
| 배포/브라우저 smoke | ✅ |
| CHECK/commit·push | ✅ 본 문서 |

---

*Status: DONE. media_assets Metadata 검색/필터 프로덕션 PASS. Cross-Resource 통합검색·인덱스(볼륨 증가 시)는 후속.*
