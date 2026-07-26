# CHECK-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V1

WO: `WO-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V1`
결정 기준: **표준 Tailwind 통일** (inline style 신규 금지, 전환 시 제거)
일시: 2026-07-26 (KST) · commit `03106f795`

## 0. 결론

전수 분류 후 **1차 묶음에서 공용 컴포넌트 1건을 완결 전환**했다.
`DB/migration 0 · backend 0 · 서비스별 CSS 복제 0 · 공용 컴포넌트 내 서비스 조건문 0.`

| 구분 | 건수 |
|------|:---:|
| 전수 (raw `<table>` 보유 파일) | **176** |
| 전환 대상 아님(표준 컴포넌트 본체 등) | 2 |
| **1차 전환 완료** | **1** (소비처 4화면 / 2서비스) |
| 1차 보류 | 1 (사유 §4) |
| 잔여 | 172 |

---

## 1. 전수 분류 (176건)

IR 은 서비스 `pages` 디렉터리 기준 128건을 셌으나, **전 소스 기준 재집계 시 176건**이다.

| 영역 | 건수 | 성격 | 우선순위 |
|------|:---:|------|:---:|
| `apps/admin-dashboard/src/pages` | 71 | 플랫폼 Admin 화면 | 2차 이후 (최대 규모) |
| `services/web-neture/src` | 49 | 서비스 최대 격차 | 2차 |
| `services/web-kpa-society/src` | 20 | 상당수 이미 표준 위임 | 3차 |
| `services/web-glycopharm/src` | 16 | | 3차 |
| `services/web-k-cosmetics/src` | 13 | | 3차 |
| **`packages/operator-core-ui/src`** | **2** | **공용 — 최고 레버리지** | **1차** |
| `packages/ui/src` | 5 | 아래 분해 참조 | — |

### 1-A. `packages/ui` 5건 분해 — **대부분 전환 대상 아님**

| 파일 | 소비처 | inline | 판정 |
|------|:---:|:---:|------|
| `BaseTable.tsx` | 48 | 7 | **전환 대상 아님** — 표준 테이블 **본체**(`<table>` 이 구현 그 자체) |
| `AGTable.tsx` | 25 | 3 | **전환 대상 아님** — 표준 테이블 계열 본체 |
| `UserDetailPage.tsx` | 9 | 0 | 이미 Tailwind. 상세 페이지 내 표 — 구조 표준화만 남음(후순위) |
| `AiReportPage.tsx` | 10 | 2 | 이미 Tailwind (후순위) |
| `RoleManagementPage.tsx` | 10 | 0 | 이미 Tailwind (후순위) |

→ **inline style + 공용** 조건을 동시에 만족하는 진짜 1차 대상은
`operator-core-ui` 의 **2건**뿐이었다.

### 1-B. debug/test/archive 버킷 — **0건**

경로 기준(`/test/`, `/debug/`, `/archive/`, `/demo/`) 검색 결과 **0건**. 후순위로 뺄 화면이 없다.

---

## 2. 1차 전환 완료 — `ContactInquiryAdminPage`

`packages/operator-core-ui/src/modules/contact-inquiry/ContactInquiryAdminPage.tsx` (217줄 → 264줄)

**소비처 4화면 / 2서비스** — 1회 수정으로 동시 개선:

- `services/web-glycopharm/src/pages/admin/ContactInquiriesPage.tsx`
- `services/web-glycopharm/src/pages/operator/OperatorContactInquiriesPage.tsx`
- `services/web-k-cosmetics/src/pages/admin/ContactInquiriesPage.tsx`
- `services/web-k-cosmetics/src/pages/operator/OperatorContactInquiriesPage.tsx`

### 2-A. 적용한 표준 계약

| 항목 | 결과 |
|------|------|
| 표준 테이블 | `<table>` 수기 마크업 → **`DataTable`**(`columns`/`data`/`rowKey`/`loading`/`emptyMessage`/`onRowClick`) |
| 컬럼 | 7종을 `ListColumnDef` + `render` 로 이관 — **표시 내용 동일** |
| 상태 필터 | 유지 (기존 select) |
| 페이지네이션 | 유지 (서버 `pagination.page/totalPages` 계약 그대로) |
| 로딩/빈 상태 | `DataTable` 표준 처리로 이관 |
| 행 액션 | 행 클릭 → 상세 드로어 (기존 동선 유지) |
| 상태 배지 | 색상 하드코딩 → **Tailwind 토큰 표준 배지** |
| 상세 드로어 | overlay/drawer/field/textarea 등 inline style **전부 Tailwind** |
| **inline style 잔존** | **0** (`S` 스타일 객체 전면 제거) |

### 2-B. 의도적으로 넣지 않은 것

**행 체크박스 / ActionBar 없음** — 문의 관리에는 정의된 일괄 작업이 없다.
WO 원칙("기능이 없는 목록에 불필요한 체크박스나 ActionBar 를 억지로 추가하지 않는다") 준수.

### 2-C. 스타일 정책 준수

- 신규 `style={{...}}` **0**
- 서비스별 CSS 복제 **0**
- 공용 컴포넌트 내 서비스 이름 조건문 **0** — 서비스 차이는 기존 props(`title`, `inquiryTypeLabels`)로만 처리
- 헤더의 *"스타일: inline (서비스 Tailwind 비의존)"* 방침은 **폐기**하고 그 사유를 주석에 명시
- 본문 `whitespace-pre-wrap` plain text 렌더 유지 — **XSS 회피 정책 무변경**

---

## 3. 검증

| 항목 | 결과 |
|------|:---:|
| `@o4o/operator-core-ui` typecheck — 변경 파일 | **오류 0** |
| 패키지 잔여 오류 1건 | `@o4o/error-handling` 의 `ImportMeta.env` — **타 패키지 사전 오류**(무관) |
| `web-glycopharm` typecheck (ContactInquiry 관련) | **0** |
| `web-k-cosmetics` typecheck (ContactInquiry 관련) | **0** |
| `web-glycopharm` build | **PASS** |
| `web-k-cosmetics` build | **PASS** |
| backend / DB / migration | **0** |

### 3-1. 배포

| 항목 | 값 |
|------|-----|
| commit | `03106f795` |
| workflow | `Deploy Web Services (Cloud Run)` run `30200431004` — **success** |
| job 결과 | `deploy-kpa-society` · `deploy-glycopharm` · `deploy-neture` · `deploy-k-cosmetics` **전부 success** |

공용 패키지 변경이라 4개 서비스가 모두 재배포되었다(소비처는 GP·KCos 2곳이지만
`@o4o/operator-core-ui` 를 참조하는 전 서비스가 빌드 대상).

### 3-2. 배포 산출물 검증 (브라우저 대체)

자동화 브라우저 프로필을 다른 세션이 점유해 화면 실측 대신 **배포된 청크를 직접 내려받아** 확인했다.

| 서비스 | 청크 | 신규 문구<br>`접수된 문의가 없습니다` | 구 inline 마커<br>`borderCollapse` |
|--------|------|:---:|:---:|
| `k-cosmetics.site` | `ContactInquiryAdminPage-BzQN08DN.js` (7,397 B) | **1** ✅ | **0** ✅ |
| `glycopharm.co.kr` | `ContactInquiryAdminPage-JvMuH-8o.js` (7,322 B) | **1** ✅ | **0** ✅ |

`borderCollapse` 는 제거된 `S.table` inline 스타일의 고유 마커다. **양쪽 프로덕션 번들에서 0** 이므로
inline style 이 실제로 제거되고 새 구현이 서빙되고 있음이 확인된다.

> 미수행: 로그인 후 화면 렌더·필터·페이지네이션의 **시각 확인**. 브라우저 점유 해제 시
> `/operator/contact-inquiries`(operator) · `/admin/contacts`(admin) 에서 확인 권장.

---

## 4. 1차 보류 — `ServiceLegalSettingsPage`

`packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` (430줄, 소비처 8)

**보류 사유(중지 조건 아님 — 범위 판단):**

이 파일의 `<table>` 은 **페이지의 한 구획**일 뿐이고, 나머지는 정책 문서 **편집 폼 + 에디터**다.
inline style 30곳 중 표 영역은 일부이며, 표만 `DataTable` 로 바꾸면 **같은 파일에 inline style 이
절반 남는 혼합 상태**가 된다. 이는 스타일 정책("전환 대상 화면에서 inline style 제거")과 어긋난다.

또한 표에 **행 단위 액션(편집 / 게시 · 게시해제)** 이 있어 `RowActionMenu` 이관과 함께
게시 상태 전이 동선을 재확인해야 하며, 소비처가 **8곳**이라 검증 폭이 크다.

→ 표 교체가 아니라 **페이지 단위 전환**으로 2차에서 다룬다. 기능·건수는 현재 그대로 유지된다.

---

## 5. 잔여 및 2차 권고 (172건)

| 순위 | 대상 | 근거 |
|:---:|------|------|
| 1 | `ServiceLegalSettingsPage` (공용, 소비처 8) | §4 — 페이지 단위 전환 |
| 2 | `web-neture` 49건 | 서비스 최대 격차, 공용 재사용 최저 |
| 3 | `apps/admin-dashboard` 71건 | 최대 규모 — 화면 중요도순 분할 필수 |
| 4 | `packages/ui` 의 `UserDetailPage`/`AiReportPage`/`RoleManagementPage` | 이미 Tailwind — 구조 표준화만 |
| 5 | KPA 20 · GP 16 · KCos 13 | 상당수가 이미 표준 컴포넌트 위임 wrapper |

**주의:** 2차 착수 전 `web-neture`·`admin-dashboard` 의 파일별 성격 분류가 필요하다.
IR 과 본 CHECK 의 집계 차이(128 vs 176)에서 보듯 **디렉터리 범위에 따라 수치가 달라지므로**,
2차에서는 "목록 화면"과 "편집기·캔버스·트리" 를 구분한 뒤 착수해야 한다(WO 중지 조건 3).
