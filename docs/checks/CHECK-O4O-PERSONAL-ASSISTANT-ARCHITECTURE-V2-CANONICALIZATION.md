# CHECK-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICALIZATION

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICALIZATION` + `WO-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH-AND-CANONICALIZATION-UPDATE` (사용자 지시 2026-10-03, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-03
> **ENVIRONMENT_BASELINE**: [`IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH`](../investigations/IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH.md) §L-1 (`300764aa4`) — 환경 Census 반복 없음
> **선행 IR**: [`…-V2-GAP-CENSUS`](../investigations/IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) · [`…-V2-CANONICAL-CONSISTENCY-REVIEW`](../investigations/IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICAL-CONSISTENCY-REVIEW.md)

---

## 0. 판정

```text
V2_ACTIVE                         = YES   docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md
ARCHITECTURE_V1                   = SUPERSEDED (본문 보존 · 유효 조항 V2 §21 승계)
EVOLUTION_PRINCIPLES              = 부분 개정 (§5 · §7 주석 · §14 · §24 행 · 하위 정본 포인터 · 핵심 세 문장 불변)
EXPERIENCE_MODEL                  = V2 정합 개정 (§0-1 · §20 · §21 · §22 표기 · D2~D8 유지)
ORPHAN_O1_O14                     = 14/14 승계 (V2 §21)
POINTERS                          = CANONICAL-INDEX §6 · CLAUDE.md · AGENTS.md 갱신
STALE_BASELINE                    = AI-USAGE-FLOW §13 · §14 stale 표기 (본문 재정렬은 별도 WO)
LEGAL_DATA_PROCESSING_GATE        = V2 §17 신설 (ACTIVE blocker 아님 · Memory Cloud 이동 · 새 외부 처리 전 필수)
KNOWN_GAP_OPENAI_DISCLOSURE       = STILL_OPEN (법률 판단 · 처리방침 수정 0)
NEW_POLICY_CONFLICT               = 0  (STOP 없음)
CODE / DB / MIGRATION / RUNTIME   = 0
LOCAL_AGENT / CHROME_EXTENSION    = 0
DEPLOYMENT                        = NOT_APPLICABLE (문서-only · Delivery LEVEL 1 기대)
```

---

## 1. 실행 기준과 출처

| 입력 | 상태 |
|---|---|
| 사용자 확정사항 10건 (2026-10-03) | 반영 — §2 |
| 지난 WO §6 의 V2 결정 13건 | 반영 — §2 |
| Consistency Review §7 문장 수정안 · §6 orphan · §2 대체 범위 | 반영 |
| GAP Census §M 자산 판정 · §F 계층 · §G 기억 분류 | 반영 (V2 §20 · §23 · §9) |
| **52절 Canonicalization WO 전문** | **이 세션에 전달되지 않음** — 저장소 · 로컬 세션 기록에도 없음 |

V2 본문은 위 네 입력으로 작성했다. 52절 WO 와 문장 · 절 구성이 다를 수 있다. 원문이 주어지면 차이를 후속 커밋으로 정합한다(정책 결정 변경이 아니라 문안 정합).

## 2. 확정 결정 → 정본 위치

| 결정 | 위치 |
|---|---|
| O4O = Personal Work Assistant · ONE Assistant | V2 §0 P1 · §3 |
| Assistant Planning ≠ Execution Planning | V2 §2-1 |
| Task = 1급 객체 (Task / Task type 구분 · 완료 계약 ≠ KPI) | V2 §4 |
| Skill = 검증된 Experience 에서 승격되는 Procedure | V2 §7 · EVOLUTION §14 주석 |
| Strong Discovery A~D = Unknown-task Discovery capability 로 재배치 | V2 §5-1 · §18-1 · §20 |
| Experience 계층화 (Assistant / Procedural / Execution) | V2 §6 |
| Local-first 폐기 → Ownership-first / Purpose-based Placement (Cloud-first 아님) | V2 §9-1 · EVOLUTION §7 주석 · EXPERIENCE §0-1 |
| Memory ownership organization / user / run / node | V2 §9-2 |
| 실제 발주 확정 = 사용자 직접 승인 | V2 §15 |
| Request Device ≠ Execution Device · PC = Execution Node | V2 §11 · EVOLUTION §5 · §24 행 |
| Cloud Browser 인증 세션 보관 = 별도 승인 전 불허 | V2 §13 |
| 외부 도매 발주 = boundary 만 (`checkout_orders` 미생성 · Commerce 구조 불변) | V2 §16 |
| POS · PHILOSOPHY · 공급자 LLM = 새 정책 없음 · 현행 유지 | V2 §16 |
| 외부 ingress = 수용 구조 + 원칙만 · 인증 방식은 후속 | V2 §14 · §24 |
| Legal Gate = ACTIVE blocker 아님 · Memory 이동/외부 처리 전 필수 · OpenAI 격차 KNOWN GAP | V2 §17 |
| V1 미완료 트랙 동결 (Phase 1 완료 승계 · Phase 2 · Strong Discovery KEEP_BUT_REPOSITION) | V2 §18-1 · EXPERIENCE §20 · §22 |
| V1 실행 자산 폐기 없이 재배치 | V2 §20 |

## 3. Consistency Review 충돌 C1~C9 해소

| # | 해소 |
|---|---|
| C1 Local-first | EVOLUTION §7 주석 · EXP D1 · §15 · §16 개정 + V2 §9 (사용자 확정 1 · 9) |
| C2 사전 정의 금지 | V2 §4-4 · §7 문장 + EVOLUTION §14 주석 — 이름은 예시 · registry = 저장 형태 · seed |
| C3 개발 순서 | V2 §18 이 ARCH §10-1 대체 · V1 트랙 동결 · Gate 를 C 앞 · D = Node 계약(튜닝 아님) · Runtime 0번 트랙 유지 |
| C4 화면 인계 · credential | EVOLUTION §5 원격 요청 주석 · V2 §12 Handover · §13 Cloud Browser 공개 사이트 전용 |
| C5 처리방침 | V2 §17 Gate + KNOWN GAP (수정 0) |
| C6 주문 확정 | V2 §15 — 사용자 직접 승인 (ARCH §9-3 승계) |
| C7 중심 | V2 §1 — 구조의 중심 Assistant / 자산의 중심 Experience |
| C8 Lower-cost | V2 §8 — 유지 (현행 정본 유지 · 새 결정 아님) |
| C9 용어 | V2 §4-1 Task/Task type · §4-3 완료 계약 · §6-1 Stage 유지 · stage=Procedural / locator=Execution |

## 4. 변경 파일

| 파일 | 변경 |
|---|---|
| `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` | 신규 · ACTIVE (§0~§25) |
| `docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md` | 부분 개정 (헤더 · §5 · §7 주석 · §11 · §12 포인터 · §14 주석 · §24 행 · §25 포인터) |
| `docs/baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md` | SUPERSEDED 표기 (본문 불변) |
| `docs/baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md` | 상위 정본 변경 · §0-1 V2 정합 · §20 · §21 · §22 표기 |
| `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` | §13.1 Known drift 행 1개 (stale 표기) |
| `docs/CANONICAL-INDEX.md` | §6 — V2 행 추가 · ARCH-V1 SUPERSEDED · EXP 행 갱신 |
| `CLAUDE.md` · `AGENTS.md` | Source of Truth 포인터 1행씩 |

## 5. 하지 않은 것

코드 · DB · migration · runtime · 배포 설정 · `DEPLOY_FREEZE` · Local Agent · Chrome Extension · run resume · smoke — 0건. 개인정보처리방침 · 약관 · COMMERCE · PHILOSOPHY · Supplier · Identity · Boundary 정본 수정 0건. AI-USAGE-FLOW 본문 재정렬 · README 배포 문구 drift 는 별도 WO 로 남김.

## 6. 검증

- V2 내부 상대 링크 전부 존재 확인 (깨진 링크 0).
- 정본에서 ARCH-V1 을 현행 기준으로 가리키는 포인터 잔여 0 (CANONICAL-INDEX · CLAUDE.md · AGENTS.md · baseline).
- CI · Delivery 결과는 커밋 후 확인해 완료 보고에 적는다.

`문서 정합: 발견 2건(AI-USAGE-FLOW §13 stale · README 배포 이행 문구) / SUPERSEDED 표기 1건 / 링크 수정 4건 / 별도 WO 제안 2건`
