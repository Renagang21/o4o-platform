# CHECK-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1

> 작업: **KPA 콘텐츠 태그 필드·표시 기반 마련 (저장/표시 — 검색/필터는 후속 WO)**
> 대상: `/store/library/contents` 통합 feed 3 source + direct content 작성/편집
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · migration 적용 · 배포 `efdf36125` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

store-side 콘텐츠 3 source에 `tags`(jsonb string[]) 저장·반환·표시 기반을 마련. **태그 검색/필터·GIN index·출처 탭은 본 WO 범위 외**(후속 `WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1`).

### Migration (CI/CD 자동 적용)
`apps/api-server/src/database/migrations/20261126000000-AddTagsToStoreContentSources.ts`
- `kpa_store_contents`, `o4o_asset_snapshots`, `store_execution_assets` 에 `tags jsonb NOT NULL DEFAULT '[]'::jsonb` 추가.
- **GIN index 보류**: 트랜잭션 migration이라 `CREATE INDEX CONCURRENTLY` 불가 → 검색 구현 시 후속 WO에서 추가.

### Entity
- `KpaStoreContent.tags`, `StoreExecutionAsset.tags` 추가. (asset-snapshot 엔티티는 shared package이고 feed가 raw SQL이라 미변경 — DB 컬럼만 추가.)

### Backend
- `store-content.controller.ts`: `normalizeTags`(문자열 배열, trim, 빈값/중복 제거, 30자·20개 제한). POST `/store-contents`(direct) + PUT `/store-contents/direct/:id` tags 수용(미전송 시 보존)·응답 포함. GET `/direct/:id` 응답 tags 포함.
- `store-library-feed.controller.ts`: UNION 3 branch tags 반환 — direct/exec=`COALESCE(tags 컬럼,'[]')`, **snapshot=`COALESCE(NULLIF(tags컬럼,'[]'), content_json->'tags', '[]')`**(기존 snapshot 태그는 resolver가 content_json에 복사 → fallback). 응답 string[] 정규화.

### Frontend
- 공용 `components/store/TagInput.tsx`(chip, Enter/쉼표 추가, Backspace 제거, paste 분해, 정규화).
- `CreateContentFromResourcesModal`: compose 단계 태그 입력 + POST payload `tags`.
- `StoreDirectContentPage`: 편집 시 TagInput, 보기 시 chip, update payload `tags`.
- `StoreContentsSelector`: 목록 제목 셀 태그 chip(최대 5 + N, **클릭 필터 없음**).
- `assetSnapshot.ts`: DirectContentItem/LibraryContentItem/`directContentApi.update` tags 타입.

## 2. 제외 범위 (후속 WO)
태그 검색·태그 필터 UI·태그 클릭 필터·출처 탭 개편·GIN index·운영자 콘텐츠 editor 수정. QR/POP 제작 흐름·제작자료 메뉴·AI 무변경.

## 3. 검증 — 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `efdf36125`)

| 검증 | 결과 |
|------|------|
| **migration**: 3 테이블 `tags` jsonb DEFAULT '[]', `typeorm_migrations` 기록 | ✅ (DB 확인) |
| 기존 목록 회귀: 8건, snapshot/direct/execution-asset 유지, 무태그 콘텐츠 정상 | ✅ |
| **신규 direct 콘텐츠 태그 저장**: 콘텐츠 제작 → 빈 편집기 → 제목+태그(간 건강/면역/스모크태그)+본문 → 저장 | ✅ 저장 후 상세 chip 3개 |
| 목록 태그 chip 표시(신규 콘텐츠) | ✅ 간 건강/면역/스모크태그/추가태그 |
| **편집 태그 로드·수정**: 수정 → TagInput에 기존 태그 로드 → "추가태그" 추가 → 저장 | ✅ chip 4개 반영 |
| 기존 **snapshot 태그** content_json fallback 표시(해양 심층수 효능 → 해양심층수/미네락) | ✅ |
| **검색 회귀**: `OMEGA`→역노화(본문) | ✅ 1건 |
| **태그 미검색 확인**: `스모크태그`(태그 전용, 제목/본문 없음) → 0건 | ✅ (검색은 후속 WO) |
| **QR 회귀**: `/qr/3`(역노화) 본문 정상 렌더 | ✅ |
| 테스트 데이터 정리(태그 스모크 250626 삭제) | ✅ 8건 복귀 |

> **태그 chip 표시와 저장은 구현됨. 태그 검색/필터는 후속 WO 범위.**

## 4. 검증 기타
- `web-kpa-society` / `api-server` tsc --noEmit 오류 0.
- API + Web Cloud Run 배포 success. migration CI/CD 자동 적용.

## 5. 범위/안전
- **KPA endpoint 한정**(`/store-contents`, `/store-library/contents` = `kpa.routes.ts` mount). `store_execution_assets`/`o4o_asset_snapshots` 컬럼은 service-neutral이나 default '[]'로 GP/KCos row 무영향(읽기/표시 변경 없음).
- 운영자 콘텐츠 `kpa_contents` editor 무변경. 기존 QR 공개 URL·execution-asset legacy target 무변경. 데이터 삭제/이동 0(컬럼 추가만).

---

## 6. 최종 판정

> store-side 3 source에 tags 저장 기반이 생기고, direct 콘텐츠에 태그를 입력·저장·편집할 수 있으며, `/store/library/contents` 목록·상세에 태그 chip이 표시된다. 기존 콘텐츠(무태그)·본문 검색·QR이 회귀하지 않는다. 태그 검색/필터는 후속 WO로 분리.

→ **충족.** 다음: `WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1`(검색창 태그 포함 + chip 클릭 필터 + GIN index + 출처 탭).
