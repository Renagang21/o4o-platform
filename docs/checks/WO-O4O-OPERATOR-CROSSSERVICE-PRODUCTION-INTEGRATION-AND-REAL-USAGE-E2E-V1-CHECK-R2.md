# WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1 — CHECK (R2)

- **작성일**: 2026-08-14
- **선행 회차**: [1회차 CHECK](WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1-CHECK.md) — Neture·PharmacyHub 를 **CONDITIONAL** 로 남기고 종료했다.
  본 R2 는 그 잔여(write E2E 미수행 2서비스)를 닫고 전 서비스를 재검증한 기록이다.
- **대상**: KPA-Society / K-Cosmetics / Neture / PharmacyHub (공식 4서비스) · GlycoPharm(공유 모듈 회귀만)
- **검증 방식**: 프로덕션 도메인 · Playwright chromium
  - desktop 1440×900 · mobile 390×844
  - 표시 메뉴는 **사이드바 접이식 그룹을 하나씩 펼쳐 DOM 에서 수집**한 뒤 전수 방문
  - 모든 방문은 `page.goto` 직접 진입(= deep link · 전체 문서 로드)
  - 계측: `fetch` + `XMLHttpRequest` 후킹 + `window.error` / `unhandledrejection`
  - 자격증명은 `docs/local/TEST-ACCOUNTS.local.md`(git 추적 제외) 에서 런타임에 읽는다. 본 문서에 값 없음.

---

## 1. main 통합 · 배포

| 항목 | 결과 |
|------|------|
| Operator 공통화 통합 | **이미 완료** — `git merge-base --is-ancestor work/operator-commonization-v1 origin/main` **통과**. 최종 공통화 commit `1446396d3` 는 merge `fa62c8052` 로 main 에 들어와 있고, branch→main **ahead 0** |
| 본 회차 커밋 | `7ce0f5457` (결함 4건) · `b0861d683` (배포 후 실측으로 남은 모바일 overflow 1건) |
| Deploy Web Services | `7ce0f5457` **success** · `b0861d683` **success** |
| Deploy API Server | `7ce0f5457` **success** (프로덕션 응답으로 반영 확인 — §4 D3) |
| Deploy Admin Dashboard | `7ce0f5457` **success** |
| CI Pipeline | `7ce0f5457` · `b0861d683` 모두 **타 세션 연속 push(`c7d35b73f` · `4e62945ad` …)로 concurrency cancelled**. 실패가 아니며 green run 을 확보하지 못했다. 대체 검증은 아래 로컬 게이트 |
| 로컬 게이트 | `@o4o/api-server` `tsc --noEmit` **0** · `@o4o/ui` `tsc --noEmit` **0** · `@o4o/web-neture` build **PASS** · `@o4o/web-k-cosmetics` build **PASS** · 변경 파일 `eslint` **error 0** (기존 warning 3건 개수 불변) |

---

## 2. 로그인 채널 — 사실대로

WO 는 "각 서비스에서 **실제 계정 로그인부터**" 를 요구한다. 실측 결과는 서비스별로 다르다.

| 서비스 | 로그인 폼 실제 로그인 | 근거 | 이번 검증에 쓴 채널 |
|--------|:---:|------|------|
| **PharmacyHub** | ✅ **200** | `sohae2100` 은 `pharmacy-hub` 에 L2 credential 이 없어 L1 fallback 으로 통과. 토큰 roles 에 `pharmacy-hub:operator` 포함 | **실제 폼 로그인** |
| **KPA-Society** | ❌ **401 `INVALID_CREDENTIALS`** | `serviceKey='kpa-society'` 로 1회 실측. L2 service credential 미확보(TEST-ACCOUNTS §2 전량 unknown) | TEST-ACCOUNTS **§4-2 L1 토큰 주입 우회** |
| **K-Cosmetics** | ❌ 동일 | 동일 (`serviceKey='k-cosmetics'` 로그인 401) | 동일 |
| **Neture** | ❌ 동일 | 동일 | 동일 |

- 우회 채널의 토큰은 **운영자 실권한 그대로**다 — roles 12개(`kpa:operator` · `cosmetics:operator` · `neture:operator` · `kpa:admin` …), memberships 6개 active. 화면 필터·API 응답은 실제 운영자와 동일하게 판정된다.
- **`platform:super_admin`(`renariver21`) 은 4서비스 모두 폼 로그인 200 이지만 대체 채널이 될 수 없다.**
  KPA 는 `KPA_SCOPE_CONFIG.platformBypass = false` 라 `GET /api/v1/kpa/operator/dashboard` **403** 이고(실측),
  나머지 서비스에서도 `adminOnly` 메뉴가 함께 보여 **운영자 시점이 아니다.**
- 따라서 **KPA·K-Cosmetics·Neture 의 "로그인 폼 통과" 자체는 이번에도 검증하지 못했다.** §7 차단 요소 참조.

---

## 3. 서비스별 결과

표시 메뉴 = 사이드바에서 실제로 보이는 `/operator`·`/admin` 링크(접이식 그룹 전개 후 수집).

| 서비스 | 로그인 | /operator | 표시 메뉴 / 검증 | 조회 E2E | write E2E | desktop·mobile | dead link | white·JS | 판정 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **KPA-Society** | 우회(§2) | PASS | **37 / 37** (mobile 38/38) | PASS | **PASS** | PASS | **0** (링크 패턴 43건 전수) | 0 / 0 | **PASS** |
| **K-Cosmetics** | 우회(§2) | PASS | **30 / 30** (mobile 30/30) | PASS | **PASS** | PASS | 1건 → **수정 후 0** | 0 / 0 | **PASS** |
| **Neture** | 우회(§2) | PASS | **19 / 19** (mobile 20/20) | PASS | **PASS** | 수정 후 PASS | 7건 → **수정 후 0** | 0 / 0 | **PASS** |
| **PharmacyHub** | ✅ 실제 200 | PASS | **2 / 2** (mobile 2/2) | PASS | **PASS** | PASS | **0** | 0 / 0 | **PASS** |
| GlycoPharm(회귀만) | 우회(§2) | PASS | 36 / 36 (mobile 36/36) | 기존 403 2건 외 이상 없음 | — | PASS | — | 0 / 0 | **회귀 없음** |

**메뉴 정의 대조** — `operatorMenuGroups.ts` 의 항목과 DOM 표시 항목을 기계 대조했다.

- KPA 37/37 · K-Cosmetics 30/30 · PharmacyHub 2/2 — **정의 = 표시, 누락 0**
- Neture 는 정의 68건 중 22건이 `adminOnly` + 나머지가 admin 사이드바 전용이라, 운영자 모드 표시 19건이 전부 방문됐다(설계대로).

### PharmacyHub 채택 범위 (WO §4)

PharmacyHub 운영자 영역은 **대시보드 + 가입 신청 관리 2화면**이 설계값이다.
화면 자체가 "현재 운영자 영역의 업무는 가입 신청 승인·반려입니다. 공급자 ↔ 약국 간 상품 거래와
공급자 콘텐츠 전달에는 운영자가 개입하지 않습니다." 라고 명시한다.
회원관리·사이니지 HQ·QR·운영 분석은 **업무 자체가 이 서비스에 없다** → `SERVICE_SPECIFIC`.
가입 승인은 공통 `@o4o/operator-core-ui` `OperatorMembersConsolePage(consoleMode='approval')` 를 채택하고 있고,
이번 회차에 **승인·반려 write 를 실제로 수행**해 채택이 동작함을 확인했다(§5).

---

## 4. 수정한 실기능 결함 (`7ce0f5457` · `b0861d683`)

### D1. Neture `/operator/ai/asset-quality` dead link 8건

페이지가 자체 서브내비 7개(`/operator/ai-admin` · `/engines` · `/policy` · `/asset-quality` · `/cost` ·
`/context-assets` · `/composition-rules`)와 서비스 카드의 '상세 보기' 1개
(`/operator/ai-admin/asset-quality/:serviceId`)를 렌더했는데, **실제 route 는 `/admin/ai-admin/**` 뿐**이다.
`0e36444cd`(WO-O4O-NETURE-ROUTE-UNIFICATION-BIG-SWITCH-V1)의 `/workspace/operator → /operator` 일괄
치환 잔재다. 프로덕션에서 8건 모두 404 렌더를 실측했다.

내비게이션은 운영자 셸 사이드바가 제공하므로 **링크 재지정이 아니라 블록 제거**로 처리했다.
같은 변경으로 셸 헤더와 중복이던 페이지 자체 `<header>` 도 사라진다.

> 같은 계열 파일 7개(`AiAdminDashboardPage` · `AiCostPage` · `AiEnginesPage` · `AiPolicyPage` ·
> `AnswerCompositionRulesPage` · `ContextAssetFormPage` · `ContextAssetListPage`)도 동일한 죽은 링크를
> 갖고 있으나 **운영자 메뉴에서 도달할 수 없고 `/admin/*` 표면에만 있어** 이번 범위 밖이다 → §8 별도 WO.

### D2. Neture `/operator/orders` 모바일 가로 스크롤

탭 줄(전체/대기 중/처리중/발송/완료)이 390px 에서 문서를 밀어냈다(`document.scrollWidth` **479 > 390**).
탭 줄만 `overflow-x-auto`, 탭은 `whitespace-nowrap` + `flex-shrink-0` — 1회차의 `MemberListLayout` 과 동일 처리.
배포 후 실측 **390 = 390** (해소).

### D3. K-Cosmetics `/operator` Quick Actions '콘텐츠 관리' dead link

`cosmetics/controllers/operator-dashboard.controller.ts` 가 `/operator/content` 를 내려주는데
K-Cosmetics 의 실제 route 는 `/operator/content-management` 다. 경로만 정렬했다.
배포 후 프로덕션 응답 실측: `"link": "/operator/content-management"` · 화면 앵커 13건 중 dead **0**.

### D4. K-Cosmetics `/operator/ai-report` 가 Mock 데이터를 실적처럼 노출

`aiReportConfig.tsx` 가 `mode: 'full'` + **하드코딩 Mock** 이었다 — 가상 KPI(1,834 / 5,678 …),
가상 제품명("수분크림 글로우 에디션"), 가상 매장("뷰티랩 강남점"), 가상 인사이트 문구가
운영자 화면에 실제 분석 결과처럼 표시되고 있었다.

**Context Asset 노출 분석 backend 는 존재하지 않는다** (api-server 전체에 `context_asset` / `ContextAsset`
엔티티·라우트 **0건**). 즉 실데이터가 될 수 없는 화면이었다.
KPA-Society · Neture 가 이미 쓰는 **canonical empty mode 로 정렬**했다.

부작용 1건을 함께 막았다 — 공통 `AiReportPage` 의 empty 분기가 `headerActions` 를 렌더하지 않아
K-Cosmetics 가 주입하는 **AiSummaryButton(실기능)이 사라지는 회귀**가 생긴다. empty 분기에 렌더를 추가했다
(미주입 서비스는 `undefined` → 렌더 없음). 배포 후 실측: mock 흔적 **없음** · empty state **표시** · AI 요약 버튼 **유지**.

### D5. Neture Asset Quality 서비스 카드 헤더 모바일 가로 스크롤 (`b0861d683`)

D1 배포 후 재측정에서 `scrollWidth` **414 > 390** 이 남아 있었다. 원인은 헤더가 아니라
서비스 카드 헤더 행이었다 — 좌측 서비스명 블록과 우측 배지 묶음(패키지 %/높음/보통/낮음/대기 + chevron)이
한 줄 고정이었다. `flex-wrap` + `min-w-0`/`truncate` + 배지 묶음 wrap 으로 정렬했다.

> **1회차 대비**: "배포 후 실측" 을 한 번 더 돌려서 D1 수정이 overflow 를 **다 해소하지 못했다**는 사실을 잡아냈다.
> 수정 직후가 아니라 배포 후에 같은 지표를 다시 재는 절차가 필요하다는 근거다.

### 배포 후 최종 재검증 (`b0861d683` 배포 완료 시점)

| 확인 | 이전 | 이후 |
|------|:---:|:---:|
| Neture `/operator/ai/asset-quality` — `/operator/ai-admin*` 앵커 | 7 (+상세보기 1) | **0** |
| Neture `/operator/ai/asset-quality` 390px `scrollWidth` | 414 > 390 | **390 = 390** |
| Neture `/operator/orders` 390px `scrollWidth` | 479 > 390 | **390 = 390** |
| Neture 운영자 전 화면(mobile 20건) overflow | 2건 | **0건** |
| K-Cosmetics `/operator` 앵커 `/operator/content` | 1 (404) | **0** · `/operator/content-management` 2 |
| K-Cosmetics `/operator` 앵커 13건 dead | 1 | **0** |
| K-Cosmetics `/operator/ai-report` Mock 흔적 | 노출 | **없음** (empty state 표시 · AI 요약 버튼 유지) |
| `GET /api/v1/cosmetics/operator/dashboard` quickAction link | `/operator/content` | **`/operator/content-management`** |

---

## 5. write E2E — 4서비스 전부 수행

| 서비스 | 대상 | 경로 | 결과 | 잔여 |
|--------|------|------|:----:|:---:|
| **KPA-Society** | 매장 HUB 블로그 | 생성 → 발행 → 보관 → 삭제 (브라우저 실조작) | **201 → 200 → 200 → 200** | **0** |
| **K-Cosmetics** | 매장 HUB 블로그 | 동일 | **201 → 200 → 200 → 200** | **0** |
| **Neture** | 안내 문구 관리(`/operator/guide-contents`) | 저장 → 새로고침 영속 확인 → 원복 → 원복 확인 | **201 → 영속 확인 → 200 → 원상복구 확인** | **0** |
| **PharmacyHub** | 가입 승인 콘솔(`/operator/memberships`) | 공개 `/join` 신청 2건 생성 → 승인 1건 · 반려 1건 | **201·201 → approve 200 · reject 200** | 테스트 계정 2건(§7) |

세부:

- **KPA / K-Cosmetics** — 이번 검증에서 새로 만든 행만 대상. 발행 노출 구간은 초 단위이고 즉시 보관·삭제했다.
  삭제 affordance 는 행 액션 overflow('더보기') 안에 있어 그 경로로 실행했다. 종료 후 목록 잔여 **0건** 재확인.
- **Neture** — 1회차에서 미수행이던 항목. `lms.lesson.editor / live` 섹션은 override 가 없는 기본 상태였으므로,
  저장으로 override 를 만든 뒤 **canonical `DELETE /api/v1/guide/contents`(기본값 복귀)** 로 되돌렸다
  (UI 에 삭제 affordance 가 없어 guide-client 와 동일한 endpoint 를 사용). 최종 3개 필드 모두 저장 전 값과 일치.
- **PharmacyHub** — 1회차의 차단 사유("대기 상태의 테스트용 가입 신청 데이터 없음")를 **공개 가입 흐름으로 해소**했다.
  기존 대기 건(실사용자 신청)에는 손대지 않았고, `[E2E_TEST]` 로 라벨링한 신규 신청 2건만 처리했다.
  최종 상태 실측: 승인 건 `status=active` · `approvedAt` 기록 / 반려 건 `status=rejected` · `rejectionReason` 기록.

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|------|:---:|
| 최신 main 통합 및 production 배포 | ✅ (§1) |
| 공식 4서비스 실제 로그인 PASS | ⚠️ **PharmacyHub 만 실제 폼 로그인.** KPA·K-Cosmetics·Neture 는 L2 credential 미확보로 401 — §2·§7 |
| `/operator` 진입 PASS | ✅ 4/4 |
| 표시 메뉴 전수 브라우저 PASS | ✅ 37/37 · 30/30 · 19/19 · 2/2 (mobile 별도 전수) |
| route / deep link / 새로고침 PASS | ✅ 전 방문이 직접 진입(full document load) |
| desktop / mobile PASS | ✅ (Neture overflow 2건 수정 후) |
| 핵심 조회 API PASS | ✅ 4서비스 4xx/5xx **0** |
| 안전한 범위 write E2E PASS | ✅ **4/4 서비스** |
| dead link 0 | ✅ 8건 수정 후 **0** (KPA 43 · K-Cos 35 · Neture 34 · PH 2 패턴 전수) |
| 준비 중 / placeholder 0 | ❌ **미충족 1건** — `/operator/ai-report` (KPA · Neture · 이번에 정렬한 K-Cosmetics) — §7 |
| white screen 0 | ✅ |
| JS exception 0 | ✅ |
| CI / typecheck / build PASS | ⚠️ typecheck·build 로컬 PASS. **CI Pipeline 은 concurrency 로 cancelled** — §1 |

---

## 7. 남은 차단 요소 · 미충족 항목 (숨기지 않음)

| # | 항목 | 필요한 것 | 왜 이번에 못 닫았나 |
|---|------|-----------|--------------------|
| 1 | **KPA·K-Cosmetics·Neture 실제 폼 로그인** | 해당 서비스의 **L2 service credential 비밀번호** | Identity V2 계약상 credential 이 있으면 `users.password` 로 fallback 하지 않는다. 해소 절차는 각 서비스 `/forgot-password` **메일 재설정**(계정 소유자만 가능). 추측·대입 금지 규칙이 있어 시도하지 않았다 |
| 2 | **`/operator/ai-report` "분석 데이터 준비 중"** | Context Asset 노출 분석 **backend**(수집·저장·집계) | api-server 에 관련 엔티티·라우트 0건. 신규 테이블·API 는 CLAUDE.md 중지 조건(DB schema 변경) → 별도 WO |
| 3 | **Neture `/operator/ai/asset-quality` 가 여전히 Mock 데이터** | 위 2번과 같은 backend + 개선요청 저장소 | 화면의 서비스 요약·개선 요청 목록이 전부 `mockServiceSummaries` / `mockImprovementRequests` 다. dead link·중복 헤더·overflow 는 고쳤으나 **데이터 원천은 없다.** 은퇴할지 구현할지는 제품 판단 |
| 4 | **GlycoPharm `/operator/ai-report` 도 동일한 Mock** | 위와 동일 | GlycoPharm 은 본 WO 의 적용 대상이 아니라 회귀 확인만 하도록 지정돼 수정하지 않았다 |
| 5 | **CI Pipeline green run** | 다른 세션 push 가 없는 구간 | 타 세션 연속 push 로 계속 cancelled |
| 6 | **PharmacyHub 테스트 계정 2건 잔여** | 정리 승인 | `e2e.test.ph.20260814.approve@example.com`(active) · `…reject@example.com`(rejected). 비밀번호는 무작위 생성 후 어디에도 기록하지 않아 로그인 불가. 기존 `e2e.test.ph.w9.owner@example.com` 과 동일 성격 |

### 정책성 항목 (수정하지 않음 · 보고)

| 항목 | 상태 | 판단 |
|------|------|------|
| KPA `/operator` 에 `platform:super_admin` 진입 허용 vs backend 403 | frontend `KPA_ROLES` 는 super_admin 허용, backend `KPA_SCOPE_CONFIG.platformBypass=false` 는 차단 | 화면은 오류 안내로 graceful 하지만 **frontend·backend 계약 불일치**다. 권한 정책 변경은 중지 조건 → 별도 WO |
| GlycoPharm `/api/ai/admin/**` 403 2건 | `requireAdmin`(=`platform:super_admin` 단독) | 1회차와 동일. GlycoPharm 은 적용 대상 아님 |
| GlycoPharm `/operator/settings` · `/operator/community` · `/operator/analytics` "준비 중" | GlycoPharm 고유 화면 | 공통화 회귀 아님(기존 상태). 적용 대상 아님 |
| KPA `/admin` 약관·개인정보 404 2쌍 | `legal/documents/published/{terms,privacy}` 미게시 | 코드 결함 아닌 **콘텐츠 미등록**. 화면은 정상 폴백 |
| `/operator/lms` "준비중" | 강의 **상태 필터 라벨** | placeholder 오탐 (1회차와 동일 판정) |

---

## 8. GlycoPharm 공유 모듈 회귀

| 확인 | 결과 |
|------|------|
| 표시 메뉴 전수 (desktop 36 / mobile 36) | JS exception **0** · white screen **0** |
| 4xx/5xx | **2건** — `/api/ai/admin/billing` · `/api/ai/admin/quotas/status` 403 (기존 정책, 1회차 기록과 동일) |
| 모바일 가로 스크롤 | **0건** — 1회차에서 넣은 `MemberListLayout` 탭 줄 수정이 유지되고 있다 |
| 이번 변경(공통 `AiReportPage` empty 분기) 영향 | GlycoPharm 은 `mode:'full'` 이라 empty 분기를 타지 않는다. `headerActions` 미주입 → 렌더 변화 없음 |

---

## 9. 별도 WO 제안

1. **Context Asset 분석 backend 부재** — `/operator/ai-report`(4서비스) · Neture `/operator/ai/asset-quality` 의
   데이터 원천 신설 또는 화면 은퇴 결정. Mock 잔존(GlycoPharm ai-report, Neture asset-quality) 처리 포함.
2. **Neture `/admin/ai-admin/**` 계열 7개 파일의 `/operator/ai-admin/**` dead link** — admin 표면 전수 정리.
3. **KPA frontend RoleGuard(super_admin 허용) ↔ backend `platformBypass=false` 불일치** 정합.
4. **1회차에서 넘어온 것** — `/operator/ai-card-report` · `/operator/ai-operations` 메뉴 진입점 부재 처리(은퇴 vs admin 승격).
5. **테스트 계정 라이프사이클** — `[E2E_TEST]` PharmacyHub 계정 정리 정책(보존/정지/삭제) 확정.

---

## 10. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건 (§9)

> 1회차 CHECK 는 그 시점 사실 기록이므로 수정하지 않고 본 R2 를 후속 회차로 남긴다
> (`docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1` — 기록물 비대상).
