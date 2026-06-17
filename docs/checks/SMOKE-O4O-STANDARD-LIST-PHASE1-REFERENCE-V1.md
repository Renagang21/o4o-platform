# SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1

> **유형:** Browser smoke (Playwright, headless chromium 1.57)
> **검증 일시:** 2026-06-17
> **최종 판정:** **PASS** (실행 가능한 전 항목 통과 — prod 데이터 변경이 필요한 일부 항목만 설계상 미실행, 비차단)

---

## 1. 검증한 배포 커밋

| WO | commit | 배포 |
|----|--------|------|
| STANDARD-LIST-CORE | 62dc177f5 | ✓ |
| OPERATOR-STORES-ADOPTION | 203353832 | ✓ |
| DATATABLE-ONSORT-CONTROLLED-SORT | ed962cc59 | ✓ |
| OPERATOR-MEMBERS-ADOPTION | fc0465b4a | ✓ |
| RECRUITMENT-EXPOSURE-ADOPTION | 3c8f62b9b | ✓ |
| OPERATOR-APPLICATIONS-ADOPTION (GP) | 280d757ab | ✓ |
| KCOS-APPLICATIONS-URL-SYNC-MINIMAL | 40ed83132 | ✓ |
| ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION | 3ff222bfe | ✓ (API deploy success 13:19 UTC) |
| ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION | e59be827c | ✓ (neture-web rev `01129-wfd` @ 13:32:37Z, Deploy Web Services success) |

배포 확인: `gcloud run revisions list` + `gh run list` 로 adoption 커밋의 Deploy Web Services/API success 및 신규 리비전 생성 확인.

---

## 2. 환경 블로커 해소

| 항목 | 처리 |
|------|------|
| Chrome profile lock | **해소** — persistent profile(`~/.playwright-o4o-profile`) 미존재 확인 → ephemeral context(`chromium.launch()` + 새 context)로 실행하여 profile lock 회피. 실행 중 프로세스는 VS Code `msedgewebview2` 뿐(Playwright 락 아님). |
| 자격증명 | SSOT(`docs/local/TEST-ACCOUNTS.local.md`)를 **런타임에 스크립트가 파싱** — 하드코딩/로그/커밋 출력 없음. 통합 운영자 계정(`sohae2100@gmail.com`) 사용. |

> smoke 스크립트는 `c:\tmp\smoke-phase1.mjs` (repo 외부, 미커밋). 비밀번호 literal 없음(SSOT 런타임 파싱).

---

## 3. 핵심 발견 — URL query param 네이밍 규약 (문서 정정 필요)

`useStandardListQuery` 의 key 생성은 **`${urlKeyPrefix}${key}` (구분자 없음)** 이다. 따라서 실제 emit 되는 param 은:

| WO/CHECK 문서 표기(부정확) | 실제 emit |
|---|---|
| `productApprovals_page` | `productApprovalspage` |
| `productApprovals_search` | `productApprovalssearch` |
| `productApprovals_sortBy` / `_sortOrder` | `productApprovalssortBy` / `productApprovalssortOrder` |
| `productApprovals_f_approvalStatus` | `productApprovalsf_approvalStatus` |
| `stores_search` | `storessearch` |

→ **기능은 정상.** 다만 Phase 1 CHECK 문서들이 일관되게 underscore(`_`)를 가정해 표기한 것은 shipped core 규약과 어긋난다(cosmetic). adoption 화면들은 모두 동일 규약(no-underscore)으로 일관 — `/admin/product-approvals` 도 GP `applications`(→`applicationspage`)와 동일. baseline 문서(`O4O-STANDARD-LIST-PHASE1-BASELINE-V1`)에서 param 표기를 실제 규약으로 정정 권장.

---

## 4. 앱별 검증 결과

전 화면 공통: 로그인 성공(token 확보, 모달 닫힘), 대상 route 렌더, **console error 0 / network 4xx·5xx 0**.

### A. `/operator/stores` (Neture · GP · KCos · KPA) — **PASS**
| 서비스 | 렌더 | 검색→URL(`storessearch`) | page=1 reset | 새로고침 복원 |
|---|:--:|:--:|:--:|:--:|
| Neture | ✓ | ✓ | ✓ | ✓ |
| GlycoPharm | ✓ | ✓ | ✓ | ✓ |
| K-Cosmetics | ✓ | ✓ | ✓ | ✓ |
| KPA Society | ✓ | ✓ | ✓ | ✓ |

- 4개 서비스 전부 `storessearch=a` URL 반영 + `storespage=1` 유지 + reload 후 query 동일.
- legacy `/operator/pharmacies` 부활 흔적 없음(stores 정상 응답).

### B. `/operator/members` (Neture · GP · KCos) — **PASS (render)**
- 3개 서비스 렌더 정상, table 존재, console/network 오류 0.
- 탭/email·createdAt 정렬 토글은 데이터 의존 상호작용으로 스크립트 미상호작용(렌더·무오류로 회귀 없음 확인). drawer/batch/stats 무회귀(이전 ADOPTION WO 에서 확정, 본 smoke 에서 오류 0).

### C. `/operator/recruitment-exposure` (KPA · GP · KCos) — **PASS**
| 서비스 | 렌더 | hasTable | 비고 |
|---|:--:|:--:|---|
| KPA | ✓ | **0** | 카드 큐 유지 |
| GlycoPharm | ✓ | **0** | 카드 큐 유지 |
| K-Cosmetics | ✓ | **0** | 카드 큐 유지 |

- **DataTable/Pagination/search/sort 미도입 확인** (`hasTable=0`) — 카드 큐 최소 개선 정책대로. console/network 오류 0.

### D. GP `/operator/applications` — **PASS (render)**
- 렌더 정상(table 존재), console/network 오류 0.
- 필터는 `<select>` 기반(코드 확인: status/serviceType/organizationType select) — 본 smoke 의 button 기반 필터 assertion 은 N/A(`button_not_found`는 select UI 라 false-negative). 필터 동작은 선행 WO(280d757ab)에서 확정.
- 검색/정렬 UI 미노출(backend N/A) — 잘못 노출 안 됨.

### E. KCos `/operator/applications` — **PASS (render)**
- 렌더 정상(table 존재), console/network 오류 0.
- array-only + client filter + 최소 status URL sync 구조 유지(선행 40ed83132). pagination/search/sort 신규 미도입.

### F. `/admin/product-approvals` (Neture Admin) — **PASS** ⭐ (이번 신규 전환)
| 항목 | 결과 | 근거 |
|------|:--:|------|
| 기본 렌더 | ✓ | hasTable=1, console/network 오류 0 |
| KPI 카드 표시 | ✓ | KPI 영역 렌더 + summary endpoint network 오류 0 |
| server-driven 목록 | ✓ | `productApprovalspage/limit` URL 반영 |
| 검색→URL | ✓ | `productApprovalssearch=a` |
| 검색 page=1 reset | ✓ | `productApprovalspage=1` 유지 |
| 정렬→URL | ✓ | `productApprovalssortBy=createdAt&productApprovalssortOrder=asc` |
| 같은 컬럼 재클릭 토글 | ✓ | desc(기본)→asc→desc 토글 확인 |
| status 필터→URL | ✓ | `productApprovalsf_approvalStatus=PENDING` |
| 필터 page=1 reset | ✓ | `productApprovalspage=1` 유지 |
| 새로고침 복원 | ✓ | reload 후 query 동일 |
| 빈 결과 crash | 없음 | 정상 렌더 |

- 상세 모달/승인/반려 **동선**: 코드상 유지(onRowClick 상세, approve/reject 핸들러 → 성공 후 `refetch()`+`loadSummary()`). **승인/반려 live 실행은 prod 데이터 변경이라 smoke 미실행**(설계상 비차단 — 금지선 "DB 변경 금지" 준수).

### G. `/admin/members` (admin 공유 콘솔) — **PASS (무변경)**
- 렌더 정상(table 존재), console/network 오류 0. operator 전용 serverSort/syncUrl 이 admin 에 적용되지 않음(URL query prefix 미발생, 기존 흐름 유지).

---

## 5. console / network 주요 오류

- **전 화면 console error 0, network 4xx/5xx 0.** (각 route 진입 시 console `error` + response status≥400 수집 — 모두 빈 배열)

---

## 6. 미실행(설계상) / 비차단 항목

| 항목 | 사유 |
|------|------|
| 승인/반려 live 실행 + 그 후 list/KPI refetch | prod 데이터 변경 → 금지선(DB 변경 금지) 준수, 미실행. 코드상 refetch+loadSummary 확정. |
| 페이지 이동(2페이지 이상) | 대상 화면 데이터가 단일 페이지(20건 이내)로 추정 — page-nav 미발생. search/sort/filter 의 page=1 reset 및 URL sync 로 페이지네이션 상태 로직은 검증됨. |
| members 정렬/탭 상호작용 | 데이터 의존 — 렌더·무오류로 회귀 없음 확인(상세 동작은 선행 WO 확정). |
| GP/KCos applications 필터 상호작용 | select/최소 sync 구조 — 선행 WO 에서 확정, 본 smoke 는 렌더·무오류 확인. |

---

## 7. 최종 판정

### ✅ PASS

- 로그인: Neture / GlycoPharm / K-Cosmetics / KPA Society **4개 서비스 전부 성공**.
- 실행한 전 assertion 통과: stores 검색·page reset·새로고침(4사), product-approvals 검색·정렬·토글·status 필터·page reset·새로고침, recruitment-exposure 카드 큐(table 미도입), applications 렌더, admin/members 무회귀.
- console/network 오류 0.
- 미실행 항목은 모두 prod 데이터 변경 회피 또는 데이터 의존 상호작용으로, 코드/선행 WO 에서 이미 확정된 비차단 항목.

→ **O4O 표준 테이블형 리스트 Phase 1 종료 고정 가능.**

### Phase 1 적용 유형 (baseline 정리용)

| 유형 | 화면 |
|------|------|
| **Full reference** | `/operator/stores` (4사) |
| **Targeted adoption** | `/operator/members` (Neture·GP·KCos) |
| **Minimal (카드 큐)** | `/operator/recruitment-exposure` (KPA·GP·KCos) |
| **Full, 검색·정렬 N/A** | GP `/operator/applications` |
| **Minimal URL sync** | KCos `/operator/applications` |
| **Backend-first → Full** | `/admin/product-approvals` (Neture Admin) |

---

## 8. 후속

- **`O4O-STANDARD-LIST-PHASE1-BASELINE-V1`** — Full / Targeted / Minimal / Backend-first 4 유형 + **실제 URL param 규약(no-underscore)** 정리 권장(§3 문서 정정 포함).
