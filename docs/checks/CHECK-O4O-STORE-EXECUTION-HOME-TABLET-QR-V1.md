# CHECK-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1

> **WO**: WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1 — 내 매장 「매장 실행」 홈 (Tablet + QR v1)
> **일자**: 2026-09-10
> **브랜치**: `work/store-execution-home-tablet-qr-v1`
> **판정**: **PASS** (완료 조건 5/5)
> **선행 정본**: [`DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1`](../design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md) · [`IR-O4O-STORE-EXECUTION-ASSET-LOCATION-AND-UI-CENSUS-V1`](../investigations/IR-O4O-STORE-EXECUTION-ASSET-LOCATION-AND-UI-CENSUS-V1.md)

---

## 1. 무엇을 만들었나

내 매장에 **「매장 실행」 → 「실행 현황」** 홈을 신설했다. 이 화면이 답하는 질문은 하나다.

> **"어디에서 무엇이 지금 사용 중인가"**

제작 화면이 아니다. 새 자산을 만들거나 편집하는 기능은 이 화면에 없고, 바꾸려면 각 위치 묶음의
링크로 기존 태블릿 · QR 화면에 간다.

| 서비스 | 경로 | 메뉴 위치 |
|---|---|---|
| KPA-Society | `/store/execution` | **신설** `[매장 실행]` 섹션 (약국 경영지원 바로 뒤) |
| Pharmacy-Hub | `/store-owner/execution` | 기존 `[매장 실행]` 섹션의 **첫 항목** |
| K-Cosmetics | 없음 | 이번 회차 범위 밖 (설정 무변경) |

PH 에만 있던 `[매장 실행]` 개념을 공통 Core 로 승격했고, 두 서비스가 **같은 View 파일**을 쓴다.

---

## 2. 완료 조건 판정

| # | 조건 | 판정 | 근거 |
|---|---|:---:|---|
| 1 | STORE EXECUTION HOME V1 | **PASS** | KPA · PH 양쪽 실 브라우저에서 렌더 · 집계 · 링크 이동 확인 (§6) |
| 2 | TABLET / QR OPERATION VIEW | **PASS** | 태블릿 3/2대 · QR 22/53건이 위치 묶음과 상태 4종으로 표시됨 |
| 3 | KPA / PH PARITY | **PASS** | 동일 Core View. `serviceKey` 분기 **0** (raw-source 테스트로 고정) |
| 4 | NO FABRICATED ANALYTICS | **PASS** | 노출 수치는 QR scan 뿐. 태블릿 노출수·재생수·도달률 필드 자체가 없음 |
| 5 | SCHEMA CHANGE = 0 | **PASS** | migration 0 · 신규 table 0 · corner entity 0 · 신규 API 0 (§9) |

---

## 3. v1 범위 계약 (§2 · §3)

이 계약을 바꾸는 것은 리팩터링이 아니라 **범위 변경**이며 별도 WO 가 필요하다.

1. **표면은 Tablet · QR 두 개뿐.** POP · Signage · ESL 은 포함하지 않는다.
2. **실측 가능한 수치만.** 유일한 실측치는 QR scan(`store_qr_scan_events`) 이다.
3. **fuzzy matching 금지.** 위치 묶음은 완전 일치 또는 명시적 `cornerRef` 두 경로뿐.
4. **serviceKey 분기 0.** 서비스는 데이터 · 링크 · 색만 주입한다.

### 3-1. 설계 §5-3 과의 의도적 편차 — 기록해 둔다

설계 정본 §5-3 은 POP · Signage 행을 값 `—` 로 **남겨 두라**고 한다.
본 WO 와 사용자 지시는 **placeholder 자체를 금지**한다. **WO 를 따랐다.**

근거: 값이 없는 행은 "아직 안 만든 기능" 이 아니라 "매장에 없는 것" 처럼 읽힌다.
실행 홈은 "지금 쓰이는 것" 을 단언하는 화면이라, 단언할 수 없는 행을 두면 화면 전체의
신뢰가 깎인다. POP/Signage 는 배치 축이 생긴 뒤에 **실제 데이터와 함께** 들어온다.

### 3-2. 태블릿 지표가 없는 이유를 화면에서 밝힌다

요약 카드 아래에 한 줄을 고정 노출한다.

> 태블릿은 노출 수를 측정하지 않습니다.

빈칸을 설명 없이 두면 "고장" 으로 읽힌다. 없는 숫자를 만들지 않는다는 계약을 화면 표면에서 지킨다.

---

## 4. 상태 4종 (§8) — 표시 전용

DB enum 이 아니라 **화면 표시용 파생 값**이다. 새 컬럼 · 새 enum 을 만들지 않았다.

| 상태 | 라벨 | 의미 |
|---|---|---|
| `ok` | 정상 | 활성 + 지정 완료 + 위치 있음 |
| `unset` | 미설정 | 만들었지만 아직 어디에도 쓰이지 않음 |
| `stopped` | 중지 | 경영자가 의도적으로 내린 상태 |
| `attention` | 확인 필요 | 사람이 보고 결정해야 하는 **모순** |

**roll-up 심각도**: `attention`(3) > `unset`(2) > `stopped`(1) > `ok`(0).
`unset` 이 `stopped` 보다 높은 이유 — 중지는 **의도한** 상태이고, 미설정은 아직 아무도 손대지
않아 매장에서 아무 일도 일어나지 않는 상태다.

**중요 — 접지 않는 규칙 2가지**

- 배치가 **2곳 이상**(`MULTIPLE` 또는 count > 1)이면 반드시 `확인 필요`다. `정상`으로 접지 않는다.
- 꺼진 태블릿은 화면 세트가 없어도 `미설정`이 아니라 `중지`다. (할 일을 잘못 안내하지 않기 위해)

코너 묶음은 최악 상태를 드러내되 `statusCounts` 를 함께 보여줘, 코너 하나가 통째로
`확인 필요`로 보이는 착시를 막는다.

---

## 5. 위치 묶음 (§4 · §5)

**묶이는 경로는 둘뿐이다.**

1. `qr.cornerRef` 가 태블릿 `id` 와 **완전 일치**
2. `qr.primaryPlacement` (trim) 이 태블릿 `location` (trim) 과 **완전 일치**

대소문자 접기 · 공백 제거 · 유사어 사전 · 부분 일치는 쓰지 않는다. 프로덕션 위치 값에는
한글 코너명 · 격자코드(`A-2`) · 의미 없는 값이 섞여 있어, 추측으로 묶으면 화면이
**"저 코너에 저게 있다"는 틀린 사실**을 단언하게 된다.

단정할 수 없으면 추측하지 않고 미분류 묶음으로 보낸다. 미분류는 정상 코너에 **섞지 않고**
항상 마지막에 별도 묶음으로 둔다.

| 묶음 | 라벨 | 대상 |
|---|---|---|
| `tablet-unlocated` | 위치 미설정 | 위치 문자열이 비어 있는 태블릿 |
| `qr-unplaced` | 미배치 QR | 활성 배치 0곳, 또는 위치를 단정할 수 없는 QR (`MULTIPLE` 포함) |

해당 대상이 없으면 빈 묶음을 만들지 않는다.

---

## 6. 프로덕션 브라우저 E2E (§19)

로컬 dev 서버(빌드 산출물 동일 소스)를 **프로덕션 API(`api.neture.co.kr`)** 에 붙여
실제 매장 데이터로 검증했다. 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서
런타임에 읽었고 **어떤 파일 · 문서 · 커밋에도 기록하지 않았다.**

### 6-1. KPA — 테스트 약국 (`/store/execution`)

| 항목 | 결과 |
|---|---|
| 사이드바 `[매장 실행] > 실행 현황` 노출 | ✅ |
| 요약 | 위치 **2** / 사용 중 태블릿 **2** / 배치된 QR **0** / QR 스캔 **41** |
| 코너 묶음 | `구강관리 코너` · `피부관리 코너` (각 태블릿 1대, 정상) |
| 미분류 | `미배치 QR` 53건 (QR 스캔 41회) |
| 상태 4종 | 정상 · 미설정 · 중지 · 확인 필요 **전부 실제 렌더** |
| 콘솔 에러 / 페이지 에러 / 4xx | **0 / 0 / 0** |

### 6-2. Pharmacy-Hub — 네뚜레 약국 (`/store-owner/execution`)

| 항목 | 결과 |
|---|---|
| `[매장 실행]` 섹션 **첫 항목**으로 노출 | ✅ |
| 요약 | 위치 **3** / 사용 중 태블릿 **3** / 배치된 QR **0** / QR 스캔 **70** |
| 코너 묶음 | `A-2` · `C-2` · `F-2` (각 태블릿 1대, 정상) |
| 미분류 | `미배치 QR` 22건 (QR 스캔 70회) |
| 상태 | 정상 · 미설정 · 중지 렌더 (`확인 필요` 는 **해당 데이터 없음** — 정직한 0) |
| 콘솔 에러 / 페이지 에러 / 4xx | **0 / 0 / 0** |

> PH 로그인은 로컬 계정 문서의 `pharmacy-hub:store_owner` 행이 드리프트되어 401 이 났다.
> 로그인 화면이 제공하는 체험용 자동입력을 사용했다. **문서 행 갱신은 범위 밖이라 보고만 한다** (§11).

### 6-3. dead link 0

실행 홈에서 나가는 링크 4개를 실제로 클릭해 이동 확인했다. 백지 화면 0 · 페이지 에러 0.

| 서비스 | 링크 | 이동 결과 |
|---|---|---|
| KPA | 태블릿 화면 제작 → `/store/commerce/tablet-displays` | ✅ |
| KPA | QR 관리 → `/store/marketing/qr` | ✅ |
| PH | 태블릿 화면 → `/store-owner/tablets` | ✅ |
| PH | QR 관리 → `/store-owner/qr` | ✅ |

### 6-4. 관측된 유일한 4xx — 결함 아님

PH 로그인 화면에서 `/favicon.ico` 404 1건. **로컬 vite dev 서버 산출물**로, 프로덕션 정적
서빙에는 존재하지 않는다. 실행 홈 자체의 콘솔 에러는 0 이다.

---

## 7. 정직한 결과 — 첫 릴리스에서 코너에 QR 이 하나도 붙지 않는다

프로덕션 전수 조회 결과 **활성 QR 배치가 플랫폼 전체 0건**이다.
따라서 첫 화면에서 모든 QR 은 `미배치 QR` 로 떨어지고, 어떤 코너도 태블릿+QR 짝을 보여주지 않는다.

**이것은 결함이 아니라 사실이고, 감추거나 backfill 하지 않는다.**
"QR 을 만들어 두기만 하고 아직 매장 어디에도 붙이지 않았다" 는 상태를 처음으로 드러낸 것이
이 화면의 가치다. 데이터를 채워 화면을 예쁘게 만드는 것은 이 WO 의 일이 아니다.

---

## 8. StoreChannelsView 경계 (§12)

| 화면 | 다루는 것 |
|---|---|
| `StoreChannelsView` (`components/channels`) | **외부 · 플랫폼 채널 계약** — 채널 유형 · 연동 상태 · 채널 코드 |
| 매장 실행 홈 (`components/execution`) | **매장 내부 물리 배치** — 어느 코너에 무엇이 놓여 있는가 |

같은 데이터를 두 화면에서 다르게 세지 않도록, 실행 모듈은 채널 개념을 **입력에도 출력에도**
두지 않는다. 이 경계는 3곳에 고정되어 있다 — 모델 헤더 주석 · 본 문서 · 계약 테스트
(`StoreChannel|channelType|channelCode` 문자열 부재 단언).

---

## 9. 변경 범위

### 9-1. 신규 (`@o4o/store-ui-core`)

| 파일 | 역할 |
|---|---|
| `src/components/execution/storeExecutionModel.ts` | React-free 순수 모델 — 상태 판정 · 위치 묶음 · 요약 |
| `src/components/execution/StoreExecutionHomeView.tsx` | 표현 전용 공통 View (palette · labels 주입) |
| `src/components/execution/index.ts` | barrel |
| `src/components/execution/__tests__/storeExecutionModel.test.ts` | 계약 테스트 24건 |

### 9-2. 신규 (서비스 페이지 — 데이터 · 링크 · 색만)

- `services/web-kpa-society/src/pages/pharmacy/StoreExecutionPage.tsx` (inline style)
- `services/web-pharmacy-hub/src/pages/store-owner/StoreExecutionPage.tsx` (Tailwind)

색은 **inline style 로 주입**한다. KPA(inline) 와 PH(Tailwind) 가 같은 Core 를 쓰기 위한
기존 선례(`StoreQrOperationBoard.tsx`)를 그대로 따랐다.

### 9-3. 수정

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/index.ts` | execution barrel export 추가 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | KPA `[매장 실행]` 섹션 신설 · PH 섹션 첫 항목 추가 |
| `services/web-kpa-society/src/App.tsx` | `execution` route (lazy) |
| `services/web-pharmacy-hub/src/App.tsx` | `execution` route |
| `services/web-kpa-society/src/api/storeQr.ts` | `primaryPlacement` · `activePlacementCount` 타입 추가 |
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubStoreQr.ts` | 동일 |

### 9-4. 변경하지 않은 것 (§17 · §18 · §21)

- migration **0** · 신규 table **0** · corner entity **0** · 백엔드 **무변경**
- 신규 집계 엔드포인트 **0** — 기존 목록 API 2개(`tablets`, `storeQr`)를 프론트에서 합성
- 신규 package **0** · 신규 dependency **0** · lockfile **무변경**
- `@o4o/tablet-screen-set-editor` 를 `store-ui-core` 의 의존으로 만들지 **않았다** (계층 계약)
- `StoreMenuKey` union · capability map **무변경** (`StoreMenuSectionItem.key` 가 이미 `string`)
- K-Cosmetics 설정 **무변경**

> QR 타입 2개는 **additive** 다. 백엔드 `store-qr.service.ts` 는 이미 두 값을 내려주고 있었고
> 프론트 타입에만 빠져 있었다. 배치(placement)는 대상(targetKind)과 **다른 축**이다.

---

## 10. 검증 결과

| 항목 | 결과 |
|---|---|
| `pharmacy-hub-web` type-check | 잔여 28건 — **전부 기존 부채**, 본 WO 파일 **0건** |
| `@o4o/web-kpa-society` tsc | 잔여 21건 — 동일, 본 WO 파일 **0건** |
| `@o4o/web-k-cosmetics` tsc (회귀) | 잔여 16건 — 동일, 본 WO 파일 **0건** |
| vite build (PH / KPA / KCos) | **3/3 성공** (KPA 는 `StoreExecutionPage` lazy chunk 생성 확인) |
| `store-ui-core` vitest | **50 passed** (신규 24 + 기존 26 — 기존 parity 계약 회귀 0) |

> 기존 부채는 세 서비스에 **공통으로** 나타나는 같은 항목들이다(`membershipGate.ts`,
> `ResetPasswordPage.tsx`, `PharmacyHubUser.roles` 등). 본 WO 와 무관하며 손대지 않았다.
> 세 서비스의 `build` 는 `tsc && vite build` 라 baseline 에서 이미 실패한다 —
> 번들 검증은 `vite build` 를 직접 돌려 확인했다.

---

## 11. POP 판정 (§16) — 코드 변경 없음

**질문**: `store_pops` 가 0행인데 POP 화면은 왜 read-only 인가?

**판정**: POP 은 **실제로 사용 중**이다. 다만 테이블이 다르다.

| 테이블 | 행 | 역할 |
|---|---|---|
| `store_execution_assets` (`usage_type='pop'`) | **17** | 실제 POP 정본 |
| `store_pops` | **0** | 2차 재편집 경로 (미사용) |

read-only 로 보이는 것은 결함이 아니라 **정본 테이블이 갈린 결과**다.

**그리고 이것이 POP 을 v1 에서 뺀 진짜 근거다.** `store_execution_assets` 는 컬럼 18개를
전수 확인했고 **위치 · 배치 컬럼이 없다.** POP 에는 배치 축 자체가 없어서
"지금 어디에 붙어 있는가" 를 말할 수 없다. 없는 축을 화면에서 지어내지 않는다.

**본 WO 에서 POP 관련 코드는 한 줄도 바꾸지 않았다.**

---

## 12. 다음 판단 — Store Corner entity 승격

이번 회차 결과가 주는 근거:

- 코너는 **태블릿의 `location` 자유 문자열**로만 존재한다. `A-2` 같은 격자코드와 `구강관리 코너`
  같은 이름이 한 매장 안에 섞여 있고, 서비스마다 관례가 다르다.
- QR 배치는 **활성 0건**이라, 코너↔QR 결합을 실측으로 검증할 데이터가 아직 없다.
- 완전 일치 규칙만으로 v1 은 성립했다. 지금 entity 를 만들면 **검증할 데이터 없이 스키마를
  먼저 고정**하게 된다.

**의견: 이번 회차만으로 승격하지 않는 것을 권한다.** QR 배치가 실제로 쌓이기 시작한 뒤,
어떤 이름 체계로 코너가 불리는지 실측하고 판단하는 편이 안전하다. 최종 결정은 사용자 몫이다.

---

## 13. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

- **발견 1건** — 설계 §5-3(POP/Signage placeholder 유지) 과 본 WO(placeholder 금지)의 충돌.
  WO 가 우선하며 §3-1 에 편차로 기록했다. 설계 문서 본문은 **수정하지 않았다** (CLAUDE.md §16-4:
  기준 문서의 내용·판정 변경은 별도 WO).
- 참고 — `docs/local/TEST-ACCOUNTS.local.md` 의 `pharmacy-hub:store_owner` 행이 드리프트되어
  401 이 난다(§6-2). 로컬 전용 · git 미추적 문서이며 범위 밖이라 **보고만 한다.**
