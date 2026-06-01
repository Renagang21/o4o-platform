# IR-O4O-AI-CLEANUP-PHASE1-RESULT

> **WO-O4O-AI-CODE-CLEANUP-PHASE1 실행 결과**
> 실행일: 2026-03-14
> 원칙: O4O Core 구조 변경 금지 / 서비스 API 변경 금지 / DB 변경 금지

---

## 1. 실행 요약

| 항목 | 값 |
|------|------|
| **삭제된 코드** | 2,077 lines / 15 files |
| **AI 코드 규모 변화** | 30,100 → 28,023 lines (-6.9%) |
| **AI 파일 수 변화** | ~158 → ~143 files |
| **빌드 검증** | tsc --noEmit 통과 (api-server, web-neture) |
| **API 변경** | 없음 |
| **DB 변경** | 없음 |

---

## 2. 삭제된 파일 목록

### D1. ai-block-writer.service.ts (387 lines)

| 항목 | 값 |
|------|------|
| 경로 | `apps/api-server/src/services/ai-block-writer.service.ts` |
| 기능 | AI 생성 React 컴포넌트를 파일시스템에 저장 + Git 자동화 |
| 삭제 근거 | 전체 코드베이스에서 import 0건 (grep 확인) |
| 상태 | 초기 실험 코드, 어떤 라우트/컨트롤러에서도 호출되지 않음 |

### D2. packages/ai-common-core/ (1,183 lines / 10 files)

| 항목 | 값 |
|------|------|
| 경로 | `packages/ai-common-core/` (전체 디렉터리) |
| 기능 | 공용 AI 채팅 UI + 프롬프트 레지스트리 + OpenAI 서비스 |
| 삭제 근거 | `@o4o/ai-common-core` import 0건, dependency 0건, tsconfig reference 0건 |
| 포함 파일 | AIChatWidget.tsx, AIChatButton.tsx, AIService.ts, PromptRegistry.ts, glucoseview prompts 등 |
| 참고 | web-glucoseview에 자체 AIChatWidget/prompts가 별도 존재 (이 패키지와 무관) |

삭제된 파일 상세:
```
packages/ai-common-core/
  ├── package.json
  ├── tsconfig.json
  ├── src/
  │   ├── index.ts (26 lines)
  │   ├── types/index.ts (89 lines)
  │   ├── components/
  │   │   ├── AIChatButton.tsx (87 lines)
  │   │   ├── AIChatWidget.tsx (360 lines)
  │   │   └── index.ts (2 lines)
  │   ├── services/
  │   │   ├── AIService.ts (239 lines)
  │   │   ├── PromptRegistry.ts (136 lines)
  │   │   └── index.ts (2 lines)
  │   └── prompts/glucoseview/
  │       └── index.ts (237 lines)
```

### D3. ai-insight 컴포넌트 (506 lines / 4 files)

| 항목 | 값 |
|------|------|
| 경로 | `services/web-neture/src/components/ai-insight/` |
| 기능 | AI 인사이트 카드/배지/상세 패널 UI 컴포넌트 |
| 삭제 근거 | 4개 파일 내부에서만 상호 참조, 어떤 페이지/라우트에서도 import 0건 |

삭제된 파일:
```
services/web-neture/src/components/ai-insight/
  ├── AIInsightCard.tsx (153 lines)
  ├── AIInsightDetailPanel.tsx (283 lines)
  ├── AIInsightBadge.tsx (55 lines)
  └── index.ts (15 lines)
```

---

## 3. 조사 과정에서 발견된 오류 수정

### web-kpa-society AI 컴포넌트 — 삭제 대상에서 제외

초기 조사에서 `services/web-kpa-society/src/components/ai/index.ts`가 미사용으로 분류되었으나,
추가 조사 결과 **6개 페이지에서 AiSummaryButton을 import** 중인 것으로 확인됨:

1. `pages/DashboardPage.tsx`
2. `pages/admin-branch/DashboardPage.tsx`
3. `pages/branch-admin/DashboardPage.tsx`
4. `pages/intranet/DashboardPage.tsx`
5. `pages/intranet/OperatorDashboardPage.tsx`
6. `pages/mypage/MyDashboardPage.tsx`

**결정: 삭제하지 않음 (활성 코드)**

---

## 4. 사용 중 확인된 AI 코드 (삭제 금지)

### Backend (apps/api-server/)
- ai-proxy.service.ts — ai-job.worker에서 import
- ai-operations.service.ts — ai-query.routes에서 import
- ai-card-exposure.service.ts — ai-query.routes에서 import
- ai-admin.service.ts — ai-admin.routes에서 import
- ai-query.service.ts — AiQueryController에서 import
- ai-dlq.service.ts — ai-job.worker에서 import
- ai-job-queue.service.ts — ai-metrics/ai-usage-report에서 import
- ai-usage-report.service.ts — ai-job-queue에서 import (내부 클러스터)
- ai-metrics.service.ts — ai-job-queue에서 import (내부 클러스터)
- google-ai.service.ts — ai-query.service에서 googleAI.executeGemini() 호출
- 모든 Copilot 서비스 — main.ts에서 라우트 등록
- 모든 Care AI 서비스 — main.ts에서 라우트 등록
- 모든 Store-AI 모듈 — main.ts에서 라우트 등록

### Frontend
- FloatingAiButton (web-neture) — Layout.tsx에서 import
- AiSummaryButton (o4o-ai-components) — 10+ 페이지에서 import
- AIChatButton (web-glucoseview) — Layout.tsx에서 import
- 모든 AI Admin 페이지 (8개) — 라우트 연결됨
- 모든 Admin Dashboard AI 서비스 (11개) — CMS 에디터에서 사용

---

## 5. 빌드 검증 결과

```
pnpm install                          ✅ Packages: +7 -253 (ai-common-core 의존성 제거)
apps/api-server: tsc --noEmit         ✅ 에러 0건
services/web-neture: tsc --noEmit     ✅ 에러 0건
grep "ai-block-writer"                ✅ 결과 0건
grep "@o4o/ai-common-core"            ✅ 결과 0건
grep "AIInsightCard|DetailPanel|Badge" ✅ 결과 0건
```

---

## 6. 향후 권고 WO

| # | WO 명 | 내용 | 우선순위 |
|---|------|------|---------|
| 1 | **WO-O4O-AI-SECURITY-APIKEY-REMEDIATION** | Client-side API key 노출 제거 (AIChatWidget, visionAI) | HIGH |
| 2 | **WO-O4O-AI-LLM-PATH-CONSOLIDATION** | google-ai.service → ai-core provider 통합 | MEDIUM |
| 3 | **WO-O4O-AI-PROMPT-RESTRUCTURE** | 분산된 Prompt를 packages/ai-prompts로 구조화 | LOW |
| 4 | **WO-O4O-AI-COPILOT-ENTRY-UNIFICATION** | AI UI 진입점 통합 (Chat/Insight/Summary → Copilot Entry) | LOW |

### 보안 이슈 상세 (WO-1 관련)

현재 3개 파일에서 Client-side에서 LLM API를 직접 호출하며, API Key가 브라우저에 노출됨:
- `services/web-glucoseview/src/components/ai/AIChatWidget.tsx` — OpenAI API Key
- `apps/admin-dashboard/src/services/ai/visionAI.ts` — OpenAI + Gemini + Claude API Keys
- `packages/ai-common-core/src/services/AIService.ts` — **삭제됨 (이번 정비에서 제거)**

---

## 7. 예상 vs 실제 비교

| 항목 | 초기 예상 | 실제 결과 | 비고 |
|------|----------|----------|------|
| 삭제 비율 | 35-40% | **6.9%** | 대부분 활성 코드 |
| 삭제 라인 | ~12,000 | **2,077** | 안전 우선 접근 |
| Copilot legacy | 삭제 대상 | **전부 사용 중** | main.ts에서 import 확인 |
| LLM 경로 통합 | 이번 정비 | **별도 WO 필요** | 구조 변경에 해당 |

---

*작성: 2026-03-14*
*상태: Complete*
