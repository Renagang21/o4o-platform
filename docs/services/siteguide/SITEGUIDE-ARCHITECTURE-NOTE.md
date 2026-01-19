# SiteGuide Architecture Note

> Version: 1.0
> Date: 2026-01-19
> Status: Foundation (Pre-Development)
> Reference: SITEGUIDE-SERVICE-OVERVIEW, AI Core README

---

## 1. 문서 목적

이 문서는 SiteGuide가 **O4O Platform 아키텍처 내에서 어떤 위치를 차지하는지** 설명합니다.
특히 **AI Core, AI Extension**과의 관계를 명확히 정의합니다.

---

## 2. 아키텍처 계층 내 위치

### 2.1 O4O Platform 계층 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         O4O Platform Layers                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                       Service Layer                          │    │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌─────────────┐   │    │
│  │  │ Neture  │  │GlycoPharm│  │ Cosmetics │  │ SiteGuide   │   │    │
│  │  └─────────┘  └─────────┘  └───────────┘  └─────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      Extension Layer                         │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │    │
│  │  │ Signage Extension │  │ LMS Extension    │  ...           │    │
│  │  └──────────────────┘  └──────────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                        Core Layer                            │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐   │    │
│  │  │Auth Core│  │CMS Core │  │AI Core  │  │E-commerce Core│   │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 SiteGuide의 위치

| 계층 | SiteGuide 해당 여부 | 이유 |
|------|-------------------|------|
| **Core** | ❌ | 공통 기반이 아닌 특정 서비스 |
| **Extension** | ❌ | 다른 서비스를 확장하지 않음 |
| **Service** | ✅ | 독립적인 최종 사용자 서비스 |

> **SiteGuide는 Service Layer에 위치하는 독립 서비스입니다.**

---

## 3. AI Core와의 관계

### 3.1 AI Core란?

AI Core는 **AI 기능을 제공하지 않고, AI의 정책/계약/로그 기준을 정의**하는 Core App입니다.

```
packages/ai-core/
├── policies/     # AI 정책 정의
├── contracts/    # AI 요청/응답 계약
└── ai-logs/      # AI 로그 형식
```

### 3.2 SiteGuide ≠ AI Core

| 항목 | AI Core | SiteGuide |
|------|---------|-----------|
| **역할** | 정책/계약 정의 | 실제 서비스 제공 |
| **대상** | 플랫폼 내부 | 외부 사업자 |
| **기능** | 기능 없음 (기준점) | AI 안내 기능 |
| **계층** | Core Layer | Service Layer |

### 3.3 SiteGuide가 AI Core를 사용하는 방식

```typescript
// SiteGuide는 AI Core의 계약을 준수하여 AI 기능 구현
import type { AiRequestContract, AiResponseContract } from '@o4o/ai-core/contracts';
import { AiPolicy } from '@o4o/ai-core/policies';

// SiteGuide 서비스 코드
class SiteGuideAiService {
  async handleQuery(request: AiRequestContract): Promise<AiResponseContract> {
    // AI Core 정책 확인
    // SiteGuide 비즈니스 로직 실행
    // AI Core 계약에 맞는 응답 반환
  }
}
```

---

## 4. AI Extension과의 관계

### 4.1 AI Extension이란?

AI Extension은 **특정 서비스에 AI 기능을 추가**하는 확장입니다.

예:
- `digital-signage-ai-ext`: Signage에 AI 콘텐츠 추천 추가
- `lms-ai-ext`: LMS에 AI 학습 추천 추가

### 4.2 SiteGuide ≠ AI Extension

| 항목 | AI Extension | SiteGuide |
|------|-------------|-----------|
| **역할** | 기존 서비스 확장 | 독립 서비스 |
| **종속** | 부모 서비스에 종속 | 종속 없음 |
| **대상** | 내부 사용자 | 외부 사업자 |
| **계층** | Extension Layer | Service Layer |

### 4.3 SiteGuide가 AI Extension이 아닌 이유

1. **독립 서비스**: 다른 서비스를 확장하지 않음
2. **외부 대상**: 외부 사업자가 직접 사용
3. **독립 도메인**: siteguide.co.kr로 독립 운영
4. **종속 없음**: Neture나 다른 서비스에 종속되지 않음

---

## 5. AI Common Core와의 관계

### 5.1 AI Common Core란?

`ai-common-core`는 **Chat UI, 프롬프트 레지스트리** 등 AI 관련 공통 컴포넌트를 제공합니다.

### 5.2 SiteGuide와 AI Common Core

SiteGuide는 필요 시 `ai-common-core`의 공통 컴포넌트를 활용할 수 있습니다.

```typescript
// 예시: AI Common Core의 Chat UI 활용
import { AiChatWidget } from '@o4o/ai-common-core/components';
```

---

## 6. 아키텍처 의존성 규칙

### 6.1 허용되는 의존성

```
SiteGuide (Service) → AI Core (Core) ✅
SiteGuide (Service) → AI Common Core ✅
SiteGuide (Service) → Auth Core (Core) ✅
```

### 6.2 금지되는 의존성

```
AI Core → SiteGuide ❌ (Core는 Service에 의존하지 않음)
Neture → SiteGuide ❌ (서비스 간 직접 의존 금지)
SiteGuide → Neture 전용 패키지 ❌ (종속 관계 생성 금지)
```

### 6.3 의존성 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Dependency Direction                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐                                                    │
│  │  SiteGuide  │ ───────────────────────────────┐                   │
│  │  (Service)  │                                │                   │
│  └─────────────┘                                │                   │
│         │                                       │                   │
│         │ uses                                  │ uses              │
│         ▼                                       ▼                   │
│  ┌─────────────┐                         ┌─────────────┐            │
│  │  AI Core    │                         │ Auth Core   │            │
│  │  (Core)     │                         │ (Core)      │            │
│  └─────────────┘                         └─────────────┘            │
│                                                                      │
│  ❌ SiteGuide → Neture (금지)                                        │
│  ❌ SiteGuide → GlycoPharm (금지)                                    │
│  ❌ AI Core → SiteGuide (금지)                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. 패키지 구조 전략

### 7.1 현재 (Foundation)

SiteGuide 전용 패키지는 **아직 생성하지 않습니다**.
이 문서는 향후 구조를 **선언**하는 것입니다.

### 7.2 향후 예상 구조

```
packages/
├── ai-core/                    # AI 정책/계약 (기존)
├── ai-common-core/             # AI 공통 컴포넌트 (기존)
│
├── siteguide-core/             # SiteGuide Core (예정)
│   ├── src/
│   │   ├── backend/
│   │   │   ├── entities/       # SiteGuide Entities
│   │   │   ├── services/       # 비즈니스 로직
│   │   │   └── types/          # 타입 정의
│   │   └── frontend/
│   │       └── components/     # 위젯 컴포넌트
│   └── package.json
│
└── siteguide-widget/           # 외부 삽입용 위젯 (예정)
    └── ...

apps/
├── siteguide-web/              # SiteGuide 대시보드 (예정)
└── siteguide-api/              # SiteGuide API (또는 통합 API)
```

### 7.3 분리 원칙

- `siteguide-*` 패키지는 **Neture 전용 패키지에 의존하지 않음**
- 필요 시 **공통 Core만 참조**
- 분리 가능한 구조 유지

---

## 8. 현재 단계에서의 제약

### 8.1 하지 않는 것

이 Foundation 단계에서는 다음을 **수행하지 않습니다**:

| 항목 | 이유 |
|------|------|
| 패키지 생성 | 아직 개발 전 |
| 폴더 구조 재설계 | 아직 범위 미확정 |
| AI 기능 구현 | 개발 착수 전 |
| 기존 코드 수정 | 선언 단계이므로 |

### 8.2 하는 것

| 항목 | 목적 |
|------|------|
| 위치 선언 | 미래 개발자 가이드 |
| 의존성 규칙 선언 | 구조 오염 방지 |
| 경계 명시 | 종속 관계 방지 |

---

## 9. 개발 가이드라인 (향후)

### 9.1 SiteGuide 개발 시 준수 사항

1. **AI Core 계약 준수**: AI 요청/응답은 AI Core 형식 사용
2. **Neture 종속 금지**: Neture 전용 패키지 import 금지
3. **독립 데이터**: SiteGuide 전용 스키마/테이블 사용
4. **독립 인증**: 필요 시 Auth Core 연동하되, Neture 세션 공유 금지

### 9.2 코드 주석 예시

```typescript
/**
 * SiteGuide Service
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 *
 * AI Core 정책/계약을 준수하며,
 * Neture 전용 패키지에 의존하지 않습니다.
 */
```

---

## 10. 관련 문서

- [SiteGuide Service Overview](./SITEGUIDE-SERVICE-OVERVIEW.md)
- [SiteGuide Domain Strategy](./SITEGUIDE-DOMAIN-STRATEGY.md)
- [AI Core README](../../../packages/ai-core/README.md)
- [Digital Signage Core/Extension Structure](../../platform/digital-signage/CORE-EXTENSION-STRUCTURE-V1.md)

---

## 11. 한 줄 요약

> **SiteGuide는 AI Core도 AI Extension도 아닌, Service Layer의 독립 서비스입니다.**

---

*Created: 2026-01-19*
*Status: Foundation Document*
