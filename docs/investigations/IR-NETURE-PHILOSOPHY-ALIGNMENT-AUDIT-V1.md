# IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1

> **조사 요청서 (Investigation Request)**
>
> 코드 수정 없음 / UI 수정 없음 / 콘텐츠 수정 없음 / SSOT 갱신 없음
>
> 본 문서는 Neture 및 O4O 관련 기준 문서, 소개 문서, 역할 정의 문서, UX 설계 문서를 조사하여 **현재 구조와 O4O 사업 철학 간의 정합성**을 확인하기 위한 IR이다.
>
> 이번 조사는 구조 변경이 아닌 **"철학 기준 SSOT 재정렬을 위한 조사"** 이다.

- **작성일:** 2026-05-23
- **분류:** Investigation Request (Read Only)
- **대상 영역:** Neture / O4O 전체 문서 + 코드 구조
- **버전:** V1
- **선행 IR:** [IR-O4O-NETURE-OVERVIEW-STRUCTURE-AUDIT-V1](IR-O4O-NETURE-OVERVIEW-STRUCTURE-AUDIT-V1.md), [IR-NETURE-SUPPLIER-STATE-AUDIT-V1](IR-NETURE-SUPPLIER-STATE-AUDIT-V1.md)

---

## 0. 조사 목적

다음 Drift 가능성을 명확히 한다.

1. Neture가 "공급자 포털"처럼 해석되는 표현 존재 여부
2. 공급자 역할 과대 정의 여부
3. 운영사업자 역할 축소 여부
4. 매장 HUB 역할 정의 불일치 여부
5. 현실 공급자 업무 흐름과 시스템 설계 간 괴리 여부
6. 공급자 → 운영사업자 → 매장 실행 흐름 반영 여부

---

## 1. 철학 기준 (조사 기준선)

본 IR이 "정합성 여부"를 판단하는 기준이 되는 사업 철학은 다음과 같다.

### 1.1 3자 역할 정의 (Business Philosophy 기준)

| 역할 | 본질 | 책임 |
|------|------|------|
| **공급자(Supplier)** | 상품·서비스 원천의 보유자 | **원천 자료 제공** (상품 정보, 브랜드 자료, 마케팅 원본) |
| **운영사업자(Operator, 서비스 운영 사업자)** | O4O 위에서 사업을 운영하는 주체 | **공급자 자료 수신 → AI 활용/보완/구성 → 매장 실행 자산 제작 → 매장 지원 → 서비스 운영** |
| **매장(Store)** | 오프라인 실행 주체 | **HUB에서 제공받은 실행 자산을 매장 현장에서 실행** |

### 1.2 흐름 (Canonical Flow)

```
공급자 기업
  ├ 마케팅팀 / 브랜드팀 / 외주 제작사
  ↓ (원천 자료 전달 — 상품 정보, 이미지, 브랜드 자료, 마케팅 원본)
공급자 담당자
  ↓
운영사업자 (서비스 운영 사업자)
  ↓ AI 활용 / 보완 / 큐레이션 / 구성
매장 HUB
  ↓
매장 실행 (POP / QR / 블로그 / 상품 설명 / 사이니지 / 고객 설문)
```

### 1.3 현실 가정

- 공급자는 POP/QR/블로그/사이니지를 **직접 제작하지 않는다**.
- 매장은 콘텐츠를 **창작하지 않는다**. 매장은 HUB가 제공한 실행 자산을 **현장에 적용**한다.
- AI를 **사용하는 주체는 운영사업자**다. 매장과 공급자는 AI의 결과물을 받는다.

---

## 2. 조사 결과 — 영역별

### 2.1 영역 ① — Neture 소개 / Hero / Overview 정합성

**조사 대상 문서:**
- [DRAFT-O4O-NETURE-OVERVIEW-BODY-V1.md](DRAFT-O4O-NETURE-OVERVIEW-BODY-V1.md)
- [WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1](../work-orders/WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1.md)
- [IR-O4O-NETURE-OVERVIEW-MESSAGE-DESIGN-V1.md](IR-O4O-NETURE-OVERVIEW-MESSAGE-DESIGN-V1.md)
- [IR-O4O-NETURE-HERO-MESSAGE-DESIGN-V1.md](IR-O4O-NETURE-HERO-MESSAGE-DESIGN-V1.md)
- [IR-O4O-NETURE-BUSINESS-INTRO-CURRENT-STATE-AUDIT-V1.md](IR-O4O-NETURE-BUSINESS-INTRO-CURRENT-STATE-AUDIT-V1.md)

#### Finding 2.1.1 — 3자 흐름이 신규 4-step에 누락됨

- **현재 문구**: `"전문성 → 콘텐츠 → 실행 → 성장"` (WO-OVERVIEW-BODY-REWRITE §3.9, DRAFT-OVERVIEW-BODY §4)
- **문제**: 매장 단일 시점의 4단계로만 표현되어 있어, **공급자가 어디에 있는지 / 운영사업자가 어디에 있는지 표현 부재**. "콘텐츠" 단계의 행위 주체가 누구인지 모호.
- **충돌 이유**: §1.2 흐름의 3자 관계가 사라지고, 매장 1자 시점으로 압축됨. "Neture가 공급자 포털인가 매장 도구인가" 라는 오해 여지를 남김.
- **수정 방향**: 4-step을 유지하되 각 단계의 **행위 주체**를 명시하거나, 별도 "3자 협업 구조" 카드/도식을 본문 하단에 추가.
- **Priority: HIGH**

#### Finding 2.1.2 — 운영사업자가 "운영 파트너 CTA"로만 표현됨

- **현재 문구**: `"운영 파트너로 참여하기"` (CTA 4개 중 1개, WO §107)
- **문제**: 운영사업자의 실제 역할(공급자 자료 가공, AI 활용, 매장 실행 자산 제작, 큐레이션, 매장 지원)이 개요 본문에 한 줄도 등장하지 않음. 현재 표현은 모호한 "함께 대응할 수 있는 구조를 만듭니다" 수준에 머무름.
- **충돌 이유**: §1.1에서 운영사업자가 O4O의 핵심 가치 생산자임에도, 개요는 이 역할을 **단순 협업자**로 격하시킴.
- **수정 방향**: 운영사업자 섹션 신설 (역할 — 책임 — 매장 지원의 3축 요약).
- **Priority: HIGH**

#### Finding 2.1.3 — 공급자는 "제품 공급자 CTA"로만 표현됨

- **현재 문구**: `"제품 공급자로 참여하기"` (CTA, WO §107)
- **문제**: 공급자의 역할 범위가 정의되지 않은 채 CTA만 노출됨. 클릭한 사용자는 "공급자가 무엇을 등록/제작하는가"를 가정하게 되는데, 이 가정이 §1 철학과 일치하는지 보장이 없음.
- **충돌 이유**: 공급자가 **원천 자료 제공자** 인지 **콘텐츠 직접 제작자** 인지 모호한 상태로 진입 동선만 열려 있음.
- **수정 방향**: 공급자 진입 페이지(/supplier 또는 onboarding) 자체에 §1 정의 적용 필요. 개요에서는 **"원천 자료 제공"** 문구 1줄로 명확화.
- **Priority: MEDIUM**

---

### 2.2 영역 ② — 운영사업자 역할 정의 정합성

**조사 대상 문서:**
- [USER-OPERATOR-FREEZE-V1.md](../architecture/USER-OPERATOR-FREEZE-V1.md)
- [BASELINE-OPERATOR-OS-V1.md](../baseline/BASELINE-OPERATOR-OS-V1.md)
- [OPERATOR-CORE-DESIGN-V1.md](../architecture/OPERATOR-CORE-DESIGN-V1.md)
- [OPERATOR-DASHBOARD-STANDARD-V1.md](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
- [O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md)
- [ROLE-POLICY-AND-GUARD-V1.md](../baseline/ROLE-POLICY-AND-GUARD-V1.md)
- CLAUDE.md §11

#### Finding 2.2.1 — 현재 SSOT는 일관되게 A안 (승인 관리자 + 콘텐츠 운영자)

- **현재 문구 (대표 인용):**
  - `CLAUDE.md §11`: `"Operator: 운영 + 콘텐츠 + 모니터링"`
  - `OPERATOR-DASHBOARD-STANDARD-V1 L19`: `"Dashboard 조회, 콘텐츠 CRUD, 사이니지, 포럼, AI 리포트"`
  - `ROLE-POLICY-AND-GUARD-V1 L31`: `"상태를 관리하는 역할 / 콘텐츠 CRUD, 상태 변경, 운영 조회"`
  - `O4O-OPERATOR-CANONICAL-WORKFLOW-V1 L15`: `"대량 항목 스캔→상태 확인→개별 검토→승인/반려/처리"`
- **문제**: 운영사업자의 정의가 **"플랫폼 내부 관리자"** 수준으로만 정의됨. §1.1의 "서비스를 운영하는 사업자" 정의와 충돌.
- **충돌 이유**: 핵심 책임 5개 중 누락:
  - ❌ 공급자 자료 수신
  - ❌ 공급자 자료 가공/구성
  - ❌ AI 활용 (현재는 "AI 리포트 조회" 수준)
  - ❌ 매장 실행 자산 제작
  - ❌ 매장 지원 / 큐레이션
- **수정 방향**: Operator 정의에 **"공급자 자료를 받아 AI로 가공해 매장 실행 자산을 만드는 사업자"** 라는 한 줄 SSOT 선언 필요. Freeze 문서 변경은 명시적 WO 필요.
- **Priority: HIGH**

#### Finding 2.2.2 — AI 활용 주체가 "수신자"로 표현됨

- **현재 문구**: `"AI 리포트 조회"` (OPERATOR-DASHBOARD-STANDARD-V1), `"AI 운영 인사이트"` (HUB-UX-GUIDELINES-V1 §8.2)
- **문제**: AI가 Operator에게 "조언"하는 형태로만 표현됨. **"Operator가 AI를 도구로 사용해 콘텐츠를 가공한다"** 는 표현이 모든 문서에 부재.
- **충돌 이유**: §1.1과 [O4O-AI-USAGE-FLOW-BASELINE-V1.md](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) §10의 `"선택(HUB) → 복사 → 정리(AI) → 실행"` 흐름 모두 운영사업자가 AI를 **능동적으로 사용**하는 주체임을 전제하나, 정의 문서는 이를 반영하지 않음.
- **수정 방향**: Operator 책임 매트릭스에 "AI 활용 (수동 능동)" 컬럼 분리.
- **Priority: MEDIUM**

---

### 2.3 영역 ③ — 공급자 기능 범위 정합성

**조사 대상 문서:**
- [IR-NETURE-SUPPLIER-STATE-AUDIT-V1.md](IR-NETURE-SUPPLIER-STATE-AUDIT-V1.md)
- [NETURE-PARTNER-CONTRACT-FREEZE-V1.md](../baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md)
- [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md)
- [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md)
- [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)

#### Finding 2.3.1 — 철학 선언과 구현이 불일치

- **현재 문구**:
  - 철학 선언 (IR-NETURE-STRUCTURE-FREEZE-V1 §2): `"공급자는 콘텐츠 생산자가 아니다. (CMS Producer 역할 없음)"`
  - 구현 (코드/문서): `POST /api/v1/cms/supplier/contents` — `authorRole='supplier'` 서버 강제, 공급자가 CMS 콘텐츠를 직접 생성 가능. supplier 대시보드에 `/supplier/contents`, `/supplier/signage/content` 메뉴 존재.
- **문제**: 한쪽에서는 "공급자는 콘텐츠 생산자가 아니다" 라고 선언하면서, 다른 쪽에서는 공급자가 직접 콘텐츠/사이니지를 만드는 UI/API가 살아 있음.
- **충돌 이유**: SSOT 분열. 두 선언이 동시에 진실일 수 없음.
- **수정 방향**: 공급자가 "어떤 종류의 자료"는 직접 생성 가능하고 "어떤 종류는 원천 자료로만" 제공하는지 명시. 권장 분류:
  - **공급자 직접 생성 허용**: 상품 마스터, 브랜드 광고/공지, 공급자 자료실(원천 저장소)
  - **공급자 직접 생성 금지 (운영사업자 가공 대상)**: POP, QR, 블로그, 상품 상세 설명, 사이니지 실행 콘텐츠
- **Priority: HIGH**

#### Finding 2.3.2 — 공급자→운영사업자 자료 전달 채널 미정의

- **현재 문구**: 없음 — 모든 조사 대상 문서에서 검색 결과 0건
- **문제**: 공급자가 운영사업자에게 **"원천 자료"** 를 어떤 채널로 전달하는지 정의된 곳이 없음. 현재 구조는 공급자가 직접 CMS에 등록하거나, 운영사업자가 외부에서 받아 등록하는 두 경로 중 어느 쪽이 canonical인지 불분명.
- **충돌 이유**: §1.2 흐름의 핵심 연결 고리가 정의되지 않음.
- **수정 방향**: "공급자 자료실(supplier vault) → 운영사업자 가공 큐(operator processing queue)" 라는 표준 채널 IR 후속 필요.
- **Priority: MEDIUM** (현 단계는 IR로 충분)

---

### 2.4 영역 ④ — 매장 HUB 정의 정합성

**조사 대상 문서:**
- [O4O-HUB-TEMPLATE-STANDARD-V1.md](../platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md)
- [HUB-UX-GUIDELINES-V1.md](../platform/hub/HUB-UX-GUIDELINES-V1.md)
- [PLATFORM-CONTENT-POLICY-V1.md](../baseline/PLATFORM-CONTENT-POLICY-V1.md)
- [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)

#### Finding 2.4.1 — HUB 정의는 B안(운영 공간)으로 명확

- **현재 문구**:
  - `HUB-UX-GUIDELINES-V1 §1`: `"모든 운영 허브의 화면 구조, 카드 배치, 신호 체계, 실행 흐름을 지배"`
  - `O4O-HUB-TEMPLATE-STANDARD-V1 §11.1`: `"매장의 운영 안내 허브 ... 정적 안내 카드 + CTA 블록"`
- **평가**: HUB 정의 자체는 §1 철학과 일치 (B안 — 운영 공간).
- **Priority: 정합 (수정 불필요)**

#### Finding 2.4.2 — HUB 책임 주체에 "운영사업자가 자산을 생산한다"는 명시 없음

- **현재 문구**: HUB-UX-GUIDELINES §2.1: `"Section 1: 운영 카드 (Operator) — 모든 역할 접근 / Section 2: 관리자 카드 (Admin Only)"`
- **문제**: Operator가 "카드를 보는 사람"으로 표현됨. **"Operator가 HUB의 콘텐츠를 생산해 매장에 공급한다"** 는 흐름이 명시되지 않음.
- **충돌 이유**: §1.1의 운영사업자 역할 중 핵심인 "매장 실행 자산 제작 → 매장 지원" 흐름이 HUB 문서에서 누락.
- **수정 방향**: HUB 문서에 `"Operator는 HUB 카드의 소비자가 아니라 생산자다"` 라는 1줄 선언 추가.
- **Priority: HIGH**

#### Finding 2.4.3 — PLATFORM-CONTENT-POLICY의 HubProducer enum이 흐름을 우회

- **현재 문구**: `HubProducer = 'operator' | 'supplier' | 'community' | 'store'` ([PLATFORM-CONTENT-POLICY-V1.md](../baseline/PLATFORM-CONTENT-POLICY-V1.md) §3, §6)
- **문제**: `supplier`가 직접 HUB Producer 가 될 수 있어, **운영사업자 가공 단계 없이도 공급자 콘텐츠가 HUB에 노출 가능**. 즉 정책상 "공급자 → HUB → 매장" 의 우회 경로가 열려 있음.
- **충돌 이유**: §1.2 흐름은 공급자가 HUB에 직접 등장하지 않는다고 가정하나, 정책은 직접 등장을 허용.
- **수정 방향**: 공급자의 HUB 직접 노출이 **의도된 정책인지, Drift인지**를 먼저 확정 필요. Freeze 문서이므로 변경은 명시적 WO 대상.
- **Priority: HIGH**

---

### 2.5 영역 ⑤ — 공급자 → 운영사업자 → 매장 흐름 정합성

#### Finding 2.5.1 — Canonical Flow 문서 부재

- **현재 문구**: 부분적으로 [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) §3 에 `"[입력 — 가공되지 않은 원천] → [편집/AI 정리] → [Store Production Material] → [사용처 결과물 생성]"` 흐름이 있음. 그러나 이 흐름의 **행위 주체(공급자 / 운영사업자 / 매장)** 가 명시되지 않음.
- **문제**: "누가 원천을 제공하고, 누가 편집/AI를 수행하고, 누가 결과물을 실행하는가" 가 문서 전체에서 일관된 SSOT로 정리된 곳이 없음.
- **충돌 이유**: §1.2 흐름이 명문화되지 않은 채 각 영역(공급자/Operator/HUB/Store)이 독립적으로 진화 중 → 영역별 Drift 가능성 영구적으로 잔존.
- **수정 방향**: 단일 SSOT 문서 신설 후보:
  - `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` (가칭)
  - 내용: 공급자 / 운영사업자 / 매장 역할 정의 + 흐름 다이어그램 + 각 단계 책임 주체 + Drift 방지 가드
- **Priority: HIGH** (이 IR의 최상위 후속)

---

### 2.6 영역 ⑥ — O4O 철학 SSOT 정합성

#### Finding 2.6.1 — 사업 철학 SSOT 부재 (기술 철학 SSOT만 존재)

- **현재 상태**:
  - 기술 철학 SSOT: 명확 (PLATFORM-CONTENT-POLICY, AI-USAGE-FLOW-BASELINE, STORE-LAYER-ARCHITECTURE, BOUNDARY-POLICY)
  - 사업 철학 SSOT: **DRAFT 상태에만 존재** ([DRAFT-O4O-NETURE-OVERVIEW-BODY-V1.md](DRAFT-O4O-NETURE-OVERVIEW-BODY-V1.md), 2026-05-23 작성)
- **문제**: "O4O가 무엇인가 / 왜 필요한가 / 3자 역할은 무엇인가" 에 대한 **공식 SSOT가 없음**. 모든 정의가 코드 / Freeze 문서 / DRAFT 사이에 분산.
- **충돌 이유**: 사업 철학이 명문화되지 않으면, 영역별(공급자/Operator/HUB/Store) 문서들이 각자 다른 가정 위에 진화하면서 Drift가 누적됨. 본 IR이 식별한 Finding 다수의 근본 원인.
- **수정 방향**: DRAFT를 정식 SSOT로 승격 + CLAUDE.md §0/§13 위로 통합. 예: `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`.
- **Priority: HIGH** (이 IR의 또 다른 최상위 후속)

---

## 3. Drift 종합 표

| # | Finding | 영역 | Priority |
|---|---------|------|----------|
| F1 | 신규 4-step에 3자 흐름 누락 | Overview | HIGH |
| F2 | 운영사업자가 "운영 파트너 CTA"로만 표현됨 | Overview | HIGH |
| F3 | 공급자 진입 동선만 있고 역할 범위 미정의 | Overview | MEDIUM |
| F4 | Operator SSOT가 A안(승인 관리자)에 고정 — 사업자 정의 누락 | Operator 정의 | HIGH |
| F5 | AI 활용 주체가 "수신자"로만 표현됨 | Operator 정의 | MEDIUM |
| F6 | "공급자는 콘텐츠 생산자 아님" 선언과 구현 불일치 | 공급자 범위 | HIGH |
| F7 | 공급자→운영사업자 자료 전달 채널 미정의 | 공급자 범위 | MEDIUM |
| F8 | HUB 책임 주체에 "운영사업자가 생산한다" 명시 없음 | HUB 정의 | HIGH |
| F9 | HubProducer enum이 supplier 직접 노출 허용 (운영사업자 우회) | HUB 정의 | HIGH |
| F10 | 3자 Canonical Flow SSOT 문서 부재 | 흐름 | HIGH |
| F11 | O4O 사업 철학 SSOT 부재 (DRAFT 상태) | 철학 SSOT | HIGH |

---

## 4. 종합 판정

| 항목 | 현재 상태 |
|------|----------|
| O4O 기술 철학 SSOT | OK — 명확 (다수 Freeze 문서) |
| O4O 사업 철학 SSOT | NG — 부재 (DRAFT만 존재) |
| 운영사업자 정의 SSOT | WARN — A안(승인 관리자), 사업 철학과 충돌 |
| 공급자 정의 SSOT | WARN — 선언과 구현 불일치 |
| 매장 HUB 정의 SSOT | WARN — B안(운영 공간)이나, "운영사업자가 생산한다"는 흐름 누락 |
| 3자 흐름 SSOT | NG — 부재 |
| Neture Overview/Hero | WARN — 매장 중심 메시지로 재정렬 중, 3자 협업 표현 누락 |

**결론**: 현재 구조는 **기술적으로는 일관**되어 있으나, **사업 철학 차원에서는 SSOT가 부재**하여 영역별 Drift가 누적되고 있다. Neture가 "공급자 포털처럼 해석될 위험"은 **즉시 발생한 것이 아니라, 사업 철학 SSOT의 부재로 인해 시간이 지날수록 커질 구조적 위험**이다.

---

## 5. 후속 권장 (IR 단계에서의 제안, 실행은 별도 WO)

본 IR은 수정을 수반하지 않는다. 후속으로 다음 순서의 WO/IR이 자연스럽다.

1. **사업 철학 SSOT 확정** — DRAFT-O4O-NETURE-OVERVIEW-BODY-V1 → `O4O-BUSINESS-PHILOSOPHY-V1.md` 정식 baseline 승격
2. **3자 Canonical Flow SSOT 신설** — `O4O-3-ROLE-FLOW-BASELINE-V1.md`
3. **Operator 정의 갱신 IR** — A안 → A+B안 통합 정의 (Freeze 변경이므로 명시적 WO 필요)
4. **공급자 범위 명확화 IR** — 직접 생성 허용 vs 원천 자료만 제공 분류표
5. **HUB Producer 정책 검증 IR** — `HubProducer='supplier'` 가 의도된 정책인지 확정
6. **Neture Overview 본문 보완** — 3자 협업 카드/도식 추가 (현재 진행 중 WO에 보충)

순서는 **1 → 2 → (3,4,5 병렬) → 6** 이 자연스럽다. 1과 2가 SSOT이고, 3~5가 이를 영역별로 정렬하는 작업, 6은 사용자 노출 결과물이다.

---

## 부록 A. 조사 근거 인용 (대표)

| Finding | 인용 |
|---------|------|
| F1 | `WO-OVERVIEW-BODY-REWRITE §263` — "전문성 → 콘텐츠 → 실행 → 성장" |
| F2 | `WO-OVERVIEW-BODY-REWRITE §107` — CTA "운영 파트너로 참여하기" / 본문 §185 "함께 대응할 수 있는 구조를 만듭니다" |
| F4 | `CLAUDE.md §11`, `OPERATOR-DASHBOARD-STANDARD-V1 L19`, `ROLE-POLICY-AND-GUARD-V1 L31` |
| F5 | `OPERATOR-DASHBOARD-STANDARD-V1` ("AI 리포트 조회"), `HUB-UX-GUIDELINES-V1 §8.2` ("AI 운영 인사이트") |
| F6 | `IR-NETURE-STRUCTURE-FREEZE-V1 §2` 선언 vs `POST /api/v1/cms/supplier/contents` 구현 |
| F8 | `HUB-UX-GUIDELINES-V1 §2.1` — Operator 섹션이 "접근(consume)" 관점 |
| F9 | `PLATFORM-CONTENT-POLICY-V1 §3, §6` — `HubProducer = 'operator' \| 'supplier' \| 'community' \| 'store'` |
| F11 | `DRAFT-O4O-NETURE-OVERVIEW-BODY-V1 §5` (2026-05-23 DRAFT) |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / 후속 SSOT 정비 대기
