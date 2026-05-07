# IR-DOCS-HIGH-RISK-CANONICAL-RENAME-RECLASSIFICATION-V1

> **목적**: HIGH-RISK 후보 7개 문서의 lifecycle 역할 재판정 및 rename 가능성 조사
> **범위**: 조사(IR)만. rename/move/delete 없음.
> **날짜**: 2026-05-07
> **선행 WO**: WO-DOCS-NAMING-PHASE3A-SAFE-FILENAME-NORMALIZATION-V1

---

## 1. 조사 대상

| # | 파일명 | 현재 위치 |
|---|--------|-----------|
| 1 | `CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md` | `docs/baseline/` |
| 2 | `CHANNEL-EXECUTION-CONSOLE-V1.md` | `docs/baseline/` |
| 3 | `E-COMMERCE-ORDER-CONTRACT.md` | `docs/baseline/` |
| 4 | `EVENT-OFFER-COMMON-DOMAIN-V1.md` | `docs/baseline/` |
| 5 | `EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md` | `docs/baseline/` |
| 6 | `EVENT-OFFER-STORE-INTEGRATION-V1.md` | `docs/baseline/` |
| 7 | `KPA-SOCIETY-SERVICE-STRUCTURE.md` | `docs/baseline/` |

---

## 2. 개별 문서 분석

---

### 2.1 CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | `WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1` — 파일명과 동일 |
| Status 선언 | `Status: Complete` |
| 성격 키워드 | "DB 변경", "API Endpoint", "파일 목록", "의도적 미구현" |
| 정책 선언 | 채널 lifecycle 정책 표 (B2C/KIOSK/TABLET/SIGNAGE → APPROVED 즉시) |
| 변경 금지 선언 | 없음 |
| Implementation steps | 있음 (섹션 3, 4, 5, 6) |

#### CLAUDE.md 참조

```
CLAUDE.md:337 — | Channel Creation Flow | `docs/baseline/CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md` |
```

- §상세 규칙 문서 목록 테이블에 1회 등재
- "참조" 성격 (active governance entry-point 아님)

#### docs/ 내 cross-reference

- 자기 자신 외 참조: **0건**
  (CLAUDE.md 1건만)
- 형제 문서 CHANNEL-EXECUTION-CONSOLE-V1이 "선행 완료" 로 단순 언급

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | 낮음 — channel lifecycle 정책은 코드로 이미 강제됨 |
| Frozen baseline 역할 | 없음 — "Complete"로 마감 |
| WO 산출물 성격 | 강함 — WO-ID = 파일명, implementation steps 중심 |
| 계약(contract) 역할 | 약함 — 기술 제약 없음, 코드에 직접 반영됨 |
| AI agent entry-point | 낮음 — cross-ref 0건 |

**판정**: `WORK_ORDER (Complete)` — WO 산출물이며 완료 상태

#### Rename 위험도

- CLAUDE.md 링크 1건 → 동시 업데이트 필요
- docs/ 내 참조 0건
- **위험도: LOW**

---

### 2.2 CHANNEL-EXECUTION-CONSOLE-V1.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | `WO-CHANNEL-EXECUTION-CONSOLE-V1` — 파일명과 동일 |
| Status 선언 | `Status: Phase 2 Complete` |
| 성격 키워드 | "구현 금지 항목 (절대)", "API Endpoints", "데이터 흐름", "파일 목록" |
| 정책 선언 | 채널별 제품 관리 정책 표 (B2C/KIOSK=관리, TABLET/SIGNAGE=관리 안함) |
| 변경 금지 선언 | §3 "구현 금지 항목 (절대)" — 5개 금지 항목 |
| Implementation steps | 있음 (섹션 4, 5, 6, 7, 8) |

#### CLAUDE.md 참조

```
CLAUDE.md:336 — | Channel Execution Console | `docs/baseline/CHANNEL-EXECUTION-CONSOLE-V1.md` |
```

- §상세 규칙 문서 목록 테이블에 1회 등재
- 참조 성격

#### docs/ 내 cross-reference

- 자기 자신 외 참조: **0건**
  - `CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md`에서 "선행 완료" 단순 언급만
  - CLAUDE.md 1건만

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | 보통 — §3 "구현 금지" 정책은 현재도 유효 |
| Frozen baseline 역할 | 낮음 — "Phase 2 Complete"로 마감 |
| WO 산출물 성격 | 강함 — WO-ID = 파일명 |
| 계약(contract) 역할 | 보통 — 채널 제품 관리 범위를 코드 외에 이 문서로 정의 |
| AI agent entry-point | 낮음 |

**판정**: `WORK_ORDER (Complete with governance clauses)` — WO 산출물이나 §3 금지 조항은 active rule

#### Rename 위험도

- CLAUDE.md 링크 1건
- docs/ 내 참조 0건
- **위험도: LOW**

---

### 2.3 E-COMMERCE-ORDER-CONTRACT.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | `Reference: WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01` (참조, 파일명 아님) |
| Status 선언 | `Status: Active` |
| 성격 키워드 | "유일한 방식을 정의", "핵심 원칙", "위반 시 조치", "금지된 주문 생성 경로" |
| 정책 선언 | OrderType 정의, 주문 생성 경로, 위반 시 조치 — 계약적 선언 |
| 변경 금지 선언 | 명시적 freeze 없음, 그러나 "유일한 방식" 선언으로 de facto freeze |
| Implementation steps | 낮음 — 기술 명세(스키마, API)는 있지만 "how to build" 아님 |

#### CLAUDE.md 참조

```
CLAUDE.md:112 — > 📄 상세: `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`  (§4 E-commerce Core 규칙)
CLAUDE.md:315 — | E-commerce 계약 | `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` |
```

- **§4 E-commerce Core 규칙의 직접 참조** — active governance entry-point

#### docs/ 내 cross-reference

```
docs/architecture/COSMETICS-DOMAIN-RULES.md:185
docs/architecture/O4O-STORE-RULES.md:260
docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md:173
docs/baseline/README.md:14
docs/investigations/IR-KPA-B-SERVICE-AUDIT-V1.md:281
docs/templates/o4o-store-template/STORE-TEMPLATE-README.md:129
```

- **6개 파일**에서 참조 — 가장 많은 cross-reference

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | **매우 높음** — 주문 생성 유일 경로 선언, CLAUDE.md §4 직접 참조 |
| Frozen baseline 역할 | **높음** — "Active Contract" 성격 |
| WO 산출물 성격 | 낮음 — WO를 참조하지만 파일명이 CONTRACT 성격 |
| 계약(contract) 역할 | **매우 높음** — 위반 시 조치 조항 포함, 6개 파일 참조 |
| AI agent entry-point | **높음** — CLAUDE.md §4에서 직접 링크됨 |

**판정**: `KEEP AS CONTRACT` — 현재 파일명이 이미 CONTRACT 성격을 정확히 표현

#### Rename 위험도

- CLAUDE.md 2개 섹션 링크
- docs/ 내 6개 파일 참조
- **위험도: HIGH → DO NOT RENAME**

---

### 2.4 EVENT-OFFER-COMMON-DOMAIN-V1.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | 없음 — `DOC-O4O-EVENT-OFFER-COMMON-DOMAIN-V1` (DOC prefix) |
| Status 선언 | `Status: Active` |
| 성격 키워드 | "공통 도메인으로 정의", "구조 기준을 확정", "수정 정책: 수정 불가" |
| 정책 선언 | 상태 모델, 노출 정책, 수량 정책, 수정 정책 — 다층 정책 선언 |
| 변경 금지 선언 | §7 "생성 이후 수정 불가" (도메인 규칙으로 명시) |
| Implementation steps | 낮음 — 기술 구조는 명세이지, WO step 아님 |

#### CLAUDE.md 참조

```
CLAUDE.md:349 — | **Event Offer 공통 도메인** | `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` |
```

- **굵게 강조(Bold)** 표시 — 중요 canonical로 지정

#### docs/ 내 cross-reference

- `EVENT-OFFER-STORE-INTEGRATION-V1.md:8` — "선행 문서"로 명시적 의존
- CLAUDE.md 1건
- **총 2건**

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | **높음** — Event Offer 공통 도메인 기준 문서 |
| Frozen baseline 역할 | **높음** — DOC prefix, Active 상태 |
| WO 산출물 성격 | 낮음 — WO-ID 없음, DOC prefix |
| 계약(contract) 역할 | 높음 — 상태 모델, 수정 정책이 계약적 |
| AI agent entry-point | 보통 — CLAUDE.md Bold 표시 |

**판정**: `KEEP AS CANONICAL` — DOC prefix + Active + 후속 문서 의존 = canonical

#### Rename 위험도

- CLAUDE.md Bold 링크 1건
- `EVENT-OFFER-STORE-INTEGRATION` 의존
- **위험도: MEDIUM → 현재 파일명이 이미 표준. rename 필요 없음**

---

### 2.5 EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | `근거 WO: WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1` (참조만) |
| Status 선언 | `ACTIVE` |
| 성격 키워드 | "역할을 명확히 정의", "금지 사항", "허용 사항" |
| 정책 선언 | 역할 구분표, 금지/허용 명세 — 명확한 정책 선언 |
| 변경 금지 선언 | §8 금지 사항 3개, §11 향후 확장 기준 |
| Implementation steps | 없음 — 순수 정책/역할 정의 |

#### CLAUDE.md 참조

```
CLAUDE.md:351 — | **Event Offer Neture 역할 구분** | `docs/baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md` |
```

- **Bold 강조** 표시

#### docs/ 내 cross-reference

- 자기 자신 외: **0건**
- CLAUDE.md 1건만

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | **높음** — Neture 역할 오해 방지를 위한 현재 규칙 |
| Frozen baseline 역할 | **높음** — DOC prefix, ACTIVE 상태 |
| WO 산출물 성격 | 낮음 — WO를 참조하지만 정책 문서 |
| 계약(contract) 역할 | 높음 — 금지/허용 명세 포함 |
| AI agent entry-point | 보통 — Bold 표시, 개발 시 오판 방지 목적 |

**판정**: `KEEP AS CANONICAL` — 현재도 active governance, CLAUDE.md Bold 등재

#### Rename 위험도

- CLAUDE.md Bold 링크 1건
- docs/ 내 참조 0건
- **위험도: LOW (기술적), 그러나 파일명이 이미 명확하므로 rename 불필요**

---

### 2.6 EVENT-OFFER-STORE-INTEGRATION-V1.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | 없음 — `DOC-O4O-EVENT-OFFER-STORE-INTEGRATION-V1` (DOC prefix) |
| Status 선언 | `Status: Active` |
| 성격 키워드 | "통합 설계 기준", "단계적 적용 전략 Phase 1/2/3" |
| 정책 선언 | 구조 변환 정책, 금지 사항 §11 (4개), API 흐름 정의 |
| 변경 금지 선언 | §11 "금지 사항" — Event Offer 전용 메뉴 등 4개 |
| Implementation steps | Phase 1/2/3 로드맵 포함 |

#### CLAUDE.md 참조

```
CLAUDE.md:350 — | **Event Offer Store 통합** | `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md` |
```

- Bold 강조 표시

#### docs/ 내 cross-reference

- `EVENT-OFFER-COMMON-DOMAIN-V1`을 "선행 문서"로 선언
- CLAUDE.md Bold 1건

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | **높음** — Event Offer UX 원칙 선언, Phase 로드맵 활성 |
| Frozen baseline 역할 | **높음** — DOC prefix, Active |
| WO 산출물 성격 | 중간 — Phase 로드맵은 WO 성격이지만 DOC 단위로 선언됨 |
| 계약(contract) 역할 | 높음 — 금지 사항 4개, 구조 통합 원칙 |
| AI agent entry-point | 보통 — Bold 표시 |

**판정**: `KEEP AS CANONICAL` — Active + DOC prefix + Phase 진행 중 + CLAUDE.md Bold

#### Rename 위험도

- CLAUDE.md Bold 1건
- docs/ 내 의존 0건 (자신이 의존을 받음)
- **위험도: LOW (기술적), 현재 파일명 표준이므로 rename 불필요**

---

### 2.7 KPA-SOCIETY-SERVICE-STRUCTURE.md

#### 내부 구조

| 항목 | 값 |
|------|------|
| 헤더 WO-ID | `작업 요청서: WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1` (생성 WO) |
| Status 선언 | 없음 (implicit active) |
| 문서 성격 | **헌법 문서 (Constitution)** — 명시적 선언 |
| 변경 금지 선언 | §6 "변경은 사전 합의 후만 가능", "버전 업데이트 필수" |
| Implementation steps | 없음 — 순수 정의/경계/규칙 |

#### CLAUDE.md 참조

```
CLAUDE.md:210 — > 📄 기준: `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`  (§10 KPA Society 구조)
CLAUDE.md:322 — | KPA Society 구조 | `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
```

- **§10의 직접 기준 문서** — CLAUDE.md에서 "📄 기준:" 패턴으로 링크 = active canonical entry-point

#### docs/ 내 cross-reference

```
docs/architecture/O4O-COMMONIZATION-STANDARD.md:211
docs/audit/IR-KPA-A-COMMUNITY-MENU-STATE-AUDIT-V1.md:38
docs/audit/IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V2.md:574
docs/baseline/KPA-UX-BASELINE-V1.md:195
docs/baseline/README.md:13
docs/o4o-common-structure.md:146
docs/platform/lms/KPA-LMS-QUALIFICATION-AND-APPROVAL-ARCHITECTURE-V1.md:844
```

- **7개 파일**에서 참조 — 가장 광범위한 cross-reference (E-COMMERCE 6건과 나란히 최상위)

#### lifecycle 판정

| 기준 | 평가 |
|------|------|
| Active governance 역할 | **매우 높음** — KPA 3-service 경계 정의, 현재도 모든 KPA 작업 기준 |
| Frozen baseline 역할 | **매우 높음** — "헌법 문서" 자기 선언, 사전 합의 필요 |
| WO 산출물 성격 | 낮음 — WO로 생성됐지만 헌법으로 승격 |
| 계약(contract) 역할 | 높음 — 서비스 경계, 금지 사항, 혼선 방지 규칙 |
| AI agent entry-point | **매우 높음** — CLAUDE.md §10 직접 기준, 7개 파일 참조 |

**판정**: `KEEP AS CANONICAL` — "헌법 문서" 자기 선언, CLAUDE.md §10 직접 기준, cross-ref 7건

#### Rename 위험도

- CLAUDE.md 2개 섹션 참조 (`📄 기준:` + 목록)
- docs/ 내 7개 파일 참조
- **위험도: HIGH → DO NOT RENAME**

---

## 3. 최종 판정표

| # | 파일명 | Lifecycle 분류 | 최종 판정 | Rename 위험도 |
|---|--------|:---:|:---:|:---:|
| 1 | `CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md` | WORK_ORDER (Complete) | **SAFE TO RENAME TO WO-** | LOW |
| 2 | `CHANNEL-EXECUTION-CONSOLE-V1.md` | WORK_ORDER (Complete + governance clauses) | **SAFE TO RENAME TO WO-** | LOW |
| 3 | `E-COMMERCE-ORDER-CONTRACT.md` | CONTRACT (Active) | **DO NOT TOUCH** | HIGH |
| 4 | `EVENT-OFFER-COMMON-DOMAIN-V1.md` | CANONICAL (Active Baseline) | **KEEP AS CANONICAL** | MEDIUM |
| 5 | `EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md` | CANONICAL (Active Policy) | **KEEP AS CANONICAL** | LOW |
| 6 | `EVENT-OFFER-STORE-INTEGRATION-V1.md` | CANONICAL (Active Baseline) | **KEEP AS CANONICAL** | LOW |
| 7 | `KPA-SOCIETY-SERVICE-STRUCTURE.md` | CANONICAL (Constitution) | **DO NOT TOUCH** | HIGH |

---

## 4. Rename 가능 후보

### 즉시 실행 가능 (기술적으로 LOW risk)

#### 후보 A: CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md

```
현재: docs/baseline/CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md
대상: docs/work-orders/WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md
```

근거:
- 파일 내부 헤더가 이미 `WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1`
- Status: Complete — 완료된 WO
- docs/ 내 참조 0건
- CLAUDE.md 1건만 → 동시 업데이트 가능

#### 후보 B: CHANNEL-EXECUTION-CONSOLE-V1.md

```
현재: docs/baseline/CHANNEL-EXECUTION-CONSOLE-V1.md
대상: docs/work-orders/WO-CHANNEL-EXECUTION-CONSOLE-V1.md
```

근거:
- 파일 내부 헤더가 이미 `WO-CHANNEL-EXECUTION-CONSOLE-V1`
- Status: Phase 2 Complete — 완료된 WO
- docs/ 내 참조 0건
- CLAUDE.md 1건만 → 동시 업데이트 가능

**주의**: 두 파일 모두 §"구현 금지" 조항을 포함하지만,
이 내용은 이미 코드로 강제되어 있으므로 WO 이관 후에도 governance 효력은 유지됨.

---

## 5. Rename 금지 후보

### KEEP AS CANONICAL (파일명 적절, rename 불필요)

| 파일명 | 이유 |
|--------|------|
| `EVENT-OFFER-COMMON-DOMAIN-V1.md` | DOC prefix = canonical 신호, Active, 후속 문서 의존 |
| `EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md` | Active 정책, Bold 등재, 오해 방지 문서 |
| `EVENT-OFFER-STORE-INTEGRATION-V1.md` | Active, Phase 진행 중, 금지 조항 포함 |

### DO NOT TOUCH (rename + move 모두 금지)

| 파일명 | 이유 |
|--------|------|
| `E-COMMERCE-ORDER-CONTRACT.md` | 파일명에 CONTRACT 명시, cross-ref 6건, CLAUDE.md §4 entry-point |
| `KPA-SOCIETY-SERVICE-STRUCTURE.md` | "헌법 문서" 자기 선언, cross-ref 7건, CLAUDE.md §10 직접 기준 |

---

## 6. "WO에서 출발했지만 canonical이 된 문서" 판정 기준

이번 조사에서 도출된 기준:

### A. WO 출발 → canonical 승격 신호 (retain in baseline/)

1. **문서 내부에서 WO-ID가 생성 이력이지 현재 신원이 아닌 경우**
   - `Reference: WO-...` (참조) vs `WO-...` (헤더 = 신원)

2. **파일명에 WO-ID가 없거나 CONTRACT/STRUCTURE 등 역할어로 대체**

3. **Status: Active (≠ Complete)**

4. **DOC prefix 사용** — WO가 아닌 문서 신호

5. **후속 문서나 다른 문서가 "선행 문서"로 의존**

6. **CLAUDE.md에서 "📄 기준:" 또는 Bold로 링크**

7. **cross-reference 4건 이상**

### B. WO 성격 유지 신호 (WO prefix 또는 work-orders/ 이관 적합)

1. **파일명 = 내부 WO-ID와 일치** (예: `CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1`)

2. **Status: Complete / Phase N Complete**

3. **섹션 구조가 implementation steps 중심** (파일 목록, DB 변경, API 구현)

4. **cross-reference 1건 이하 (CLAUDE.md 목록 등재만)**

5. **"의도적 미구현" 섹션 존재** — WO 범위 문서의 전형

---

## 7. 장기 Naming Governance 권고

### A. 파일 origin보다 현재 역할 우선

```
WO에서 생성된 문서라도 현재 active governance 역할이 있으면
파일명을 WO-로 바꾸지 않는다.
```

### B. Contract 문서는 WO prefix 영구 금지

```
E-COMMERCE-ORDER-CONTRACT.md 같이 파일명에 역할어(CONTRACT/STRUCTURE)가
포함된 경우, WO prefix 부여 금지.
역할어가 파일명의 핵심 신호이다.
```

### C. Baseline 승격 시 파일명 원칙

```
WO 산출물 → baseline/ 이관 시:
- WO-ID 파일명 유지 가능 (history 보존)
- Status를 "Active/Complete"로 명확히 선언 필수
- CLAUDE.md 등재 방식으로 역할 구분
  * 목록 등재만 → WO 성격 유지
  * Bold + "기준:" 패턴 → canonical 승격 신호
```

### D. 향후 신규 문서 작성 기준

| 문서 성격 | 파일 위치 | 파일명 패턴 |
|----------|----------|------------|
| 완료된 WO | `docs/work-orders/` | `WO-{NAME}-V1.md` |
| Active contract | `docs/baseline/` | `{DOMAIN}-{ROLE}-CONTRACT.md` |
| Platform canonical | `docs/baseline/` | `DOC-{NAME}-V1.md` 또는 `{NAME}-STANDARD-V1.md` |
| Constitution | `docs/baseline/` | `{DOMAIN}-{ROLE}-STRUCTURE.md` |
| Architecture decision | `docs/architecture/` | `{NAME}-V1.md` |

### E. CHANNEL-* 두 문서 이관 시 처리 지침

두 문서를 `docs/work-orders/`로 이관할 경우:
1. CLAUDE.md §상세 규칙 문서 목록에서 해당 항목 경로 업데이트
2. 이관 후에도 governance 조항(`구현 금지 항목`)은 architecture 문서나 CLAUDE.md 인라인으로 보존 검토
3. 두 문서가 상호 참조하므로 **동시 이관** 권장

---

## 8. 다음 단계 권고

### 즉시 실행 가능 (WO-DOCS-NAMING-PHASE3B)

| 작업 | 위험도 | 설명 |
|------|:---:|------|
| CHANNEL-CREATION-FLOW → work-orders/WO-* | LOW | git mv + CLAUDE.md 1건 업데이트 |
| CHANNEL-EXECUTION-CONSOLE → work-orders/WO-* | LOW | git mv + CLAUDE.md 1건 업데이트 |

### 보류 (현재 파일명 적절)

| 파일 | 이유 |
|------|------|
| EVENT-OFFER-* 3개 | DOC prefix + Active + 현재 파일명이 이미 표준 |

### 영구 금지

| 파일 | 이유 |
|------|------|
| E-COMMERCE-ORDER-CONTRACT.md | cross-ref 6건 + §4 entry-point + CONTRACT 역할어 |
| KPA-SOCIETY-SERVICE-STRUCTURE.md | cross-ref 7건 + §10 기준 + 헌법 문서 선언 |

---

*IR 완료: 2026-05-07*
*다음 WO: WO-DOCS-NAMING-PHASE3B-CHANNEL-WO-MIGRATION-V1 (선택)*
*Status: Investigation Complete*
