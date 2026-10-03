# O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1

> **O4O AI 자동화 진화 원칙 — 상위 제품·개발 원칙 SSOT**
>
> Browser Agent · PC 프로그램 자동화 · 주문 · 회계 · 사이트 Adapter · Workflow 등 **모든 AI 자동화 WO 의 상위 기준**이다.
> 기능 구현 문서가 아니며, 개별 WO/CHECK 는 이 문서의 원칙 아래에 놓인다.

*Status: Active Baseline*
*Date: 2026-09-12 · 부분 개정 2026-10-03 (`WO-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICALIZATION` — §5 원격 요청 인계 · §7 주석 Ownership-first · §14 Task type/Skill · §24 Local Work Agent 행 · 하위 정본 포인터. 핵심 원칙 세 문장 불변) · 부분 개정 2026-10-04 (`WO-O4O-PERSONAL-ASSISTANT-PERSONALIZATION-PRINCIPLE-ALIGNMENT-V1` — §8 비교 목적 · §9 "표준 Workflow 승격" → Shared Candidate. 핵심 원칙 세 문장 불변)*
*상위 문서: [`CLAUDE.md`](../../CLAUDE.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) §6 (AI 의 역할) · [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) §5 (AI 개입)*
*하위 정본: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) (구조 — Personal Work Assistant) → [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) (Experience) · §24 표의 자동화 계열 WO/CHECK*

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

> **원격 요청 (2026-10-03)** — 요청한 기기와 실행 노드가 다를 때(예: 휴대폰 · 메신저로 요청 → 사무실 PC 에서 실행)는 실제 화면을 그 자리에서 인계할 수 없다. 이때 기본값은 **결과 요약 + 실행 노드의 실제 화면으로 가는 경로**(노드에 결과 화면을 열어 둔 채 유지)다. 요약만 남기고 원본 화면을 닫지 않는다 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §12.

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

> **저장 위치 — Ownership-first / Purpose-based Placement (2026-10-03 개정)**: 구조적 경험은 실행 위치가 아니라 **그 의미의 소유 주체**(organization · user · run)에 귀속되고, 실행 노드(PC 등)에는 credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로 같은 실행환경 상태만 둔다. Cloud-first 로의 반전이 아니며, 위 표의 "수집하지 않는다(내용)" 와 구조만 남기는 원칙은 저장 위치와 무관하게 그대로다. 실제 저장 위치 이동은 Legal / Data Processing Gate 통과 후에만 한다 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §9 · §17. 기록 단위는 [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md).
>
> ~~구조적 경험의 저장 위치는 사용자 PC(Local) 다. 서버는 Local 원장을 read-back · 동기화하지 않으며, 질의형 recall 만 허용한다 (2026-10-01)~~ — Local-first 는 V2 에서 폐기됐다.

## §8. 여러 사용자 경험을 비교한다

전문매장 사용자들이 쓰는 프로그램 · 사이트 · 업무 유형은 비교적 유사하다. 한 사용자의 개선 경험은 다른 사용자에게 재사용될 가능성이 높다.

```text
사용자 A: Workflow A · 8단계 · 70초 · 수정 3회
사용자 B: Workflow B · 5단계 · 38초 · 수정 1회     → 사용자 A 에게 추천할 후보 발견
```

비교의 목적은 **모든 사용자를 하나의 Workflow 로 통일하는 것이 아니라, 각 사용자의 Assistant 가 더 나은 방법을 후보로 알게 하는 것**이다. 사용자 A 가 B 의 방법을 쓸지는 A 의 Assistant 가 A 의 Experience 와 상황으로 판단하고, A 의 Run 에서 다시 검증된다(2026-10-04 개정 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §0-1).

## §9. 반복 패턴 → Workflow 후보

```text
실제 사용 → 반복 패턴 발견 → 개선 Workflow 후보 생성 → 검증 → 제한적 적용
        → 성공 여부 비교 → Shared Candidate 승격 (다른 사용자에게 추천 · 우선 후보)
```

- 승격의 끝은 **표준 Workflow 가 아니라 Shared Candidate** 다. 반복 검증된 방법은 추천하거나 우선 후보로 고려할 수 있지만 사용자에게 강제하지 않고, 그 사용자의 검증된 방법 · 교정을 덮어쓰지 않는다(2026-10-04 개정 — 종전 "표준 Workflow 승격").

**금지**: 사용자 행동 1회 → 즉시 공통 자동화 규칙 변경. 다수 사용자의 성공 경로를 하나의 표준 Workflow 로 만들어 모든 사용자에게 적용하는 것.

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

> API · WebMCP · Browser DOM · Windows UIA · Computer Use · RPA · Script 는 모두 **실행 수단**이다. RPA 는 AI Automation 과 경쟁하는 별도 개념이 아니라 AI Automation 이 고를 수 있는 실행 수단 중 하나다 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §11-3. (2026-10-01 · 포인터 2026-10-03)

## §12. 초기 비용과 속도

새로운 사이트/프로그램/업무에서는 초기에 `AI 호출 많음 · 화면 관찰 많음 · 잘못된 경로 진입 · 사용자 takeover 많음 · 속도 느림 · 비용 높음` 이 발생할 수 있다. 이는 허용한다. 단순 운영 낭비가 아니라 **Workflow 를 발견하기 위한 학습 비용**이다.

> **사용자 편의성과 업무 성공 가능성이 AI 비용보다 우선한다.** 비용을 줄이려고 사용자에게 자세한 prompt · AI 모델 선택 · 절차 사전 구조화를 요구하거나 불필요한 실패를 허용하지 않는다. 비용은 "한 번 비싸게 해결한 문제를 계속 비싸게 풀지 않는 것" 으로 낮춘다 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §5-3 · §8-3. 사용자 교정 · 매뉴얼 · 공식 웹 Knowledge 의 기록 단위는 [`EXPERIENCE-MODEL`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) §7-5 · §7-6 · §8-1~8-4. (2026-10-01)

## §13. 시간이 갈수록 개선되어야 한다

동일하거나 유사한 업무가 반복되면 `AI 탐색 감소 · Workflow 재사용 증가 · 사용자 조작 감소 · 완료시간 감소 · AI 비용 감소` 방향으로 발전해야 한다.

## §14. 사이트별 주요 업무를 미리 정의하지 않는다

O4O 운영자가 수백 개 사이트/프로그램을 일일이 조사하여 "이 사이트의 주요 기능 5개 · 이 프로그램의 핵심 업무 8개" 를 미리 정하는 구조를 **기본으로 하지 않는다**. 그 방식은 수백 개 서비스 수동 조사 · 지속 유지보수 · 사전 기획 의존 · SI 화로 이어진다.

> 등재부(EntryPoint Registry 등)는 **검증된 Workflow 의 저장 형태**다. 첫 사이트를 여는 최소 seed 는 허용하지만, 그 이후의 확장은 §15 의 실제 사용에서 나와야 한다.
>
> **Task type · Skill (2026-10-03)**: Personal Assistant 의 Task type 과 Skill 도 같다. 이름 붙은 Task type · Skill 은 운영자가 미리 정하는 목록이 아니라 실제 사용 → Experience → 검증 승격으로 생기며, Skill registry 는 승격된 Experience 의 저장 형태다. 기존 결정론 adapter 는 seed 다. 등록된 Skill 개수는 §22 의 지표가 아니다 — [`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §4-4 · §7.

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
| Local Work Agent | [`CHECK-O4O-LOCAL-WORK-AGENT-V0`](../checks/CHECK-O4O-LOCAL-WORK-AGENT-V0.md) · [`…-ONECLICK-PAIRING-V1`](../checks/CHECK-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1.md) | §5·§7 — 사용자 PC 에서 사용자 세션으로 실행, credential 불수집. V2 에서 **Execution Node** 로 재배치(기억의 소유자 아님 — [V2](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §9 · §11) |
| AI Capability / Tool Routing | [`CHECK-O4O-AI-CAPABILITY-TOOL-ROUTING-V0`](../checks/CHECK-O4O-AI-CAPABILITY-TOOL-ROUTING-V0.md) | §10·§11 — AI 는 판단, runtime 이 검증·실행 |
| Automation Execution Layer | [`CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1`](../checks/CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1.md) | §11 — Deterministic First, computer_use 는 마지막 fallback |
| Browser Control · DOM · Chrome Bridge | [`CHECK-O4O-BROWSER-CONTROL-V0`](../checks/CHECK-O4O-BROWSER-CONTROL-V0.md) · [`CHECK-O4O-BROWSER-DOM-CONTROL-V0`](../checks/CHECK-O4O-BROWSER-DOM-CONTROL-V0.md) · [`CHECK-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0`](../checks/CHECK-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0.md) | §5 — 사용자의 실제 탭에서 실행하고 그 화면을 남긴다 |
| Computer Use | [`CHECK-O4O-COMPUTER-USE-V0`](../checks/CHECK-O4O-COMPUTER-USE-V0.md) | §11·§12 — 초기 탐색 수단, 검증되면 결정적 실행으로 이동 |
| Windows App / Local Data | [`CHECK-O4O-WINDOWS-APP-WINDOW-CONTROL-V0`](../checks/CHECK-O4O-WINDOWS-APP-WINDOW-CONTROL-V0.md) · [`CHECK-O4O-LOCAL-DATA-SQLITE-V0`](../checks/CHECK-O4O-LOCAL-DATA-SQLITE-V0.md) · [`…-TOOL-BRIDGE-CLOSURE-V1`](../checks/CHECK-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1.md) | §7 — 구조적 상태만, 원자료 비노출 |
| Supplier Site Adapter | [`CHECK-O4O-SUPPLIER-SITE-ADAPTER-V0`](../checks/CHECK-O4O-SUPPLIER-SITE-ADAPTER-V0.md) | §9·§11 — Adapter = 검증된 Workflow 의 저장 형태 |
| Pharmacy Web Automation Core · health.kr | [`CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`](../checks/CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0.md) | §14·§15 — EntryPoint Registry 는 seed, 확장은 usage 에서 (§25 참조) |
| AI 활용 흐름 · 사업 철학 | [`O4O-AI-USAGE-FLOW-BASELINE-V1`](O4O-AI-USAGE-FLOW-BASELINE-V1.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) §6 | 상위: "AI 는 사람의 검수 없이 최종 기준을 결정하지 않는다" 와 일치 |

## §25. 현행 구현과의 정렬 상태 — 충돌 · 격차 (2026-09-12 조사 · 2026-10-01 갱신)

코드 · 아키텍처를 임의로 바꾸지 않는다. 아래는 **보고**이며 각 항목은 후속 WO 의 입력이다.
2026-10-01 갱신 근거: [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](../investigations/IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) census. 계층별 구현 방향은 하위 정본 [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) 이 정한다(2026-10-03 — [`ARCHITECTURE-V1`](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) SUPERSEDED). 아래 표의 "ARCHITECTURE §n" 은 작성 시점 기록이며 현재 위치는 V2 §21 승계표로 찾는다.

### 25-1. 2026-09-12 항목의 현재 상태

| # | 2026-09-12 현행 | 당시 판정 | 2026-10-01 상태 |
|---|---|---|---|
| 1 | Pharmacy Web Core 의 EntryPoint Registry 가 코드 상수로 사전 정의(약학정보원 4개) | 긴장(충돌 아님) | **그대로** — 사이트 registry 도 코드 상수(TS · agent · 확장 3곳 중복). "usage → EntryPoint/Workflow 승격" 경로 여전히 없음 |
| 2 | usage event 에 `takeover step · user correction count · completion state` 없음 | 격차 | **일부 해소** — work-agent usage event 에 takeoverReason/Step · completionState · failureClass · recoveryTier · durationMs · aiPlanCount 추가. **`userCorrectionCount` 는 상수 0(미기록)**. 저장은 로그뿐(DB·집계 없음) |
| 3 | 의도 해석이 키워드 결정론, AI 판단(§10)이 개입하지 않음 | 격차 | **일부 해소** — 등재 대상 안에서 AI planner(관찰 → 계획 → runtime 검증 → 실행) 동작. 요청 분기·대상 해석은 여전히 키워드 결정론이고, **처음 보는 대상은 탐색하지 않고 거절**(§14 와 긴장) |
| 4 | DOM V0 밖 컨트롤 → 사용자가 이어 함, takeover 지점 미기록 | 일치 | **개선** — QUESTION(재개 가능) ↔ TAKEOVER(종료) 분리, takeover 지점은 usage event 에 기록 |
| 5 | Adapter 결과 "값 요약" 전달, 화면은 사용자 탭에 | 일치(§5) | 변화 없음 |
| 6 | 이미지 식별 WO 초안 순서 | 긴장 | 변화 없음(재개 안 됨) |
| 7 | CHECK 완료 기준이 smoke PASS 중심, §22 지표 측정 구조 없음 | 격차 | **그대로** — 최근 CHECK 다수가 runtime 결함 마감. 지표 집계 채널 없음 |
| 8 | structured first · fallback 추적 · COMMIT 미실행 · credential 0 | 일치 | 일치 유지. 단 Deterministic First 순서는 수단 **선택**이 아니라 fallback 기록·위험 게이트에만 쓰인다(수단은 대상 유형으로 결정) |

### 25-2. 2026-09-12 이후 구현된 것

| 구현 | 원칙 대응 |
|---|---|
| resume / runId — 같은 run 이어가기(version-checked) | §4·§6 — 사람이 이어받은 지점에서 다시 이어간다 |
| User Assistance QUESTION / resume — QUESTION ≠ 실패, 재개 가능 | §6 |
| Workflow Candidate — 성공 run 을 입력 슬롯 템플릿으로 Local 저장 · 결정적 replay · 어긋나면 AI 로 복귀 | §9·§11·§20 (개인 범위 · 단일 실행 공유 승격 없음) |
| replay preflight — 불특정 입력이면 재생 전 질문 | §9 — 검증 없이 재생하지 않는다 |
| targetHint — 재개 시 대상 승계 | §4 |

### 25-3. 2026-10-01 현재 격차

| # | 현행 | 판정 | 후속 |
|---|---|---|---|
| 9 | Experience 구조 부족 — 저장되는 학습 산출물은 성공 DOM 경로(Workflow Candidate)뿐. 실패·복구·사용자 답변/교정·참조 자료·지표는 run 과 묶여 남지 않는다. **사용자 도움·재개 run 은 Candidate 저장에서 제외**된다 | **격차 (§6·§7 와 어긋남)** | Experience Model 설계 (ARCHITECTURE §10-2) |
| 10 | Promotion 없음 — 수준(단계적 자동화 §17) 개념 · 승격 조건 · 저가 수행자 전환 없음. 결정적 경로는 Candidate replay 하나, 강등은 실패 누적 disable 하나 | **격차 (§9·§13·§17)** | Experience 축적 뒤 Promotion |
| 11 | 재개 시 원래 업무 목표가 planner 에 돌아오지 않는다(답변문이 새 요청이 됨) | 격차 (§6) | User Assistance 보강 |
| 12 | Execution layer 가 가장 성숙 — 실행 계열 ≈21k LOC vs 학습 계열 ≈0.7k LOC. 진행 중 runtime 결함(명령 polling · relay 재연결 · content script 미주입 site_not_ready) | **일치하나 편중** — 실행 계층 완성도는 §22 지표가 아니다 | runtime 은 필요한 만큼만 마감(ARCHITECTURE §10-1 0번 트랙) |
| 13 | 매뉴얼 · 업무 문서 ingestion 없음(문서 첨부는 대화로 분기) | 격차 (§18) | Manual / Knowledge |
| 14 | 사용자 간 경험 비교·공유 없음(Local 전용, 서버는 상태·명령·로그만) | 격차 (§8) | Shared Experience (동의·익명화 정책 선행) |

충돌로 판정된 항목은 없다(처음 보는 대상 거절은 하위 정본에서 MISALIGNED 로 판정 — 원칙 변경이 아니라 구현 정렬 대상). 무단 코드 수정 · 아키텍처 재설계는 하지 않았다.

---

*문서 정합: 이 문서는 자동화 계열의 첫 baseline 이다. CANONICAL-INDEX §6 · CLAUDE.md Source of Truth · AGENTS.md §7 에 연결한다.*
