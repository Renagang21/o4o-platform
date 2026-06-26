# CHECK-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1

> 작업: **KPA 콘텐츠 목록 태그 검색/필터 + 출처 탭 UX 정비**
> 대상: `/store/library/contents` (feed controller + StoreContentsSelector)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `b95f131c4` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

선행(`TAG-FIELD-AND-DISPLAY`=태그 저장/표시, `SEARCH-BODY-SUMMARY`=본문 검색) 위에 **태그 검색 + 태그 chip 클릭 필터 + 출처 탭**을 추가. **migration 없음.**

### 태그 검색 (tags::text)
feed 각 branch 검색 절에 `tags::text ILIKE` 추가. snapshot은 content_json::text가 이미 태그를 포함하나 신규 `s.tags` 컬럼도 검색. direct=`d.tags::text`, exec=`e.tags::text`. 기존 제목/본문/요약 검색과 OR.

### 태그 정확 필터 (tag 파라미터)
`?tag=<태그>` → outer `tags @> $::jsonb` (jsonb array 포함). 검색어 `q`와 **AND** 결합. 바인딩 파라미터(JSON.stringify([tag]))로 injection 안전.

### 출처 탭 (source 파라미터)
`?source=operator|community|mine` → 각 branch `source_group` 계산 후 outer `WHERE source_group = $`. count 쿼리도 source_group/tags 출력해 동일 필터.

| 탭 | source | 매핑 |
|----|--------|------|
| 전체 | (없음) | 3 origin 전체 |
| 운영자 제공 | operator | snapshot `asset_type='cms'` |
| 커뮤니티 가져옴 | community | snapshot `asset_type='content'` |
| 내가 만든 콘텐츠 | mine | direct + execution-asset |

> **매핑 한계(기록)**: `kpa_contents`에 producer/author_role 컬럼이 없어, snapshot:content(콘텐츠 허브) 내부의 "운영자 작성 vs 커뮤니티 사용자 작성"을 더 세분화할 수 없음. 현재는 **asset_type 기준**(cms=운영자 제공 / content=커뮤니티 가져옴)으로 매핑. 정밀 분류는 `kpa_contents.author_role` migration이 선행되어야 함(후속).

### Frontend
- 출처 탭 4개(**page 모드 전용** — modal "제작 자료 선택"엔 미노출).
- 태그 chip 클릭 → 해당 태그 필터 적용(`stopPropagation`으로 행 선택/열기와 분리). 적용 태그 chip "태그: X ×"(해제). 검색어와 독립 유지.
- placeholder "제목·요약·본문 검색" → **"제목·요약·본문·태그 검색"**.
- `listContents` source/tag 파라미터.

### 파일
| 파일 | 변경 |
|------|------|
| `store-library-feed.controller.ts` | tags::text 검색 + source_group/source 필터 + tag(@>) 필터 + 동적 바인딩 인덱스. count 쿼리 정렬 |
| `assetSnapshot.ts` | `listContents` source/tag 파라미터 |
| `StoreContentsSelector.tsx` | 출처 탭, 태그 chip 클릭 필터, 적용 chip, placeholder |

## 2. 보류/후속
- **GIN index 보류(A안)**: 데이터 소규모(8건), 트랜잭션 migration이라 `CREATE INDEX CONCURRENTLY` 불가. 규모 확장 시 후속.
- **URL query sync 보류**: StoreContentsSelector를 modal도 공유 → URL 쓰기 시 모달 회귀 위험. 본 WO에서 과도 구현 지양(WO 지침 "최소 구현"). 후속 page-only sync 후보.
- 출처 정밀 분류(author_role) 후속.

## 3. 검증 — 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `b95f131c4`)

| 검증 | 결과 |
|------|------|
| 출처 탭 렌더(전체/운영자 제공/커뮤니티 가져옴/내가 만든 콘텐츠) + placeholder "…·태그 검색" | ✅ |
| 기본 목록 8건 회귀 | ✅ |
| **출처 탭**: 내가 만든 **7** / 커뮤니티 가져옴 **1** / 운영자 제공 **0** / 전체 **8** | ✅ |
| **태그 텍스트 검색** `미네락`(제목/본문 없음, 태그만) → 해양 심층수 | ✅ 1건 |
| **본문 검색 회귀** `OMEGA` → 역노화 | ✅ 1건 |
| **태그 chip 클릭 필터**: 해양심층수 chip → 1건 + 적용 chip "태그: 해양심층수 ×" | ✅ |
| **필터 해제(×)** → 8건 복귀, 적용 chip 제거 | ✅ |
| **검색어+태그 AND**: 태그 해양심층수 + `콜레스테롤`→1, + `OMEGA`→0 | ✅ |
| 기존 QR `/qr/3`(역노화) 본문 정상 렌더 | ✅ |

## 4. 검증 기타
- `api-server` / `web-kpa-society` tsc --noEmit 오류 0. API+Web 배포 success.

## 5. 범위/안전
- **KPA mount 전용**(`kpa.routes.ts`) → GP/KCos 무영향. migration 없음.
- QR/POP 제작 흐름·제작자료 메뉴·AI·운영자 콘텐츠 editor 무변경. 기존 QR target/공개 URL 무변경. 데이터 삭제/이동 0.
- 태그 chip 클릭은 `stopPropagation`으로 체크박스/행 클릭과 분리. modal(제작 자료 선택)은 출처 탭 미노출(page 게이트) → 모달 흐름 회귀 없음.

---

## 6. 최종 판정

> `/store/library/contents`에서 태그가 검색되고, 태그 chip 클릭으로 필터가 적용·해제되며, 검색어와 함께 AND로 동작한다. 출처 탭(전체/운영자 제공/커뮤니티 가져옴/내가 만든 콘텐츠)이 제공된다. 기존 제목/본문 검색·QR이 회귀하지 않는다.

→ **충족.** 출처 정밀 분류·GIN index·URL sync는 후속. 다음: 콘텐츠 선택 후 QR 만들기 모달 바로 호출.
