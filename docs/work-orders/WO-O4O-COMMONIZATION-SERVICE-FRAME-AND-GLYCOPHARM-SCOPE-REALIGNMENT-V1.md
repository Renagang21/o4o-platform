# WO-O4O-COMMONIZATION-SERVICE-FRAME-AND-GLYCOPHARM-SCOPE-REALIGNMENT-V1

- 일자: 2026-08-04
- 브랜치: `main` / 기준 commit: `5621dfaef` / 시작 시 작업 트리: clean
- 성격: **활성 공통화 기준 문서 정비만** (코드 0 / 패키지 0 / DB 0 / 배포 0)
- 산출: [`O4O-COMMONIZATION-STANDARD`](../architecture/O4O-COMMONIZATION-STANDARD.md) **V2.1 → V3**

---

## 1. 목표

현재 활성 공통화 문서를 다음 방침에 맞게 재정렬한다.

```text
- GlycoPharm 삭제 검토를 보류한다.
- GlycoPharm을 현재 공통화 대상에 다시 포함한다.
- KPA Society와 K-Cosmetics는 동일한 O4O 서비스 프레임의 업종별 구현으로 정의한다.
- PharmacyHub도 공통 매장 경영 기능을 기본적으로 가져야 한다는 원칙을 반영한다.
- Neture의 공급자·파트너 중심 독립 경계는 유지한다.
```

---

## 2. 범위

| 구분 | 내용 |
|------|------|
| 대상 | 활성 공통화 기준 문서 (architecture 계층) + 본 WO 문서 |
| 제외 | 과거 IR·CHECK·archive · GlycoPharm 코드 · PharmacyHub 조사/문서/구현 · Neture 기능 확대 · 코드/패키지/DB/배포 전부 |

---

## 3. 필수 반영 사항

### A. GlycoPharm

정정 대상 표현: `historical out-of-scope` · `제거 검토 중` · `조사 금지` · `신규 공통 모듈 적용 검토 금지` · `현재 공통화 판정 근거에서 제외`

현재 기준:

```text
GlycoPharm 삭제 검토는 보류한다.
GlycoPharm은 현재 공통화 대상 서비스다.
기존 공통화 구조와 후속 공통화 작업을 유지한다.
```

GlycoPharm 코드·기능은 수정하지 않는다.

### B. KPA Society 와 K-Cosmetics

```text
KPA Society   = 공통 서비스 프레임 + 약국·약사·의약품 extension
K-Cosmetics   = 공통 서비스 프레임 + 화장품 매장·화장품 extension
```

차이는 서비스 프레임이 아니라 domain extension 이다. K-Cosmetics 를 KPA 의 하위 서비스나 단순 frame 검증체로 정의하지 않는다.
현재 코드상 KPA 가 더 많은 기준 구현을 보유한다는 **사실**과 두 서비스의 **아키텍처적 지위**는 구분한다.

### C. 매장 경영자 역할

공통 매장 경영자는 기본적으로 다음 역할을 가질 수 있다: 상품 구매 / 매장 취급 상품 관리 / 소비자 대상 판매 / 매장 콘텐츠 활용 / QR·POP·태블릿·설명서 등 매장 실행 / 매장 운영.

금지 구분: `KPA 매장 = 판매자` · `PharmacyHub 매장 = 구매자`

### D. PharmacyHub

```text
PharmacyHub = O4O 공통 매장 경영 프레임 + 공급자 직결 B2B 구매·주문·결제 extension
```

미구현을 이유로 `NOT_APPLICABLE` 로 단정하지 않고 `MISSING_BASE_FUNCTION` 으로 구분한다.
단, 본 작업에서는 **기준 문서의 해석만 정정**하며 PharmacyHub 조사·문서 수정·개발 요청·구현은 하지 않는다.

### E. Neture

공급자·파트너 중심 독립 서비스 경계 유지. 미채택 축(LMS·매장 실행)은 자동으로 adoption gap 이 아니다.

---

## 4. 공통화 구조

```text
O4O Common Service Frame
├─ Operator
├─ Member / Account
├─ Supplier Connection
├─ Store Management
├─ Product / Order
├─ Store Local Product
├─ Content Execution
├─ QR / POP / Tablet / Signage / Leaflet
└─ Optional Modules

Service Extension
├─ KPA Society   └─ 약국·약사·의약품
├─ K-Cosmetics   └─ 화장품 매장·화장품
├─ GlycoPharm    └─ GlycoPharm 도메인
├─ PharmacyHub   └─ 공급자 직결 B2B 거래
└─ Neture        └─ 공급자·파트너 중심 업무
```

공통화 방식: `core + optional module + service config + API adapter + capability + service extension`.
서비스별 조건문을 공통 core 내부에 추가하는 방향으로 문서를 작성하지 않는다.

---

## 5. 실행 결과 (2026-08-04)

### 5.1 검토한 활성 공통화 문서

| 문서 | 판정 |
|------|------|
| [`docs/architecture/O4O-COMMONIZATION-STANDARD.md`](../architecture/O4O-COMMONIZATION-STANDARD.md) | **활성 기준 문서 — 수정** (V2.1 → V3) |
| [`docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md`](../architecture/OPERATOR-INTEGRATION-STATE-V1.md) | **활성 architecture 문서 — 파생 표현 1건 수정** (스코프 note 의 `historical out-of-scope`) |
| `docs/investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md` | 과거 IR — **무수정** |
| `docs/investigations/IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1.md` | PharmacyHub 별도 트랙 + IR — **무수정** |
| `docs/investigations/IR-O4O-OPERATOR-CORE-CANONICAL-ROLE-AND-MODULAR-COMPOSITION-AUDIT-V1.md` | 과거 IR — **무수정** |
| `docs/work-orders/WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1.md` | V2 를 만든 과거 WO 기록 — **무수정** (V3 가 그 판정을 정정했다는 사실은 STANDARD §3.4 · Changelog 에 기재) |
| `docs/checks/CHECK-O4O-*-COMMONIZATION-CYCLE1-CLOSURE-*.md` 등 CHECK 계열 | 과거 CHECK — **무수정** |
| `docs/architecture/*MARKET-TRIAL*`, `*CONTACT*`, `*PLATFORM-ROLES*` 등 | `제거 검토` 문자열이 다른 맥락(legacy productId·IP 정리 등)으로 매칭 — **공통화 스코프와 무관, 무수정** |

> 공통화 트랙에 별도 MASTER / PLAN 문서는 존재하지 않는다(전수 확인). 기준 문서는 `O4O-COMMONIZATION-STANDARD.md` 단일이다.

### 5.2 수정 내용 — `O4O-COMMONIZATION-STANDARD.md` (V3)

| 절 | 변경 |
|----|------|
| 헤더 | V2.1 → **V3**, 개정일 2026-08-04 |
| §0 | 스코프 선언 (V3) · 근거 WO 링크 추가 · §0.2 에 V3 개정 성격 + "코드·패키지·DB 변경 0" 명시 |
| **§1.1 (신설)** | **O4O Common Service Frame ↔ Service Extension 구조** · 공통화 5요소 · "프레임은 하나 / 미채택 ≠ 프레임 이탈 / 서비스 조건문 금지" 원칙 |
| §3.0 | 대상 서비스 표를 "**프레임 + extension**" 기준으로 재기술. **GlycoPharm 행 복귀**(`EXISTING_ADOPTION_MAINTAINED`). PharmacyHub 지위를 "공통 매장 경영 프레임 + B2B extension" 으로 정정 |
| §3.0.1 | 제목 `KPA reference 의 의미` → **`KPA Society 와 K-Cosmetics 의 관계`**. 동일 프레임 지위 명시 + 금지 표현 표(하위 서비스 / 단순 frame 검증체) + "구현 진척도 ≠ 아키텍처적 지위" |
| §3.1 | Neture 독립 경계 유지 문장 보강 (변경 아님, 재확인) |
| **§3.2 (신설)** | **매장 경영자 공통 역할** 6항목 + 금지 구분(`KPA=판매자` / `PharmacyHub=구매자`) + "현재 구현 범위를 역할 정의로 환원하지 않는다" |
| §3.3 | PharmacyHub 정의식 추가 · **`MISSING_BASE_FUNCTION` 표기 도입**(`NOT_APPLICABLE` 단정 금지) · 본 작업이 해석만 정정했고 PharmacyHub 트랙 무접촉임을 명시 |
| §3.4 | **`historical out-of-scope` 폐기 → 공통화 대상 복귀.** V2↔V3 대비표 · 삭제 검토 보류 · 기존 공통화 구조 유지 · 코드 무수정 명시 |
| §7 | 금지사항 1행 추가 — 공통 core 내부 서비스별 조건문 |
| §9.0 | 표기 원칙 2행 추가 — `미구현 ≠ 해당 없음` · `검증 시점 명시` |
| §9.1 | GlycoPharm 열 `(historical)` 해제 후 정규 열로 재배치 · 범례 정리 · V3 는 표기만 정정했고 실측 재수행 없음을 명시 |
| §9.2 | 열 순서 동일 기준 재배치 |
| §9.3 | GlycoPharm Hub 외 영역은 **`미조사`** 로 표기 (§9.0 "미조사 = 공백" 준수 — 추정 금지) |
| §10 | 축 A 내용을 V3 기준으로 갱신 |
| §11 | V3 재정렬 WO 링크 추가 |
| Changelog | V3 항목 추가 |

**변경하지 않은 것**: 공통화 정의(§1) · Hub 표준(§2) · Layout 정책(§4) · Template 원칙(§5) · 판정 체크리스트(§6) · dead code 기준(§8) · Cycle 1 종료 판정 · frozen baseline · Neture 예외 사유(§3.1) 내용 · §10.1 `operator-core` 판정.

### 5.3 수정 내용 — `OPERATOR-INTEGRATION-STATE-V1.md`

2026-08-03 자 스코프 note 한 문단만 정정했다.

- 변경 전: "현재 공식 대상 서비스는 KPA / K-Cos / Neture / PharmacyHub 이며 **GlycoPharm 은 `historical out-of-scope` 다**"
- 변경 후: 대상 서비스 5개(GlycoPharm 포함) 기재 + **정정 문단 추가** — GlycoPharm 기재는 이력이 아니라 현재 대상 서비스의 2026-05-03 시점 조사 기록으로 읽는다.
- 본문(§1.1 Capability 정책 · §1.2 3-카테고리 · §1.3 목표 구조 · 서비스별 현황 표)은 **무수정**. "서비스별 현황 표·우선순위를 그대로 사용하지 않는다"는 기존 단서도 유지했다.

### 5.4 하지 않은 것 (확인)

| 항목 | 상태 |
|------|------|
| 코드 · 패키지 · dependency · `pnpm-lock.yaml` · route | **0** |
| DB · migration · 배포 | **0** |
| GlycoPharm 코드 수정·삭제 | **0** |
| PharmacyHub 조사·문서 수정·개발·구현 | **0** |
| Neture 기능 확대 | **0** |
| 과거 IR · CHECK · archive 소급 수정 | **0** |
| 다른 세션 WIP 수정·삭제·stash·revert | **0** (시작 시 작업 트리 clean) |

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|------|------|
| GlycoPharm 이 현재 공통화 대상에 복귀 | ✅ STANDARD §3.0 · §3.4 · §9.1 |
| `historical out-of-scope` 활성 표현 정정 | ✅ STANDARD §3.4 · OPERATOR-INTEGRATION-STATE §스코프 note |
| KPA Society 와 K-Cosmetics 동일 프레임 관계 명시 | ✅ STANDARD §3.0 · §3.0.1 |
| 매장 경영자의 구매·판매·콘텐츠 실행 역할 명시 | ✅ STANDARD §3.2 |
| PharmacyHub 기본 매장 경영 기능 원칙 반영 | ✅ STANDARD §3.0 · §3.2 · §3.3 (`MISSING_BASE_FUNCTION`) |
| PharmacyHub 별도 작업 무접촉 | ✅ PharmacyHub 문서·코드 0 수정 |
| Neture 독립 경계 유지 | ✅ STANDARD §3.0 · §3.1 (내용 불변) |
| 활성 공통화 문서만 수정 | ✅ 2건 |
| 과거 IR · CHECK 무수정 | ✅ |
| 코드 · 패키지 · DB 변경 0 | ✅ |

**판정: PASS**

---

## 7. 후속 정정 (2026-08-08)

본 WO 로 재진입해 산출물을 재검증했다. 실행 결과(§5)·완료 기준(§6) 판정은 **모두 유지**되며, V3 편집이 만든 마크다운 결함 1건만 정정했다.

| 항목 | 내용 |
|------|------|
| 기준 commit | `4e9ccc303` (V3 커밋 `8189f04ff` 는 `origin/main` 에 포함, 작업 트리 clean) |
| 결함 | `O4O-COMMONIZATION-STANDARD` §9.3 에서 GlycoPharm 미조사 note 가 표 중간에 삽입돼 `/mypage` 행이 표 밖으로 떨어져 렌더링됨 |
| 정정 | `/mypage` 행을 표 안으로 복귀 · note 를 표 뒤로 이동 (STANDARD Changelog V3.1) |
| 재검증 | `historical out-of-scope` 잔존 활성 표현 0 — 남은 매칭은 전부 **폐기 사실을 기록한 문장**(STANDARD §3.4 · 본 WO) 또는 **무수정 대상인 과거 WO/IR**(V2 WO · operator-core IR · PharmacyHub IR) |
| 변경 없음 | 판정·표기·스코프 내용 · 코드 · 패키지 · DB · 배포 · PharmacyHub · GlycoPharm 코드 |

