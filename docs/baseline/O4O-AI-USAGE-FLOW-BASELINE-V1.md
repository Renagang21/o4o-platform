# O4O-AI-USAGE-FLOW-BASELINE-V1

> **현재 기준 정렬 문서** — 설계 변경 문서가 아님
>
> O4O 플랫폼에서 사용자가 자료를 선택하고, AI를 활용하여, 실제 콘텐츠/매장 자산으로 전환하는
> 현재 기준 표준 흐름을 명확히 정의한다.

*Status: Active Baseline*
*Date: 2026-04-23*
*Last aligned with production: 2026-09-14 (WO-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1 · 이전 WO-O4O-AI-USAGE-FLOW-BASELINE-REALIGNMENT-V1)*

> **정책 확장 2026-10-22:** 사용자 승인에 따라 외부 AI의 자료 조회·초안 저장 직접 연결을 허용한다. 이 정책 추가는 운영 연결·배포 완료를 뜻하지 않는다. 아래 External 설명과 연결 설계·TODO를 따른다.

> **2026-09-14 정렬 요지** — AI 의 위치를 4축으로 나눈다. ① 플랫폼 **일반 업무 진입** = Home AI(가능).
> ② **매장 콘텐츠의 Creative/Strategy**(기획·스토리·초안) = **사용자 자신의 외부 AI**(ChatGPT/Gemini/Claude 등) 사용 가능·권장 가능.
> ③ **매장 제작 실행** = O4O 표준 제작환경(편집기 · POP/QR/Blog/상품설명/태블릿/사이니지/영상 · Media Library · VIDEO Job).
> ④ O4O **내부 AI = 선택적 보조**(편집 정리 · 구조화 · 내부 자동화) — 매장 콘텐츠 제작의 **필수 단계가 아니다**.
> Home AI 는 "모든 콘텐츠 제작의 필수 시작점" 이 아니다. 역할 경계의 정본은
> [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)(§15).

> **2026-09 정렬 요지** — O4O 공통 Home(`neture.co.kr/`)에 **중앙 AI 입력이 canonical 로 존재**한다.
> 2026-04 판 전제였던 "독립 AI 입력 화면 없음" 은 현재 구조와 맞지 않아 폐기했다(§11).
> Home AI 는 편집기 AI 를 대체하지 않는다 — **두 진입점이 축을 달리하여 공존**한다(§11.2).

---

## 1. 역할 분리

| 레이어 | 화면/서비스 | 역할 |
|-------|-----------|------|
| **External** | 사용자의 외부 AI (ChatGPT / Gemini / Claude 등, 플랫폼 밖) | 매장 콘텐츠의 기획 · 스토리 · 초안 · 문구 (Creative / Strategy) — 결과를 O4O 로 가져온다 (2026-09-14, §15) |
| **Entry** | O4O 공통 Home (`neture.co.kr/`) 중앙 AI 입력 | 플랫폼 일반 업무 진입 + 질의응답 (2026-09 추가) — 콘텐츠 제작의 필수 시작점이 아님 |
| **HUB** | `/content`, `/forum`, `/resources`, `/lms` | 선택 + 복사 |
| **AI** | RichTextEditor + AiContentModal, POP 제작기, 기타 편집 화면 | 정리 + 생성 |
| **Execution** | POP, QR, 블로그, 상품 상세 설명 | 실행 + 노출 |

Entry 레이어는 HUB→편집기 흐름의 **대체가 아니라 상위 진입점**이다. 상세는 §11.
External 레이어의 창작·모델 선택·구독·비용·대화는 사용자 외부 AI가 담당한다. 기존 안내(`ContentCreationGuideModal`)와 복사/붙여넣기 도구(`LlmAssistPanel`)를 유지한다.
2026-10-22 사용자 결정으로, 외부 AI가 사용자 동의와 기존 업무 권한 안에서 자료를 조회하고 초안을 저장하는 직접 연결을 추가한다.
범위·인증·보관은 [외부 AI 연결 설계](../design/DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md), 구현·검증·운영 상태는 [TODO](../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md)를 따른다. O4O가 외부 AI의 LLM 호출·대화 수집을 대행하는 변경은 아니다.

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

O4O 내부 AI 진입점은 **공통 Home 중앙 입력 1곳 + 편집기 내부**다. (사용자 외부 AI 는 플랫폼 밖 — §15)

| 진입점 | 경로 | AI 진입 | 성격 |
|-------|------|--------|------|
| **O4O 공통 Home 중앙 입력** | `neture.co.kr/` (`O4OHomePage.tsx`) | 자유 질문 (WorkScope 동반) | **업무 진입점** — 텍스트 응답 전용 |
| RichTextEditor 툴바 | AiContentModal (✨ 버튼) | textarea 수동 입력 or "에디터에서 가져오기" | 편집 대상 산출물 생성 |
| ~~POP 제작기 Step 3~~ | ~~PopCreatePage~~ | — | **stale(2026-09-14 정정)** — `PopCreatePage` 는 저장소에 없고 POP canonical 은 `/store/marketing/pop-v2`(AI 단계 없음). 페이지형 제작 AI 의 현재 census 는 [IR §4](../investigations/IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1.md) |

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
| `POST /api/ai/home-chat` | **Home AI canonical endpoint** (텍스트·기존 첨부 해석) | `apps/api-server/src/routes/ai-proxy.routes.ts` |
| `buildHomeChatSystemPrompt()` 외 | Home AI 프롬프트·검증 (순수 함수) | `apps/api-server/src/services/ai-prompts/homeChat.ts` |
| `@o4o/ai-core execute()` | Home AI 실행 (정책 executor 미경유 — §11.6) | `packages/ai-core/` |
| `AiAccountedExecution.invoke()/invokeNative()` | 확인된 활성 텍스트·전문 transport의 호출 전 예약/정산 (개발 branch — §11.6) | `apps/api-server/src/modules/ai-policy/ai-accounted-execution.ts` |
| `resolveWorkScopeStore()` | Home AI 의 서버측 store 재확정 | `apps/api-server/src/utils/work-scope-store-resolution.ts` |

기존 `AIProxyService`·`AiPolicyExecutorService`와 직접 Core/native transport 소비처를 조사해, 확인된 활성 경로를 같은 `AiAccountedExecution`의 예약/정산에 연결했다. 이 개발 상태의 main/운영 반영·전문 가격 준비 경계는 §11.6을 따른다. 사용 여부 미확인 legacy 경로까지 연결 완료로 해석하지 않는다.
Frontend에서 LLM API 직접 호출 없음 (WO-O4O-AI-SECURITY-APIKEY-REMEDIATION).

---

## 7. 현재 구조의 특징

### 장점

- 확인된 활성 경로의 키 해석·시도별 예약/정산을 기존 공통 기반으로 연결
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

> O4O의 AI는 **업무의 진입점이자, 콘텐츠를 실행으로 연결하는 흐름의 선택적 일부**다. 매장 콘텐츠의 창작 주체는 사용자(와 사용자의 AI)다.

```
진입:  O4O Home 중앙 AI 입력 → WorkScope → 텍스트 응답            (플랫폼 일반 업무)
기획:  사용자 외부 AI → 기획·초안 → O4O 로 가져오기(HTML 붙여넣기)   (§15)
실행:  선택(HUB/자료) → 복사(텍스트) → [정리(AI, 선택)] → 실행(POP/QR/콘텐츠)
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
Supplier(`/supplier`) 는 O4O 의 **하위 업무영역**이며 pill 로 진입한다. (Partner(`/partner`) 진입은 2026-09-15 Legacy Partner 은퇴로 제거 — ROLE-WORKSPACE-ARCHITECTURE §7)

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

2026-10-25 [텍스트 회계 후속 TODO](../work-orders/TODO-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md)와 이를 포함하는 [전문 호출 회계 TODO](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md)는 PR #811/main `67654de1fe`에 통합됐다. 운영 적용의 실제 증거는 [후속 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)를 따르며 실제 유료 호출·운영 한도 검증 완료를 뜻하지 않는다. 사용자 지시에 따른 코드 배포에서도 전문 경로는 명시 모델 가격/profile 준비 전 provider 호출을 차단한다. 코드 연결과 실제 사용 활성화를 구분한다.

| 항목 | 현재 |
|---|---|
| rate limit | 있음 — `dynamicLimiter('free')` (60초 / 10회) |
| maxTokens | 있음 — 2048 |
| input length 제한 | 있음 — 2000자 (`HOME_CHAT_MAX_MESSAGE_LENGTH`, `/api/ai/query` 와 동일) |
| retry 제한 | 있음 — `maxAttempts: 1` |
| **텍스트 토큰 사용량 DB 집계** | 기존 `executeAccountedAi` → `ai_usage_logs`·예약/정산에 연결 |
| 호출 전 quota | 텍스트와 native 모두 `SERVICE_QUERY/neture`·인증 사용자 한도. 클라이언트 WorkScope와 청구 귀속을 혼동하지 않음 |
| 이미지·PDF native 해석 | 기존 native transport를 `executeAccountedNativeAi` 예약/정산에 연결. 관리 목록은 connected이며 명시 모델 가격/profile이 없으면 503으로 선차단. 사용량 누락은 예산 보류 |
| **conversation 원문 저장** | **없음** |

Home AI는 텍스트의 기존 `executeAccountedAi`를 통해 Core를 소비하고 native transport도 같은 원장을 사용하며 모델 선택·업무 권한 경로를 유지한다. 별도 scope 정책 실행기로 바꾸거나 SERVICE_QUERY 질의 중지 설정이 홈에도 적용된다고 표시하지 않는다. 한도 초과는 429, 한도 DB/가격 장애는 503으로 거부하며 자동 유료 재시도를 유도하지 않는다. 원장에는 본문 없는 사용자·모델·사용량·비용 메타데이터만 남기고, 사용량이 누락되면 무료 사용으로 확정하지 않는다. V0의 직접 호출·미집계는 이 연결 이전의 상태다.

### 11.7 Conversation 상태 (V0 계약)

```text
conversation DB       = 없음
message persistence   = 없음
새로고침 시 대화 유지 = 없음
```

두 번째 질문은 이전 질문의 문맥을 **자동으로 기억하지 않는다.**
이는 결함이 아니라 **대화 원문을 영속화하지 않는 V0 계약의 일부**다. 비용·사용량 메타데이터 기록은 conversation/message 저장과 구분한다.
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
| §13 "현재 불가능" 목록 · §14 | Local Work Agent · Browser control · Computer Use · tool calling 은 work-agent 경로(Home AI 업무 요청 → Local Agent · Chrome 확장 · UIA)로 이미 구현돼 있다 — 이 목록은 **Home AI 텍스트 응답 축** 기준으로만 유효하다. 업무 비서 · 자동화 축의 정본은 [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) (2026-10-03 표기) | **stale — 본문 재정렬은 별도 WO** |

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

---

## 15. 매장 콘텐츠 제작에서의 AI 위치 (2026-09-14)

> 정본: [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md). 본 절은 이 문서의 진입 흐름과 그 원칙의 접점만 적는다.

| 단계 | 주체 | O4O 코드 접점 |
|---|---|---|
| 기획 · 스토리 · 초안 (Creative / Strategy) | **사용자의 외부 AI** | O4O는 외부 LLM 호출·모델/구독/비용 관리·대화 수집을 하지 않는다. 명시적 연결 허용 시 기존 자료 조회·초안 저장만 연결한다(§1 External 설명·외부 AI 연결 설계) |
| 가져오기 · 누락 확인 (Normalize / Handoff) | O4O Guide | `ContentCreationGuideModal`(KPA) · `LlmAssistPanel`(`@o4o/content-editor`, 태블릿 코너) · 편집기 HTML 탭 |
| 제작 실행 (Execute / Manage / Reuse) | O4O 표준 제작환경 | `StartProductionModal` → POP V2 / QR / Blog / 상품설명 · Production Materials 편집 · Media Library V2 · VIDEO Job · Temporary Output |
| 편집 보조 · 구조화 · 내부 자동화 (Assist) | O4O 내부 AI (**선택**) | Toolbar `AI 정리`(`AiContentModal`, `/api/ai/content`) · Product AI pipeline(§5.1) · Home AI(§11) |

- §2.2 편집기 AI 흐름의 "AI 정리" 는 **선택 단계**다. 외부 LLM 결과를 붙여넣고 AI 정리 없이 바로 실행해도 canonical 흐름이다.
- `StartProductionModal.onAiAction`("AI 제작 자료 초안 만들기") 은 프로덕션 소비처 0 인 DORMANT capability 다(IR §3.2). 이 문서의 어느 흐름도 그것을 전제하지 않는다.
- 잔존 페이지형 제작 AI(KPA `/store/marketing/qr/ai-description`)의 처분은 별도 WO(IR §8-4). 이 문서는 그것을 canonical 진입점으로 등재하지 않는다.

