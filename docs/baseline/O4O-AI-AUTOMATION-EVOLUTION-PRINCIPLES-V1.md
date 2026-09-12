# O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1

> **O4O AI 자동화 진화 원칙 — 상위 제품·개발 원칙 SSOT**
>
> Browser Agent · PC 프로그램 자동화 · 주문 · 회계 · 사이트 Adapter · Workflow 등 **모든 AI 자동화 WO 의 상위 기준**이다.
> 기능 구현 문서가 아니며, 개별 WO/CHECK 는 이 문서의 원칙 아래에 놓인다.

*Status: Active Baseline*
*Date: 2026-09-12*
*상위 문서: [`CLAUDE.md`](../../CLAUDE.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) §6 (AI 의 역할) · [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) §5 (AI 개입)*
*하위 문서: §24 표의 자동화 계열 WO/CHECK*

---

## 핵심 원칙 (세 문장)

> **사용자의 행동은 학습 자료이고, 사용자의 목적과 결과가 최적화 기준이다.**

> **O4O AI 자동화는 업무를 미리 정의하는 시스템이 아니라, 실제 사용자 업무를 관찰하고 반복되는 패턴을 발견하여 자동화 범위를 지속적으로 확장하는 시스템이다.**

> **O4O 의 목표는 모든 업무를 완전히 대신하는 것이 아니라, 사용자가 직접 해야 하는 지점까지 가장 빠르고 안정적으로 데려가는 것이다.**

---

## §1. 핵심 철학 — 처음부터 완성된 자동화가 아니다

O4O AI 자동화의 목표는 처음부터 완성도 높은 자동화 서비스를 내놓는 것이 아니다.
**실제 사용자의 업무를 수행하면서 반복되는 패턴을 발견하고, 검증된 개선을 계속 축적하여 서비스가 시간이 갈수록 더 좋아지도록 만드는 것**이 목표다.

```text
처음부터 완성된 자동화                                   X

사용 → 관찰 → 패턴 발견 → 개선 → 검증 → Workflow 축적
    → 다음 사용에서 더 나은 자동화                        O
```

## §2. 사용자의 행동이 정답은 아니다

사용자의 행동은 **학습 자료**이고, 사용자의 **목적과 결과**가 최적화 기준이다.
사용자는 지금 비효율적인 경로로 사이트·프로그램을 쓰고 있을 수 있다. O4O 는 사용자의 클릭 순서를 그대로 복제하는 시스템이 아니다.

```text
사용자 기존 흐름:  홈 → 메뉴 A → 뒤로 → 메뉴 B → 검색 → 조건 수정 → 결과 확인
```

이 경로를 그대로 자동화하는 것이 목표가 아니다. O4O 는 반복 작업을 수행하면서
`사용자의 목적 · 시작 상태 · 실행 경로 · 결과 · 소요시간 · 사용자 수정` 을 비교하고 더 효율적인 경로를 찾는다.

## §3. 사용자의 목적이 기준

O4O 가 먼저 이해해야 할 것은 "사용자가 무엇을 하려는가" 다. 그 다음 현재 사이트/프로그램을 관찰하여 가능한 실행 방법을 찾는다.

```text
User Goal
  ↓ 현재 화면/상태 관찰
  ↓ 가능한 행동 판단
  ↓ 업무 수행
  ↓ 결과 관찰
  ↓ 목적에 가까워졌는지 판단
```

## §4. 완전 자동화가 목표가 아니다

사용자는 자신의 작업시간이 줄어드는 것만으로 충분한 가치를 느낀다. 모든 업무를 끝까지 자동 완료할 필요가 없다.

```text
원래 10단계 업무 → O4O 가 7단계 수행 → 사용자가 마지막 3단계 수행   = 충분히 성공적인 자동화
```

핵심 지표는 "업무 완료율" 이 아니라 **사용자 시간 절감 · 사용자 조작 감소 · 반복 작업 감소**다.

## §5. 최종 화면을 사용자에게 넘긴다

O4O 는 가능하면 실제 사이트/프로그램을 **사용자가 바로 이어서 작업할 수 있는 상태**로 남긴다.

```text
AI 가 사이트에서 작업 → 원하는 결과 화면까지 이동 → 그 실제 화면을 사용자에게 인계
```

AI 요약 화면만 보여주고 원본 업무 화면을 숨기는 구조는 기본값이 아니다. 사용자는 필요하면 바로 추가 작업을 한다.

## §6. 사용자 Takeover 는 실패가 아니다

사용자가 AI 작업 이후 직접 이어서 작업하는 것은 실패가 아니라 **중요한 학습 신호**다.

```text
AI → 6단계까지 수행 / 사용자 → 7단계 수정 · 8단계 완료
```

O4O 는 여기서 `자동화 경계 · 사용자 수정 지점 · 반복 수정 여부` 를 관찰한다.

## §7. 사용자 작업을 그대로 저장하지 않는다

O4O 가 학습할 것은 민감한 업무 내용이 아니라 **구조적 이벤트**다.

| 수집한다 (구조) | 기본적으로 수집하지 않는다 (내용) |
|---|---|
| target · workflow goal · entryPoint · automation steps · takeover step · user correction count · completion state · duration · success/failure | 환자정보 · 처방내용 · 비밀번호 · OTP · 전체 화면 내용 · 사이트 전체 데이터 · 민감한 입력값 |

## §8. 여러 사용자 경험을 비교한다

전문매장 사용자들이 쓰는 프로그램 · 사이트 · 업무 유형은 비교적 유사하다. 한 사용자의 개선 경험은 다른 사용자에게 재사용될 가능성이 높다.

```text
사용자 A: Workflow A · 8단계 · 70초 · 수정 3회
사용자 B: Workflow B · 5단계 · 38초 · 수정 1회     → 더 좋은 Workflow 후보 발견
```

## §9. 반복 패턴 → Workflow 후보

```text
실제 사용 → 반복 패턴 발견 → 개선 Workflow 후보 생성 → 검증 → 제한적 적용
        → 성공 여부 비교 → 표준 Workflow 승격
```

**금지**: 사용자 행동 1회 → 즉시 공통 자동화 규칙 변경.

## §10. AI 의 역할

AI 는 다음에 강하게 쓴다: `사용자 목적 이해 · 현재 화면 해석 · 예외 상황 판단 · 여러 실행 경로 비교 · 반복 패턴 발견 · 개선 Workflow 후보 생성 · 사이트/프로그램 변화 대응`.

## §11. 결정적 Runtime 의 역할

반복적으로 검증된 행동은 AI 판단에서 점차 분리한다.

```text
처음: AI 가 화면을 많이 해석
  → 반복 후: 검증된 DOM/UIA Workflow
  → 더 반복: 결정적 실행 증가 · AI 호출 감소

AI = 발견 / 판단 / 예외 대응        O4O Runtime = 검증된 실행
```

이는 [`AUTOMATION-EXECUTION-LAYER`](../checks/CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1.md) 의 **Deterministic First**(api → browser_dom → windows_uia → computer_use) 와 같은 방향이다.

## §12. 초기 비용과 속도

새로운 사이트/프로그램/업무에서는 초기에 `AI 호출 많음 · 화면 관찰 많음 · 잘못된 경로 진입 · 사용자 takeover 많음 · 속도 느림 · 비용 높음` 이 발생할 수 있다. 이는 허용한다. 단순 운영 낭비가 아니라 **Workflow 를 발견하기 위한 학습 비용**이다.

## §13. 시간이 갈수록 개선되어야 한다

동일하거나 유사한 업무가 반복되면 `AI 탐색 감소 · Workflow 재사용 증가 · 사용자 조작 감소 · 완료시간 감소 · AI 비용 감소` 방향으로 발전해야 한다.

## §14. 사이트별 주요 업무를 미리 정의하지 않는다

O4O 운영자가 수백 개 사이트/프로그램을 일일이 조사하여 "이 사이트의 주요 기능 5개 · 이 프로그램의 핵심 업무 8개" 를 미리 정하는 구조를 **기본으로 하지 않는다**. 그 방식은 수백 개 서비스 수동 조사 · 지속 유지보수 · 사전 기획 의존 · SI 화로 이어진다.

> 등재부(EntryPoint Registry 등)는 **검증된 Workflow 의 저장 형태**다. 첫 사이트를 여는 최소 seed 는 허용하지만, 그 이후의 확장은 §15 의 실제 사용에서 나와야 한다.

## §15. 실제 사용이 우선순위를 만든다

```text
실제 사용자 사용 → 사용 빈도 확인 → 반복 업무 확인 → 마찰 지점 확인 → 자동화 후보 발생
```

운영자가 미리 대표 업무를 선정하지 않는다.

## §16. 서비스/프로그램 수가 제한적이라는 강점

O4O 대상 업종은 범용 개인업무 자동화와 다르다. 전문매장이 쓰는 `웹사이트 · PC 프로그램 · 공급처 · 공공서비스 · 회계서비스 · 업무 방식` 은 상당 부분 반복된다. 전체 대상이 수백 개 수준이라면, 사용자 경험에서 발견한 Workflow 를 다른 사용자에게 재사용할 수 있다.

## §17. 자동화 수준은 단계적으로

```text
AI Assist → AI + 사용자 공동 작업 → 검증된 반복 업무의 부분 Workflow → 충분히 안정화된 결정적 자동화
```

처음부터 최종 단계로 갈 필요가 없다.

## §18. 멀티모달 입력 원칙

사용자가 주는 `텍스트 · 이미지 · 파일` 은 특정 업무 전용 parser 를 먼저 만드는 방식보다, **현재 업무 목적과 사이트/프로그램이 요구하는 정보를 기준으로** 해석하는 방향을 우선한다.

```text
입력을 먼저 완벽히 구조화 → 사이트에 맞춤                       (후순위)
업무 목적 + 현재 화면 → 필요한 정보 결정 → 입력에서 필요한 부분 추출  (우선)
```

## §19. 약학정보원 사례 (구조 설명용 — 사이트 전용 정책 아님)

```text
사용자: 알약 이미지 + "이게 무슨 약인지 찾아줘"
O4O:   약학정보원 진입 → 식별검색 화면 관찰 → 사이트가 요구하는 검색조건 확인
     → 이미지에서 가능한 조건 추출 → 일부 조건 입력 → 검색 → 여러 후보가 나와도 허용
     → 실제 검색 결과 화면을 사용자에게 인계
```

정확한 약품 하나를 찾지 못해도 사용자의 수작업을 크게 줄였다면 성공이다.

## §20. Workflow 의 진화

Workflow 는 고정된 영구 규칙이 아니다. 사이트가 변하거나 더 나은 경로가 발견되면 다시 개선된다.

```text
기존 Workflow → 실패/비효율 관찰 → AI 재탐색 → 개선 후보 → 검증 → 새 Workflow
```

## §21. 서비스 설명 원칙

사용자에게 과도하게 약속하지 않는다. 권장 표현:

> O4O AI 업무자동화는 사용자가 반복하는 업무를 함께 수행하면서 사용 패턴을 익히고, 사용할수록 자주 하는 작업을 더 빠르게 처리하도록 발전하는 서비스다. 처음 접하는 업무는 사용자가 일부 이어서 처리할 수 있으며, 반복될수록 자동화 범위와 속도가 개선된다.

## §22. 평가 기준

| 핵심 KPI 가 **아닌** 것 | 더 중요한 지표 |
|---|---|
| 지원 사이트 숫자 · 사전 정의 Workflow 숫자 · AI 자동 완료율 | 동일 업무 완료시간 감소 · 사용자 수동 조작 감소 · 사용자 takeover 위치 변화 · 반복 수정 감소 · Workflow 재사용률 · 새 업무 적응 속도 · AI 판단 호출 감소 · 결정적 실행 비율 증가 |

## §23. 최종 원칙

문서 상단 "핵심 원칙 (세 문장)" 이 이 문서의 최종 원칙이다. 개별 WO 가 이와 충돌하면 WO 를 이 문서에 맞춘다.

---

## §24. 기존 문서와의 연결

자동화 계열은 아직 baseline 이 없고 WO/CHECK(기록물)로만 존재한다. 이 문서가 그 위의 상위 기준이다.

| 계열 | 문서 | 이 원칙과의 관계 |
|---|---|---|
| Local Work Agent | [`CHECK-O4O-LOCAL-WORK-AGENT-V0`](../checks/CHECK-O4O-LOCAL-WORK-AGENT-V0.md) · [`…-ONECLICK-PAIRING-V1`](../checks/CHECK-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1.md) | §5·§7 — 사용자 PC 에서 사용자 세션으로 실행, credential 불수집 |
| AI Capability / Tool Routing | [`CHECK-O4O-AI-CAPABILITY-TOOL-ROUTING-V0`](../checks/CHECK-O4O-AI-CAPABILITY-TOOL-ROUTING-V0.md) | §10·§11 — AI 는 판단, runtime 이 검증·실행 |
| Automation Execution Layer | [`CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1`](../checks/CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1.md) | §11 — Deterministic First, computer_use 는 마지막 fallback |
| Browser Control · DOM · Chrome Bridge | [`CHECK-O4O-BROWSER-CONTROL-V0`](../checks/CHECK-O4O-BROWSER-CONTROL-V0.md) · [`CHECK-O4O-BROWSER-DOM-CONTROL-V0`](../checks/CHECK-O4O-BROWSER-DOM-CONTROL-V0.md) · [`CHECK-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0`](../checks/CHECK-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0.md) | §5 — 사용자의 실제 탭에서 실행하고 그 화면을 남긴다 |
| Computer Use | [`CHECK-O4O-COMPUTER-USE-V0`](../checks/CHECK-O4O-COMPUTER-USE-V0.md) | §11·§12 — 초기 탐색 수단, 검증되면 결정적 실행으로 이동 |
| Windows App / Local Data | [`CHECK-O4O-WINDOWS-APP-WINDOW-CONTROL-V0`](../checks/CHECK-O4O-WINDOWS-APP-WINDOW-CONTROL-V0.md) · [`CHECK-O4O-LOCAL-DATA-SQLITE-V0`](../checks/CHECK-O4O-LOCAL-DATA-SQLITE-V0.md) · [`…-TOOL-BRIDGE-CLOSURE-V1`](../checks/CHECK-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1.md) | §7 — 구조적 상태만, 원자료 비노출 |
| Supplier Site Adapter | [`CHECK-O4O-SUPPLIER-SITE-ADAPTER-V0`](../checks/CHECK-O4O-SUPPLIER-SITE-ADAPTER-V0.md) | §9·§11 — Adapter = 검증된 Workflow 의 저장 형태 |
| Pharmacy Web Automation Core · health.kr | [`CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`](../checks/CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0.md) | §14·§15 — EntryPoint Registry 는 seed, 확장은 usage 에서 (§25 참조) |
| AI 활용 흐름 · 사업 철학 | [`O4O-AI-USAGE-FLOW-BASELINE-V1`](O4O-AI-USAGE-FLOW-BASELINE-V1.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) §6 | 상위: "AI 는 사람의 검수 없이 최종 기준을 결정하지 않는다" 와 일치 |

## §25. 현행 구현과의 정렬 상태 — 충돌 · 격차 (2026-09-12 조사)

코드 · 아키텍처를 임의로 바꾸지 않는다. 아래는 **보고**이며 각 항목은 후속 WO 의 입력이다.

| # | 현행 | 판정 | 후속 반영 |
|---|---|---|---|
| 1 | Pharmacy Web Core 의 EntryPoint Registry 가 **코드 상수로 사전 정의**(약학정보원 4개)된다 | **긴장(충돌 아님)** — §14 는 seed 를 허용하되 확장은 usage 에서 나와야 한다. 현재 "usage → 신규 EntryPoint 승격" 경로가 없다 | usage event 집계 → EntryPoint/Workflow 후보 승격 절차(§9·§15) |
| 2 | Pharmacy Web usage event 키 = `siteId · entryPointId · intent · status · errorCode · durationMs · domCommands · timestamp(·inputMode)` | **격차** — §7 의 `takeover step · user correction count · completion state` 가 없다 | usage event 확장(내용 아닌 구조만) |
| 3 | 의도 해석이 키워드 결정론이고 AI 판단(§10)이 tool 선택에 개입하지 않는다(ai-core F1: native tool calling 없음) | **격차** — §10 의 "화면 해석 · 경로 비교 · 예외 판단" 미실현. 결정적 runtime(§11)은 먼저 섰다 | AI 판단 층 도입 시 "AI 판단 → runtime 검증" 구조 유지 |
| 4 | 상세 진입(`td onclick`) · 색상/모양 커스텀 컨트롤은 DOM V0 밖 → 사용자가 이어서 한다 | **일치** — §4·§6 takeover 모델. 다만 takeover 지점이 기록되지 않는다(#2) | Browser DOM V1 + takeover 이벤트 |
| 5 | Adapter 결과가 "값 요약" 으로 프롬프트에 가고, 실제 화면은 사용자 탭에 남는다 | **일치(§5)** — 다만 UI 가 "그 화면으로 가기" 를 안내하지 않는다 | 결과 화면 인계 UX |
| 6 | 진행 중이던 이미지 식별 WO 초안이 "Vision → 구조화된 특징 → EntryPoint 입력" 순이다 | **긴장** — §18 은 "업무 목적 + 현재 화면 → 필요한 정보 결정" 을 우선한다. 초안도 Adapter 가 적용 가능한 조건(식별문자)만 넘기고 나머지를 미적용으로 표기하므로 방향은 같다 | 재개 시 "현재 화면이 요구하는 조건 → 추출" 순서로 명시 정렬 |
| 7 | CHECK 문서의 완료 기준이 smoke PASS 개수 중심이고 §22 지표(완료시간 · 조작 감소 · 재사용률)를 측정할 구조가 없다 | **격차** | 지표 정의 + 집계 채널(새 DB 없이 로그 집계부터) |
| 8 | Automation Execution Layer · Browser DOM · Computer Use 의 "structured first · fallback 추적 · COMMIT 미실행 · credential 0" | **일치(§10·§11·§7)** | — |

충돌로 판정된 항목은 없다. 무단 코드 수정 · 아키텍처 재설계는 하지 않았다.

---

*문서 정합: 이 문서는 자동화 계열의 첫 baseline 이다. CANONICAL-INDEX §6 · CLAUDE.md Source of Truth · AGENTS.md §7 에 연결한다.*
