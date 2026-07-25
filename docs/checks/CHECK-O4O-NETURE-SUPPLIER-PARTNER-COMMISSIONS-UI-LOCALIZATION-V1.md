# CHECK-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-UI-LOCALIZATION-V1

WO: `WO-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-UI-LOCALIZATION-V1`
대상: `/supplier/partner-commissions`
작성일: 2026-07-25 (KST)

---

## 1. 조사한 구현 파일과 API

| 항목 | 값 |
|------|-----|
| route | `App.tsx` → `/supplier/partner-commissions` |
| 컴포넌트 | `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx` (단일 파일 — 전용 modal/table 컴포넌트 분리 없음) |
| API client | `supplierCommissionApi` (`lib/api/supplier.ts:180`) |
| 제품 목록 | `supplierApi.getProducts()` (form 의 제품 select) |
| toast | `@o4o/error-handling` |

### 데이터 계약 (`SupplierPartnerCommission`)

```ts
{ id, supplier_product_id, commission_per_unit, start_date, end_date | null, created_at, product_name, barcode }
```

| 엔드포인트 | 메서드 |
|------------|--------|
| `/neture/supplier/partner-commissions` | GET · POST |
| `/neture/supplier/partner-commissions/:id` | PUT · DELETE |

**핵심 확인 사항 — 화면 용어 결정의 근거:**

1. 저장값은 `commission_per_unit` = **제품 단위당 고정 수수료(원)**. 비율(%) 필드가 **없다**.
   (form placeholder `500`, 표시 `Number(...).toLocaleString() + '원'`)
2. **파트너 식별 필드가 없다.** 정책은 `supplier_product_id` 단위로 걸리며 특정 파트너에 귀속되지 않는다.
3. 상태는 저장된 ENUM 이 아니라 `getStatus()` 가 `start_date` / `end_date` 와 오늘 날짜를 비교해 **파생**한다
   (`scheduled` / `active` / `expired`).
4. 삭제는 **hard delete** (`DELETE`), 단 서버가 `IN_USE` 로 이미 사용된 정책을 거부한다. soft delete·archive 아님.

## 2. 변경 전 영문 문구 → 변경 후 한국어

| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| 페이지 제목 | `Partner Commissions` | `파트너 수수료` |
| 페이지 설명 | 파트너에게 제공할 커미션 정책을 관리합니다 | 파트너에게 지급할 제품별 수수료 정책을 설정하고 관리합니다. |
| 주요 버튼 | `Add Commission` | `수수료 정책 추가` |
| 폼 제목(생성) | `Add Commission` | `수수료 정책 추가` |
| 폼 제목(수정) | `Edit Commission` | `수수료 정책 수정` |
| 폼 라벨 | `Commission / unit (원)` | `단위당 수수료 (원)` |
| 폼 라벨 | 시작일 | `적용 시작일` |
| 폼 라벨 | 종료일 (선택) | `적용 종료일 (선택)` |
| 저장 버튼 | 생성 / 수정 | `저장` (진행 중 `저장 중...`) |
| 표 헤더 | `Product` | `제품` |
| 표 헤더 | `Commission / unit` | `단위당 수수료` |
| 표 헤더 | `Start date` | `적용 시작일` |
| 표 헤더 | `End date` | `적용 종료일` |
| 표 헤더 | `Status` | `상태` |
| 표 헤더 | `Edit` | `작업` |
| 상태 배지 | `Active` / `Scheduled` / `Expired` | `적용 중` / `적용 예정` / `종료됨` |
| 로딩 | `Loading...` | `불러오는 중...` |
| 빈 상태 제목 | 등록된 커미션 정책이 없습니다 | `등록된 파트너 수수료 정책이 없습니다.` |
| 빈 상태 설명 | `Add Commission` 버튼을 눌러 첫 커미션 정책을 만들어보세요 | `수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.` |
| 모바일 카드 | `Commission` | `단위당 수수료` |
| 모바일 카드 | 기간 | `적용 기간` |
| validation | 제품을 선택하세요 | `제품을 선택해 주세요.` |
| validation | 커미션 금액을 입력하세요 | `단위당 수수료를 입력해 주세요.` / `단위당 수수료는 0보다 커야 합니다.` (분리) |
| validation | 시작일을 입력하세요 | `적용 시작일을 입력해 주세요.` |
| 오류(겹침) | 기간이 기존 정책과 겹칩니다 | `적용 기간이 기존 정책과 겹칩니다.` |
| 오류(사용중) | 이미 사용된 정책은 삭제할 수 없습니다 | `이미 사용된 정책은 삭제할 수 없습니다.` |
| 오류(그 외) | **`result.error` 원문 또는 `'Failed'`** | `수수료 정책 저장에 실패했습니다.` / `수수료 정책 삭제에 실패했습니다.` |
| 삭제 확인 | 이 커미션 정책을 삭제하시겠습니까? | `이 수수료 정책을 삭제하시겠습니까?` + `삭제 후에는 되돌릴 수 없습니다.` |

## 3. 용어 선택 근거

| 결정 | 근거 |
|------|------|
| **커미션 → 수수료** | 사이드바 canonical 라벨이 `파트너 수수료`. 화면 본문만 `커미션`이라 축이 어긋나 있었다 |
| **"수수료 정책"** 채택 | 기존 코드·문구가 이미 `정책`(policy) 어휘를 사용(`DATE_OVERLAP` = 정책 간 기간 겹침, `IN_USE` = 사용된 정책). `규칙`·`설정` 으로 바꾸면 서버 오류 문구와 어휘가 갈린다 |
| **"파트너" 컬럼 미추가** | 데이터 계약에 파트너 식별 필드가 없다. WO §6 "실제 모델에 존재하지 않는 컬럼은 새로 만들지 않는다" 준수 |
| **"수수료율(%)" 미사용** | 저장값이 단위당 고정 금액(원)이다. `수수료율` 표기는 사용자에게 비율로 오인시킨다 → `단위당 수수료 (원)` 사용 |
| **활성/비활성 대신 적용 중/적용 예정/종료됨** | 상태가 저장 ENUM 이 아니라 날짜 파생값이다. `비활성`은 수동 on/off 를 연상시켜 실제 동작과 다르다 |
| **"삭제" 유지** | 서버가 hard delete. `비활성화`·`보관` 으로 바꾸면 실제 동작을 오인시킨다 |
| 저장 버튼 `저장` 통일 | WO §5 `Save → 저장`. 생성/수정은 폼 제목에서 이미 구분된다 |

## 4. 금액·비율 표시 기준

- 금액: `Number(c.commission_per_unit).toLocaleString() + '원'` — **기존 표기 그대로 유지**(변경 0). 서비스 내 다른 화면(공급자 홈 KPI, 상품 성과)과 동일한 `1,234원` 형식.
- 비율(%): **표시하지 않음** — 데이터 계약에 비율 필드가 없다.
- 프론트 곱셈·나눗셈·반올림·통화 변환 **0건**. 저장값을 그대로 렌더한다.

## 5. 상태 매핑

`getStatus()` 파생 로직(무변경) → 라벨만 한국어화:

| 파생값 | 조건 (기존 코드) | 라벨 |
|--------|------------------|------|
| `scheduled` | `start_date > today` | 적용 예정 |
| `expired` | `end_date && end_date < today` | 종료됨 |
| `active` | 그 외 | 적용 중 |

색상 토큰(green/blue/slate)은 변경하지 않았다.

## 6. 빈 화면·오류·확인 문구

- 빈 상태: `등록된 파트너 수수료 정책이 없습니다.` + `수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.`
- 오류 처리에 `commissionErrorMessage(code, fallback)` 헬퍼 도입:
  - `DATE_OVERLAP` → 적용 기간이 기존 정책과 겹칩니다.
  - `IN_USE` → 이미 사용된 정책은 삭제할 수 없습니다.
  - **그 외 코드는 원문을 노출하지 않고** 일반 한국어 문구로 대체 (기존에는 `result.error` 원문 / `'Failed'` 가 그대로 화면에 노출되었다).
- 삭제 확인: `이 수수료 정책을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.`

## 7. 변경 파일

| 파일 | 변경 | 커밋 |
|------|------|------|
| `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx` | 문구 한국어화 +46 / −32 | `8daee03b5` |
| `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx` | 헤더 반응형 정리 (아래 7-1) | 2차 커밋 |

### 7-1. 헤더 반응형 보정 (2차)

1차 배포 후 실제 브라우저 smoke(390×844)에서 헤더의 `수수료 정책 추가` 버튼이
`수수료 / 정책 추 / 가` 3줄로 쪼개지고 `+` 아이콘이 라벨과 분리되는 현상을 확인했다.
WO §11(버튼 겹침·잘림 확인) 범위로 판단해 **해당 페이지 헤더에 한정한 최소 수정**을 적용했다.

| 대상 | 변경 |
|------|------|
| 헤더 컨테이너 | `flexWrap: 'wrap'` + `gap: '12px'` 추가 |
| 제목·설명 블록 | `flex: '1 1 260px'` + `minWidth: 0` |
| 추가 버튼 | `whiteSpace: 'nowrap'` + `flexShrink: 0` |

문구·로직·데이터 계약 무변경. 신규 컴포넌트·신규 UI 패턴 도입 0
(기존 인라인 style 구조 그대로, 새 CSS 클래스·미디어쿼리 추가 없음).

| 항목 | 값 |
|------|-----|
| 수수료 계산 로직 | **무변경** |
| 저장값 단위 (`commission_per_unit`, 원) | **무변경** |
| API 요청/응답 형태 | **무변경** |
| `getStatus()` 파생 규칙 | **무변경** |
| 삭제 정책 (hard delete + IN_USE 가드) | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 신규 API·ENUM·권한 변경 | 0 |
| `/supplier/settlements` · `/account/supplier/*` · 대시보드 · 사이드바 | 무변경 |
| 신규 UI 패턴·컴포넌트 | 0 (기존 인라인 table/card 구조 유지) |

## 8. 검증 (build)

| 항목 | 결과 |
|------|:---:|
| `tsc --noEmit` (web-neture) | PASS (오류 0) |
| `pnpm --filter @o4o/web-neture build` — 1차(문구) | PASS (12.53s) |
| `pnpm --filter @o4o/web-neture build` — 재검증(문구 커밋 상태) | PASS (20.39s) |
| `pnpm --filter @o4o/web-neture build` — 2차(반응형 보정 포함) | PASS (16.80s) |
| 소스 내 사용자 노출 영문 문구 | **0** (잔여 영문은 식별자·import·주석뿐) |

## 9. 배포 및 프로덕션 smoke

### 9-1. 배포 경위

| 단계 | 내용 |
|------|------|
| commit | `8daee03b5` |
| 1차 run (30151699207) | `Deploy Web Services (Cloud Run)` — **failure**. 단 실패 원인은 코드가 아니라 `detect-changes` **cancelled** — 다른 세션의 후속 push 로 workflow concurrency 취소 |
| 실제 배포 run | 후속 커밋 `089fae48f` 의 Deploy Web Services. `git merge-base --is-ancestor 8daee03b5 089fae48f` = **YES** → 본 변경 포함 확인 |

추가 확인: `089fae48f` run(30151874624)에서 `deploy-neture` 가 **skipped** 되었다.
`detect-changes` 가 tip 커밋(HEAD~1) 기준으로만 변경 경로를 판정해 web-neture 변경을 놓친 것으로, 알려진 동작이다.

→ `gh workflow run deploy-web-services.yml --ref main -f service=neture` 로 **명시 재배포**:

| 항목 | 값 |
|------|-----|
| run | 30152136531 (`workflow_dispatch`, service=neture) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| 배포 SHA | `f5f08abad` — `git merge-base --is-ancestor 8daee03b5 f5f08abad` = **YES** |
| Cloud Run revision | `neture-web-01310-ml6` → **`neture-web-01311-tb4`** |

### 9-2. 프로덕션 검증 A — 배포 번들 직접 검증

1차 세션에서는 Playwright MCP 프로필 잠금(`Browser is already in use`)으로 브라우저 smoke 를 수행하지 못해,
배포된 프로덕션 자산에서 문구를 직접 검증했다.

- 진입 청크 `https://neture.co.kr/assets/index-DiRsxnEh.js` → 해당 페이지 청크 **`assets/index-DhEMOhCx.js`** 특정.

**한국어 문구 22/22 FOUND:**

```text
파트너 수수료 · 파트너에게 지급할 제품별 수수료 정책을 설정하고 관리합니다.
수수료 정책 추가 · 수수료 정책 수정 · 단위당 수수료 (원) · 단위당 수수료
적용 시작일 · 적용 종료일 · 적용 중 · 적용 예정 · 종료됨 · 적용 기간 · 작업
등록된 파트너 수수료 정책이 없습니다. · 수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.
불러오는 중... · 삭제 후에는 되돌릴 수 없습니다.
적용 기간이 기존 정책과 겹칩니다. · 수수료 정책 저장에 실패했습니다. · 수수료 정책 삭제에 실패했습니다.
단위당 수수료는 0보다 커야 합니다. · 제품을 선택해 주세요.
```

**영문·구(舊) 문구 11/11 absent:**

```text
Partner Commissions · Add Commission · Edit Commission · Commission / unit
Start date · End date · Loading... · "Failed" · Scheduled · Expired · 커미션
```

→ 프로덕션 반영 확인 완료.

### 9-3. 프로덕션 검증 B — 번들 재검증 (2차 세션, 독립 수행)

라이브 리비전 `neture-web-01311-tb4` 기준으로 페이지 청크를 다시 내려받아 재검증했다.

| 항목 | 결과 |
|------|:---:|
| 한국어 문구 | **27/27 present** (1차 22개 + `이미 사용된 정책은 삭제할 수 없습니다.` · `적용 시작일을 입력해 주세요.` · `단위당 수수료를 입력해 주세요.` · `제품 선택...` · `저장 중...`) |
| 영문·구(舊) 문구 | **10/10 absent** |

### 9-4. 프로덕션 검증 C — 실브라우저 smoke (2차 세션)

MCP 대신 **로컬 Playwright(chromium headless)** 로 실제 로그인 → 라우트 → 폼 조작까지 수행했다.
자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서만 읽고 스크립트·로그에 하드코딩하지 않았다.

검증 계정: `Neture 공급자`(sohae21) / `Neture 공급자2`(renagang21) **2개 계정 모두 동일 결과**.

| 항목 | 결과 |
|------|:---:|
| 로그인 → `/supplier/dashboard` 랜딩 | PASS (프로필 미완료 모달은 `나중에` 로 닫힘) |
| `/supplier/partner-commissions` 직접 접근(hard-nav) | PASS |
| 사이드바 `주문·정산 → 파트너 수수료` 엔트리 | 존재 · 라벨 `파트너 수수료` · 현재 경로 활성 표시 |
| `h1` | `파트너 수수료` |
| 설명 문구 | `파트너에게 지급할 제품별 수수료 정책을 설정하고 관리합니다.` |
| 주요 버튼 | `수수료 정책 추가` |
| 빈 상태 | `등록된 파트너 수수료 정책이 없습니다.` + `수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.` |
| 폼 열기 → 제목 | `수수료 정책 추가` |
| 폼 라벨 | `["제품", "단위당 수수료 (원)", "적용 시작일", "적용 종료일 (선택)"]` |
| select placeholder / 금액 placeholder | `제품 선택...` / `500` |
| validation (빈 상태 저장 클릭) | `제품을 선택해 주세요.` 표시 PASS |
| `취소` 클릭 | 폼 닫힘 PASS (저장 요청 발생 0 — **운영 데이터 write 0건**) |
| 화면 내 영문 잔여 문구 | 0 (본문 기준. 전역 헤더/푸터의 `Home`·`Contact Us`·`About` 은 본 WO 범위 밖 공통 셸) |

**텔레메트리 (계정 2개 × 전 구간 합산):**

| 항목 | 건수 |
|------|:---:|
| console error | **0** |
| page error (uncaught) | **0** |
| HTTP 4xx/5xx 응답 | **0** |

**반응형:**

| 뷰포트 | 가로 overflow | 비고 |
|--------|:---:|------|
| Desktop 1440×900 | 없음 (scrollW=clientW=1440) | 헤더 1행 정상 |
| Tablet 768×1024 | 없음 (768=768) | 헤더 1행 정상 |
| Mobile 390×844 | 없음 (390=390) | — |
| Mobile 390 + 폼 열림 | 없음 (390=390) | 폼 필드 1열 스택, 화면 이탈 없음 |

→ **1차 smoke 에서 결함 1건 발견**: 390px 에서 헤더 버튼 라벨이 `수수료 / 정책 추 / 가` 3줄로 쪼개짐.
§7-1 보정 후 재배포 → 재검증 결과는 아래 9-5.

### 9-5. 반응형 보정 재배포 및 재smoke

| 항목 | 값 |
|------|-----|
| commit | `b3a7ffed7` |
| run | 30157260139 (push 트리거) — `detect-changes` success · `deploy-neture` success |
| 배포 SHA | `b3a7ffed7` |
| Cloud Run revision | `neture-web-01311-tb4` → **`neture-web-01312-rpg`** |

> 동시에 `gh workflow run ... -f service=neture` dispatch(30157263693)도 걸었으나 concurrency 로 **cancelled**.
> 동일 SHA 를 push run 이 이미 배포했으므로 재실행하지 않았다.

**재smoke 결과 (신규 리비전 기준):**

| 항목 | 결과 |
|------|:---:|
| 배포 청크 `assets/index-DwM15K_D.js` — 한국어 문구 | **27/27 present** |
| 동 청크 — 영문·구 문구 | **10/10 absent** |
| 동 청크 — 보정 반영 (`flexWrap:"wrap"` · `whiteSpace:"nowrap"` · `1 1 260px`) | 3/3 present |
| 390×844 헤더 버튼 | **1줄 렌더 복구** (`+ 수수료 정책 추가`), 헤더가 2행으로 wrap |
| 390 / 768 / 1440 가로 overflow | 없음 |
| 폼 열림 상태 390px | 화면 이탈 없음, 필드 1열 스택 |
| console / page error / 4xx·5xx | **0 / 0 / 0** |

### 9-6. 검증 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 실데이터 기반 표·상태 배지·수정 폼 프리필 | **미확인** | 검증 가능한 공급자 계정 2개 모두 등록된 수수료 정책 **0건**, 폼의 제품 select 도 **0건**(등록 상품 없음). WO §14 에 따라 검증 목적의 운영 데이터 생성을 하지 않았다 |
| `0 이하 금액` validation 문구 | **미확인** | 위와 동일 — 제품 선택이 선행 조건이라 제품 0건 상태에서는 `제품을 선택해 주세요.` 에서 멈춘다. 소스·번들에는 문구 존재 확인됨 |
| 삭제 확인 다이얼로그 실동작 | **미확인** | 삭제 대상 데이터 0건 |

표·카드 전환 CSS(`@media (max-width: 768px)`)는 본 WO 에서 변경하지 않았고, 데이터 0건이라 렌더 경로 자체가 실행되지 않았다.

## 10. 후속 항목

| # | 항목 |
|---|------|
| 1 | `supplierCommissionApi.getCommissions()` 가 오류를 삼키고 `[]` 를 반환해, **로드 실패와 0건이 화면에서 구분되지 않는다**. WO §9 의 "수수료 정책을 불러오지 못했습니다." 를 정확히 띄우려면 API client 의 error surface 변경이 필요 → 계약 변경이라 본 WO 범위 밖 |
| 2 | 인라인 style 기반 table/card → 표준 `DataTable` 전환 검토 (본 WO 는 새 UI 패턴 도입 금지라 유지) |
| 3 | 실데이터(정책 1건 이상 + 공급자 상품 1건 이상) 확보 후 표·상태 배지·수정 폼 프리필·금액 validation 검증 |
| 4 | 모바일에서 고정 하단 탭바(전역 셸)가 본문 하단과 겹쳐 보이는 구간이 있다. 본 페이지 전용 문제가 아니라 공통 셸 이슈로 판단해 접촉하지 않았다 |

---

## 11. 커밋

| 커밋 | 내용 |
|------|------|
| `8daee03b5` | `refactor(neture): localize supplier partner commissions UI` — 문구 한국어화 |
| `b3a7ffed7` | `fix(neture): keep supplier commission header button on one line on mobile` — §7-1 반응형 보정 |
| (본 문서) | CHECK 문서 |

전 커밋 path-specific stage. `git add .` / `git commit -am` 미사용, 타 세션 dirty 파일(`pnpm-lock.yaml`, `apps/api-server/src/scripts/otc-v2-*.mjs`) 미접촉.
