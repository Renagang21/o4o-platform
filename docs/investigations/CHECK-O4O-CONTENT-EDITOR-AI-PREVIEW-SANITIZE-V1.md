# CHECK-O4O-CONTENT-EDITOR-AI-PREVIEW-SANITIZE-V1

> **작업명:** WO-O4O-CONTENT-EDITOR-AI-PREVIEW-SANITIZE-V1
> **유형:** frontend 최소 보안 수정 (AI preview raw HTML → sanitizeHtml)
> **판정: PASS.** `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` 의 **DANGER 2건**(content-editor AI preview `result.html` raw 주입)을 기존 패키지 내 `sanitizeHtml` 로 정화 → **DANGER 2 → 0**. 신규 dependency·backend·DB 변경 없음. content-editor typecheck PASS.
> 선행: FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1 · SANITIZE-ON-WRITE-V2 — 2026-06-16

---

## 1. IR DANGER 2 근거

`IR-...-AUDIT-V1 §5.3`:

| # | 파일:라인 | 주입값 | 비고 |
|---|----------|--------|------|
| D1 | `AiContentModal.tsx:1361` | `result.html` (AI 결과) | preview 탭 raw 주입, sanitize 없음 |
| D2 | `StoreUseModal.tsx:382` | `result.html` (AI 결과) | preview 뷰 raw 주입, sanitize 없음 |

둘 다 admin/operator 모달 preview. canonical sanitizer 가 같은 패키지에 존재 → 신규 dep 없이 해소 가능.

## 2. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/content-editor/src/components/AiContentModal.tsx` | `import { sanitizeHtml } from '../sanitize';` 추가 + L1361 preview 주입을 `sanitizeHtml(result.html || '')` 로 변경 |
| `packages/content-editor/src/components/StoreUseModal.tsx` | `import { sanitizeHtml } from '../sanitize';` 추가 + L382 preview 주입을 `sanitizeHtml(result.html || '')` 로 변경 |

## 3. 수정 전/후 렌더 방식

**AiContentModal (preview 탭):**
```tsx
// before
dangerouslySetInnerHTML={{ __html: result.html }}
// after
dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.html || '') }}
```

**StoreUseModal (preview 뷰):**
```tsx
// before
<div dangerouslySetInnerHTML={{ __html: result.html }} />
// after
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.html || '') }} />
```

preview UI 구조는 그대로 유지. source/text 탭(`<pre>{result.html}` / `{result.plainText}`)은 텍스트 렌더라 변경 불요.

## 4. sanitizeHtml 재사용 경로

- export: `packages/content-editor/src/index.ts:8` → `export { sanitizeHtml, sanitizeRichHtml } from './sanitize';`
- 정의: `packages/content-editor/src/sanitize.ts` → `sanitizeHtml(dirty) = DOMPurify.sanitize(dirty)` (기본 정책).
- import 경로: 동일 패키지 sibling 컴포넌트(`ContentRenderer.tsx`, `ContentPreview.tsx`)와 동일하게 `'../sanitize'` 상대 경로 사용 → 순환 참조 없음(`sanitize.ts` 는 components 를 import 하지 않음).
- WO §5/§9 지정대로 `sanitizeHtml` 사용(`sanitizeRichHtml` 아님).

## 5. dangerouslySetInnerHTML 잔여 사용 여부

- 두 파일 내 `dangerouslySetInnerHTML` 은 각 1곳뿐이며 **모두 sanitize 적용 완료**:
  - `AiContentModal.tsx:1362` → `sanitizeHtml(result.html || '')`
  - `StoreUseModal.tsx:383` → `sanitizeHtml(result.html || '')`
- 동일 파일 내 다른 `result.html` 참조(클립보드 복사 / editor setContent / API payload / `<pre>` 소스 보기)는 **HTML 주입 아님** → 범위 밖.

## 6. 신규 dependency 없음 확인

- import 추가는 **기존 패키지 내부 export**(`'../sanitize'`)만. `dompurify` 는 content-editor 가 이미 의존(기존).
- package.json / lockfile **변경 없음**.

## 7. DB / API / backend 변경 없음 확인

- AI 결과 생성 로직 / prompt / response schema **변경 없음**.
- 저장 sanitize / DB / migration / backend / API **변경 없음**.
- frontend preview 렌더 2곳만 수정.

## 8. 보안 검증

- `sanitizeHtml` = `DOMPurify.sanitize` 기본 정책. WO §9 벡터는 동일 DOMPurify 기본 정책으로 `CHECK-...-SANITIZE-ON-WRITE-V2 §12` 에서 runtime 확인 완료:
  - `<script>alert(1)</script><p>정상</p>` → `<p>정상</p>` ✅
  - `<p onclick="alert(1)">설명</p>` → `<p>설명</p>` ✅
  - `<a href="javascript:alert(1)">링크</a>` → `<a>링크</a>` ✅ (javascript: 제거)
  - `<img src=x onerror=alert(1)>` → `<img src="x">` ✅ (onerror 제거)
  - 유효 서식(p/strong/ul/li 등) 유지 ✅
- content-editor 의 `sanitizeHtml` 은 브라우저 DOMPurify 이며 위 정책과 동일 → 별도 whitelist 정의 없음.

## 9. 검증 결과

| 항목 | 결과 |
|------|------|
| content-editor `tsc --noEmit` | **PASS** (EXIT 0, 에러 0) |
| 소비처 typecheck | 미실행 — content-editor public API(export) **무변경**(내부 컴포넌트 렌더만 수정)이므로 소비처 영향 없음. 패키지 typecheck PASS 로 충분. |
| 신규 dependency | 없음 |
| backend/DB/API | 무변경 |

## 10. 남은 WARNING 6건 (이번 WO 범위 밖)

이번 WO 는 DANGER 2 만 처리. WARNING 6 은 IR §7 후속 WO 로 분리:

- `WO-O4O-KPA-CONTENT-AI-DRAWER-SANITIZE-V1` — KPA `drawerDetail.body` / AI `generatedContent` (W2/W3/W4)
- `WO-O4O-ADMIN-HTMLSETTINGS-SANITIZE-HARDENING-V1` — `HTMLSettings` regex/safeMode 우회 (W5)
- `WO-O4O-SHARED-COMMUNITY-DETAIL-SANITIZE-CONTRACT-V1` — `CommunityContentDetailView` sanitize 계약 (W1)
- `WO-O4O-ADMIN-RICHTEXT-EDITOR-INIT-SANITIZE-V1` — Gutenberg `RichText` 초기 innerHTML (W6)

## 11. 완료 판정

**PASS.**
- AiContentModal / StoreUseModal AI preview `result.html` raw 주입 제거 → `sanitizeHtml` 적용.
- 신규 dependency / backend / API / DB 변경 없음.
- content-editor typecheck PASS.
- **IR DANGER 2 → 0** 정리 가능(공개·admin surface 모두 미차단 raw HTML 주입 없음).

## 12. Commit Hygiene

- 수정 파일(2 src + 본 CHECK) **path-specific stage**, `git diff --cached --name-only` 확인 후 단일 shell call 로 `add → diff → commit` 체인(직전 V2 mixed-commit 재발 방지).
- 다른 세션 WIP 미접촉.

---

*Date: 2026-06-16 · content-editor AI preview sanitize · PASS · AiContentModal:1361 / StoreUseModal:382 result.html → sanitizeHtml(result.html||'') · 기존 '../sanitize' 재사용 · 신규 dep/backend/DB 무변경 · content-editor tsc --noEmit PASS · IR DANGER 2→0 · WARNING 6 후속.*
