# CHECK-O4O-PHARMACYHUB-REMAINING-CAPABILITY-AND-KPA-PARITY-REBASELINE-V1

- **WO**: WO-O4O-PHARMACYHUB-REMAINING-CAPABILITY-AND-KPA-PARITY-REBASELINE-V1
- **작업일**: 2026-09-12
- **성격**: **조사/재기준선 전용** — code change 0 · schema change 0 · production write 0
- **기준 SHA**: `origin/main` = `3a7df1296` · 전용 worktree `.claude/worktrees/wo-ph-rebaseline-v1`
- **상위 기준**: [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) — *PharmacyHub = KPA류 공통 매장경영 구조 − (공급승인 + 매장지원) operator capability · supplier ≠ PH 회원*
- **live**: web `pharmacyhub.co.kr` · api `/api/v1/pharmacy-hub/*` (배포 확인)

---

## 1. 핵심 결론 (재기준선)

> **PharmacyHub 는 이미 KPA parity 에 도달했고 유지보수 단계다. 과거 gap 목록은 폐기(obsolete)한다.**
>
> 최신 `origin/main` 실측 결과, PharmacyHub 의 회원·커뮤니티·LMS·콘텐츠·매장실행(Tablet/QR/POP V2/Signage)·운영자·공개 영역은 **공통 Core 소비 + 얇은 PH-specific 어댑터**로 구현이 완료되어 있다. **새로 만들 큰 기능 덩어리가 없다.**
>
> 직전 종합 census([`CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1`](CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1.md), 2026-08-26 `2d375cde1`)이 **N=97 / ADOPTED=91 / PARTIAL=0 / MISSING=0 / INTENTIONAL_DIFFERENCE=5 / OUT_OF_SCOPE=1** 로 parity COMPLETE 를 확정했고, 그 이후 15개 커밋은 전부 **전진(POP V2 · Tablet canonical · QR placement/analytics · Store Execution Home · kiosk · news)** 이며 회귀가 없다.
>
> **따라서 §17 의 예상 묶음(WO-PH-A~D, 2~4개 큰 구현 WO)은 성립하지 않는다.** 실제 잔여는 소수의 마이너 UX 버그(다수가 KPA 공통)와 콘텐츠-운영 사안뿐이다.

```text
PHARMACYHUB CURRENT CAPABILITY MAP   = CLOSED (parity 유지 · 유지보수 단계)
KPA / PH REQUIRED PARITY             = CLOSED (직전 census N=97 재확인 · 회귀 0)
REAL REMAINING GAPS                  = 소수 마이너 (신규 대형 기능 0)
FOLLOW-UP LARGE WOS                  = NOT_JUSTIFIED (2~4 큰 WO 근거 없음)
```

---

## 2. 방법 (read-only)

| 축 | 방법 |
|---|---|
| frontend IA | `web-pharmacy-hub/src/App.tsx` route 전수 + `pages/` 트리 |
| backend surface | `routes/pharmacy-hub/pharmacy-hub.routes.ts` (81 distinct path) + register-routes mount |
| 공통 vs PH-specific | PH frontend 의 `/api/v1/*` 호출 prefix 분포 |
| KPA 비교 | `web-kpa-society/src/App.tsx` route 그룹 대조 |
| 이력 | 직전 parity census CHECK + 이후 PH-touching 커밋 15건 |
| production | `api.neture.co.kr` 무인증 read-only ping (200/401/404 의미) |

---

## 3. 이미 CLOSED — 회귀 확인만 (WO §1)

직전 census 이후 커밋이 모두 이 축을 **전진**시켰다. 재구현 대상 아님.

| 축 | 상태 | 근거 |
|---|---|---|
| My Store 공통 Core · Store Owner 실행 | CANONICAL | store-owner 라우트 81 path 중 다수 · thin adapter |
| Tablet canonical | CANONICAL | `WO-…-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1` (be5eb5fa7) |
| QR canonical + placement | CANONICAL | `WO-…-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1` (95427a42d·57b9fc304) |
| Public kiosk / screen-set viewer | CANONICAL | `ca5b6e8ff` PH Screen Set 공개 랜딩 종결 |
| Store Execution Home | CANONICAL | `WO-…-STORE-EXECUTION-HOME-TABLET-QR-V1` (8f73ef002) |
| POP V2 · KPA/PH POP parity | CANONICAL | `43807e6bc`(POP V2) · `48631bab2`(HUB/library handoff→V2) |
| Header/Footer · Profile 공통화 | ADOPTED | `WO-…-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1` |
| Operator 공통화 본체 | ADOPTED | thin wrapper (`@o4o/operator-core-ui`) 확인 |
| role / store_owner 기본 계약 | ADOPTED | §13 |

**새 drift 발견 0.** (아래 §14 의 `/api/v1/kpa/forum` 는 drift 아님 — 주석이 "PH 는 공통 forum route 를 쓰고 KPA 변형을 참조하지 않는다"를 명시한 것.)

---

## 4~13. 영역별 재계수 (요약)

| # | 영역 | 상태 | 비고 |
|---|---|---|---|
| §4 | Community / Forum | **ADOPTED** | 포럼 hub/목록/작성/댓글/좋아요/참여·고정/요청/my-dashboard/members · 공통 forum-core(`/api/v1/forum/*`, serviceCode=pharmacy-hub) 소비. operator forum(categories/requests/delete/analytics)=thin wrapper |
| §5 | LMS / 강의 | **ADOPTED** | education(course/lesson) · My learning(enrollments/certificates/credits) · instructor(courses/lessons/submissions) · operator LMS · 공통 `/api/v1/lms/*` |
| §6 | Content / Library | **ADOPTED** | store-owned content · library · blog · product-descriptions · multilingual-product-contents · STORE canonical · POP V2 handoff · Tablet/QR 소비. KPA snapshot/control 확장계층 미도입(의도) |
| §7 | Signage / Media | **ACTIVE_CANONICAL** | store-owner signage playlists/media/schedules/player 라우트 실장 · execution model. legacy placeholder 혼입 없음 |
| §8 | Channels / 외부 판매채널 | **NOT_APPLICABLE** | PH store-owner 에 `channels` 라우트 없음 = 현재 사업상 미개발(Naver/Coupang future) → missing 으로 세지 않음 (COMMERCE-BOUNDARY) |
| §9 | Product / B2B / Store Hub | **ADOPTED** | products(공급 offer)·handled-products·register-by-barcode·store-hub·상품상세 · **supplier ≠ PH 회원 계약 유지**(§13) |
| §10 | Store Owner | **CANONICAL** | overview/products/content/tablet/QR/POP/execution/signage/manuals/analytics/multilingual/foreign-visitor 실장. billing/order = B2B 공급주문(cart/orders) canonical |
| §11 | Operator / Admin | **ADOPTED (adapter)** | operator=memberships(승인/거부)+members+forum+content+lms+analytics+roles(전부 `@o4o/operator-core-ui` thin) · admin=legal-terms. **공급승인·매장지원 capability 부재**(baseline 준수) |
| §12 | Public Home | **ADOPTED** | home(CommunityHomePage)·service-guide·guide/*·login·join·news·legal. Marketing Hero 차이는 parity gap 아님 |
| §13 | Auth / Role | **ADOPTED** | `pharmacy-hub:{member,store_owner,operator,admin}` · **supplier 역할/셸 제거됨**(`WO-…-SUPPLIER-ROLE-REMOVAL-V1`, 잔재 0) · pharmacist qualification ≠ role 유지 |

---

## 14. API / DB 잔재 (PH 관련, WO §14)

| 항목 | 결과 |
|---|---|
| dead route (PH) | 0 — production ping 상 실경로 404 없음(무인증은 401) |
| placeholder controller / mock / TODO / 501 | **0** (`routes/pharmacy-hub` · `controllers/pharmacy-hub`) |
| KPA hardcoding | 0 — `/api/v1/kpa/forum` 은 "PH 는 참조 안 함" 주석뿐 |
| supplier 역할 잔재 | 0 |
| frontend placeholder | 0 — 발견된 문자열은 전부 "가짜 카드/placeholder 를 만들지 않는다"는 **anti-placeholder 주석** |

> entity-without-table / table-without-consumer 의 PH 지분은 **직전 schema WO** (`CHECK-O4O-SCHEMA-COMPATIBILITY-RESIDUE-…-V1`)에서 이미 분류됨. 이 WO 에서 repository cleanup 을 재개하지 않는다(WO §14 단서 준수).

---

## 15. Production 실측 (read-only)

| endpoint | code | 의미 |
|---|---|---|
| `/api/v1/pharmacy-hub/service-info` | **200** | 공개 · live |
| `/api/v1/pharmacy-hub/me/access` | **401** | 인증 게이트 · wired (missing 아님) |
| `/api/v1/pharmacy-hub/operator/ping` | **401** | 인증 게이트 · wired |
| `/api/v1/pharmacy-hub/store-owner/dashboard` | **401** | 인증 게이트 · wired |

**404 = 0.** 실경로가 전부 존재하고 권한 게이트가 정상. 테스트 데이터 부재를 missing 으로 판정하지 않음(WO §15 준수).

---

## 16. 최종 capability matrix (도메인 단위)

> 항목 단위 matrix 는 직전 census 의 **N=97 행**이 정본이며 이 WO 가 재확인했다(회귀 0). 아래는 도메인 롤업.

| Capability | KPA | PharmacyHub | Parity 요구 | 현재 상태 | Gap type | 조치 | Priority |
|---|---|---|---|---|---|---|---|
| Community / Forum | ✅ | ✅ | Y | ADOPTED | — | 유지보수 | — |
| LMS / 강의 (learner+instructor+operator) | ✅ | ✅ | Y | ADOPTED | — | 유지보수 | — |
| Content / Library / Blog | ✅ | ✅ | Y | ADOPTED | — | 유지보수 | — |
| Store Execution (Tablet/QR/POP V2/Signage) | ✅ | ✅ | Y | CANONICAL | — | 유지보수 | — |
| Product / B2B 공급주문 / Store Hub | ✅ | ✅ | Y | ADOPTED | — | 유지보수 | — |
| Operator (memberships+forum+lms+content+analytics) | ✅ | ✅ (adapter) | Y | ADOPTED | — | 유지보수 | — |
| 공급 승인 · 매장 지원 operator capability | ✅ | ❌ (의도적 제거) | **N** | PH_SPECIFIC | — | 없음(baseline) | — |
| supplier 회원/셸 | ✅(Neture) | ❌ | **N** | PH_SPECIFIC | — | 없음(baseline) | — |
| 외부 판매채널(Channels) | 부분 | ❌ | **N (현재)** | NOT_APPLICABLE | — | 사업결정 대기 | — |
| Admin 금융/거버넌스 심층 | ✅ | 얇음(legal-terms) | 부분 | INTENTIONAL_DIFFERENCE | — | 유지보수 | — |
| LMS 태그검증 400 vs 500 · 진도 staleness 등 | 동일결함 | 동일결함 | Y | REGRESSION(공통) | 플랫폼 공통 버그 | 소규모 polish | P3 |
| KPA/PH 약관·개인정보 published 문서 | 일부 부재 | 일부 부재 | Y | DATA_CONDITION | 콘텐츠 운영 | 운영 등록 | P3 |
| 수료증 backfill(기존 수료자) | — | 미실행 | Y | 승인 필요 | DB write | 사용자 승인 후 | P3 |

판정값 분포: **ADOPTED(도메인 6) · PH_SPECIFIC(2) · NOT_APPLICABLE(1) · INTENTIONAL_DIFFERENCE(1) · REGRESSION-공통(1) · DATA_CONDITION(1)**. MISSING_ADOPTION = **0**.

---

## 17. 구현 WO 묶음 — **재판정: 큰 WO 불필요**

WO 초안의 예상 묶음(WO-PH-A Community/Forum · B LMS/Content · C Store Owner execution · D Operator/public)은 **모두 이미 CLOSED** 되어 성립하지 않는다. 남은 것은 대형 기능이 아니라 소수 잔여로, 큰 WO 로 묶을 모집단이 없다.

권고:

```text
WO-PH-MAINT (선택, 소규모 · P3)
  - LMS 태그 미입력 400 정규화 (현재 500) — KPA/PH 공통 백엔드 · 플랫폼 공통 수정
  - operator LMS 목록 유형/레슨수/진도 staleness 표시 — 공통 endpoint · KPA 동반 개선
  - 퀴즈 (신규) 라벨 갱신
  ※ 전부 공통 Core 결함이라 "PharmacyHub WO" 가 아니라 플랫폼 공통 polish 로 다루는 것이 맞다.

콘텐츠-운영 (WO 아님)
  - KPA/PH 약관·개인정보 published 문서 등록 (운영 콘텐츠)

승인-게이트 작업 (별도)
  - 기존 수료자 수료증 backfill — DB write → 사용자 승인 필요
```

**대형 PharmacyHub 구현 WO 는 착수하지 않는다.** PharmacyHub 는 유지보수 단계로 전환한다(직전 `FINAL-ROLE-ENTRY-…` CHECK 의 "후속 분할 WO 없이 유지보수 대상으로 전환" 판정과 일치).

---

## 18. 완료 조건

```text
PHARMACYHUB CURRENT CAPABILITY MAP   = CLOSED (frontend IA + backend 81 path + 공통/PH-specific 분리)
KPA / PH REQUIRED PARITY             = CLOSED (직전 census N=97 재확인 · 이후 15커밋 전진 · 회귀 0)
ALREADY-CLOSED TRACKS                = PRESERVED (Tablet/QR/POP V2/Execution Home/Operator 공통화 무접촉)
REAL REMAINING GAPS                  = CLASSIFIED (소수 · §16·§17)
LEGACY / REGRESSION                  = CLASSIFIED (공통 Core 마이너 버그 · PH 고유 regression 0)
PRODUCTION REALITY                   = VERIFIED (200/401 · 404 0)
FOLLOW-UP LARGE WOS                  = NOT_JUSTIFIED (유지보수 전환 · 대형 WO 근거 없음)
CODE CHANGE                          = 0
SCHEMA CHANGE                        = 0
PRODUCTION WRITE                     = 0
```

---

## 19. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (유지보수 polish 는 §17, 신규 WO 아님)
```

> 참고: PharmacyHub 관련 과거 "gap 목록"류 문서를 신규 구현 근거로 재사용하지 않는다. 현행 정본은 `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` + 직전 parity census + 본 재기준선 CHECK 다.
