# WO-O4O-GLYCOPHARM-CARE-AI-INTERMITTENT-404-AND-ERROR-MESSAGE-FIX-V1

> 작업일: 2026-03-24
> 커밋: `0134e43c3`
> 배포: main → Cloud Run (CI/CD)
> 대상 파일: `services/web-glycopharm/src/pages/care/CareAiChatPanel.tsx`

---

## 문제 요약

| # | 문제 | 심각도 | IR 참조 |
|---|------|--------|---------|
| R1 | 세션 내 6번째 질문에서 간헐적 404 | P2 | IR-...-REVERIFY-V1 §5 |
| R2 | 404 발생 시 "Request failed" generic 메시지 | P2 | IR-...-REVERIFY-V1 §6 |

---

## 원인 분석

### R1: 간헐적 404

- **현상**: 브라우저에서 `/api/v1/care/ai-chat/stream` → 404, fallback `/api/v1/care/ai-chat` → 404
- **서버 확인**: 동일 토큰+메시지로 curl 호출 시 200 (서버 API 정상)
- **추정 원인**: Cloud Run 멀티 인스턴스 환경에서 일시적 라우트 미등록 인스턴스로 요청이 라우팅됨
- **근거**: 재로그인(세션 갱신) 후 동일 질문 정상 응답, 서버 코드에 rate limit/조건부 등록 없음

### R2: generic 에러 메시지

- **현상**: `pharmacy.ts` 에러 핸들러가 unknown 에러에 `'Request failed'` 디폴트 메시지 사용
- **경로**: 스트리밍 실패 → `throw new Error(...)` (HTTP status 정보 소실) → catch에서 메시지만 표시
- **원인**: 에러 객체에 HTTP status/backend code가 전달되지 않아 매핑 불가

---

## 수정 내용

### 1. `doStreamFetch()` — 404/502/503 자동 재시도

```typescript
const doStreamFetch = async (retried = false): Promise<Response> => {
  const res = await fetch(`${API_BASE_URL}/api/v1/care/ai-chat/stream`, { ... });
  if ((res.status === 404 || res.status === 502 || res.status === 503) && !retried) {
    await new Promise(r => setTimeout(r, 500));
    return doStreamFetch(true);
  }
  return res;
};
```

- 404/502/503: 500ms 후 1회 재시도 (Cloud Run 인스턴스 전환 대응)
- 최대 재시도 1회 (무한 루프 방지)

### 2. `getFriendlyErrorMessage()` — 통합 에러 메시지 매핑

```
우선순위: backend code → HTTP status → 네트워크 에러 → 원본 메시지 → 기본값
```

| 소스 | 예시 | 매핑 메시지 |
|------|------|------------|
| Backend code | `AI_TIMEOUT` | AI 응답 시간이 초과되었습니다. |
| Backend code | `PATIENT_NOT_IN_PHARMACY` | 이 환자의 약국 연동 정보가 확인되지 않습니다. |
| HTTP 401 | 토큰 만료 | 인증이 만료되었습니다. 페이지를 새로고침 해 주세요. |
| HTTP 404 | 라우트 미발견 | AI 서비스 경로를 찾지 못했습니다. 잠시 후 다시 시도해 주세요. |
| HTTP 502/503 | 서버 오류 | AI 서버에 일시적 문제가 있습니다. |
| TypeError(fetch) | 네트워크 단절 | 네트워크 연결에 문제가 있습니다. |
| 기본값 | — | AI 요청 처리 중 문제가 발생했습니다. 다시 시도해 주세요. |

### 3. 구조화된 에러 전달

- 스트리밍 HTTP 에러: `throw { status, message }` (이전: `throw new Error(text)`)
- SSE error 이벤트: `throw { code, message, status }` (이전: `throw new Error(msg)`)
- `getFriendlyErrorMessage()`가 `err.code`, `err.status`, `err.message` 모두 추출

### 4. 401/403 분기 처리

| HTTP | 동작 |
|------|------|
| 401 | 스트리밍 실패 → sync fallback으로 위임 (Axios auto-refresh 활용) |
| 403 | 즉시 사용자 메시지 반환 (fallback 불필요) |
| 404/502/503 | `doStreamFetch()` 1회 재시도 → 실패 시 sync fallback |

---

## 변경 파일

| 파일 | 변경 | 줄 수 |
|------|------|-------|
| `services/web-glycopharm/src/pages/care/CareAiChatPanel.tsx` | EDIT | +101 / -37 |

---

## 검증

### 코드 레벨

- [x] `npx tsc --noEmit` — 0 에러
- [x] `git diff` 리뷰 — 의도한 변경만 포함
- [x] 기존 sync fallback 에러 핸들링 — `getFriendlyErrorMessage()` 로 통합 확인

### 배포 후 브라우저 검증 (2026-03-24 14:50~15:00 KST)

**검증 환경**: glycopharm.co.kr / pharmacist_test@glycopharm.co.kr / 테스트환자

| # | 시나리오 | 결과 | 비고 |
|---|---------|------|------|
| S1 | 기본 동작 — preset 질문 | **BLOCKED** | Gemini API 429 quota exceeded |
| S2 | 동일 세션 반복 7~10회 | **BLOCKED** | Gemini API 429 quota exceeded |
| S3 | 404 재현 및 retry | **BLOCKED** | 404 미발생 (502만 발생), retry 코드 배포 확인 |
| S4 | fallback 동작 | **PASS** | stream 200 (SSE error) → sync fallback 502 확인 |
| S5 | 에러 메시지 한국어 | **PASS** | "AI 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |
| S6 | 회귀 테스트 | **PASS** | 분석탭(TIR/CV/차트)/코칭탭/데이터탭 모두 정상 |

### 검증 상세

#### S4 — Fallback 동작 (PASS)

네트워크 로그에서 확인:
```
POST /api/v1/care/ai-chat/stream → 200 (SSE error event: AI_PROVIDER_ERROR)
POST /api/v1/care/ai-chat       → 502 (sync fallback 시도)
```
- 스트리밍 SSE 에러 → sync fallback 자동 전환 **정상 동작**
- 3회 반복 시도 모두 동일 패턴 확인

#### S5 — 에러 메시지 (PASS)

| 이전 (수정 전) | 현재 (수정 후) |
|---------------|---------------|
| "Request failed" | "AI 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |

- `AI_PROVIDER_ERROR` 코드 → `getFriendlyErrorMessage()` → 한국어 매핑 **정상**
- "Request failed" generic 메시지 **미출현**
- "다시 시도" 버튼 정상 동작

#### S6 — 회귀 (PASS)

- 분석 탭: TIR 100% / CV 12% / 위험도 양호 / 혈당 추이 차트 / 혈압·체중 empty state / 복합 지표 — 정상
- 코칭 탭: AI 코칭 초안 / 전송·폐기 버튼 / 코칭 기록 — 정상
- 데이터 탭: 건강 데이터 입력 폼 / 최근 기록 테이블 — 정상
- 콘솔 에러: AI chat 502 외 0건

### BLOCKED 원인

서버 로그 확인:
```
[CareAiChat] Gemini provider error: Gemini API error 429: {
  "message": "You exceeded your current quota, please check your plan and billing details."
}
```

- Gemini API 일일 할당량 초과 (이전 IR 검증 세션에서 소진)
- 서버 care AI chat 라우트 자체는 정상 등록 (200 응답 후 SSE 에러)
- 프론트엔드 수정 사항과 무관한 외부 서비스 제한

### 종합 판정

**PARTIAL PASS** — 코드 변경 검증 가능 항목 모두 PASS. AI 응답 기반 시나리오(S1/S2/S3)는 Gemini quota 회복 후 재검증 필요.

| 검증 영역 | 결과 |
|----------|------|
| 에러 메시지 매핑 (R2 수정) | **PASS** — 한국어 메시지 정상 표시 |
| Fallback 경로 | **PASS** — stream → sync 자동 전환 |
| 회귀 | **PASS** — 전 탭 정상 |
| 404 재시도 (R1 수정) | **배포 확인** — 동일 빌드, 404 미발생으로 실행 경로 미도달 |
| 반복 요청 안정성 | **BLOCKED** — Gemini quota 회복 후 재검증 |

---

## 다음 단계

| # | 항목 | 우선순위 |
|---|------|---------|
| 1 | Gemini quota 회복 후 S1/S2/S3 재검증 | P2 |
| 2 | Gemini API 할당량 모니터링/알림 설정 | P3 |
| 3 | AI chat 응답 속도 최적화 (~30초 → 목표 15초 이내) | P3 |

---

## 참조

- IR: `docs/investigation/IR-O4O-GLYCOPHARM-CARE-AI-REPEATED-REQUEST-REVERIFY-V1.md`
- 대상 파일: `services/web-glycopharm/src/pages/care/CareAiChatPanel.tsx`
- API 클라이언트: `services/web-glycopharm/src/api/pharmacy.ts`
- Auth 클라이언트: `packages/auth-client/src/client.js`

---

*작성: 2026-03-24*
*검증: 2026-03-24 14:50~15:00 KST*
