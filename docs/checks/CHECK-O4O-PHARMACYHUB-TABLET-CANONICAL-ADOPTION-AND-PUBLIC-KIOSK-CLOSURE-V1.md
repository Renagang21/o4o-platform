# CHECK — PharmacyHub Tablet Canonical Adoption & Public Kiosk Closure V1

**WO**: `WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1`
**작업일**: 2026-09-08
**선행**: `73c21813b` · `b97a4dcc6` · `f75dc8a34`
**commit**: `be5eb5fa7` (구현) · 본 CHECK
**결과**: **PH TABLET CANONICAL ADOPTION = PASS · PH PUBLIC KIOSK = PASS**

---

## 1. PH 기존 구조 → 최종 구조

| 축 | 이전 | 이후 |
|---|---|---|
| 태블릿/코너 목록 | PH 자체 `<li>` 목록 + 인라인 적용 `<select>` | **공통 `TabletCornerBoard`** (KPA 와 동일 컴포넌트) |
| 화면 교체 | 인라인 select | **공통 `TabletScreenSetSwapDialog`** |
| 현재 화면 표시 | "적용 중: {name}" 배지 | "지금 나오는 화면" 카드 (KPA 와 동일 문구·배치) |
| 실제 화면 열기 | **없음** | 카드 액션 `실제 화면 열기` → 공개 kiosk |
| public kiosk route | **없음** | **`/tablet/:slug` (+ `?tabletId=`) 신설** |
| 저작(Screen Set 편집) | 공통 `TabletContentStepBuilder` | 그대로 (이미 공통) |
| backend | 공통 `createStoreTabletRoutes` | 그대로 (이미 공통) |

---

## 2. `corner_legacy_all` 정책 — 폐기 확정

사용자 확정 정책을 그대로 구현했다.

```text
진열 0행 ≠ 매장 전체 상품을 보여달라는 의사표시
진열 0행 = 이 코너에 명시적으로 선택된 상품이 없음
```

- `resolveCornerProducts` 에서 `configured` 매개변수 자체를 제거해 **매장 전체를 만들 수 있는 경로를 구조적으로 차단**했다(빠뜨림이 아니라 불가능하게).
- 공개 resolver·preview 모두 `!effectiveTablet || !effectiveTablet.configured` → 상품 0.
- kiosk 는 `'none'`(0건)도 **서버 확정 결과**로 신뢰한다. 여기서 자체 조회로 되돌아가면
  폐기한 fallback 이 클라이언트에서 부활한다. 자체 조회는 `product_list` 섹션이 아예 없을 때
  (= 세트 미적용 legacy 태블릿)로만 남는다.
- "매장 전체" 가 실제로 필요해지면 **명시적 mode**(`all_products`)로만 표현한다 — 이번에 신설하지 않았다.

### 2-1. ⚠️ 직전 회차 서술 정정

직전 CHECK 는 「진열 0행 코너 3개가 현재 **매장 전체 18건**을 보여주고 있다」고 적었다.
이번 회차 production 실측 결과 **그렇지 않았다.**

```text
A-2 의약품 : mode=selected n=6
C-2 건기식 : mode=selected n=6
F-2 화장품 : mode=selected n=6
```

세 코너 모두 **명시 선택(tier ①)** 을 갖고 있어 애초에 `corner_legacy_all` 로 내려간 적이 없다.
직전 서술은 `configured=false` 로부터의 **추론**이었고 관측이 아니었다.

→ **`corner_legacy_all` 폐기의 production 영향 = 0.** 정책 결정의 위험 근거였던 "18→0 화면 변화" 는
   실재하지 않았다. (현재 적용 세트 5개 = KPA 2개 tier ② + PH 3개 tier ① — tier ③ 로 가는 코너 0개.)

---

## 3. `TabletCornerBoard` adoption 결과

- PH·KPA **두 서비스가 같은 컴포넌트**를 소비한다.
- Core 에 서비스 조건문 **0** — `serviceKey` · `fetch` · 라우터 문자열이 없다(spec 으로 고정).
- PH 는 accent(blue)·라벨(`실제 화면 열기`)·콜백만 주입한다.

### 3-1. 제거한 PH 중복 LOC

`TabletsPage.tsx`: **+87 / −77** (순 +10). 순증인 이유는 교체 다이얼로그 연결·kiosk URL·
태블릿 관리 접이식 블록이 추가됐기 때문이며, **코너 목록 렌더링 자체는 전량 Core 로 이동**했다.
공통 Core 신규 439L(`TabletCornerBoard` 269 + `TabletScreenSetSwapDialog` 170)은 이후 KCos/GP 채택 시
추가 비용 없이 재사용된다.

### 3-2. PH adapter 에 남은 것

`serviceKey`(경로 prefix `/pharmacy-hub/store-owner`) · endpoint client · store connection 해석(409) ·
라벨/accent · 콜백(적용·해제·이름수정·내리기) · kiosk URL 빌더. **업무 로직·렌더링 없음.**

---

## 4. public kiosk canonical URL

```text
https://pharmacyhub.co.kr/tablet/{storeSlug}                  → first_active
https://pharmacyhub.co.kr/tablet/{storeSlug}?tabletId={id}    → 그 코너
```

- 신규 renderer **0** — `@o4o/tablet-kiosk-core` 그대로.
- 신규 공개 API **0** — 공통 service-neutral `/api/v1/stores/:slug/tablet/*` 그대로.
- 실행 주소용 매장 slug 는 공통 라우터의 신규 `GET /store-runtime-info` 로 얻는다
  (KPA 가 쓰던 서비스 전용 `/pharmacy/info` 의존을 PH 에 만들지 않았다). read-only · migration 0.

---

## 5. §7 서비스 격리

공개 태블릿 응답에 slug 의 `serviceKey` 를 **additive** 로 실었다(기존 소비처 무시 → 동작 불변).
PH kiosk 셸이 그 값으로 자기 서비스 매장만 렌더한다.

production 실측:

| 요청 | serviceKey | PH 셸 판정 |
|---|---|---|
| `/tablet/테스트-사업자` | `pharmacy-hub` | 허용 |
| `/tablet/네뚜레-약국` (KPA slug) | `kpa` | **거부** — "이 주소는 PharmacyHub 매장이 아닙니다." · KPA 상품 유입 0 |

공통 resolver 의 격리는 **완화하지 않았다** — 셸에서 좁히기만 한다(쿼리로 serviceKey 를 주입하지 않는다).

---

## 6. preview / tablet / QR product_list 비교 (production)

| 케이스 | tablet | QR | 판정 |
|---|---|---|:---:|
| KPA 피부관리(진열 3) | `corner_display` **3** | `corner_display` **3** | **SAME** |
| PH A-2(명시 선택 6) | `selected` **6** | `selected` **6** | **SAME** |

- id·순서까지 일치. **PRODUCT_LIST DRIFT = 0** 유지.
- `first_active`: KPA `corner_display`/3 · PH `selected`/6 — 양쪽 모두 정상, 기존 URL breaking 0.

---

## 7. 상품 Content fallback · product-linked 실증 (§9·§10)

계약은 KPA 와 동일하다(공통 resolver 그대로 소비 — PH 전용 상품 설명 resolver 0).

두 회차 연속 BLOCKED 였던 **1순위 우선/복귀**를 이번에 **쓰기 0으로 실증**했다.
링크를 실제로 만들면 라이브 코너의 상품 설명이 바뀌므로(중지 조건 §18-5),
링크 원장을 CTE 로 **가상 주입**해 resolver 와 동일한 LATERAL 을 production 데이터에서 실행했다.

| 상태 | 후시딘연고 | 비판텐연고 | 마데카솔겔 |
|---|---|---|---|
| BEFORE(실제 원장 0행) | `selectedContentId` NULL | NULL | NULL |
| AFTER(가상 링크 1건) | **콘텐츠 id 발화** | NULL | NULL |
| 링크 원장 | **여전히 0행 (write 0 확인)** | | |

증명된 것: ① 링크가 있으면 1순위가 발화한다 ② **상품별로** 발화한다(다른 상품 불변)
③ 링크가 없으면 NULL → STORE canonical 로 복귀한다(= BEFORE 상태가 곧 G 시나리오).

**남은 미실증**: 그 상태의 **runtime UI 렌더**. 이는 실제 링크 1건이 필요하다.
안전한 fixture 조사 결과 — 진열된 local 상품과 store content 를 **동시에** 가진 조직은
라이브 참조 매장 하나뿐이고, `[E2E_TEST] W9 검증약국` 은 active 태블릿·상품·콘텐츠가 모두 0이라
fixture 를 새로 구축해야 한다(다수의 운영 write). 따라서 **UI 실증만 BLOCKED 유지**.

> 후속 제안: 검증 전용 매장(태블릿 1 + local 상품 1 + 콘텐츠 1 + 링크 1)을 **1회 승인 하에** seed 하면
> 이 항목이 영구히 닫힌다.

---

## 8. KPA / PH UX parity · KPA 회귀

| 항목 | KPA | PH |
|---|:---:|:---:|
| 코너 현황판(같은 컴포넌트) | ✅ | ✅ |
| "지금 나오는 화면" | ✅ | ✅ |
| 화면 바꾸기 | ✅(코너 콘텐츠 인지형) | ✅(공통 다이얼로그) |
| 실제 화면 열기 / kiosk | ✅ | ✅ **신설** |
| product_list 계약 | 동일 | 동일 |
| 가격 포맷 | `6,500원` | 동일 규칙 |
| Content fallback | 동일 | 동일 |

**KPA 회귀 PASS** — 코너 현황판·kiosk·QR 모두 정상(§9 E2E). PH 를 맞추려고 KPA 를 분기시키지 않았다.

### 8-1. 남은 PH 갭 (MISSING_ADOPTION · 후속)

KPA 의 교체 모달은 `store_tablet_corner_contents`(3세대 코너 콘텐츠)를 인지해 "이 코너에서 쓰는 화면"
을 먼저 보여준다. PH 는 그 축의 데이터가 없어 공통 다이얼로그(저장된 세트 목록)를 쓴다.
**business difference 로 해석하지 않는다 — MISSING_ADOPTION 이며 코너 콘텐츠 축 채택은 후속이다.**

---

## 9. 검증

### 9-1. 정적·테스트

| 항목 | 결과 |
|---|---|
| `@o4o/api-server` type-check | PASS |
| `type-check:frontend` (6서비스) | **OK** |
| build — PH · KPA · K-Cosmetics · GlycoPharm | **4/4 OK** |
| 신규 `pharmacy-hub-tablet-canonical-adoption.spec` | **17/17 PASS** |
| tablet 회귀 7스위트 | **89/89 PASS** |
| ESLint | 0 error |
| `lint-ratchet` | PASS — `51 / baseline 51` 변동 0 |

작업 중 내가 만든 lint 오류 1건(정규식에 리터럴 TAB → `no-control-regex`)이 ratchet 을 52로 올렸고,
이스케이프 표기로 정정해 51로 복구한 뒤 커밋했다.

### 9-2. Production Browser E2E — **10/10 PASS**

| # | 시나리오 | 결과 |
|:---:|---|:---:|
| A·B·C | PH 태블릿 관리 → 코너 현황판·현재 화면 | **PASS** |
| D | 화면 바꾸기 다이얼로그(공통) | **PASS** |
| I | PH 공개 kiosk (`?tabletId=`) — 상품 6건 렌더 | **PASS** |
| O | PH 공개 kiosk (first_active) | **PASS** |
| §7 | PH 오리진에서 KPA slug → 거부 · KPA 상품 유입 0 | **PASS** |
| KPA-I / KPA-QR | KPA kiosk · QR 회귀(`후시딘연고` `6,500원`) | **PASS** |
| KPA-A | KPA 코너 현황판 회귀 | **PASS** |

console error 0 · white screen 0 · dead link 0 · not-found shell 0.

**게이트 오탐 정정(기록)**: 1차 실행에서 §7 거부 화면이 `white-screen` 으로 FAIL 났다.
원인은 그 페이지가 **의도적으로 짧아서**(문구 2줄) 내 `<60자` 휴리스틱에 걸린 것이다.
"기대 문구가 모두 있으면 짧아도 white-screen 이 아니다" 로 규칙을 좁혀 재측정했다.
**제품 결함이 아니었다.**

---

## 10. 중지 조건

| # | 조건 | 상태 |
|:---:|---|:---:|
| 1 | PH kiosk 에 신규 schema/migration 필요 | 미해당 — **migration 0** |
| 2 | 기존 KPA public contract breaking | 미해당 — KPA URL·응답 불변(additive 만) |
| 3 | `corner_legacy_all=0` 이 공개 중인 PH consumer 를 깨뜨림 | 미해당 — §2-1 실측상 영향 0 |
| 4 | 공통 Core 변경이 KCos/GP legacy runtime 을 깨뜨림 | 미해당 — `store-ui-core` 무변경 · 2서비스 build OK |
| 5 | product-linked 검증에 운영 화면 변경 필수 | **부분 해당** → 쓰기 0 실증으로 대체, UI 실증만 BLOCKED (§7) |
| 6 | 서비스별 Tablet business model 이 달라야 한다는 근거 | **발견 없음** — 차이는 전부 MISSING_ADOPTION |
| 7 | 병렬 세션 파일 충돌 | 미해당 |

---

## 11. 범위 밖 (미착수 확인)

QR 전체 console 공통화 · QR placement · ESL · KCos/GP canonical 전환 ·
`product_content` DB CHECK 축소 · `first_active` 제거 · `store_tablet_displays` 제거 · 신규 Content 원장.

---

## 12. 문서 정합

문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건

- 발견 1건 = 직전 CHECK 의 「매장 전체 18건」 서술이 관측이 아니라 추론이었음 → **본 문서 §2-1 에 정정 기록**.
  (기록물은 §16-1 상 인라인 수정 대상이 아니므로 원문을 고치지 않고 여기서 정정한다.)
- 후속 WO 제안: ① 검증 전용 매장 seed(§7) ② PH 코너 콘텐츠 축 채택(§8-1).

---

## 13. 종결 판정

| 완료 조건 | 결과 |
|---|:---:|
| PH TABLET CANONICAL ADOPTION | **PASS** |
| PH PUBLIC KIOSK | **PASS** |
| KPA / PH MY STORE TABLET PARITY | **PASS** |
| PRODUCT_LIST DRIFT | **0** |
| CORNER_LEGACY_ALL IMPLICIT FALLBACK | **RETIRED** (production 영향 0) |
| KPA REGRESSION | **PASS** |
| KCOS / GP LEGACY CORE REGRESSION | **PASS** |

→ `WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1` = **CLOSED**

Tablet 의 KPA/PH 축은 이것으로 닫힌다. 다음은 QR 축(target 정렬 · Placement) 설계다.
