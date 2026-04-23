# O4O-AI-USAGE-FLOW-BASELINE-V1

> **현재 기준 정렬 문서** — 설계 변경 문서가 아님
>
> O4O 플랫폼에서 사용자가 자료를 선택하고, AI를 활용하여, 실제 콘텐츠/매장 자산으로 전환하는
> 현재 기준 표준 흐름을 명확히 정의한다.

*Status: Active Baseline*
*Date: 2026-04-23*

---

## 1. 역할 분리

| 레이어 | 화면/서비스 | 역할 |
|-------|-----------|------|
| **HUB** | `/content`, `/forum`, `/resources`, `/lms` | 선택 + 복사 |
| **AI** | RichTextEditor + AiContentModal, POP 제작기, 기타 편집 화면 | 정리 + 생성 |
| **Execution** | POP, QR, 블로그, 상품 상세 설명 | 실행 + 노출 |

---

## 2. 전체 흐름

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

편집기 내부에서만 실행. 독립 AI 입력 화면(`/ai` 등) 없음.

| 편집기 | 경로 | AI 진입 |
|-------|------|--------|
| RichTextEditor 툴바 | AiContentModal (✨ 버튼) | textarea 수동 입력 or "에디터에서 가져오기" |
| POP 제작기 Step 3 | PopCreatePage | 상품 마스터 자동 — 사용자 입력 불필요 |
| FloatingAiButton | 우측 하단 | 자유 질문 (에디터 반영 없음) |

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

모든 LLM 호출은 `AIProxyService` 또는 `AiPolicyExecutorService`를 통해 실행됨.
Frontend에서 LLM API 직접 호출 없음 (WO-O4O-AI-SECURITY-APIKEY-REMEDIATION).

---

## 7. 현재 구조의 특징

### 장점

- AI 실행 인프라 완전 통합 (키 해석, retry, usage logging 공통화)
- 편집기 기반 UX — 사용자는 편집 위치를 벗어나지 않음
- 독립 AI 화면 없이도 흐름 성립
- HUB와 AI 간 결합 최소화 (텍스트 브리지만 존재)
- 외부 LLM 결과 붙여넣기 흐름과 호환

### 제약

- HUB 텍스트 복사는 `/content`, `/forum`만 완료 (`/resources`, `/lms` 미적용)
- URL 직접 붙여넣기 시 자동 본문 추출 미지원 (텍스트 수동 입력 필요)

---

## 8. 의도적 미적용 항목

현재 단계에서 적용하지 않은 것:

- 독립 AI 입력 화면 (`/ai` 등)
- HUB → AI 자동 전달 구조
- URL 붙여넣기 시 자동 본문 추출
- Vision AI 편집기 통합
- 고급 프롬프트 관리 UI

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

---

## 10. 한 줄 핵심

> O4O의 AI는 **"따로 사용하는 기능"이 아니라
> "콘텐츠를 실행으로 연결하는 흐름의 일부"이다.**

```
선택(HUB) → 복사(텍스트) → 정리(AI) → 실행(POP/QR/콘텐츠)
```
