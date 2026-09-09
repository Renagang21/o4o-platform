# O4O-AI-USAGE-FLOW-BASELINE-V1

> **현재 기준 정렬 문서** — 설계 변경 문서가 아님
>
> O4O 플랫폼에서 사용자가 자료를 선택하고, AI를 활용하여, 실제 콘텐츠/매장 자산으로 전환하는
> 현재 기준 표준 흐름을 명확히 정의한다.

*Status: Active Baseline*
*Date: 2026-04-23*
*Last aligned with production: 2026-09 (WO-O4O-AI-USAGE-FLOW-BASELINE-REALIGNMENT-V1)*

> **2026-09 정렬 요지** — O4O 공통 Home(`neture.co.kr/`)에 **중앙 AI 입력이 canonical 로 존재**한다.
> 2026-04 판 전제였던 "독립 AI 입력 화면 없음" 은 현재 구조와 맞지 않아 폐기했다(§11).
> Home AI 는 편집기 AI 를 대체하지 않는다 — **두 진입점이 축을 달리하여 공존**한다(§11.2).

---

## 1. 역할 분리

| 레이어 | 화면/서비스 | 역할 |
|-------|-----------|------|
| **Entry** | O4O 공통 Home (`neture.co.kr/`) 중앙 AI 입력 | 업무 진입 + 질의응답 (2026-09 추가) |
| **HUB** | `/content`, `/forum`, `/resources`, `/lms` | 선택 + 복사 |
| **AI** | RichTextEditor + AiContentModal, POP 제작기, 기타 편집 화면 | 정리 + 생성 |
| **Execution** | POP, QR, 블로그, 상품 상세 설명 | 실행 + 노출 |

Entry 레이어는 HUB→편집기 흐름의 **대체가 아니라 상위 진입점**이다. 상세는 §11.

---

## 2. 전체 흐름

O4O 의 AI 진입 흐름은 두 갈래다.

### 2.1 Home AI 흐름 (canonical entry — 2026-09)

```
neture.co.kr/
 → O4O 공통 Home
 → 중앙 AI 입력창
 → WorkScope 확인 (client hint)
 → POST /api/ai/home-chat
 → 서버가 membership · store 재확정
 → 텍스트 응답
```

현재 단계에서 이 경로는 **질문/응답**이다. **자동 실행 agent 가 아니다** (§13).

### 2.2 편집기 AI 흐름 (기존)

```
HUB
 → 선택 (BaseTable selectable, multi-select)
 → 복사 (AI용 텍스트)
 → 편집기 (AiContentModal textarea)
 → AI 정리 (outputType 선택)
 → 결과 생성 (미리보기)
 → 편집기에 삽입 (setContent) 또는 복사
 → 실행 (POP / QR / 콘텐츠 / 상품 설명)
```

---

## 3. HUB 동작 기준

### 3.1 선택

- `BaseTable` selectable 패턴
- multi-select 가능 (`selectedKeys: Set<string>`)

### 3.2 복사 방식

#### (1) 링크 복사 (기존)

- URL 목록 (`origin/{path}/{id}`) 클립보드 저장
- 용도: 외부 공유, 단순 전달

#### (2) AI용 텍스트 복사 (WO-HUB-COPY-TEXT-INCLUDE-V1, 2026-04-23)

클립보드 포맷:

```
[항목 1]
제목: ...
출처: https://...
내용:
...

---

[항목 2]
제목: ...
출처: https://...
내용:
...
```

특징:

- `AiContentModal` textarea에 바로 붙여넣기 가능
- 다중 선택 시 `---` 구분자로 병합
- HTML 제거된 plain text 중심 (`stripHtml`, `blocksToText`)

**적용 범위:**

| HUB | 본문 추출 방식 | 상태 |
|-----|-------------|------|
| `/content` | `ContentItem.body` → `stripHtml()` / fallback: `summary` | ✅ 완료 |
| `/forum` | `ForumPost.content` (blocks→`blocksToText` / string→`stripHtml`) / fallback: `excerpt` | ✅ 완료 |
| `/resources` | - | Phase 2 예정 |
| `/lms` | - | Phase 2 예정 |

**공유 유틸:** `services/web-kpa-society/src/utils/ai-clipboard.ts`
- `stripHtml(html)` — HTML 태그 + 엔티티 디코딩
- `blocksToText(blocks)` — KPA/TipTap 블록 배열 → plain text
- `buildAiClipboardText(items)` — 포맷 조립

---

## 4. AI 사용 기준

### 4.1 실행 위치

AI 진입점은 **공통 Home 중앙 입력 1곳 + 편집기 내부**다.

| 진입점 | 경로 | AI 진입 | 성격 |
|-------|------|--------|------|
| **O4O 공통 Home 중앙 입력** | `neture.co.kr/` (`O4OHomePage.tsx`) | 자유 질문 (WorkScope 동반) | **업무 진입점** — 텍스트 응답 전용 |
| RichTextEditor 툴바 | AiContentModal (✨ 버튼) | textarea 수동 입력 or "에디터에서 가져오기" | 편집 대상 산출물 생성 |
| POP 제작기 Step 3 | PopCreatePage | 상품 마스터 자동 — 사용자 입력 불필요 | 편집 대상 산출물 생성 |

> 2026-04 판에 있던 `FloatingAiButton` 행은 제거했다. 해당 컴포넌트는
> WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1 에서 이미 제거되어
> 저장소에 존재하지 않는다 (문서가 코드보다 뒤처져 있던 항목).

Home AI 의 계약 상세는 §11 을 따른다.

### 4.2 입력 방식

- textarea 기반
- 붙여넣기 중심
- 입력 데이터:
  - HUB에서 "AI용 텍스트 복사"한 내용
  - 외부 자료 (외부 LLM 결과 등)
  - 사용자 직접 입력

### 4.3 outputType 목록

| outputType | 용도 | 주요 출력 |
|-----------|------|---------|
| `product_detail` | 고객용 상품 설명 | html, title, summary, bullets |
| `blog` | 블로그 포스트 | html, title, summary, bullets |
| `pop` | POP 문구 세트 | title, shortText, longText, bullets |
| `summary` | 3-5줄 요약 | html, summary, bullets, shortText |
| `title_suggest` | 제목 후보 3-5개 | title, bullets |

API: `POST /api/ai/content` (`apps/api-server/src/routes/ai-proxy.routes.ts`)

### 4.4 결과 처리

- 미리보기 탭 / HTML 탭 제공
- **에디터에 삽입**: `editor.commands.setContent(html)` (직접 삽입)
- **복사**: `navigator.clipboard.writeText(html)` (선택적 반영)

---

## 5. 자동화된 AI 흐름 (사용자 개입 없음)

### 5.1 Product AI Pipeline

```
상품 마스터 데이터
 → ProductAiContentService
 → AiPolicyExecutorService.execute('PRODUCT_CONTENT', ...)
 → Gemini LLM
 → product_ai_contents 테이블 저장
 → POP / QR / 상품 설명에서 자동 사용
```

지원 content_type: `pop_short`, `pop_long`, `product_description`, `qr_description`, `signage_text`

### 5.2 Insight / Dashboard AI

```
스토어 운영 데이터
 → CopilotEngineService.generateInsights()
 → AiPolicyExecutorService
 → 대시보드 AI Summary 블록 표시
```

---

## 6. AI 실행 인프라 현황

| 컴포넌트 | 역할 | 경로 |
|---------|------|------|
| `resolveAiApiKey()` | API 키 단일 해석 (DB → env) | `apps/api-server/src/utils/ai-key.util.ts` |
| `AIProxyService.generateContent()` | 블록형 AI 응답 (편집기용) | `apps/api-server/src/services/ai-proxy.service.ts` |
| `AIProxyService.generateRawContent()` | JSON 구조형 AI 응답 (`/api/ai/content`용) | 동일 |
| `AiPolicyExecutorService.execute()` | 정책 기반 실행 (retry, usage logging) | `apps/api-server/src/modules/ai-policy/` |
| `AiContentModal` | 편집기 내 AI UX | `packages/content-editor/src/components/` |
| `POST /api/ai/home-chat` | **Home AI canonical endpoint** (텍스트 전용) | `apps/api-server/src/routes/ai-proxy.routes.ts` |
| `buildHomeChatSystemPrompt()` 외 | Home AI 프롬프트·검증 (순수 함수) | `apps/api-server/src/services/ai-prompts/homeChat.ts` |
| `@o4o/ai-core execute()` | Home AI 실행 (정책 executor 미경유 — §11.6) | `packages/ai-core/` |
| `resolveWorkScopeStore()` | Home AI 의 서버측 store 재확정 | `apps/api-server/src/utils/work-scope-store-resolution.ts` |

모든 LLM 호출은 `AIProxyService` 또는 `AiPolicyExecutorService`를 통해 실행됨.
Frontend에서 LLM API 직접 호출 없음 (WO-O4O-AI-SECURITY-APIKEY-REMEDIATION).

---

## 7. 현재 구조의 특징

### 장점

- AI 실행 인프라 완전 통합 (키 해석, retry, usage logging 공통화)
- 편집기 기반 UX — 사용자는 편집 위치를 벗어나지 않음
- 공통 Home 에 단일 업무 진입점 존재 (2026-09) — 서비스별 화면을 먼저 고르지 않아도 질문 가능
- HUB와 AI 간 결합 최소화 (텍스트 브리지만 존재)
- 외부 LLM 결과 붙여넣기 흐름과 호환

### 제약

- HUB 텍스트 복사는 `/content`, `/forum`만 완료 (`/resources`, `/lms` 미적용)
- URL 직접 붙여넣기 시 자동 본문 추출 미지원 (텍스트 수동 입력 필요)

---

## 8. 의도적 미적용 항목

현재 단계에서 적용하지 않은 것:

- HUB → AI 자동 전달 구조
- URL 붙여넣기 시 자동 본문 추출
- Vision AI 편집기 통합
- 고급 프롬프트 관리 UI

> **2026-09 정정** — "독립 AI 입력 화면" 은 더 이상 미적용 항목이 아니다.
> O4O 공통 Home 의 중앙 AI 입력이 production 에서 동작하며 canonical 이다(§11).
> 다만 그것은 별도 `/ai` route 가 아니라 **공통 Home 화면 자체**다.

---

## 9. 향후 확장 후보

### Phase 2

- HUB AI용 텍스트 복사 확장 (`/resources`, `/lms`)
- `AiContentModal` URL 직접 입력 지원
- `AiContentModal` 공통 입력 컴포넌트화

### Phase 3

- 비동기 AI Job (BullMQ)
- 멀티 입력 병합 UI
- 목적별 AI 정책 고도화

> Home AI 축의 향후 단계는 §14 에 별도로 둔다(위 Phase 2/3 은 편집기 AI 축의 후보다).

---

## 10. 한 줄 핵심

> O4O의 AI는 **업무의 진입점이자, 콘텐츠를 실행으로 연결하는 흐름의 일부**다.

```
진입:  O4O Home 중앙 AI 입력 → WorkScope → 텍스트 응답
실행:  선택(HUB) → 복사(텍스트) → 정리(AI) → 실행(POP/QR/콘텐츠)
```

2026-04 판의 "AI 는 따로 사용하는 기능이 아니다" 는 **편집기 축에 한해 여전히 유효**하다 —
AI 가 빈 콘텐츠를 스스로 만들어 실행 자산으로 내보내는 주체가 아니라는 뜻이며,
공통 Home 에 질의응답 진입점이 있다는 사실과 충돌하지 않는다.

---

## 11. O4O Home AI — canonical 계약 (2026-09)

> 근거: `WO-O4O-COMMON-HOME-PHASE1-V1` · `WO-O4O-WORK-SCOPE-CONTRACT-V0` ·
> `WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0` · `WO-O4O-COMMON-HOME-AI-INPUT-V0` ·
> `WO-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1` (전부 CLOSED, production smoke PASS)

### 11.1 진입점

```text
neture.co.kr/  =  O4O 전체 서비스 대표 진입점
```

`neture.co.kr` 는 Neture 단일 서비스의 홈이 아니라 **O4O 공통 Home** 이다.
Supplier(`/supplier`) · Partner(`/partner`) 는 O4O 의 **하위 업무영역**이며 pill 로 진입한다.

Home 의 기본 구성은 다음 4가지로 고정한다. 포털형·대시보드형 Home 으로 정의하지 않는다.

```text
O4O 워드마크
중앙 AI 입력
서비스 진입 pill
최소 account UI
```

구현: `services/web-neture/src/pages/O4OHomePage.tsx` (App.tsx 에서 `NetureLayout` 밖에 배치).

### 11.2 Home AI 와 서비스 내부 AI 의 구분

**둘을 합치지 않는다.** 축이 다르다.

| | 공통 Home AI | 서비스 내부 AI |
|---|---|---|
| 위치 | `neture.co.kr/` 중앙 입력 | 편집기(AiContentModal) · POP 제작기 등 |
| 목적 | O4O 전체 업무 진입 · 자유 질의응답 | 서비스별 특정 업무 지원 (산출물 생성) |
| 출력 | 텍스트 | outputType 별 구조화 결과 (§4.3) |
| endpoint | `POST /api/ai/home-chat` | `POST /api/ai/content` 등 |
| 편집기 반영 | 없음 | 있음 (`setContent`) |

### 11.3 canonical endpoint

```text
POST /api/ai/home-chat
```

`/api/ai/query` 는 **Home AI 의 canonical 경로가 아니다** (§12).

### 11.4 WorkScope 결합

Home AI 요청은 WorkScope 와 결합된다. 클라이언트가 싣는 축:

```text
serviceKey
workspace
role
capabilities
executionMode
status
```

**client WorkScope 는 authorization SSOT 가 아니다.** 서버는 요청의 `workspace` / `serviceKey` 만
힌트로 받고, 현재 로그인 사용자 · membership · 기존 resolver(`resolveWorkScopeStore()`)를 기준으로
scope 를 다시 확정한다. 응답의 `scope` 는 **서버가 확정한 값**이다.

production 실측 (2026-09):

| 요청 | 서버 확정 `scope` |
|---|---|
| `{workspace:"home", serviceKey:"neture"}` | `{workspace:"home", serviceKey:"neture", storeStatus:null}` |
| `{workspace:"store", serviceKey:"kpa"}` | `{workspace:"store", serviceKey:"kpa-society", storeStatus:"resolved"}` |

`organizationId` / `storeId` 는 **아예 전송하지 않으며 서버도 읽지 않는다** —
보내면 "클라이언트가 scope 를 주장한다"는 잘못된 계약이 되기 때문이다.

### 11.5 개인정보 · 식별자 경계

Home AI 는 `storeId` · `organizationId` · UUID 등 **내부 식별자를 LLM 에 넣지 않는다.**
store 가 `resolved` 여도 system prompt 에는

```text
매장 컨텍스트: 확정됨
```

수준의 **불리언 사실**만 전달한다. 식별자를 프롬프트에 넣지 않으므로 응답으로 새어나갈 수 없다.
구현 근거: `apps/api-server/src/services/ai-prompts/homeChat.ts` (`VerifiedScopeFacts`).

### 11.6 비용 · 사용량 현재 상태

| 항목 | 현재 |
|---|---|
| rate limit | 있음 — `dynamicLimiter('free')` (60초 / 10회) |
| maxTokens | 있음 — 2048 |
| input length 제한 | 있음 — 2000자 (`HOME_CHAT_MAX_MESSAGE_LENGTH`, `/api/ai/query` 와 동일) |
| retry 제한 | 있음 — `maxAttempts: 1` |
| **토큰 사용량 DB 집계** | **없음** |
| **conversation 원문 저장** | **없음** |

Home AI 는 `@o4o/ai-core execute()` 를 직접 호출하며 `AiPolicyExecutorService` 를 경유하지 않는다.
따라서 편집기·파이프라인 경로와 달리 **`ai_usage_logs` 에 기록이 남지 않는다.**
비용/사용량 telemetry 는 향후 후속 과제로 둔다(§14).

### 11.7 Conversation 상태 (V0 계약)

```text
conversation DB       = 없음
message persistence   = 없음
새로고침 시 대화 유지 = 없음
```

두 번째 질문은 이전 질문의 문맥을 **자동으로 기억하지 않는다.**
이는 결함이 아니라 **V0 계약의 일부**다 (DB write 0 을 유지하기 위한 의도적 설계).
대화 맥락 유지가 필요해지면 별도 WO 로 다룬다.

---

## 12. `/api/ai/query` 취급

`/api/ai/query` 는 이번 기준선에서 **Home AI 의 canonical 경로로 지정하지 않는다.**
Home AI canonical 은 `POST /api/ai/home-chat` 이다(§11.3).

`/api/ai/query` 에 남아 있는 기존 기술부채(`column AiSettings.apikey does not exist`)는
**별도 후속 과제**이며 본 baseline 의 판정 대상이 아니다.

---

## 13. 현재 AI 기능 경계

미구현 기능을 현재 canonical 기능처럼 적지 않는다.

**현재 가능**

```text
사용자 질문
WorkScope context 결합
서버 AI 호출
텍스트 응답
```

**현재 불가능 / 미구현**

```text
tool calling
RPA
Computer Use
Browser control
Local Work Agent
local file access
POS 조작
약국 프로그램 조작
자동 write action
```

즉 현재 단계의 정의는 다음과 같다.

```text
AI = 질문 / 응답
AI ≠ 자동 실행 agent
```

WorkScope 타입의 `executionMode: 'local' | 'hybrid'` 와 capability `local_read` /
`local_write` / `browser` 는 **후속을 위한 계약 자리일 뿐 현재 부여되지 않는다.**

### 13.1 Known drift (수정 대상 아님 — 기록만)

| drift | 내용 | 상태 |
|---|---|---|
| `ai_query_policy.default_model` | 값이 `gemini-3.0-flash` 인데 `MODEL_WHITELIST.gemini` 에 없어 `resolveEditingModel()` 이 fallback `gemini-2.5-flash` 로 되돌린다 — admin 이 고른 모델이 조용히 무시된다 | **후속 정비 대상** |
| `/api/ai/query` | `column AiSettings.apikey does not exist` | **후속 정비 대상** (§12) |
| AI 키 주입 | Cloud Run **평문 env** 로 주입 (DB 비밀번호·encryption key 와 달리 Secret Manager 미경유) | 구조 개선 후보 |

---

## 14. Home AI 축 향후 단계 (예정 — 현재 canonical 아님)

```text
현재:      Home AI text response
다음:      AI Capability / Tool Routing
그 다음:   Local Work Agent
그 다음:   Browser / Computer Use
그 다음:   Local SQLite / Device
```

여기에 적힌 항목은 **전부 미구현**이다. 구현·검증되기 전까지 canonical 기능으로 인용하지 않는다.
비용/사용량 telemetry(§11.6)도 이 축의 후속 과제에 포함한다.
