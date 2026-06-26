# CHECK-O4O-KPA-CONTENT-LIST-SEARCH-BODY-SUMMARY-V1

> 작업: **KPA 콘텐츠 목록 검색 범위 확장 1단계 (제목 → 제목+본문/요약)**
> 대상: `/store/library/contents` (`store-library-feed.controller` + `StoreContentsSelector`)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `4d5f942be` · DB+운영 브라우저 smoke PASS**

---

## 1. 변경 요약

`/store/library/contents` 통합 feed 검색을 **제목 ILIKE만** → **제목 + 본문/요약**으로 확장.

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../store-library-feed.controller.ts` | data/count 쿼리의 검색 절을 branch별로 확장. 동일 바인딩($4 data / $2 count)을 여러 컬럼에 OR. |
| `services/web-kpa-society/.../StoreContentsSelector.tsx` | 문서형 검색 placeholder `제목 검색` → `제목·요약·본문 검색`. (검색 전달 배선·로직 무변경) |

### 검색 대상 확장 범위 (실제 스키마 기준)

| origin | 테이블 | 검색 컬럼 |
|--------|-------|----------|
| snapshot | o4o_asset_snapshots | `title` + `content_json::text` |
| direct | kpa_store_contents | `title` + `content_json::text` |
| execution-asset | store_execution_assets | `title` + `description` + `html_content` + `category` |

- 바인딩 파라미터에 검색어 전달 → **문자열 보간 없음(SQL injection 안전)**. 기존 ILIKE 방식 유지.
- raw HTML/JSON text 검색은 1차 허용(데이터 소규모: source별 ≤5건, IR §11 count 근거).

## 2. 제외한 범위 (다음 WO)

`tags` 컬럼 추가 / tags jsonb migration / GIN index / 태그 입력 UX / 태그 chip / 출처 탭 개편 / QR·POP 바로 만들기 / 제작자료 메뉴 숨김 / AI 버튼 제거. **migration 없음.**

## 3. 검증 — 검색어 / 결과

운영 데이터(테스트 약국, org 9c87f46b) 기준. **본문에만 있고 제목엔 없는 단어**로 origin별 본문 검색 입증.

| 검색어 | 기대 | DB 검증 | 운영 브라우저(UI) |
|--------|------|:--:|:--:|
| (없음) | 8건(direct 4 + exec 3 + snapshot 1), 배지 유지 | — | ✅ 8건, placeholder "제목·요약·본문 검색" |
| `OMEGA` | exec html_content → 역노화 | ✅ 1 | ✅ 1건(역노화, 제작 자료) |
| `MSM` | direct content_json → 관절 세트 3 | ✅ 3 | ✅ 3건(관절 type3/type2/1) |
| `콜레스테롤` | snapshot content_json → 해양 심층수 | ✅ 1 | ✅ 1건(해양 심층수, 커뮤니티) |
| `면역`(免疫) | direct content_json → 프리미엄 간 건강 세트 | ✅ 1 | — |
| `미백` | exec title(회귀) | ✅ 1 | ✅ (기본 목록 표시) |
| `해양` | snapshot title(회귀) | ✅ 1 | ✅ (기본 목록 표시) |
| `wwwzzzqqq` | 무결과 | ✅ 0 | ✅ 0건 "검색 결과가 없습니다" |

> 한글 검색어 DB 검증은 UTF8 SQL 파일(`psql -f`)로 수행(bash `-c`는 Windows 코드페이지로 한글 깨짐 — 기능 문제 아님). UI에서는 정상 UTF8 전송으로 한글 본문 검색 PASS.

## 4. 기존 QR / 콘텐츠 목록 회귀

- 3 origin(snapshot/direct/execution-asset) 배지·열기 경로 유지 ✅
- exec 3건(미백/혈당/역노화) 콘텐츠 목록 노출 유지 ✅ (직전 WO A안)
- 기존 QR 공개 URL `/qr/3`(역노화) 본문 전체 정상 렌더(자산 무변경) ✅

## 5. 배포

- 커밋 `4d5f942be`(feat) + 본 CHECK. API + Web 양쪽 Cloud Run 배포 success.
- typecheck: `web-kpa-society` / `api-server` 모두 오류 0.

## 6. 범위/안전

- **KPA endpoint 한정**(`kpa.routes.ts:400` mount) → GP/KCos 무영향.
- DB migration·tags 컬럼 없음. QR/POP 제작 흐름·제작자료 메뉴·execution-asset legacy target 무변경. 기존 QR 공개 URL 비파손.

---

## 7. 최종 판정

> `/store/library/contents`에서 제목뿐 아니라 본문/요약(snapshot·direct content_json, exec html_content/description/category)까지 검색된다. 3 origin 모두 검색 대상에 포함되며 기존 목록·QR이 회귀하지 않는다. migration 없이 검색 범위만 확장.

→ **충족.** 다음 단계: 태그 컬럼/입력/검색 별도 WO.
