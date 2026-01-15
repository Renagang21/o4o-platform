# AI Core

> **AI 기능을 제공하지 않는다. AI의 정책, 계약, 로그 기준을 정의한다.**

---

## 1. 앱 설명

AI Core는 O4O Platform에서 AI 관련 **책임 경계와 기준점을 정의**하는 Core App입니다.

### 핵심 원칙

- 이 앱은 **AI 기능을 직접 구현하지 않음**
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
| 과금/결제 | ecommerce-core | AI Core가 제공하지 않음 |
| 모델 다중화 | 인프라 영역 | AI Core가 제공하지 않음 |
| LLM 프롬프트 | ai-common-core | Chat UI용 프롬프트는 별도 |

---

## 4. 관련 패키지

| 패키지 | 역할 | 관계 |
|--------|------|------|
| `@o4o/ai-core` | 정책/계약/로그 기준 | **본 패키지** |
| `@o4o/ai-common-core` | Chat UI, 프롬프트 레지스트리 | AI Core 정책 준수 |
| 각 서비스 AI 컴포넌트 | 서비스별 AI UI | AI Core 계약 준수 |

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

> **"AI Core는 기능을 만드는 앱이 아니라, AI의 기준과 책임을 고정하는 앱이다."**

---

*Created: 2026-01-15*
*Work Order: WO-AI-CORE-APP-SCAFFOLD-V0*
*Status: Active Core App*
