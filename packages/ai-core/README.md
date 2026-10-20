# AI Core

> **AI 공통 계약과 실행 흐름, provider 호출을 제공한다. 업무 규칙과 도메인 권한·저장은 호스트/Extension이 담당한다.**

---

## 1. 앱 설명

AI Core는 O4O Platform에서 AI 관련 **책임 경계와 기준점을 정의**하는 Core App입니다.

### 핵심 원칙

- 업무별 기능은 Extension이 구현하고, 공통 실행은 기존 `execute`/`executeStream`을 재사용
- AI의 **정책, 계약, 로그 기준**을 정의
- 모든 AI 관련 작업의 **참조 대상**

---

## 2. 책임 범위

### 2.1 AI 정책 기준점 (Policy)

```
policies/
└── ai.policy.ts
```

- AI 사용 정책 정의
- 서비스별 AI 활성화/비활성화 기준
- AI 기능 접근 권한 정책

### 2.2 AI 요청/응답 계약 (Contract)

```
contracts/
└── ai.contract.ts
```

- AI 요청 형식 표준
- AI 응답 형식 표준
- 에러 처리 계약

### 2.3 AI 로그/설명 가능성 기준 (Logs)

```
ai-logs/
└── ai-log.types.ts
```

- AI 호출 로그 형식
- 설명 가능성(Explainability) 기준
- 감사(Audit) 로그 표준

### 2.4 AI UX 개념 기준

- AI 버튼/모달 표준 (AiSummaryButton, AiPreviewModal)
- AI 응답 표시 형식
- 사용자 피드백 수집 기준

---

## 3. 명시적 비책임 항목

다음은 AI Core의 책임 범위에 **포함되지 않습니다**:

| 항목 | 소유권 | 비고 |
|------|--------|------|
| 추천 알고리즘 | 각 서비스 Extension | AI Core가 제공하지 않음 |
| 벡터 DB | 인프라 영역 | AI Core가 제공하지 않음 |
| 과금/결제 | payment-core | AI Core가 제공하지 않음 |
| 업체/모델 선택 정책 | 서버 정책·외부 연결부 | Core의 기존 provider adapter로 실제 호출 |
| 업무 LLM 프롬프트 | `@o4o/ai-prompts` · 업무 Extension | Core에서 업무 prompt를 정의하지 않음 |

---

## 4. 관련 패키지

| 패키지 | 역할 | 관계 |
|--------|------|------|
| `@o4o/ai-core` | 정책/계약/로그 기준 | **본 패키지** |
| `@o4o/ai-prompts` | 업무별 prompt | Extension에서 재사용 |
| 각 서비스 AI 컴포넌트 | 서비스별 AI UI | AI Core 계약 준수 |

### 4.1 AI를 사용하는 독립 서비스

AI Core의 정책/계약을 준수하지만 **AI Core나 AI Extension이 아닌 독립 Service Layer**로 동작하는 서비스를 여기에 등재한다. 현재 해당 서비스는 없다.

> **참고**: SiteGuide는 과거 이 항목의 예시였으나, **O4O 에서 legacy 코드·인프라가 모두 제거**되었으며 현재 운영 서비스가 아니다(WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1). **2026-10-05 서비스 폐기로 확정**됐다(WO-O4O-SITEGUIDE-RETIREMENT-V1) — 후보로 보류하지 않는다.

---

## 5. 향후 이관 대상

> 아래 기존 코드는 향후 AI Core App 소유로 이관 예정입니다.
> 이관은 별도 Work Order로 진행됩니다.

| 현재 위치 | 이관 대상 | 상태 |
|-----------|-----------|------|
| `api-server/routes/ai-query` | AI 요청 계약 | 예정 |
| 각 서비스 `components/ai/*` | UI 계약 참조 | 예정 |

---

## 6. 사용 예시

```typescript
// AI Core의 계약 타입 import
import { AiRequestContract, AiResponseContract } from '@o4o/ai-core/contracts';

// AI Core의 정책 확인
import { AiPolicy } from '@o4o/ai-core/policies';

// AI Core의 로그 타입
import { AiLogEntry } from '@o4o/ai-core/ai-logs';
```

---

## 7. Work Order 이력

| Work Order | 설명 | 상태 |
|------------|------|------|
| WO-AI-CORE-APP-SCAFFOLD-V0 | 스캐폴딩 (본 작업) | 완료 |
| WO-AI-CONTEXT-CARD-RULES-V1 | 컨텍스트 카드 규칙 | 대기 |

---

## 한 줄 요약

> **"공통 실행은 AI Core, 업무 규칙은 Extension, 권한·정책·저장은 기존 호스트가 담당한다."**

---

*Created: 2026-01-15*
*Work Order: WO-AI-CORE-APP-SCAFFOLD-V0*
*Status: Active Core App*


## 업무 Extension 실행 (2026-10-13)

[공통 구조·조사·TODO](../../docs/architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)와
[구현 WO](../../docs/work-orders/WO-O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)를 따른다.
`AiBusinessExtension`은 provider와 독립적인 prepare/parse만 제공한다.
`runAiExtension(request, runtime, host)`는 기존 domain authorize → started → prepare → runtime.invoke → provider-completed → parse → completed 순서다.
read/draft만 허용하며, consumer 요청에 staff 자료는 거부한다. host.record는 원문·key를 저장하지 않는다.
미연결·한도·provider 오류는 안전한 코드로 반환한다. 자료 audience 표시는 권한 증명이 아니다.
첫 연결은 기존 콘텐츠 번역 + CONTENT_TRANSLATION 정책이다. 로그 observer는 구조화 logger이며 durable 실행 원장/원자 quota/외부 계정 연결은 후속이다.
기존 execute/stream/runAIInsight 계약과 호출부는 보존한다.


서비스 확대: 카탈로그별 question/summary/draft·운영 요약, LMS 피드백, Neture 추천, 공용 리서치를 기존 실행에 연결했다.
기본 principal은 인증 actor다. 명시적 public principal은 actor 없이 consumer read/no-materials만 허용하며 호스트의 기존 공개 접근 판정이 반드시 필요하다.
public으로 직원 자료·draft·도메인 실행을 열 수 없다. [구조안 §9](../../docs/architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)에서 연결 범위와 호환 유지 경로를 확인한다.
