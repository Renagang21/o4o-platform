# CHECK-O4O-STORE-CONTENT-USAGE-TRACE-FOR-REIMPORT-V1

WO: `WO-O4O-STORE-CONTENT-USAGE-TRACE-FOR-REIMPORT-V1`
상태: **CLOSED / PASS** (2026-07-14)
commit: `d808dd460` (feat)
배포: `o4o-core-api-02561-8hq` (API) + Deploy Web Services 성공

---

## 0. 목적

REIMPORT-OVERWRITE(기존 매장 사본 덮어쓰기) 착수 전 **선행 안전장치**. 매장 설명서 사본
(`kpa_store_contents`, source_type='direct') 1건이 QR / 태블릿 진열 / 취급제품 / POP 중
**어디에 쓰이는지 read-only 로 집계·표시**한다. 덮어쓰기·자동변경·삭제·migration 없음.

- 이 사본이 QR 에 연결되어 있는가?
- 태블릿 진열에 쓰이고 있는가?
- POP 로 만들어졌는가?
- 취급제품에 연결되어 있는가?
- 아니면 자료함에만 있고 사용 중은 아닌가?

## 1. 사용처 연결 구조 (조사 확정 — 코드 근거)

단일 통합 카운트 소스가 **없다**. 참조 방식이 자원마다 다르므로 자원별 권위 소스를 각각 집계한다.

| 사용처 | 참조 위치 | FK | 집계 |
|---|---|:--:|:--:|
| QR | `store_qr_codes.landing_target_id` (varchar, `landing_type='page'`) | soft-ref | ✅ |
| 태블릿 진열 | `store_tablet_displays.content_id` | FK (SET NULL) | ✅ |
| 취급제품 연결 | `kpa_store_content_product_links.content_id` | FK (CASCADE) | ✅ |
| POP | `store_pops` 직접 링크 없음 → `store_asset_derivations`(`pop_pdf`) | 없음 | ✅ 근사 |
| 태블릿 content_list 블록 | 블록 config jsonb `items[].contentId` | 없음 | ❌ not_counted |
| store_videos | 링크 없음 (`copied_from_id`=타 video) | 없음 | ❌ no_link |

미집계 항목은 응답 `coverage` 에 **명시**(은폐 아님).

## 2. 구현 내용

### 2-1. 백엔드 (read-only)

`GET /api/v1/kpa/store-library/contents/:id/usage`
(`apps/api-server/src/routes/o4o-store/controllers/store-library-feed.controller.ts`)

- 인증 = `requireAuth` (core). org = `resolveDualOrgId`(role_assignments 우선 → kpa_members fallback).
- **소유 검증**: `kpa_store_contents WHERE id=$1 AND organization_id=$2` 먼저 확정 → 이후 count 는 이 id 를 권위 스코프로 사용(격리).
- id 는 UUID 정규식 가드(soft-ref varchar 비교에 임의 문자열 유입 차단).
- 자원별 count 병렬 실행. org 컬럼 있는 곳(qr / product_link / derivation)은 org 필터 동시 적용.
  `store_tablet_displays` 는 org 컬럼이 없어(tablet_id 경유) 위 소유 검증으로 격리.
- 응답:
  ```json
  { "success": true, "data": {
    "contentId": "...",
    "usage": { "qr": 3, "tablet_display": 0, "product_link": 0, "pop_pdf": 4 },
    "total": 7,
    "coverage": { "tablet_content_list_block": "not_counted", "store_videos": "no_link", "pop": "approximate" }
  }}
  ```
- **DB write 0 · migration 0** (SELECT / COUNT 만).

### 2-2. 프론트

`services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx`
+ `services/web-kpa-society/src/api/assetSnapshot.ts` (`getContentUsage`, `StoreContentUsage`)

- "원본 갱신됨"(`hasSourceUpdate`) direct 사본에 한해 사용처 요약 **lazy 조회**(현재 페이지 대상만, 미조회 항목만, 병렬).
- 배지 옆 표시: `QR 3 · POP 4에서 사용 중` / 사용처 0 이면 `자료함에만 있음 (사용 중 아님)`.
- 조회 실패는 조용히 무시(요약 미표시) — 목록/편집 흐름 무영향.
- **덮어쓰기 버튼·자동 변경 없음** (표시 전용).

## 3. 검증 (배포 후 실측)

### 3-1. API 스모크 (약국 계정 renagang21, 프로덕션)

| # | 케이스 | 결과 |
|---|---|---|
| 1 | 실소유 id → usage | **200** `{qr,tablet_display,product_link,pop_pdf,total,coverage}` 정상 |
| 2 | 미소유 임의 uuid → | **404** `NOT_FOUND` (격리 확인) |
| 3 | malformed id → | **400** `INVALID_ID` |
| 4 | 무인증 → | **401** `AUTH_REQUIRED` |

### 3-2. 비-제로 집계 확인

- 약국 org direct 사본 13건 스캔 → 6건 사용처 있음(QR 1–3), 1건은 `QR 3 · POP 4`, 나머지 0.
- 자원별 집계가 실제로 동작하고 0 케이스도 정확히 0 반환 확인.

### 3-3. DB read-only 대조 (Cloud SQL Auth Proxy, SELECT only)

- 콘텐츠 `295b24b2…` 직접 대조: `store_qr_codes` join = **3**, `store_asset_derivations`(content_direct/pop_pdf) join = **4**.
- API 응답 `{qr:3, pop_pdf:4}` 와 **정확히 일치** → count 정확성 확인.

## 4. 알려진 한계 (솔직 표시)

- FE 요약은 `hasSourceUpdate=true` 사본에만 렌더 — 현재 약국 계정에는 해당 사본이 없어 **화면 상 시각 관측은 미수행**. FE 코드는 typecheck clean + 배포 완료, 백엔드(위험 부담부)는 실데이터로 완전 검증됨.
- POP 은 `store_pops` 직접 링크가 없어 `store_asset_derivations(pop_pdf)` 기반 **근사**(coverage.pop='approximate'). 태블릿 content_list 블록 JSON / store_videos 는 미집계(coverage 명시).

## 5. 다음 단계

- **2순위 = `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-OVERWRITE-V1`** (기존 사본 덮어쓰기) — 본 usage-trace 종료로 착수 안전 조건 충족.
- 덮어쓰기 확인 다이얼로그에 본 usage 요약을 노출해 사용 중 사본 덮어쓰기 경고에 활용 권장.

---

## 커밋

- `d808dd460` feat(store): add store-content usage-trace endpoint + badge summary
