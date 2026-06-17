# CHECK-O4O-STORE-HOME-GLYCOPHARM-CANONICAL-SHELL-SMOKE-V1

> **작업명:** SMOKE-O4O-STORE-HOME-GLYCOPHARM-CANONICAL-SHELL-V1
> **유형:** 배포 후 browser smoke — WO-O4O-STORE-HOME-CANONICAL-SHELL-V1(StoreHomeShell + GlycoPharm adopt) 운영 회귀 검증.
> **결과: PASS — GlycoPharm `/store` 홈이 StoreHomeShell 적용 후에도 기존 렌더 순서·의미를 그대로 유지. 홈 console error 0, 홈 API 4xx/5xx 0(전부 200), 사이드바·반응형 무회귀. 인사이트 action 네비게이션(공통 셸 신규 경로) 동작 확인.**
> 선행: WO-O4O-STORE-HOME-CANONICAL-SHELL-V1 (커밋 `b47e1dfe9`)
>
> *Date: 2026-06-17*

---

## 1. 배포 커밋 / 환경

| 항목 | 값 |
|------|------|
| WO 커밋 | `b47e1dfe9` (feat(store-ui-core): canonical StoreHomeShell + GlycoPharm adopt) |
| 배포 이슈 | WO 커밋의 Web 배포가 동시 세션 KPA 커밋(`6418988ee`) push tip 으로 **cancelled** + detect-changes tip-only(KPA 전용) → glycopharm 재배포 skip |
| 처리 | `gh workflow run deploy-web-services.yml -f service=glycopharm` 명시 dispatch (run 27659310355) → **success** |
| 라이브 이미지(검증 시점) | `glycopharm-web` image sha `6418988ee…` (= `b47e1dfe9` 포함 확인: `git merge-base --is-ancestor b47e1dfe9 6418988ee` ✓) |
| 검증 URL | https://glycopharm.co.kr/store |
| 계정 | GlycoPharm 약국(store owner) — TEST-ACCOUNTS.local SSOT |
| 도구 | Playwright MCP (Chrome), desktop 1440×900 / mobile 390×844 |

---

## 2. Desktop smoke 결과

| # | 검증 | 결과 |
|---|------|------|
| 1 | 로그인 후 `/store` 진입 | ✅ 진입(인증 세션, 사이드바 "내 약국 홈" 렌더) |
| 2 | StoreDashboardLayout / StoreSidebar / 상단 헤더 | ✅ 정상(헤더 GlycoGlobalHeader, 좌측 사이드바 "내 매장 관리" 9그룹) |
| 3 | `/store` 홈 본문 렌더 | ✅ 정상(로딩 → 정착) |
| 4 | **렌더 순서 유지** | ✅ 헤더 → **새로고침** → **AI 운영 요약** → **경영 인사이트** → **매출/매장 카드** → footerNote |
| 5 | 인사이트 의미 유지 | ✅ 🔴 "이번 달 매출이 없습니다" / 🔵 "비활성 채널이 1개" / 🔵 "진열 상품이 0개" + recommendation + action 버튼 |
| 6 | 주요 CTA / action 네비게이션 | ✅ 경영 인사이트 "상품 관리로 이동 →" 클릭 → URL `/store/products` 이동(`onInsightAction=navigate` 배선 정상) |
| 7 | 매출/매장 카드 signal | ✅ 상품 "미등록", 디지털사이니지 "미사용" signal 표시(HubLayout 주입) |
| 8 | AI 요약 로드 | ✅ "약국 운영 분석" / 위험도 배지(관찰·주의) / gemini provider / 요약·권장 3건 |

**배너 주의:** 주문/매출 "준비 중" 배너는 **미표시** — 이번 계정은 `orderMetricsReady=true`(매출 0이지만 데이터 준비됨)라 배너 조건(`!orderMetricsReady`) 불충족. 정상 동작(거짓 표시 아님).

**렌더 순서 = WO 전 GlycoPharm 홈과 동일.** StoreHomeShell 이 기존 `beforeSections` 영역(새로고침/배너/AI요약/인사이트)을 그대로 합성하고, 경영 인사이트는 로컬 InsightBlock → 공통 셸 ShellInsightBlock 으로 위임됐으나 마크업·아이콘·action 동일.

---

## 3. Responsive smoke 결과 (390×844)

| 검증 | 결과 |
|------|------|
| 상단 nav → 햄버거 | ✅ "메뉴 열기" 버튼으로 접힘 |
| 사이드바 → drawer | ✅ 닫기 버튼 포함 drawer 모드 전환(lg=1024 표준 breakpoint) |
| 홈 본문 순서 | ✅ desktop 과 동일(새로고침→AI요약→인사이트→매출/매장) |
| 본문 깨짐 | ✅ 없음 |

→ 반응형 사이드바/drawer 는 layout 셸(StoreDashboardLayout) 책임이며 본 WO 무변경. 회귀 없음.

---

## 4. console / API 오류 여부

| 항목 | 결과 |
|------|------|
| 홈 console error | **0** (정착 후) |
| 홈 네트워크 | **전부 200** — `auth/me`, `notifications/unread-count`, cockpit `ai-summary`·`today-actions`·`franchise-services`, `products?pageSize=1`, `store-hub/capabilities`, `footer-legal` |
| 초기 401 1회 | 첫 진입 시 `GET /auth/me` 401 1회 관측 → **재진입 후 200 정상화**(stale 토큰 1회성, 본 WO 무관) |

---

## 5. 발견된 기존 이슈 (회귀 아님 — 기록만, WO §금지 "즉시 수정하지 말 것" 준수)

**`/store/products` 목적지 페이지 ErrorBoundary 오류** — 인사이트/카드 action 으로 이동 시:
- `404` `GET /api/v1/glycopharm/stores/products/storefront-config`
- `404` `GET /api/v1/glycopharm/stores/products`
- `Store load error {status:404}` → `TypeError: m?.includes is not a function` → ErrorBoundary "문제가 발생했습니다"

**판단: 본 WO(`/store` 홈)와 무관한 기존 이슈.**
- 본 WO 변경 범위 = 홈 본문 구성(StoreHomeShell + StoreOverviewPage)뿐. `/store/products` 페이지 코드·인사이트 action target(`/store/products`)은 **무변경**(target 은 기존 computeStoreInsights/card href 그대로).
- 원인 추정: 테스트 약국 계정에 storefront/products 미프로비저닝(404) + products 페이지의 `m?.includes` 타입 방어 부재. **canonical shell 회귀 아님.**
- 후속 후보: `IR-O4O-GLYCOPHARM-STORE-PRODUCTS-404-TYPEERROR-V1`(별도, 본 smoke 와 독립).

---

## 6. 기존 홈 대비 렌더 순서 유지 여부

✅ **유지.** WO 전(인라인 beforeSections) ↔ WO 후(StoreHomeShell) 렌더 순서/의미 동일:
```
[전] 새로고침 → (배너) → AI요약 → 인사이트(local InsightBlock) → 매출/매장 섹션
[후] 새로고침 → (배너) → AI요약 → 인사이트(shell ShellInsightBlock) → 매출/매장 섹션
```
인사이트 렌더 주체만 로컬 → 공통 셸로 위임, 시각/동작 결과 동일.

---

## 7. 판정

**PASS.**
- GlycoPharm `/store` 홈 정상 렌더, StoreHomeShell 적용 후 기존 렌더 순서·의미 유지.
- 공통 셸 신규 경로(인사이트 action 네비게이션) 동작 확인.
- 홈 console error 0 / 홈 API 전부 200 / 사이드바·반응형 무회귀.
- 발견된 `/store/products` 오류는 본 WO 무관 기존 이슈(회귀 아님)로 분리 기록.

→ **후속 K-Cosmetics adopt 진행 가능.**

## 8. 후속

1. **`WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1`** — `storeSelectorSlot`(다중매장) 포함 adopt. (KCos 홈 = `StoreCockpitPage`)
2. **`WO-O4O-STORE-HOME-KPA-ADOPT-V1`** — KPA `StoreHomePage` adopt, 실행 흐름 → `onboardingSlot`.
3. (독립, 본 smoke 발견) **`IR-O4O-GLYCOPHARM-STORE-PRODUCTS-404-TYPEERROR-V1`** — `/store/products` 404 + `m?.includes` TypeError 점검.
4. (선택) dead `glycopharm.ai_summary` signal/action 정리(WO-...-GLYCOPHARM-AI-SIGNAL-CLEANUP-V1).

---

*Date: 2026-06-17 · GlycoPharm store home canonical shell post-deploy smoke · PASS · 렌더 순서(새로고침→AI요약→경영인사이트→매출/매장) 유지, 인사이트 공통 셸 위임·action 네비 동작, 홈 console 0/API 200, 반응형 drawer 무회귀 · /store/products 404+TypeError 는 WO 무관 기존 이슈(회귀 아님) 분리 기록 · K-Cosmetics adopt 진행 가능.*
