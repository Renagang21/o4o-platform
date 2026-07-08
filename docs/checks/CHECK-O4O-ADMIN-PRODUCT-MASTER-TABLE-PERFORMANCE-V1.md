# CHECK-O4O-ADMIN-PRODUCT-MASTER-TABLE-PERFORMANCE-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-ADMIN-PRODUCT-MASTER-TABLE-PERFORMANCE-V1`

Scope: admin.neture.co.kr `/admin/o4o-product-db/masters` 기본 상품 테이블 **체감 속도 개선**. 원칙 = "**목록은 가볍게, 상세는 따로, 다음 페이지만 미리**". 프론트 1파일 중심 + 백엔드 limit 캡 2줄.

---

## 1. 조사 — 현재 상태

| WO 목표 | 실제 |
| --- | --- |
| ① 목록 API 경량화 | **응답은 이미 경량** — `GET /neture/products/library/search` 는 테이블 필드만 반환(id/barcode/name/regulatoryName/manufacturerName/specification/category/brand/primaryImageUrl). 긴 설명·rawPayload·검토데이터 없음. (DB 쿼리는 category/brand만 join, 무거운 relation eager 없음 → 트리밍 이득 미미·shared 서비스라 미변경) |
| ② 상세 조회 분리 | **이미 분리** — 행 클릭 = `navigate(masterId)` → 상세 페이지가 `/products/library/:id` 개별 조회. 목록 재조회 없음 |
| ③ 다음 페이지 prefetch | **없었음** → 신규 |
| ④ 페이지 크기 20/50/100 | 없었음(고정 20) + 서버 캡 50 → 신규 + 캡 상향 |
| ⑤ 검색 debounce | 없었음(제출 전용) → debounce + 버튼 병행 |
| ⑥ 로딩 UX | 단순 "불러오는 중" → skeleton + keep-prev + 비블로킹 |

---

## 2. 구현

### 백엔드 (limit 캡 50→100, 2줄) — 100 페이지 옵션 지원
- `product-library.controller.ts` `Math.min(Number(limit), 50)` → `100`.
- `catalog.service.ts searchProductMasters` `Math.min(limit, 50)` → `100`.
- 소비처 2곳(admin library search + store product search). store 프론트는 limit≤20 전송 → 동작 불변. **응답 형태·쿼리·스키마 무변경.**

### 프론트 (`ProductMastersPage.tsx`) — 핵심
| 기능 | 구현 |
| --- | --- |
| **페이지 크기** | 20/50/100 select, **기본 50**. URL(`limit`) sync. 변경 시 page=1 + 캐시 초기화 |
| **검색** | 입력 **debounce 400ms** 자동 적용 + **검색 버튼 즉시 실행**. 변경 시 page=1 + 선택/캐시 초기화 |
| **prefetch** | 현재 페이지 로드 후 **다음 1~2 페이지를 백그라운드 선로딩**(fire-and-forget) → 페이지 캐시(`Map`, key=`q\|limit\|page`) |
| **페이지 캐시** | 캐시 히트 시 **즉시 표시(로딩 없음)**. q/limit 변경 시 `cache.clear()` |
| **로딩 UX** | 최초 = **skeleton**(TableSkeleton, 자리만 확보). 페이지 이동 = **기존 데이터 유지(soft)** + 상단 얇은 로딩바(비블로킹). prefetch는 화면 blocking 없음 |
| **stale 방지** | `reqIdRef` 로 최신 요청만 state 반영(빠른 연속 이동 대비) |
| 유지 | BaseTable + `_select` 체크박스 + ActionBar + RowActionMenu(상세) + columnVisibility + URL sync(q/page/limit). 상세=행 클릭 navigate(목록 재조회 없음) |
| pagination footer | `n–m / total건 · page / totalPages` 범위 표기 + 이전/다음(캐시로 즉시) |

---

## 3. 제외 (WO 준수)

- 전체 198,000건 대량 로딩 없음(페이지당 최대 100).
- 목록 응답에 상세/설명/rawPayload 추가 없음(이미 경량 유지).
- bulk write / 정렬(서버 sort 파라미터 부재) — 별도 WO.

---

## 4. 검증

| 항목 | 결과 |
| --- | --- |
| admin-dashboard typecheck | **에러 0** |
| api-server typecheck | **에러 0**(변경 2파일, 잔여는 병렬 drug-otc scripts=build 제외) |
| admin build / api build | **EXIT 0** (ProductMastersPage 청크 정상, api tsc 정상) |
| 변경 | 프론트 1(ProductMastersPage) + 백엔드 2(limit 캡). 응답 형태/스키마 무변경 |
| DB write | **0** (GET-only) |
| 프로덕션 smoke | **PASS** (admin.neture.co.kr, 2026-07-08, 서철환 admin, API+Admin 배포 성공) |

**smoke 상세 (PASS):**
- 진입: 페이지 크기 **기본 50**(옵션 20/50/100), 푸터 **"1–50 / 198,389건 · 1 / 3968 페이지"** 범위 표기.
- **다음 페이지 즉시 이동**: `?page=2`, "51–100 / … · 2 / 3968" — prefetch 캐시로 지연 없이 전환(이전 버튼 활성).
- **페이지 크기 100**(백엔드 캡 50→100 검증): `?limit=100`, "1–100 / … · 1 / **1984** 페이지" — 100건/페이지 서버 반영(캡 50이면 불가). limit 변경 시 page=1 리셋.
- 상세는 행 클릭 navigate(구조 유지, 목록 재조회 없음). Console 신규 에러 없음(초기 401은 앱 공통 인증, 무관).

---

## 5. 완료 기준 대비

| 기준 | 상태 |
| --- | --- |
| 최초 진입 속도 개선 | ✅ skeleton + 경량 응답 유지 |
| 다음 페이지 이동 체감 지연 감소 | ✅ prefetch(1~2) + 캐시 즉시 표시 |
| 상세 클릭 시 목록 전체 reload 없음 | ✅ 기존 분리 유지(navigate) |
| 검색/필터 변경 시 캐시 초기화 | ✅ q/limit 변경 시 clear |
| typecheck/build | ✅ |
| CHECK / smoke | ✅ (3c4e56ce6, API+Admin 배포 성공, smoke PASS) |
