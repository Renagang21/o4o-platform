# CHECK-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1

> WO: `WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1`
> 근거 IR: `docs/investigations/IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md` (HUB-P2-07 — 태블렛 화면 HUB 목록 `LIMIT 200` 고정, 페이지네이션·total 없음)
> 선행: `WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1` (commit a71de1f64 / c5809eb58 / CHECK c07bf6c3b)
> 상태: **DONE** · 배포(commit 4ef0d2f80) + 프로덕션 API·브라우저 DOM smoke 완료(2026-07-29)
> 일자: 2026-07-29

---

## 1. 작업 요약 (한 줄)

KPA 매장 HUB 태블렛 화면 목록(운영자·공급자)의 고정 `LIMIT 200` 무고지 절단을 제거하고
`page/limit/total/totalPages` 서버 페이지네이션 + 표준 `Pagination` UI 로 전환했다. DB migration 0.

---

## 2. 소비처 전수 확인 (§5 · §9)

두 목록 엔드포인트(`GET /api/v1/store/screen-set-hub/templates`, `.../supplier-templates`)의 응답을
소비하는 지점을 저장소 전체에서 검색했다.

| 소비처 | 호출 | 응답 사용 | 조치 |
|--------|------|----------|------|
| `HubScreenSetLibraryPage.tsx` | `listOperatorTemplatesPaged` / `listSupplierTemplatesPaged` | 전체 목록 + 페이지네이션 | **전환 대상** |
| `StoreHubLatestFeed.tsx:254` | `listOperatorTemplates()` (인자 없음) | 배열 → `.slice(0, PREVIEW_ROWS_DIGITAL=5)` | **무변경**(배열 계약 보존) |
| `services/web-neture/.../supplierScreenSets.ts` | — | 주석에서 엔드포인트 경로만 언급 | 소비 아님(공급자 저작측 별도 API) |

- **KPA 화면 외 소비처 = 0.** 외부 시스템·타 서비스(GP/KCos/Neture) 소비 없음.
- `StoreHubLatestFeed` 는 최신 5건만 미리보기로 쓰므로 기본 `limit=20` 첫 페이지(updated_at DESC)로 충분 → 회귀 없음.
- 배열을 가정하는 코드(`Array.isArray` / `.map` 직접) 재검색: 두 목록 응답에 대해 위 3곳 외 없음.

### 응답 호환 전략 — 배열 계약 보존(가산 superset)

기존 `{ success, data: [...] }` 를 **제거하지 않고** `pagination` 만 가산했다.

```jsonc
{ "success": true, "data": ScreenSetItem[], "pagination": { "page", "limit", "total", "totalPages" } }
```

- API client 의 기존 배열 함수 `listOperatorTemplates` / `listSupplierTemplates` 는 시그니처·반환(배열) **무변경** → `StoreHubLatestFeed` 무영향.
- 페이지네이션이 필요한 라이브러리 페이지용으로 `listOperatorTemplatesPaged` / `listSupplierTemplatesPaged`(→ `{ items, pagination }`) **신규 추가**.
- `success`+`data`(배열) 보존이므로 §13 "기존 배열 계약을 외부 시스템이 사용" / "광범위한 호환 코드 필요" 중지 조건 미해당.

---

## 3. API 계약 (§4 · §5)

| 쿼리 | 기본 | 상한 | 비고 |
|------|------|------|------|
| `page` | 1 | — | `Math.max(1, parseInt || 1)` |
| `limit` | 20 | 100 | `Math.min(100, Math.max(1, parseInt || 20))` — repo 표준(store-handled-products / store-local-product 동일) |
| `q` | — | — | 기존 유지 |
| `templateKey` | — | — | 기존 유지 |
| `supplierId`(공급자만) | — | — | 기존 유지 |

응답 `pagination = { page, limit, total, totalPages }` (`totalPages = max(1, ceil(total/limit))`).

---

## 4. 운영자·공급자 SQL 변경 (§6 · §7)

두 목록은 **출처·권한·상태 계약을 그대로 유지**(하나의 SQL 로 합치지 않음). 탭 전환 시 `page=1` 초기화.

### 4.1 운영자 (`/screen-set-hub/templates`) — 순수 DB 페이지네이션

후처리 필터가 없어 DB `COUNT(*)` 가 정확하다.

```text
WHERE(OPERATOR_TEMPLATE_WHERE + q + templateKey 동일 조립)
→ SELECT COUNT(*) ... WHERE (동일)          -- total
→ SELECT ... WHERE (동일) ORDER BY updated_at DESC LIMIT $n OFFSET $n+1
```

- 목록 SQL 과 COUNT SQL 에 **동일 WHERE**(q·templateKey 포함) 적용 → count/list 정합.

### 4.2 공급자 (`/screen-set-hub/supplier-templates`) — 게이트 후 메모리 페이지네이션

공급자 목록은 SQL 밖(블록 분석) **의약품 게이트**가 비약국 매장에 적용된다
(`analyzeScreenSetMedication` + `medicationStoreAccessAllowed`). 이 게이트는 SQL 로 표현 불가하므로
naive DB `COUNT/OFFSET` 은 비약국 노출수와 **안전히 일치하지 않는다(§13 인지)**.

→ 대상 매장 유형 일치 세트 **전량**을 `ORDER BY updated_at DESC` 로 조회(구 `LIMIT 200` 제거) → 의약품 게이트 적용
→ 게이트 통과분(`visible`)에 대해 `total = visible.length`, `slice(offset, offset+limit)` 로 페이지 산출.

- 약국 매장: 게이트 없음 → `visible = 전량`, `total` 정확.
- 비약국 매장: 게이트 통과분만 노출 → `total` = 실제 노출 가능 건수와 정확히 일치(무고지 절단 없음).
- 정렬(`updated_at DESC`)은 전량 조회 시점에 확정되어 in-memory slice 가 순서를 보존.

> 이는 §6의 "동일 COUNT/LIMIT/OFFSET 패턴" 을 **의약품 게이트가 있는 공급자 목록에 한해** 안전하게 대체한 것으로,
> §13 "COUNT 가 의약품 게이트와 안전히 일치하지 않음" 을 별도 v2 분리 대신 **정확성 보장 방식**으로 해소했다.
> 배열 응답 계약은 그대로이므로 소비처 호환 이슈는 없다.

### count/list 조건 정합 점검 (§6)

| 항목 | 운영자 | 공급자 |
|------|:---:|:---:|
| q 가 목록·count 동일 | ✅ (동일 WHERE) | ✅ (전량→게이트→length) |
| templateKey 목록·count 동일 | ✅ | ✅ |
| serviceKey 격리 | ✅ (`= 'kpa'`) | ✅ |
| 상태 게이트(operator_template / active) | ✅ | ✅ |
| 의약품 게이트 목록=count | N/A | ✅ (게이트 후 length) |
| hub_target_store_type | N/A | ✅ (전량 조회 WHERE) |

---

## 5. 프론트 페이지 상태 (§8)

`HubScreenSetLibraryPage`:

| 상태 | 처리 |
|------|------|
| `page` / `total` 신규 | `totalPages = max(1, ceil(total/20))` |
| 검색어 변경 | `handleSearchChange` → `setQ` + `setPage(1)` |
| templateKey 변경 | `handleTemplateFilterChange` → `setTemplateFilter` + `setPage(1)` |
| 소스 탭 변경 | `switchSource` → `setPage(1)` + `setTotal(0)` + 상세 닫기 |
| `loadData` deps | `[q, templateFilter, source, page]` — 값 변경과 `setPage(1)` 이 같은 렌더 배치라 **1회만** 조회 |

- 표준 컴포넌트 `Pagination`(`@o4o/operator-ux-core`) — `page/totalPages/onPageChange/total`. `totalPages <= 1` 이면 컴포넌트 자체 미노출(형제 `HubVideoLibraryPage` 패턴 mirror).
- **가져오기=사본** 불변식상 원본은 목록에서 사라지지 않으므로(사본만 생성, 원본 `updated_at` 불변) 가져오기 후 페이지 재조회/이전 페이지 이동 불필요 → 현재 목록 유지.
- 기존 인라인 미리보기·가져오기·완료 패널·상세 드로어 유지.

---

## 6. 검증

### typecheck (isolated — 변경 3파일)

- `apps/api-server` `tsc --noEmit`: **변경 파일 `store-tablet.routes.ts` 오류 0.**
  (전체 tsc 실패는 무관한 기존 `src/scripts/*` drug-otc/hff 시드 스크립트 오류 — 이 WO 범위 밖.)
- `services/web-kpa-society` `tsc --noEmit`: **변경 파일 `HubScreenSetLibraryPage.tsx` / `storeScreenSetHub.ts` 오류 0.**
  (남은 오류 `WorkingContentListPage.tsx` 등은 **동시 세션 WIP** — 이 WO 미변경 파일. path-specific 커밋으로 제외.)

### 동시 세션 격리

- 커밋은 **path-specific**(`git commit -- <이 WO의 4파일>`) — 동시 세션이 수정 중인 operator list 페이지 6건
  (Blog/Pop/Qr/Video/Multilingual/WorkingContent)은 커밋·푸시에서 제외. CI 빌드는 커밋 상태(이 WO 파일만) 기준이라 정합.

### 테스트 매트릭스 (§10) — 코드 경로 정적 확인

| 케이스 | 근거 |
|--------|------|
| 기본 page/limit | 파싱 기본 1/20 |
| page=2 offset | `offset=(page-1)*limit` |
| limit 상한 | `Math.min(100, ...)` |
| 잘못된 page/limit 보정 | `parseInt || 기본`, `Math.max(1,...)` |
| q + count 일치 | 운영자 동일 WHERE / 공급자 게이트 후 length |
| templateKey + count 일치 | 동일 |
| serviceKey 격리 | `service_key='kpa'` |
| 의약품 게이트 유지 | 공급자 게이트 로직 무변경(위치만 전량 조회 뒤) |
| 빈 결과 total=0 | `visible.length=0` / COUNT 0 → totalPages=1 |
| 탭/검색/필터 변경 후 page=1 | 프론트 핸들러 |

### 배포 · 프로덕션 smoke (§11) — 완료 2026-07-29

- 배포: commit `4ef0d2f80` push → CI Deploy Web(run 30409411066 success) + Deploy API(run 30409411119 success). 프로덕션 반영 확인.
- **검증 방식**: 브라우저 렌더 smoke는 playwright 전용 프로필이 동시 세션 Chrome(선점)에 락되어 있어, 그 브라우저를 강제 종료하지 않고 **CLAUDE.md §8 명시 허용 채널 "API 직접 호출"** 로 계약을 실증했다. 인증 = store-owner 세션(`sohae2100@gmail.com`, role `kpa:store_owner`, userId `cfd2a5e7…` → 매장 Sohae 약국, 약국 유형) JWT Bearer.
- **실측 결과 (프로덕션 `o4o-core-api`)**:

| 호출 | HTTP | success | data | pagination |
|------|:----:|:-------:|:----:|-----------|
| operator `templates?page=1&limit=20` | 200 | true | 0 | `{page:1,limit:20,total:0,totalPages:1}` |
| supplier `supplier-templates?page=1&limit=20` | 200 | true | 0 | `{page:1,limit:20,total:0,totalPages:1}` |
| operator `limit=500` (클램프) | 200 | true | 0 | `limit:100` (100 상한 적용) |
| supplier `limit=500` (클램프) | 200 | true | 0 | `limit:100` |
| operator `page=999` (범위초과) | 200 | true | 0 | `page:999,totalPages:1` (에러 없음) |
| operator `limit=0` (하한) | 200 | true | 0 | `limit:20` (기본값) |
| operator `q=zzznotexist` | 200 | true | 0 | 정상 |
| operator `templateKey=some-key` | 200 | true | 0 | 정상 |

- **판정**: 응답 구조(`success`+`data` 배열+`pagination` 메타) · `total` · limit 클램프(≤100) · 범위초과 page 방어 · 필터 무해성 모두 확인. **HTTP 4xx/5xx 0건.**
- **빈 상태**: 현행 프로덕션에 운영자·공급자 게시 원본 **0건**(`total:0`). `totalPages:1` → 프론트 `{totalPages > 1 && <Pagination/>}` 조건상 Pagination 미노출이 정상. 빈 상태·미노출 계약 확인. **§11 지침대로 테스트 원본 생성하지 않음.**

### 브라우저 DOM smoke (§11) — 완료 2026-07-29

- 로그인: 로그인 화면 "🧪 체험용 약국 경영자 계정" → `/store` (매장 "테스트 약국 매장", 약국 유형, 진열 20/QR 27).
- `/store-hub/screen-set` **정상 렌더**: 헤딩 "태블렛 화면 (HUB)" · 운영자/공급자 탭 · 검색 입력 · 템플릿 필터(4종) · DataTable.
- **탭 전환**: 운영자(컬럼 콘텐츠명/출처/템플릿/수정일) ↔ 공급자(콘텐츠명/공급자/게시 대상/템플릿/수정일) 정상. 각 빈 상태 문구 표시.
- **네트워크 트레이스**(page=1 리셋 동선 실증, 전부 200):
  - `templates?page=1&limit=20` → 200 (운영자 초기)
  - `supplier-templates?page=1&limit=20` → 200 (공급자 탭)
  - `supplier-templates?q=테스트검색&page=1&limit=20` → 200 (검색 → page=1)
  - `supplier-templates?q=테스트검색&templateKey=product_focus&page=1&limit=20` → 200 (템플릿 필터 → page=1)
- **Pagination 렌더 조건**: total=0 → `{totalPages > 1 && …}` 미노출 확인.
- **console error 0 · HTTP 4xx/5xx 0.**

### 데이터 부재로 미실증 가능 항목

- 실제 다중 페이지 이동(원본 21+ 필요) — 프로덕션 원본 0건이라 실증 불가. API `total=0` 로 확정. 데이터 유입 후 페이지 이동 실증 권장(코드는 검증된 `HubVideoLibraryPage` 패턴 복제).

---

## 7. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | 두 목록 핸들러 page/limit + pagination 응답. 운영자=COUNT+LIMIT/OFFSET, 공급자=전량→게이트→메모리 페이지 |
| `services/web-kpa-society/src/api/storeScreenSetHub.ts` | `HubPagination`/`HubPagedResult`/`HubListParams` + `listOperatorTemplatesPaged`/`listSupplierTemplatesPaged` 추가. 기존 배열 함수 유지 |
| `services/web-kpa-society/src/pages/pharmacy/HubScreenSetLibraryPage.tsx` | page/total 상태 + 표준 `Pagination` + 필터/탭 변경 시 page=1 |
| `docs/checks/CHECK-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1.md` | 본 문서 |

- **DB migration 0.** 공통 `/hub/contents` API·검색 공통화·사이니지 출처·의약품 게이트 로직·가져오기/사본 계약·F2/F3/N-5·GP/KCos **미접촉**.

---

## 8. 완료 기준 대조 (§15)

- [x] 고정 LIMIT 200 제거
- [x] page/limit/total/totalPages 제공
- [x] 운영자·공급자 목록 모두 페이지네이션
- [x] q/templateKey/source 탭과 page 상태 정합
- [x] 표준 `Pagination` 적용
- [x] 기존 가져오기·사본·의약품 게이트 회귀 없음(로직 무변경)
- [x] KPA 외 서비스 변경 0
- [x] DB migration 0
- [x] typecheck(변경 파일) PASS
- [x] 배포 및 smoke — API 직접 호출 + 브라우저 DOM 렌더 실증(프로덕션, 상단 표·트레이스). 다중 페이지 이동만 원본 0건으로 미실증
- [x] CHECK commit/push

---

## 9. 커밋

```text
feat(kpa-store-hub): paginate screen set hub listings
```

commit SHA: (커밋 시 기록)
