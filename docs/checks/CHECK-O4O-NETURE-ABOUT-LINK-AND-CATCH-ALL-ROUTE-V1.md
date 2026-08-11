# CHECK-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1

> WO: `WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1`
> 작업일: 2026-08-11 · 기준 commit: `0df187485` → 구현 commit: `af62069a7`
> 결과: **PASS**

---

## 1. 기준 commit

| 항목 | 값 |
|------|-----|
| 기준 (작업 시작) | `0df187485` |
| 구현 | `af62069a7` |
| CHECK 문서 | 본 문서 (후속 commit) |
| 브랜치 | `main` (직접 작업) |

---

## 2. `/about` 링크 조사 결과

`services/web-neture/src` 전수 grep 결과, 작업 전 살아있는 `/about` 링크는 **1건**이었다.

| 파일 | 상태 (작업 전) | 처리 |
|------|------|------|
| `components/layouts/PartnerSpaceLayout.tsx:237` | footer 에 `<Link to="/about">About</Link>` — route 없음 → 클릭 시 빈 화면 | **제거** (Contact Us 만 유지) |
| `components/layouts/NetureLayout.tsx` | 이미 제거됨 (`WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1`) | 변경 없음 |
| `components/layouts/SupplierSpaceLayout.tsx:371` | 이미 제거됨 — 단, 주석이 "catch-all 도 없어 빈 화면" 이라 이번 변경 후 사실과 어긋남 | **주석만 갱신** (코드 변경 없음) |

작업 후 `services/web-neture/src` 내 살아있는 `/about` 링크 **0건**. 문자열 `"/about"` 은 WO 주석에만 남는다.
실브라우저 sweep 에서도 전 경로 `document.querySelectorAll('a[href="/about"]').length === 0` 으로 재확인했다(§5).

---

## 3. catch-all route 적용 위치

| 파일 | 내용 |
|------|------|
| `services/web-neture/src/pages/NotFoundPage.tsx` | **신규** — API 호출 0 · layout 비의존 독립 화면 |
| `services/web-neture/src/App.tsx` | `<Routes>` **최하단**에 `<Route path="*" element={<NotFoundPage />} />` 추가 |

설계 판단 2가지 (기록):

- **redirect 가 아니라 render** — 요청 주소를 그대로 유지하고 그 자리에서 404 를 보여준다.
  redirect 로 흡수하면 사용자는 "왜 홈으로 튕겼는지" 를 알 수 없고, WO §5 의 "redirect 대량 정책 변경 금지" 와도 맞지 않는다.
- **layout 밖에 둔다** — `/o4o/**` 처럼 layout 컨텍스트(auth·role)를 얻을 수 없는 경로에서도 렌더돼야 하므로
  `SupplierSpaceLayout` · `PartnerSpaceLayout` · `NetureLayout` 어디에도 넣지 않았다.

React Router v6 특성상 `path="*"` 는 **가장 낮은 우선순위**로만 매치되므로, 위에 선언된 기존 route·redirect 는
전부 더 구체적이어서 영향을 받지 않는다. 기존 route 삭제·변경 0건(§7).

---

## 4. 정상 route 회귀 결과

계정: `renagang21@gmail.com` (Neture 공급자2) — 자격증명 SSOT `docs/local/TEST-ACCOUNTS.local.md`
프로덕션 `https://neture.co.kr` · 배포 리비전 = commit `af62069a7`

| 경로 | h1 | 판정 |
|------|-----|:---:|
| `/` | `Neture` | ✅ 정상 |
| `/supplier/dashboard` | `공급자 홈` (KPI·업무 바로가기 전부 렌더) | ✅ 정상 |
| `/partner/dashboard` | `접근 권한 없음` | ✅ 정상 (아래 주) |
| `/guide/business` | `Business Guide` | ✅ 정상 |
| `/contact` | `문의하기` | ✅ 정상 |
| `/store/cart` | `장바구니` | ✅ 정상 |

> **`/partner/dashboard` 주** — 검증 계정이 공급자라서 기존 guard 가 `접근 권한 없음` 을 렌더한 것이다.
> **빈 화면도 404 화면도 아니다** = route 는 정상 매치되고 있으며 catch-all 에 먹히지 않았다는 증거다.
> 권한 화면이 뜨는 것은 이번 변경 이전과 동일한 기존 동작이며, WO §5 "권한/role 변경 금지" 에 따라 손대지 않았다.

**console error 0건** (인증 상태 sweep 전 구간).
비인증 상태로 먼저 돌린 1차 sweep 에서는 `401 /api/v1/auth/me` · `401 /api/v1/auth/refresh` · `/store/cart/neture/groups` 에러가 있었으나
모두 로그인하지 않은 세션 때문이고 이번 변경과 무관하다 — 인증 후 재실행하여 0건임을 확인했다.

**redirect loop 0건** — 모든 요청 경로에서 `location.pathname === 요청 경로` 유지.

---

## 5. 없는 route smoke 결과

| 요청 경로 | 도착 주소 | h1 | 404 안내 | `a[href="/about"]` |
|------|------|-----|:---:|:---:|
| `/about` | `/about` | 요청하신 페이지를 찾을 수 없습니다. | ✅ | 0 |
| `/not-existing-test` | `/not-existing-test` | 〃 | ✅ | 0 |
| `/supplier/not-existing-test` | `/supplier/not-existing-test` | 〃 | ✅ | 0 |
| `/partner/not-existing-test` | `/partner/not-existing-test` | 〃 | ✅ | 0 |
| `/o4o/removed-test` | `/o4o/removed-test` | 〃 | ✅ | 0 |

전 경로에서 **요청 주소가 그대로 보존**됐다(`at === req`). 빈 화면 0건.

404 화면 구성 (WO §4 문구 방향 준수):

- `404` · **요청하신 페이지를 찾을 수 없습니다.**
- 주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
- 요청한 경로 표시 (`location.pathname`)
- **홈으로 이동** (`<Link to="/">`) · **이전 화면으로 돌아가기** (`navigate(-1)`)

별도로 하드 내비게이션(`https://neture.co.kr/not-existing-test` 직접 진입)으로도 동일 화면을 확인했다 —
SPA 내부 전환뿐 아니라 주소창 직접 입력·외부 링크 유입에서도 동작한다.

---

## 6. typecheck · build · deploy 결과

| 항목 | 명령 | 결과 |
|------|------|:---:|
| typecheck | `npx tsc --noEmit -p tsconfig.json` (`services/web-neture`) | ✅ PASS (출력 없음) |
| build | `pnpm run build` (`services/web-neture`) | ✅ PASS (20.58s) |
| deploy | `Deploy Web Services (Cloud Run)` run **31448597299** | ✅ success — `deploy-neture: success` |

> `pnpm --filter @o4o/web-neture run type-check` 는 **존재하지 않는다** (web-neture 의 script 는 `dev build preview start` 뿐).
> 그래서 패키지 디렉터리에서 `tsc --noEmit` 을 직접 실행했다. 숨기지 않고 기록한다.

같은 워크플로의 다른 서비스 job 은 detect-changes 에 의해 skip 됐다.
**API 배포 없음** (WO §7 준수) — 백엔드 파일 변경 0건.

---

## 7. 변경 파일 (commit `af62069a7`, +115/−2)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/NotFoundPage.tsx` | **신규** (+100) |
| `services/web-neture/src/App.tsx` | import 1줄 + 최하단 catch-all route (+10) |
| `services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx` | `/about` dead link 제거 (+2/−1) |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 주석만 갱신 (+3/−1) |

---

## 8. 금지사항 준수 (WO §5)

| 금지 | 준수 |
|------|:---:|
| backend 변경 | ✅ 없음 (변경 파일 4건 전부 `services/web-neture/src`) |
| redirect 대량 정책 변경 | ✅ 없음 (redirect 0건 추가 · 404 를 그 자리에 렌더) |
| 기존 route 삭제 | ✅ 없음 (route 추가 1건뿐) |
| 권한 / role 변경 | ✅ 없음 (guard 코드 무접촉 — `/partner/dashboard` 권한 화면 그대로) |
| Neture IA 대개편 | ✅ 없음 (메뉴 구조 무변경 · footer dead link 1건만 제거) |
| DB write | ✅ 없음 |
| migration | ✅ 없음 |
| partnerops package / app_registry 변경 | ✅ 없음 |

---

## 9. commit SHA · push 결과

| 항목 | 값 |
|------|-----|
| 구현 commit | `af62069a7` |
| push | ✅ 완료 — `0df187485..af62069a7` → `origin/main` |
| stage 방식 | path-specific (`services/web-neture/src`) — 다른 세션 파일·lockfile 미포함 |
| 작업 트리 | clean |

---

## 10. 후속 후보 (본 WO 범위 아님)

1. `WO-O4O-NETURE-ABOUT-PAGE-DECISION-V1` — `/about` 을 404 로 둘지, 실제 소개 페이지(`/guide/intro` 통합 포함)를 만들지 판단
2. `WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1` — KPA / GlycoPharm / K-Cosmetics / Pharmacy-Hub 에도 동일한 catch-all 부재 여부 전수 확인
3. `WO-O4O-NETURE-NOTFOUND-SHARED-COMPONENT-V1` — 서비스별 404 화면이 늘어나면 공통 패키지로 승격

---

## 11. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

(§16-1 대상인 기준 문서 — `docs/baseline/` · `docs/architecture/` · `docs/rules/` 등 — 를 이번 작업에서 참조하지 않았다.
`SupplierSpaceLayout.tsx` 의 낡은 주석 1건은 문서가 아니라 **소스 코드**이며, 이번 변경으로 사실이 바뀐 부분이라 WO 범위 안에서 갱신했다.)
