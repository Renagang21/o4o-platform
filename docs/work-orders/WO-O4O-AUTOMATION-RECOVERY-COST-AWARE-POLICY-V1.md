# WO-O4O-AUTOMATION-RECOVERY-COST-AWARE-POLICY-V1

> **성격**: 복구 정책 재정의 — `decideRecovery`/tier 순서 로직 변경(코드 WO). 핸드오프 전용, 명시 지시 전 실행 금지.
> **선행/근거**: `WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0`(구현·배포) · [WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1](WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1.md)(실 smoke) · Doctors 마약류 일괄입력 smoke 가 드러낸 원칙.
> **상위 기준**: [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md).

---

## 1. 목적

복구 우선순위를 **"강한 AI 우선"에서 "사용자 목적에 가장 싸고 빠르게 다시 접근하는 경로 선택"으로 재정의**한다.

두 원칙을 계층에 새긴다:
- **AI 가 모든 문제를 스스로 해결하는 것이 목표가 아니다.** 사용자가 알고 있을 가능성이 높은 정보는 적절한 시점에 **짧게** 질문하고, 그 답을 다음 자동화 개선에 활용한다.
- **Recovery 는 모델 성능을 최대화하는 문제가 아니라, 사용자의 목적에 가장 빠르고 저렴하게 다시 접근하는 방법을 선택하는 문제다.**

## 2. 배경

- 현 구현: `RECOVERY_TIERS = ['normal_retry','strong_model','user_assistance']` — strong 이 항상 user 앞. 이는 "AI 실패→더 강한 AI→끝까지 스스로"로 흐를 수 있다.
- Doctors smoke 실측 국면(예 "대상 환자에 표준코드 미입력"): AI 가 화면을 2분 뒤지며 표준코드의 의미·입력 위치·재고리스트/제조번호/환자행 관계를 추론하는 것보다, **사용자에게 10초 질문 → 한 문장 답("위 재고리스트에서 알프람 선택 후 적용") → 즉시 진행**이 싸고 빠르고 UX 도 낫다. 사용자는 이미 답을 아는 경우가 많다.
- 초기 1~3개 약국/병원 사용자는 O4O 를 **가르치는 역할**을 겸한다. 첫 질문-답 한 번이 이후 "질문 없이 재고리스트 match→적용→저장 재시도"로 발전하고, 여러 사용자가 같은 방식으로 풀면 **공통 workflow 후보**가 된다(자동 승격은 금지, 후보 신호만 — 선행 WO `isImprovementCandidate` 계승).

## 3. 범위

**In scope:**
- `decideRecovery` 에 **비용/속도 판단 게이트** 도입: normal 판단 후 strong 으로 가기 전에 "사용자에게 묻는 게 더 빠른가?"를 먼저 본다.
- 질문 최소화 계약: 한 국면당 질문은 **막힌 원인 설명 + 필요한 정보 하나**. 막연한 질문("어떻게 해야 하나요?") 금지. 조금 모른다고 매번 묻지 않는다(§4 게이트 신호로 억제).
- 사용자 답 → `improvementCandidate` 신호(기존 6키 로그 재사용, 새 키 없음).
- baseline 원칙 2개(§1) 를 [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) 에 추가(이 WO 가 §16-4 예외의 명시 근거).

**Out of scope:**
- 새 tool·새 taxonomy·새 provider stack·새 로그 키.
- Safety/Risk/never-escalate 경계 변경(credential·commit·payment·security·risk 는 여전히 즉시 사용자, 판단 게이트 이전).
- 자동 workflow 승격(후보 신호까지만).
- UI 신설.

## 4. 제안 로직 (복구 우선순위)

```text
1. 현재 화면에서 명백히 해결 가능 → AI 스스로 진행
2. 짧은 재관찰/재시도로 해결 가능    → AI 진행 (normal_retry)
3. 사용자가 답을 알 가능성 높음 + 질문 하나면 해결 → 사용자에게 질문 (user_assistance 선행)
4. 사용자가 모를 가능성 높음 / 화면 변화·새 UI 분석 필요 → strong_model
5. 그래도 불확실 → 사용자 직접 조작 / takeover
```

즉 기존 `normal → strong → user` 를 다음으로 바꾼다:

```text
normal 판단
→ "사용자에게 물어보는 게 더 빠른가?"
   ├─ YES → 사용자 질문
   └─ NO  → strong model
→ 그래도 불확실 → takeover
```

**"묻는 게 더 빠른가" 신호(제안, 구현 시 확정):** 화면상 해결이 명백하지 않음 + 필요한 것이 **사용자 도메인 지식**(표준코드 입력 위치 등 앱 관례) + 질문 하나로 해소 가능. 반대로 새 UI/화면 변화 분석·좌표 추론이 필요하면 strong. never-escalate 국면은 이 게이트 이전에 그대로 즉시 사용자.

## 5. 검증

- 단위: `decideRecovery` 가 "user-likely-knows" 신호에서 strong 을 건너뛰고 user_assistance 를 먼저 고르는지 / 신호 없을 때 기존 strong 경로 유지(무회귀) / never-escalate 국면은 게이트 무관하게 즉시 사용자.
- 질문 최소화: 같은 국면 반복 질문 억제, 질문 문구에 원인 설명 + 단일 요청 포함.
- 무회귀: 선행 closure lock spec + 계약/런타임 spec 전부 green(기존 tier 상수/키 불변 확인).
- baseline 반영: 원칙 2개가 evolution principles 문서에 들어갔고 CANONICAL-INDEX 정합.
- 실 검증은 CLOSURE 계열 smoke 에 위임(Doctors 표준코드 국면에서 질문-우선 경로 실측).

## 6. 산출물

- 코드: `automation-recovery-contract.ts`(`decideRecovery` 게이트) + 필요 시 `work-agent-runtime.ts` 배선. 최소 diff.
- 테스트: `automation-recovery.spec.ts`/`work-agent-recovery-runtime.spec.ts` 에 게이트 케이스 추가.
- baseline: evolution principles 문서에 원칙 2개.
- CHECK + memory 트랙 갱신. 완료 보고 `문서 정합` 한 줄.

## 7. 금지 · 안전 경계

- never-escalate 경계(credential·commit·payment·security·risk)는 비용 게이트보다 **항상 우선** — 싸다고 위험 국면을 자동 진행하지 않는다.
- 질문-우선이 되어도 planner 는 safety 비활성·capability 변경·권한 상승·shell·credential·commit 을 할 수 없다.
- 사용자 답을 **자동 workflow 로 승격하지 않는다**(후보 신호까지).
- 내부 용어를 사용자 질문에 노출하지 않는다.
- baseline 편집은 이 WO 승인 범위에서만(§16-4). 그 밖 기준 문서는 보고 후 별도.
- Git: 전용 worktree·최신 origin/main·path-specific stage·`--force` 금지.
