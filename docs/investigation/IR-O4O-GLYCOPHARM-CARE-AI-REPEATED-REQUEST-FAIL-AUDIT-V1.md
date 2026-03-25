# IR-O4O-GLYCOPHARM-CARE-AI-REPEATED-REQUEST-FAIL-AUDIT-V1

> **GlycoPharm Care Copilot — 반복 요청 실패 원인 조사**
> Date: 2026-03-24
> Status: Complete

---

## 증상 요약

| 조건 | 결과 |
|------|------|
| 첫 질문 (preset 또는 자유) | 느리지만 응답 생성됨 |
| 두 번째 질문 (동일/다른) | `AI chat processing failed` 에러 |
| Preset 질문 반복 | 첫 번째 후 실패 반복 |
| 재시도 버튼 | 동일 실패 |

---

## 1. 첫 요청 vs 반복 요청 비교표

| 항목 | 첫 요청 | 두 번째 요청 | 차이점 |
|------|---------|-------------|--------|
| Request body | `{message, patientId}` | `{message, patientId}` | **동일** — 히스토리 미전송 |
| Auth token (streaming) | `localStorage.getItem('accessToken')` | 동일 키 조회 | 토큰 갱신 시 stale 가능 (아래 §4 참조) |
| Auth token (sync fallback) | `authClient.api` (인터셉터) | 동일 | 자동 갱신 동작 |
| Backend cache | MISS (첫 호출) | **동일 메시지면 HIT** / 다른 메시지면 MISS | 동일 메시지 재질문은 캐시 반환 → 빠름 |
| Gemini API 호출 | 1회 (+ 실패 시 retry 1회) | 1회 (+ retry 1회) | **연속 호출 시 Gemini quota 소비 누적** |
| Patient context | DB 6쿼리 | DB 6쿼리 | 동일 |
| Prompt size | systemPrompt + context + message | 동일 | 변화 없음 |
| Server-side state | `cache: Map` (비어있음) | `cache: Map` (첫 응답 캐시) | 캐시 외 서버 상태 없음 |
| Frontend state | `messages: []` | `messages: [user1, ai1]` | **UI 히스토리만 누적, 백엔드 무관** |

**핵심 발견**: 프론트엔드는 대화 히스토리를 백엔드에 보내지 않는다. 모든 요청은 stateless. 첫/후속 요청의 payload는 동일하다.

---

## 2. `AI chat processing failed` 실제 발생 지점

### 발생 경로

```
[Frontend]
CareAiChatPanel.tsx:193  →  POST /api/v1/care/ai-chat/stream (streaming)
                             ↓ 실패 시
CareAiChatPanel.tsx:325  →  POST /api/v1/care/ai-chat (sync fallback)
                             ↓ 실패 시
CareAiChatPanel.tsx:343-345 →  에러 메시지 표시

[Backend]
care-ai-chat.controller.ts:107-111  ←  "AI chat processing failed" 생성 지점
```

### 에러 원문 위치

**`care-ai-chat.controller.ts:107-111`** (generic catch-all):
```typescript
console.error('[CareAiChat] endpoint error:', error);
res.status(500).json({
  success: false,
  error: { code: 'AI_CHAT_ERROR', message: 'AI chat processing failed' },
});
```

이 블록은 controller의 **catch-all**이다. 위의 3개 specific 패턴에 매칭되지 않는 모든 에러가 여기로 빠진다.

### 버그: 에러 패턴 매칭 불완전 (원인 은폐)

**`care-ai-chat.controller.ts:79-105`** 에러 패턴:

| 패턴 | 체크 방식 | 매칭되는 에러 | 매칭 안 되는 에러 |
|------|----------|-------------|-----------------|
| `AI_NOT_CONFIGURED` | **`msg === '...'`** (strict equality) | 없음 (아래 참조) | `'AI_NOT_CONFIGURED: gemini API key missing'` |
| `Gemini API error` | `msg.includes(...)` | HTTP 4xx/5xx | `'Gemini returned empty response — no candidates'` |
| `timeout` | `msg.includes(...)` | 모든 timeout | - |

**치명적 버그**:

1. **`execute()`가 throw하는 `'AI_NOT_CONFIGURED: gemini API key missing'`** (execute.ts:116)이 controller의 `msg === 'AI_NOT_CONFIGURED'` (strict equality)에 **매칭 안 됨**. 콜론+설명 때문에 실패. → generic 500으로 빠짐.

2. **`'Gemini returned empty response — no candidates'`** (gemini.provider.ts:248)은 `includes('Gemini API error')`에 매칭 안 됨. "Gemini API error"가 아니라 "Gemini returned"이기 때문.

3. **`'Gemini JSON parse failed: ...'`** (gemini.provider.ts:256)도 매칭 안 됨.

4. **`'Gemini provider failed'`** (gemini.provider.ts:91)도 매칭 안 됨.

**결론: Gemini 응답이 비정상(빈 응답, JSON 파싱 실패)인 경우 모두 generic "AI chat processing failed"로 은폐된다.**

---

## 3. Preset 질문 처리 구조

### 구조 요약

| 항목 | 결과 |
|------|------|
| Preset 전용 API? | **없음** — 일반 질문과 100% 동일 경로 |
| Preset 전용 캐시? | **없음** — 동일 cache key 로직 |
| Preset 전용 프롬프트? | **없음** — 동일 system prompt + context |
| 경량 처리? | **없음** — 동일 DB 6쿼리 + Gemini 호출 |

### 처리 흐름

```
[CareAiChatEntry.tsx]
  preset 버튼 클릭
  → openWithQuestion(q) → setPanelOpen(true) + setInitialQuestion(q)

[CareAiChatPanel.tsx]
  useEffect(isOpen + initialQuestion) → sendMessage(initialQuestion)
  → POST /care/ai-chat/stream (동일 API, 동일 payload)
```

**Preset 질문 상수** (CareAiChatPanel.tsx:75-87):
- Population: `'오늘 관리해야 할 당뇨인는?'`, `'야간 저혈당 당뇨인는?'` 등 4개
- Patient: `'이 당뇨인의 최근 혈당 추세는?'` 등 4개

**Preset은 일반 대화와 완전히 동일한 무거운 흐름을 탄다.** context build (DB 5~6쿼리) + system prompt 조립 + Gemini API 호출. 미리 만들어진 질문임에도 최적화 없음.

---

## 4. 스트리밍 인증 토큰 불일치 (Token Key Mismatch)

### 발견

| 경로 | 토큰 조회 | 키 |
|------|----------|-----|
| Streaming (fetch) | `localStorage.getItem('accessToken')` 등 | Legacy keys: `accessToken`, `token`, `authToken` |
| Sync fallback (axios) | `authClient.api` → `getAccessToken()` | Standard: `o4o_accessToken`, fallback legacy |

### token-storage.ts 규칙

- **Write**: `setAccessToken()` → `o4o_accessToken`만 기록 (legacy keys에 기록 안 함)
- **Read**: `getAccessToken()` → `o4o_accessToken` 먼저, 없으면 legacy 순회

### 시나리오

1. **초기 로그인**: 토큰이 `o4o_accessToken`에만 저장됨
2. **Streaming fetch**: `localStorage.getItem('accessToken')` → **null** (legacy key에 없음)
3. **Authorization 헤더 누락** → streaming 요청에 토큰 없음
4. Backend `authenticate` → **401 Unauthorized**
5. Frontend: `Stream HTTP 401` → catch → sync fallback
6. Sync fallback: `authClient.api` → `getAccessToken()` → `o4o_accessToken` 찾음 → **성공**

**결론: 스트리밍은 항상 실패하고, 매 요청마다 sync fallback으로 동작하고 있을 가능성이 높다.**

단, legacy 세션에서 `accessToken` 키가 남아있으면 스트리밍이 작동할 수 있으나, 토큰 갱신 후에는 legacy 키가 업데이트되지 않아 stale 토큰으로 인한 401이 발생한다.

---

## 5. 멀티턴 상태 유지 구조

| 항목 | 구현 |
|------|------|
| 프론트엔드 히스토리 | `messages: ChatMessage[]` — React state (세션 내 유지) |
| 백엔드 히스토리 | **없음** — stateless (히스토리 미수신) |
| 대화 컨텍스트 전달 | **없음** — 매 요청이 독립 |
| 서버 캐시 | `Map<string, CacheEntry>` — 서비스 인스턴스 수명 동안 유지 |
| 캐시 TTL | Population 5분, Patient 10분 |
| 캐시 키 | `SHA256(pharmacyId:patientId:message)` |

**히스토리 누적이 후속 요청 실패의 원인은 아니다.** 백엔드에 히스토리가 전송되지 않으므로, prompt 비대화 문제도 없다.

---

## 6. Provider 전/후 실패 분리

### 실패 가능 지점 분석

| 단계 | 파일 | 실패 시 | 복구 |
|------|------|---------|------|
| 1. Config resolve | ai-config-resolver.ts | DB 에러 → empty apiKey | try/catch, env fallback |
| 2. API key check | execute.ts:115 | `AI_NOT_CONFIGURED: gemini...` | **controller 매칭 실패 → 500** |
| 3. Gemini HTTP 호출 | gemini.provider.ts:216 | `Gemini API error {status}:` | controller 502 매칭 ✅ |
| 4. Gemini 응답 파싱 | gemini.provider.ts:246-248 | `Gemini returned empty response` | **controller 매칭 실패 → 500** |
| 5. JSON 파싱 | gemini.provider.ts:253-256 | `Gemini JSON parse failed:` | **controller 매칭 실패 → 500** |
| 6. execute retry | execute.ts:131-170 | 2회 시도 후 lastError throw | 위 에러 그대로 전파 |
| 7. 결과 JSON 파싱 | care-ai-chat.service.ts:92-96 | 파싱 실패 → fallback summary | **복구됨** (throw 안 함) |

### 결론

**Provider 호출 자체(Gemini API)에서 발생하는 비정상 응답(빈 응답, JSON 실패)이 controller에서 제대로 분류되지 않아 generic 500으로 빠진다.**

---

## 7. 원인 분류

### 1순위: Gemini 비정상 응답 + Controller 에러 매칭 불완전

**재현 조건**: Gemini가 빈 응답(no candidates) 또는 비-JSON 응답을 반환하는 경우.

Gemini 2.5 Flash에서 빈 응답이 발생하는 조건:
- Safety filter 발동 (의료 데이터 관련 질문)
- 모델 과부하 (API 응답 지연 → timeout → retry → 다시 실패)
- Rate limit 직후 요청 (캐시 미히트 상태에서 연속 호출)
- 긴 context 전송 후 불완전 응답

**왜 첫 요청은 성공하고 후속은 실패하는가?**
- 첫 요청: Gemini API 콜드 스타트 후 정상 응답
- 후속 요청: 짧은 간격 연속 호출 시 Gemini quota/rate 제한 또는 불안정 응답
- 혹은 첫 요청이 캐시되어 있는 경우 (5~10분 TTL) 두 번째 다른 질문에서 실제 API 호출 → 실패

**확인 방법**: Cloud Run 로그에서 `[CareAiChat] endpoint error:` 로그 확인 → 실제 throw된 에러 메시지 확인

### 2순위: 스트리밍 인증 토큰 불일치 (성능 저하)

스트리밍이 토큰 키 불일치로 매번 실패 → sync fallback으로 동작. 이 자체가 "AI chat processing failed"를 직접 유발하지는 않지만:
- 매 요청이 2번 실행 (streaming 401 → sync retry)
- Gemini API에 부하 증가
- 사용자 체감 응답 시간 증가

### 보조 원인: 에러 메시지 미한국어화

`AI_CHAT_ERROR` 코드가 프론트엔드 `friendlyMessages`에 매핑되지 않아 영문 에러 "AI chat processing failed"가 그대로 노출.

---

## 8. 다음 단계 제안

### 최소 수정안 (WO 1건)

**WO-GLYCOPHARM-CARE-AI-CHAT-ERROR-HANDLING-FIX-V1**

| # | 수정 | 파일 | 효과 |
|---|------|------|------|
| 1 | Controller 에러 매칭을 `includes` 기반으로 변경 | `care-ai-chat.controller.ts:82` | `AI_NOT_CONFIGURED: ...` 캐치 |
| 2 | `Gemini returned empty` / `Gemini JSON parse` 패턴 추가 | `care-ai-chat.controller.ts:89-96` | 빈 응답/파싱 실패 정확한 코드 반환 |
| 3 | `AI_CHAT_ERROR` → 프론트 friendlyMessages 추가 | `CareAiChatPanel.tsx:337-342` | 한국어 에러 메시지 |
| 4 | Streaming 토큰 조회를 `getAccessToken()` 사용으로 변경 | `CareAiChatPanel.tsx:189-191` | 스트리밍 인증 정상화 |

예상 변경: 4 파일, 각 5줄 미만.

### 성능 개선안 (후순위)

| # | 항목 | 설명 |
|---|------|------|
| 1 | Preset 질문 응답 사전 캐시 | Population preset 4개를 주기적 warm-up |
| 2 | Gemini retry 시 exponential backoff | 현재 고정 2초 → 2초/4초 |
| 3 | 에러 로그에 request context 추가 | pharmacyId, message 앞 50자, patientId 포함 |
| 4 | 스트리밍 실패 시 에러 코드별 분기 | 401은 silent fallback, 기타는 UI 피드백 |

### Preset 질문 최적화 여부

**필요**. 현재 preset 질문도 일반 질문과 동일하게 DB 5~6쿼리 + Gemini API 호출을 한다. 대안:
- Population preset은 대시보드 로드 시 백그라운드 pre-warm
- 결과를 별도 캐시 TTL (30분)로 유지
- 별도 WO로 분리 검토

---

## 파일 참조

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `services/web-glycopharm/src/pages/care/CareAiChatPanel.tsx` | 프론트 AI 채팅 패널 | 159-358 (sendMessage), 189-191 (토큰) |
| `services/web-glycopharm/src/pages/care/CareAiChatEntry.tsx` | 프론트 진입점 (preset 버튼) | 38-46 |
| `apps/api-server/src/modules/care/controllers/care-ai-chat.controller.ts` | 백엔드 컨트롤러 | 79-112 (에러 매칭) |
| `apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts` | AI 서비스 (캐시, 컨텍스트) | 58-123 (chat), 131-207 (chatStream) |
| `packages/ai-core/src/orchestration/execute.ts` | AI 실행기 (retry) | 115-117 (config check), 131-170 (retry) |
| `packages/ai-core/src/orchestration/execute-stream.ts` | AI 스트리밍 실행기 | 59-128 |
| `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | Gemini 호출 | 45-92 (complete), 96-207 (streaming), 246-248 (empty check) |
| `packages/auth-client/src/token-storage.ts` | 토큰 저장소 | 33-37 (키 정의), 84-88 (write) |
| `apps/api-server/src/utils/ai-config-resolver.ts` | AI 설정 리졸버 | 22-54 |

---

## 제외 범위

- 즉시 코드 수정 (이 IR에서는 원인 파악만)
- 전체 AI 아키텍처 개편
- 모델 교체 논의
- Care 외 다른 서비스 AI 수정
