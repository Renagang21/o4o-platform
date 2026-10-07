# IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICAL-CONSISTENCY-REVIEW

> **상태**: COMPLETED (조사 전용) — V2 초안을 ACTIVE 로 올리기 전 조항별 정합성 검토. 정본 · 코드 변경 0건
> **작성일**: 2026-10-02
> **근거**: 사용자 지시 "한번더 조사해" (2026-10-02) — 사용자 V2 초안 §1~§24 와 저장소 기존 정본의 조항별 충돌 조사. WO 문서 없음 — 이 IR 이 기록
> **기준 커밋**: `origin/main` 61ae47bc9
> **선행 IR**: [`IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS`](IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) (코드 vs 목표) — 이 IR 은 **V2 초안 vs 정본 문서**를 본다
> **검토 대상 초안**: 사용자 대화로 제시된 `O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2` 초안(저장소 미등재). 아래에서 "V2 §n" 은 그 초안의 절 번호, "P1 · P2" 는 초안 첫머리 두 원칙 문장이다
> - P1: O4O 의 최상위 제품은 Automation 이 아니라 Personal Work Assistant 다.
> - P2: Assistant 의 기억은 사용자와 업무에 귀속되고, PC 는 필요할 때 선택되는 Execution Node 다.

---

## 0. 결론

1. **V2 방향을 금지하는 사업 · 구조 정본은 없다.** 외부 도매 사이트 발주, 매장 운영 데이터 Cloud 보관, ProductMaster 참조, Kakao 업무 채널은 모두 현행 정본 안에서 **허용되거나 정의되지 않은 영역**이다(§4).
2. **그러나 V2 §23 의 대체 범위가 너무 좁다.** 초안은 `O4O-AUTOMATION-AGENT-ARCHITECTURE-V1` 만 SUPERSEDED 로 처리한다. 하지만 가장 큰 충돌(기억의 Local-first, 업무 사전 정의 금지, 실제 화면 인계, credential 불수집)은 그 **상위 정본** `O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1` 에 있다. ARCHITECTURE 정본은 "둘이 충돌하면 EVOLUTION-PRINCIPLES 가 우선한다"(`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md:6`)고 정한다. 따라서 ARCHITECTURE 만 대체하면 V2 는 **ACTIVE 가 되는 순간 상위 정본과 충돌한 상태**가 된다.
3. **2026-10-01 사용자 확정 조항 4건과 직접 충돌한다**: ARCH §5-1 질의형 recall · ARCH §9-3 최종 확정 사용자 직접 · ARCH §10-1 개발 순서 · EXPERIENCE-MODEL D1/D2. 이 4건은 V2 문장을 고치거나 해당 조항을 명시적으로 개정해야 한다.
4. **법률 · 개인정보 게이트가 V2 Phase C(기억 이동) 보다 먼저 와야 한다.** 개인정보처리방침에는 Local Agent · 자동화 · Assistant 기억에 대한 기재가 없다. 국외 이전도 Gemini · Gmail 만 고지돼 있다. V2 §11 · §12 · §15 를 실행하면 처리방침 개정이 필요하다(§3-C5).
5. **V2 초안에서 빠져 V1 대체 시 사라질 조항이 14건 있다**(§6). Human-Assisted Discovery, Knowledge/Manual, Shared Experience 동의 · 익명화, Target 개념 등이다.

판정 요약: **V2 는 "방향 수정 없이 ACTIVE" 불가 · "문장 수정 + 연동 개정 + 사용자 결정" 후 ACTIVE 가능.** 필요한 V2 문장 수정은 §7 에, 사용자 결정 항목은 §8 에 정리했다.

---

## 1. 범위 · 방법

- V2 초안 §1~§24 를 조항 단위로 정리한 뒤, 3개 축으로 병렬 대조했다.
  - ① 자동화 정본 3종: EVOLUTION-PRINCIPLES · AGENT-ARCHITECTURE · EXPERIENCE-MODEL
  - ② 사업 · 구조 정본: ROLE-WORKSPACE · PHILOSOPHY · COMMERCE-BOUNDARY · B2B 주문 계약 · F12 Product Resource · Supplier Domain · Boundary Policy(F6) · Core Freeze(F10)
  - ③ 데이터 · 보안 · 인증: 개인정보처리방침 · 보유기간 정책 · 통합 이용약관 · 매장 경영자 이용계약 · Identity V3 · RBAC Freeze(F9) · Local Agent · 병원약국 CHECK
- 판정 어휘: **CONSISTENT**(일치) · **EXTENDS**(V2 가 추가하나 충돌 없음) · **CONFLICT**(명시 개정 필요) · **NEEDS-DECISION**(정본이 판단을 사용자에게 남김) · **UNDEFINED**(어느 정본도 다루지 않음)
- 판정을 좌우하는 인용은 원문에서 다시 확인했다(부록 A).
- CLAUDE.md 우선순위상 ②(사업 · 정책 정본)가 ①(자동화 도메인 정본)보다 위다. 따라서 ②와의 충돌은 V2 가 물러서야 하고, ①과의 충돌은 개정 WO 로 풀 수 있다.

---

## 2. 대체 · 개정 범위 (V2 §23 보정)

V2 를 ACTIVE 로 올리려면 아래 문서를 **같은 WO 에서 함께** 다뤄야 한다. 따로 처리하면 정본끼리 모순인 기간이 생긴다.

| 문서 | 현재 상태 | V2 초안의 처리 | 필요한 처리 |
|---|---|---|---|
| `O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1` | ACTIVE · **상위 정본** | 언급 없음 | **부분 개정** — §5 · §7 주석(:100) · §14 · §24 Local Work Agent 행. 또는 V2 를 EVOLUTION 아래에 두고 V2 문장을 맞춤 |
| `O4O-AUTOMATION-AGENT-ARCHITECTURE-V1` | ACTIVE | SUPERSEDED | SUPERSEDED. 단 §6 의 orphan 조항을 V2 로 승계해야 함 |
| `O4O-AUTOMATION-EXPERIENCE-MODEL-V1` | ACTIVE · D1~D8 사용자 확정 | 개정 또는 V2 로 승계 | **개정** — D1 · D2 · §15 · §16 은 V2 와 충돌, 나머지(D3~D8 · §6~§13)는 대부분 유지 가능 |
| `docs/CANONICAL-INDEX.md` §6 (:127-129) | "Experience 중심" · "§10-1" 기재 | — | 행 갱신(별도 WO — CLAUDE.md §16-4) |
| `CLAUDE.md:29` · `AGENTS.md` Source of Truth 행 | "6계층 · Experience 중심 · 개발 순서 §10-1" | — | 포인터 갱신 |
| `O4O-AI-USAGE-FLOW-BASELINE-V1` §13 (:411-446) | "현재 불가능: Local Work Agent · Computer Use" — 이미 stale | — | 정합 갱신(V2 와 무관하게 낡음) |
| 개인정보처리방침 · 보유기간 정책 · 매장 경영자 이용계약 | 자동화 · Assistant 기억 미기재 | — | V2 Phase C 이전 개정 필요 여부를 사용자가 결정(§8-B) |

---

## 3. CONFLICT — 명시 개정이 필요한 충돌 (심각도 순)

### C1. 기억의 소유 위치 — Local-first 원칙 (HIGH)

| | 내용 |
|---|---|
| V2 | P2 · §11 기억은 사용자/업무 주체 소속 · §12 업무 데이터 Cloud 보관 가능 |
| 충돌 정본 | **EVOLUTION §7 주석** `:100` "구조적 경험의 저장 위치는 사용자 PC(Local) 다. 서버는 Local 원장을 read-back · 동기화하지 않으며…" (상위 정본) · **ARCH §5-1** `:156-170` (**사용자 확정 2026-10-01**) · ARCH §5 표 `:146-154` (교정 · 도움 = Local) · **EXP D1** `:642` (질의형 recall) · EXP §15 `:468-490` · EXP §16 `:505` "사용자의 실제 거래금액 · 거래처 실명 → LOCAL_ONLY 또는 DO_NOT_STORE" |
| 성격 | V2 가 의도적으로 바꾸려는 원칙. V2 문장이 아니라 **정본 개정 대상** |
| 풀이 | (1) 위 6곳을 하나의 개정 WO 로 함께 고친다. (2) 기억 계층을 2단(Local / Shared)에서 **3단(Device / Tenant-private Cloud / Shared)** 으로 정의한다 — V2 가 실제로 추가하는 것은 "사용자 · 매장 전용 Cloud" 층이며, 공유층(익명화 · 동의 전제)은 그대로 둘 수 있다. (3) "Experience 는 내용이 아니라 구조를 남긴다"(ARCH §4-2 `:138`)는 Tenant-cloud 층에서도 유지할지 정한다. 업무 데이터(가격 · 재고 · 주문)는 Experience 가 아니라 **별도 업무 데이터 영역**으로 두면 EXP D3 · §16 과의 충돌이 줄어든다 |
| 선행 조건 | ARCH §10 `:265` "데이터가 PC 밖으로 나가는 작업은 경계 정책이 선행" — V2 §13 (Storage/Processing/Retention/Sharing 정책) 이 **Phase C 보다 먼저** 확정돼야 한다. 현재 V2 §24 에는 이 순서가 없다 |

### C2. 업무 사전 정의 금지 vs 이름 붙은 Skill · Task type (HIGH)

| | 내용 |
|---|---|
| V2 | §4 `REPLENISHMENT_REVIEW` · §6 `HEALTHKR_PRODUCT_SEARCH` · "Skill registry"(§24 Phase E) |
| 충돌 정본 | **EVOLUTION 핵심 문장** `:19` "업무를 미리 정의하는 시스템이 아니라 … 반복되는 패턴을 발견하여 자동화 범위를 지속적으로 확장" · **EVOLUTION §14** `:152` "주요 기능 5개 … 미리 정하는 구조를 기본으로 하지 않는다", `:154` "등재부는 검증된 Workflow 의 저장 형태다. 최소 seed 는 허용" · EVOLUTION §15 · **EXP D2** `:643` "사이트별 업무 사전 정의 금지" (사용자 확정) · ARCH §10 `:264` "특정 사이트 · 업무 전용 코드는 사례로만" |
| 성격 | 상위 정본과의 충돌. **V2 문장 수정**으로 푸는 것이 맞다(EVOLUTION 원칙을 V2 가 뒤집으려는 의도는 초안에 없음) |
| 풀이 | V2 에 "Task type 과 Skill 은 운영자가 미리 정하는 목록이 아니라 실제 사용 → Experience → 검증 승격(§19)으로 생긴다. 이름은 예시다. Skill registry 는 **승격된 Experience 의 저장 형태**이며 seed 는 EVOLUTION §14 범위만 허용한다" 를 명시한다. 기존 결정론 adapter(health.kr 등)는 "seed" 로 분류한다 |
| 주의 | EVOLUTION §22 `:214` 평가 기준(지원 사이트 수 · 사전 정의 workflow 수는 지표가 아니다)을 V2 로 승계하지 않으면, Skill registry 가 "등록된 Skill 개수" 로 진척을 세는 방향으로 흐를 위험이 있다 |

### C3. 개발 순서 (HIGH)

| | 내용 |
|---|---|
| V2 | §24 A Assistant+Task → B Planner 분리 → C Memory → **D Execution Node · Task dispatch** → E Skill registry → **F Hybrid vision** → G Ingress → H ProductMaster → I Worker |
| 충돌 정본 | **ARCH §10-1** `:268-291` (**사용자 확정 2026-10-01**) "1 Experience Model → 2 User Assistance(+Correction) → 3 Strong Discovery → 4 Manual/Knowledge → 5 Promotion → 6 Shared", "Execution Runtime 은 별도 0번 트랙 · 새로운 runtime 최적화는 Experience 계층보다 선행하지 않는다", "순서를 바꾸려면 이 절을 고치는 명시적 WO 가 필요" · EXP §20 Phase 1~5 |
| 성격 | 순서 변경 자체는 정본이 허용한다(명시 WO 조건). 문제는 V2 순서가 **현재 진행 상태를 반영하지 않는다**는 것 |
| 현재 상태 | Phase 1(Local Experience 최소 저장) **코드 완료 · 실 PC smoke PENDING** · Phase 2(Assistance/Correction) 커밋 `6cd618217` · Strong Discovery(`87ebdb074`) **미배포 BLOCKED_FREEZE**. V2 순서표는 이 셋의 마감 여부를 말하지 않는다 |
| 풀이 | V2 §24 에 (1) "진행 중인 V1 Phase 1 · 2 · Strong Discovery 를 마감하는가, 동결하는가" 를 적고, (2) Phase D(작업 단위 dispatch) · F(vision) 가 ARCH §10-1 의 "runtime 최적화 선행 금지" 와 어떻게 다른지 근거를 적는다 — V2 자신의 경고("vision · polling 부터 하면 더 좋은 RPA")와 같은 취지이므로, D 를 "Execution Node 계약"(구조)으로 한정하고 성능 튜닝과 분리해 쓰면 충돌이 풀린다. (3) §13 정책 확정을 C 앞에 둔다(C1) |

### C4. 원격 실행 · Cloud Browser vs 실제 화면 인계 · credential 불수집 (MEDIUM-HIGH)

| | 내용 |
|---|---|
| V2 | §9 결과는 Cloud 로 요약 반환 · §15 Cloud Node/Cloud Browser · §16 KakaoTalk → 사무실 PC → 결과는 KakaoTalk |
| 충돌 정본 | **EVOLUTION §5** `:72-80` "실제 사이트/프로그램을 사용자가 바로 이어서 작업할 수 있는 상태로 남긴다 … AI 요약 화면만 보여주고 원본 업무 화면을 숨기는 구조는 기본값이 아니다" · EVOLUTION §25 #8 `:254` "credential 0" · **EXP §16** `:490` "비밀번호 · OTP · 토큰 · 인증 정보 → DO_NOT_STORE · 어디에도" · ARCH §5 `:149` · `CHECK-O4O-LOCAL-WORK-AGENT-V0.md:18` "쿠키 복사" 금지 |
| 성격 | 요청 기기 ≠ 실행 기기(§16)이면 실제 화면 인계가 기본값이 될 수 없다. Cloud Browser 가 도매 사이트에 로그인된 상태를 유지하면 세션 쿠키가 O4O 인프라에 있게 된다 |
| 풀이 | (1) EVOLUTION §5 를 "사용자가 실행 화면 앞에 있을 때는 실제 화면 인계, 원격 요청일 때는 결과 + 실행 노드의 실제 화면으로 가는 경로(링크 · 노드에서 열어 두기)" 로 개정하거나, V2 에 handover mode 를 정의한다. (2) Cloud Browser 의 세션 보관은 세 선택지 중 하나를 사용자가 정한다 — ⓐ 매번 사용자가 로그인하는 비영속 세션 ⓑ "어디에도" 규칙 개정 ⓒ Cloud Browser 는 로그인 없는 공개 사이트 전용. 결정 전까지 V2 §15 의 Cloud Browser 는 ⓒ 로 한정해 쓰는 것이 기존 정본과 충돌하지 않는다 |

### C5. 개인정보처리방침 · 약관 공시와의 충돌 (MEDIUM — 법률 판단 필요)

| | 내용 |
|---|---|
| V2 | §4 · §10 · §11 Assistant 기억 · 대화 context · task history · §8 화면 캡처를 vision LLM 에 전송 · §13 처리 정책 · §20 작업별 모델 선택 |
| 관련 정본 | 개인정보처리방침 `O4O-PRIVACY-POLICY-V1.0.md:426` "O4O Home AI 의 프롬프트 · 생성답변 · 첨부파일 원문을 AI 사용량 로그에 저장하지 않습니다" · 같은 문서 국외 이전 `:343-416` (**Gemini · Gmail 만 고지**) · `:414` "생성형 AI 기능을 이용하지 않는 방법으로 국외이전을 거부" · 통합 이용약관 `O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md:10` "OpenAI 는 API Key 존재만으로 … 추가하지 않는다 … provider 전환 = privacy-policy revision trigger" · 보유기간 정책 `O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md:17` "보유기간을 무기한으로 두지 않는다", `:91` "AI 입력 · 첨부파일을 별도 저장하는 기능이 추가되면 … 처리방침을 개정한다" |
| 현재 코드와의 관계 | 선행 IR §H: 지금도 work-agent planner 는 요청 원문 · 화면 텍스트를 OpenAI(`gpt-6-astra`)로 보낸다. 처리방침 국외 이전 항목에 OpenAI 가 없다. **V2 와 별개로 이미 존재하는 공시 격차일 수 있다** — 법적 판단이므로 이 IR 은 결론 내리지 않고 보고만 한다 |
| 풀이 | V2 문장 문제가 아니라 **선행 법무 게이트**. V2 §13 에 "처리방침 · 보유기간 · 국외 이전 고지가 개정되기 전에는 Assistant 기억의 Cloud 저장(Phase C) · 새 provider 의 화면 전송(Phase F)을 열지 않는다" 를 적는 것이 기존 정본(약관 `:10`)과 맞다 |

### C6. 주문 확정 "정책에 따라" vs 최종 확정 사용자 직접 (MEDIUM)

| | 내용 |
|---|---|
| V2 | §21 "실제 주문 확정 → 정책에 따라 확인" |
| 충돌 정본 | **ARCH §9-3** `:250-252` (**사용자 확정 2026-10-01**) "조제 보고, 마약류, 청구, 결제, 전자서명, 계약 · 법적 확정 … 최종 확정 · 고위험 행위는 수준과 무관하게 사용자가 직접 확정한다" · ARCH §8-2 `:216` 최종 확정 클릭 · 결제 차단 · EVOLUTION §25 #8 "COMMIT 미실행" |
| 풀이 | V2 §21 의 "정책에 따라" 는 주문 확정을 정책으로 자동화할 여지를 남긴다. ARCH §9-3 을 승계하려면 "실제 주문 확정 → 사용자 확인(수준 무관)" 으로 고친다. 자동 확정을 허용하려는 의도라면 §9-3 을 개정하는 사용자 결정이 필요하다 |

### C7. Experience 중심 → Assistant 중심 (MEDIUM, 의도된 변경)

| | 내용 |
|---|---|
| V2 | §22 Assistant 가 최상위, Experience 는 하단 시스템 |
| 충돌 정본 | ARCH §1-1 `:41` "계층 4 가 중심이다" · ARCH §0 `:13` "실행 도구는 손이고, 경험이 자산이다" · CANONICAL-INDEX `:128` · CLAUDE.md `:29` |
| 풀이 | 의도된 변경이므로 V2 에 "**Assistant 는 제품 구조의 중심, Experience 는 자산의 중심**" 처럼 두 축을 구분해 쓰면 ARCH §0 의 자산 원칙을 잃지 않는다. 포인터 3곳 갱신 필요(§2) |

### C8. Lower-cost Reasoning 단계 누락 (LOW-MEDIUM)

| | 내용 |
|---|---|
| V2 | §20 Unknown → Strong · Known → Skill · Repeated → Deterministic · Failure → Strong |
| 충돌 정본 | ARCH §1-2 `:43-49` 역할 3종(Strong Discovery / **Lower-cost Reasoning** / Deterministic) · ARCH §7-1 (L1~L4 수준) · §7-2-5 |
| 풀이 | V2 가 중간 단계(검증된 절차를 따라가며 작은 판단만 하는 저비용 수행자)를 폐기하는 것인지, 생략한 것인지 명시한다. "속도는 약한 모델로 해결하지 않는다" 와 "검증된 절차의 작은 판단은 저비용 모델" 은 양립한다 |

### C9. 용어 충돌 (LOW)

- **Task**: EXP §3 `:75-96` 의 Task 는 **업무 유형**(도메인 · 행위 · 대상, 문장이 아님)이다. V2 §4 의 Task 는 **업무 인스턴스**(owner · goal · status)다. V2 에서 "Task(인스턴스) · Task type(EXP §3 의 Task identity)" 로 구분하지 않으면 두 정본이 같은 단어를 다른 뜻으로 쓴다.
- **완료 기준**: V2 §4 "completion contract" 는 EVOLUTION §4 `:70` "핵심 지표는 업무 완료율이 아니라 시간 절감" 과 충돌할 여지가 있다. EXP §9 의 `USER_COMPLETED` · 부분 완료를 정상 결과로 유지한다고 적어야 한다.
- **Stage → Context**: V2 §18 은 교정 축적 단위를 "Task × Target × Context" 로 쓴다. EXP §7-6 은 "Task × Target × **Stage**" 다. 의도적 변경인지 명시가 필요하다.
- **Step 의 위치**: V2 §10 은 "DOM step/failure trace 는 Execution Experience" 라고 쓴다. 그런데 EXP §6 의 Step 은 **stage(의미 단계) 중심**이다. stage 는 Procedural Memory, locator · DOM trace 만 Execution Experience 로 나눠 써야 한다.

---

## 4. 사업 · 구조 정본 — 금지 없음, 경계 조건 있음

| V2 | 정본 | 판정 | 조건 |
|---|---|---|---|
| §16 외부 도매 사이트 발주 | COMMERCE-BOUNDARY §2 `:34` · §12 `:262-272` "O4O 에서 order 자체를 금지하지 않는다 … 발주 · 사업자 간 거래" · 판별 질문 `:278` "소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?" → 아니오 | **CONSISTENT (정의 없음)** | B2B 계약(`:20` · `:121`)은 O4O 공급자 offer 만 다룬다. 외부 도매 발주는 **어느 정본에도 정의돼 있지 않다**. 외부 사이트가 주문 원장(System of Record)으로 남는 한 `createOrder()` 단일 지점 규칙(BOUNDARY §5.4 `:226`)은 적용되지 않는다. 외부 발주를 `checkout_orders` 행으로 만들거나 새 `*_orders` 테이블을 만들면 위반 |
| §12 매장 재고 · 판매량 Cloud 보관 | COMMERCE §11 `:242-244` POS 판매결과 · 재고 → O4O 허용 · §6 `:146-150` "업무지원을 위한 사본" · `:256` 판매 원장 · 결제 실행 금지 | **CONSISTENT (사본 한정)** | 업무지원 사본이어야 하고 원장이 되면 안 됨. B2B §1-2 `:53` "새 ERP · 재고 시스템" 범위 밖 — V2 가 재고 시스템으로 커지면 결정 필요. POS 연동 Skill 은 "POS 비개발"(B2B §1-1 · CLAUDE.md) 과 충돌 → 결정 필요 |
| §14 ProductMaster 식별축 | F12 Freeze #6 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md:53` ProductMaster 에 역방향 FK 금지 · Supplier §3 `:63` `product_masters` 플랫폼 read-only · PRODUCT-CORE §12-3 `:230` 수집 데이터 직접 확정 금지 | **CONSISTENT (단방향 · read-only 한정)** | Assistant 쪽이 `product_master_id` 를 참조만, ProductMaster 는 역참조 없음. 미매칭 품목은 ProductCandidate 경로. `storeProductId` 는 정본에 없는 이름(0건) → 기존 엔티티(OPL 등)에 매핑 필요. 외부 도매 가격 · 재고의 정본 위치 없음. 보험코드 등 다중 식별자 매칭은 Identifier Core(미구현) 선행 |
| §14 판매 · 재고 · 주문 · 공급 연결 | BOUNDARY Rule 5 `:181` Cross-domain JOIN 금지 | **NEEDS-DECISION** | ID 참조 + 개별 조회는 허용. JOIN 이 필요하면 WO 예외(`:184`) |
| P2 · §11 "사용자/매장" 소유 | BOUNDARY §2 `:80-81` Store Ops = `organizationId` · Commerce = `storeId` · ROLE-WS §3 `:81` "My Store 는 Store 소유 공간 … 경계는 organizationId" · `:79` 1 Store : N Services | **CONFLICT (용어) / NEEDS-DECISION** | 정본에 `userId` 를 1차 경계로 하는 도메인이 없다. 매장 업무 데이터 · 매장 절차 기억은 **organization 소유**가 정본과 맞고, 개인 선호 · 교정만 user 소유가 된다. P2 "사용자에게 귀속" 은 직원 퇴사 · 다인 매장(`organization_members`)에서 정본과 어긋난다. 새 도메인 추가는 기존 도메인에 영향이 없으면 허용(`:258-260`) |
| §2 한 사용자 한 Assistant | ROLE-WS §1 `:32` 한 사용자 복수 업무공간 | **EXTENDS** | Task 마다 업무공간 · organization 을 지녀야 역할 drift(PHILOSOPHY §7 `:61`)를 막는다 |
| P1 Store 경영자 개인 비서 | PHILOSOPHY §6 `:55-57` "AI 는 운영자의 작업을 보조하는 도구다 … 사람의 검수 없이 최종 기준을 결정하지 않는다" | **EXTENDS / NEEDS-DECISION** | 현 PHILOSOPHY 의 AI 는 Operator 콘텐츠 도구 중심. 매장 경영자 개인 비서는 새 프레이밍 — PHILOSOPHY §7 `:66` 상 문서 개정 대상 |
| §1 · §13 서버 LLM 처리 | Supplier Domain §9 `:168` "Supplier 내부 LLM 호출 금지" | **NEEDS-DECISION** | 공급자 역할 사용자에게 Assistant 를 적용할 때의 범위 |
| 의약품 도매 발주 자동화 | 의약품 거래 절대 차단은 **O4O 내부** cart · `createOrder()` 축(`CHECK-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1.md:66,87` · `external-sales-eligibility.guard.ts:16`) | **정의 없음 · 법률 판단 필요** | 약국의 외부 도매 발주는 O4O 내부 거래가 아니다. 단 의약품 보충을 O4O cart · `createOrder()` 로 보내면 설계상 403 `DRUG_COMMERCE_FORBIDDEN`. 약사법 · 도매 사이트 약관 검토는 어느 정본에도 없음. 또한 이 차단 규칙은 baseline 이 아니라 CHECK · 코드에만 있다 |
| §21 승인 | 매장 경영자 이용계약 `O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md:180` "의약품, 건강 … 매장 경영자가 최종적으로 확인" | **CONSISTENT** | 계약의 서비스 범위(`:136` · `:489`)에는 외부 자동 발주가 없다 → 계약 개정 여부 결정 필요 |

---

## 5. UNDEFINED — 어느 정본도 다루지 않는 것

| 항목 | V2 | 메모 |
|---|---|---|
| 외부 Assistant 의 기계 자격 · 위임 토큰 | §17 | `service_credentials` 는 옛 서비스별 비밀번호 테이블이었고 **재사용 금지**(`O4O-IDENTITY-ARCHITECTURE-V3.md:63` · `USER-DOMAIN-SSOT-V1.md:53`). JWT 는 `tokenType:'user'` 만(`:139-140`). Core auth 수정은 CORE-FREEZE `:83-88` 의 명시 WO. Local Agent 의 별도 device-token 경로(`CHECK-O4O-LOCAL-WORK-AGENT-V0.md:143`)가 Core 를 건드리지 않는 선례 |
| ChatGPT · 개인 AI 연결 (O4O 가 OAuth 인가 서버가 되는 구조) | §17 | 정본 없음. Identity V3 `:94` 는 Google 외 소셜을 로그인 Identity 로 쓰지 않는다고만 정함 |
| Kakao 업무 채널 | §16 | Identity V3 `:148-151` "KakaoTalk 은 로그인 Identity 가 아니라 업무 채널 · Authenticated Connected Channel = Phase 7 별도 설계". **V2 와 방향 일치** — V2 는 사실상 Identity Phase 7 을 시작하는 것 |
| 원격 요청 시 OTP 입력 · 주문 승인 방법 | §16 · §21 | 요청 기기가 실행 기기와 다를 때 사용자가 OTP 를 어떻게 넣고 승인을 어떻게 하는지 정본 없음 |
| Assistant 기억 · task history · 대화 context 의 보유기간 | §11 | 보유기간 정책 `:17` 상 출시 전 확정 필수 |
| 건강정보 "별도 보호 경계" 의 내용 | §12 | 처리방침 `:511,515` 은 별도 법적 근거 · 동의 절차만 요구. 병원약국은 결정상 Local-only(`CHECK-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1.md:32` · `…-LOCAL-AUTOMATION-PILOT-V1.md:86`) — V2 §12 의 "재고 · 제품 데이터 Cloud" 와 겹치므로 예외 조항 필요 |
| 매장 소유 기억의 반환 · 이전 | §11 | 이용계약 반환 분류 F `:500` "AI 사용 메타정보 → 반환 대상 아님". "기억은 매장 소유" 라면 해지 시 반환 대상 분류가 필요 |
| 사용자 간 Skill 승격 = 데이터 재사용? | §19 | 이용계약 `:184,186` 은 자체 모델 학습 · 외부 제공자 학습 공유를 하지 않는다고 함. 절차 승격이 그에 해당하는지 해석 필요 |
| 외부 호출자 rate limit · quota | §17 | 약관 `:366` 은 자동화 수단 과부하를 금지만 함 |
| 외부 도매 가격 · 재고의 저장 위치 | §12 · §14 | `supplier_product_offers` 는 O4O 공급자 전용(Supplier write) |

---

## 6. Orphan — ARCH-V1 대체 · EXP-V1 개정 시 V2 로 승계하지 않으면 사라지는 조항

| # | 조항 | 출처 |
|---|---|---|
| O1 | **Human-Assisted Discovery** — 추측하지 말고 묻는다 · 같은 질문을 두 번 하지 않는다 · 재개 시 목표 유지 | ARCH §3 `:100-112` · EXP §7-3 |
| O2 | **Takeover 는 학습 신호** | EVOLUTION §6 `:84` (V2 §18 은 correction 만 다룸) |
| O3 | **Knowledge / Manual** — AI 는 원본 매뉴얼을 수정하지 않는다 · 공식 업데이트만으로 Skill 을 자동 변경하지 않는다(Knowledge Watch) | EXP §8~§8-4 |
| O4 | **Shared Experience** — 동의 전제 · 익명화 · 받은 Digest 는 미검증 Knowledge | ARCH §5 `:153-154` · EXP §17 · EVOLUTION §8 |
| O5 | 모델 비종속 역할 이름 · **외부 생성형 AI 의 사용자 화면을 조작해 Strong Agent 로 삼지 않는다** | ARCH §1-2 `:43-51` — V2 §17 ChatGPT ingress 는 반대 방향(ChatGPT → O4O API)이라 일치하지만, 이 금지 문장 자체는 승계해야 한다 |
| O6 | **Target** 개념(종류 · provisional · 가시성 · D8 사설 시스템 분류) | EXP §4 `:100-116` · D8 — V2 §18 은 Target 을 정의 없이 사용 |
| O7 | Stage 중심 Step | EXP §6 `:141-162` |
| O8 | 실패 원인 층 구분 · D7(runtime 실패는 절차 신뢰를 깎지 않음) | EXP §10-2 `:364-373` · D7 |
| O9 | Run Metric 시간 분해 | EXP §11 `:379-403` |
| O10 | D3 slot 값 run 종료 시 삭제 · D4 도움 · 교정 원문 미저장 | EXP §21 — V2 §10 의 Assistant Experience 가 교정 원문을 Cloud 로 올리면 D4 위반 |
| O11 | 승격 신호 목록 · 개인 승격 vs 공유 승격 · **강등은 즉시, 승격은 신중히** · stage 별 혼합 수준 | ARCH §7-2-3 `:197-198` · §9-1 · §9-2 |
| O12 | 우선순위 판단 원칙 — 사이트 전용 코드는 사례로만(`:264`) · 경계 정책 선행(`:265`) · EVOLUTION §22 KPI(`:266`) | ARCH §10 |
| O13 | "실행 완성도 ≠ 진척" | ARCH §8-5 `:219` |
| O14 | Experience 제외 대상(스크린샷 · 프롬프트 전문 · 업무 원장) | EXP §1 `:29-36` |

**User Convenience First**(ARCH §2-3, 사용자 확정)는 V2 와 충돌하지 않지만 문장 그대로 승계해야 한다. V2 §17 의 "O4O Web = Skill 관리 Surface" 가 사용자에게 절차 구조화를 요구하는 방향으로 해석되지 않게 하기 위해서다.

---

## 7. V2 초안 문장 수정 제안 (적용하지 않음)

정본 개정 없이 V2 문장만 고쳐서 풀리는 항목이다.

| V2 절 | 현재 | 제안 |
|---|---|---|
| P2 | "Assistant 의 기억은 사용자와 업무에 귀속" | "Assistant 의 기억은 **업무 주체**(매장 업무 = organization, 개인 선호 · 교정 = user)에 귀속되고, PC 는 기억의 소유자가 아니라 필요할 때 선택되는 Execution Node 다" (C1 · §4 BOUNDARY/ROLE-WS) |
| §4 · §6 | `REPLENISHMENT_REVIEW` · `HEALTHKR_PRODUCT_SEARCH` | "이름은 예시. Task type 과 Skill 은 실제 사용과 검증 승격으로 생기며 운영자가 미리 정하지 않는다. Skill registry = 승격된 Experience 의 저장 형태, seed 는 EVOLUTION §14 범위" (C2) |
| §4 | completion contract | "완료 계약은 실행 검증 기준이며 KPI 가 아니다. USER_COMPLETED · 부분 완료 · BLOCKED 는 정상 결과" · Task(인스턴스) / Task type 구분 (C9) |
| §9 | Node 내부 find → input → submit → verify | "Node 는 검증된 Skill 의 결정적 실행만 내부에서 수행하고, 어긋나면 판단을 Assistant 로 되돌린다(ARCH §8-1 `:215` 실행 계층 ≠ 두뇌 승계)" |
| §15 | Cloud Browser | "로그인 세션 보관 정책이 정해지기 전에는 로그인 없는 공개 사이트 전용" (C4) |
| §16 · §5 연동 | 결과를 Kakao 로 반환 | handover mode — 원격 요청이면 결과 + 실행 노드의 실제 화면으로 가는 경로 (C4) |
| §20 | Unknown/Known/Repeated/Failure | Lower-cost Reasoning 단계의 유지 · 폐기 명시 (C8) |
| §21 | 실제 주문 확정 = 정책에 따라 | "실제 주문 확정 · 결제 · 법적 확정 = 수준과 무관하게 사용자 확인(ARCH §9-3 승계)" (C6) |
| §22 | Assistant 최상위 | "구조의 중심 = Assistant, 자산의 중심 = Experience" (C7) |
| §23 | ARCH-V1 SUPERSEDED · EXP-V1 개정 | EVOLUTION 부분 개정 추가 · orphan O1~O14 승계 목록 첨부 · 포인터 3곳 갱신 (§2) |
| §24 | A → … → I | (1) V1 Phase 1 · 2 · Strong Discovery 의 마감/동결 결정 (2) §13 정책 · 법무 게이트를 C 앞에 (3) D 를 "Node 계약" 으로 한정해 runtime 튜닝과 구분 (C3) |
| §10 | DOM step/failure trace = Execution | stage → Procedural Memory, locator · DOM trace → Execution (C9) |
| §18 | Task × Target × Context | Stage 를 Context 로 바꾼 의도 명시 (C9) |

---

## 8. 사용자 결정 필요 항목

### 8-A. 제품 · 사업 (CLAUDE.md 우선순위 2 — 사업 정본 개정 수반)

| # | 결정 | 관련 |
|---|---|---|
| A1 | 기억 소유의 분할 — organization 소유 항목과 user 소유 항목, 직원 퇴사 · 매장 이전 시 처리 | C1 · §4 |
| A2 | 외부 도매 발주를 정본에 정의할지 — "매장 자신의 행위, O4O 는 대리 실행자 · 원장 아님 · `checkout_orders` 미생성" 조항 신설 위치(COMMERCE-BOUNDARY 또는 신규) | §4 |
| A3 | 주문 확정 자동화 허용 여부 — 허용하지 않으면 V2 §21 수정, 허용하면 ARCH §9-3 개정 | C6 |
| A4 | POS 데이터 수집을 V2 범위에 넣을지 — 넣으면 "POS 비개발" 조정 | §4 |
| A5 | PHILOSOPHY §6 개정 — AI 를 운영자 도구에서 매장 경영자 개인 비서로 확장 | §4 |
| A6 | 공급자 역할 사용자에게 서버 LLM 적용 범위(Supplier §9) | §4 |
| A7 | 외부 도매 가격 · 재고의 정본 위치, Identifier Core 를 Phase H 선행조건으로 둘지, `storeProductId` 매핑 대상 | §4 |
| A8 | 의약품 도매 발주 자동화의 법률 검토(약사법 · 도매 사이트 약관) 진행 여부, 의약품 거래 차단 규칙의 baseline 승격 여부 | §4 |

### 8-B. 데이터 · 법률 (CLAUDE.md 중지 조건 "법률 · 규제 판단")

| # | 결정 | 관련 |
|---|---|---|
| B1 | Local-first(사용자 확정 2026-10-01) 폐기 · 3단 기억 계층 채택 여부 | C1 |
| B2 | 개인정보처리방침 개정 — Assistant 기억 · task history · 대화 context 의 목적 · 근거 · 보유기간 | C5 · §5 |
| B3 | 국외 이전 고지 — OpenAI(현재 코드가 이미 사용) 등 provider 추가, 화면 캡처 속 제3자 개인정보 | C5 |
| B4 | "AI 를 쓰지 않는 방법으로 거부"(`PRIVACY:414`) 경로를 Assistant 가 핵심 제품일 때 어떻게 둘지 | C5 |
| B5 | Cloud Browser 의 제3자 사이트 세션 보관 — ⓐ 비영속 ⓑ 규칙 개정 ⓒ 공개 사이트 전용 | C4 |
| B6 | 건강 · 병원약국 데이터의 V2 §12 예외 조항(현재 Local-only 결정) | §5 |
| B7 | 매장 소유 기억의 반환 분류 · Skill 승격의 재사용 해석(이용계약 `:184,186,500`) | §5 |
| B8 | ChatGPT · Kakao 등 외부 채널로 O4O 결과가 나가는 것의 성격(이용자 지시 전송 vs 제3자 제공) · 동의 문구 | §5 |
| B9 | 처리방침 개정 시 재동의(Identity V3 §10 `:154-158` 동의 테이블 보류 해제) | §5 |

### 8-C. 구조 · 인증

| # | 결정 | 관련 |
|---|---|---|
| C-1 | ARCH §10-1 개발 순서 변경 WO — V1 Phase 1 · 2 · Strong Discovery 의 마감 또는 동결 | C3 |
| C-2 | 외부 ingress 인증 방식 — Core 밖 별도 guard(Local Agent 선례) vs Core 변경 WO, 위임 토큰 타입 | §5 |
| C-3 | Boundary Policy 에 Assistant 도메인 신설(1차 경계 = `organizationId` + `userId`?) · §14 연결에 Rule 5 예외가 필요한지 | §4 |
| C-4 | EVOLUTION §5 실제 화면 인계 원칙의 원격 요청 예외 | C4 |

---

## 9. 권고 순서 (구현 WO 아님)

1. V2 초안에 §7 문장 수정을 반영한다 — 정본 개정 없이 풀리는 C2 · C6(유지 결정 시) · C7 · C8 · C9.
2. §8-A1 · A3 · B1 · C-1 을 먼저 결정한다 — 이 네 개가 V2 의 뼈대(기억 위치 · 위험 경계 · 순서)를 정한다.
3. 정본 개정 WO 하나로 EVOLUTION 부분 개정 + ARCH-V1 SUPERSEDED + EXP-V1 개정 + V2 ACTIVE + orphan 승계 + 포인터 갱신을 함께 처리한다(§2).
4. 법무 게이트(B2~B4 · B6 · B9)는 V2 Phase C · F 의 선행조건으로 V2 §24 에 적는다. ACTIVE 자체를 막을 필요는 없다.

---

## 부록 A. 원문 재확인 (2026-10-02)

| 인용 | 위치 |
|---|---|
| "업무를 미리 정의하는 시스템이 아니라 … 반복되는 패턴을 발견하여" | `O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md:19` |
| "AI 요약 화면만 보여주고 원본 업무 화면을 숨기는 구조는 기본값이 아니다" | 같은 문서 §5 `:72-80` |
| "구조적 경험의 저장 위치는 사용자 PC(Local) 다. 서버는 Local 원장을 read-back · 동기화하지 않으며" | 같은 문서 `:100` |
| "주요 기능 5개 … 미리 정하는 구조를 기본으로 하지 않는다" · "등재부는 검증된 Workflow 의 저장 형태 … 최소 seed 는 허용" | 같은 문서 `:152` · `:154` |
| "최종 확정 · 고위험 행위는 수준과 무관하게 사용자가 직접 확정한다" | `O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md:252` |
| "둘이 충돌하면 EVOLUTION-PRINCIPLES 가 우선한다" | 같은 문서 `:6` |
| D2 "사이트별 업무 사전 정의 금지(EVOLUTION §14)" | `O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md:643` |
| "사용자의 실제 거래금액 · 거래처 실명 → LOCAL_ONLY 또는 DO_NOT_STORE" | 같은 문서 `:505` |
| "O4O Home AI 의 프롬프트 · 생성답변 · 첨부파일 원문을 AI 사용량 로그에 저장하지 않습니다" | `O4O-PRIVACY-POLICY-V1.0.md:426` |
| "KakaoTalk / LINE / WhatsApp 은 로그인 Identity 가 아니라 업무 채널" · Connected Channel = Phase 7 | `O4O-IDENTITY-ARCHITECTURE-V3.md:148-150` |

## 부록 B. 하지 않은 것

정본 · 코드 · DB · 배포 변경 0건. V2 초안을 저장소에 등재하지 않았다(사용자 결정 전). CANONICAL-INDEX · CLAUDE.md · AGENTS.md 포인터와 AI-USAGE-FLOW §13 stale 은 보고만 했다. 법률 · 규제 사항은 결론 없이 결정 항목으로만 올렸다.
