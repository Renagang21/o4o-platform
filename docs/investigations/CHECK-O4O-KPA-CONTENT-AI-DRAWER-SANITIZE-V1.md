# CHECK-O4O-KPA-CONTENT-AI-DRAWER-SANITIZE-V1

> **작업명:** WO-O4O-KPA-CONTENT-AI-DRAWER-SANITIZE-V1
> **유형:** frontend 렌더 sanitize 보정 (KPA content drawer + signage AI preview)
> **판정: PASS.** IR WARNING **W2/W3/W4** 데이터 흐름 조사 + 4개 raw HTML 주입 지점을 `ContentRenderer`(내부 `sanitizeHtml`)로 보정. **신규 dependency·backend·DB·API schema 변경 없음.** web-kpa-society typecheck PASS.
> **중요:** W2/W3 은 조사 결과 **member 작성 본문 → member 열람 stored-XSS 경로**(backend 저장 sanitize 부재)로, WARNING 보다 위험도 높음 → render sanitize 로 즉시 차단 + 저장 sanitize 는 후속 WO.
> 선행: FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1 · CONTENT-EDITOR-AI-PREVIEW-SANITIZE-V1 — 2026-06-16

---

## 1. IR WARNING W2/W3/W4 근거

`IR-...-AUDIT-V1 §5.2`:

| # | 파일:라인 | 주입값 |
|---|----------|--------|
| W2 | `ContentDocumentsPage.tsx:545` | `drawerDetail.body` |
| W3 | `ContentListPage.tsx:447` | `drawerDetail.body` |
| W4 | `AiContentGenerationModal.tsx:320,381` | `genResult.generatedContent` |

## 2. 조사한 파일 목록

- `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx`
- `services/web-kpa-society/src/pages/contents/ContentListPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/AiContentGenerationModal.tsx`
- `services/web-kpa-society/src/api/content.ts` (데이터 출처)
- `services/web-kpa-society/src/App.tsx` (route/surface)
- `apps/api-server/src/routes/kpa/kpa.routes.ts` + `apps/api-server/src/routes/cms-content/cms-content-mutation.handler.ts` (backend 저장 sanitize 확인)
- `packages/content-editor/src/components/ContentRenderer.tsx` (안전 렌더러 계약)

## 3. drawerDetail.body 데이터 흐름 (W2/W3)

```
member 작성(ContentWritePage → contentApi.create/update body)
  → POST/PATCH /contents  (kpa.routes.ts:1935 → cms-content-mutation.handler)
  → DB 저장: content.body = body  (handler L173 create / L282 update — sanitize 없음, raw)
  → GET /contents/:id  (contentApi.detail)
  → drawerDetail.body
  → [before] dangerouslySetInnerHTML raw  ← W2/W3 취약 지점
```

- **데이터 출처:** member 작성 본문(operator/admin 전용 아님). content hub `/content`·`/content/documents`·`/content/resources` 는 **로그인 member(약사) surface**.
- **backend 저장 sanitize:** **없음** — `cms-content-mutation.handler.ts` 가 `body` 를 raw 저장(create L173 / update L282).
- → 즉, **member A 가 body 에 `<script>`/onerror 주입 → member B 가 drawer 열람 시 실행**되는 **stored-XSS 경로**. IR 의 "공개 노출+backend 미sanitize 시 DANGER 승격" 조건에 해당(member-to-member). render sanitize 로 즉시 차단.

## 4. generatedContent 데이터 흐름 (W4)

```
operator 생성 요청 → signageAi.generateAiContent (POST)
  → genResult.generatedContent (AI 생성 HTML, signage 미디어용)
  → [before] preview 2곳 dangerouslySetInnerHTML raw (L320 step2 / L381 step3)
```

- **데이터 출처:** AI 생성 결과(backend AI). **surface:** operator/signage(`pages/operator/signage`).
- preview sanitize 는 **저장값을 바꾸지 않음**(미리보기 안전화만) — AI 생성/저장 로직 무변경.

## 5. surface 분류 결과

| # | surface | 데이터 | 위험 |
|---|---------|--------|------|
| W2/W3 | **member**(content hub) | member 작성 body, backend raw 저장 | stored-XSS(member-to-member) — render sanitize 로 차단 |
| W4 | operator/signage | AI 생성 HTML preview | preview raw → sanitize |

## 6. backend sanitize 여부

- `/contents` write(`cms-content-mutation.handler.ts`): `body` **raw 저장**(sanitize 없음). → **후속** `WO-O4O-KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1` 로 저장 단계 sanitize 분리(WO §7/§9: 본 WO 에서 backend sanitize 신규 도입 제외).
- 본 WO 는 **render 단계 sanitize** 로 노출 위험을 즉시 차단(2겹 방어선의 render 측). 저장 sanitize 도입 시 write 측 보강.

## 7. 수정 파일 목록 / 수정 전·후

기존 `<div ... dangerouslySetInnerHTML={{ __html: X }} />` 를 `<ContentRenderer html={X} className=... />` 로 교체.
`ContentRenderer`(variant 미지정)는 `<div className={className} style={style} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />` 로, **기존 div 구조/className 그대로 + 내부 sanitizeHtml** → 시각 회귀 0.

| 파일:라인 | before | after |
|----------|--------|-------|
| `ContentDocumentsPage.tsx:545` | `<div className="text-sm text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: drawerDetail.body }} />` | `<ContentRenderer html={drawerDetail.body || ''} className="text-sm text-slate-800 leading-relaxed" />` |
| `ContentListPage.tsx:447` | 동일 | `<ContentRenderer html={drawerDetail.body || ''} className="text-sm text-slate-800 leading-relaxed" />` |
| `AiContentGenerationModal.tsx:320` | `<div className="border border-purple-200 ..." dangerouslySetInnerHTML={{ __html: genResult.generatedContent }} />` | `<ContentRenderer html={genResult.generatedContent} className="border border-purple-200 ..." />` |
| `AiContentGenerationModal.tsx:381` | `<div className="border border-slate-200 ..." dangerouslySetInnerHTML={{ __html: genResult.generatedContent }} />` | `<ContentRenderer html={genResult.generatedContent} className="border border-slate-200 ..." />` |

각 파일 상단에 `import { ContentRenderer } from '@o4o/content-editor';` 추가(KPA 기존 컨벤션 — StorefrontProductDetailPage/LmsLessonPage 동일).

## 8. ContentRenderer 재사용 / raw __html 잔여

- `ContentRenderer` = KPA canonical 안전 렌더러(`@o4o/content-editor`, 내부 `sanitizeHtml` = `DOMPurify.sanitize` 기본 정책).
- 3개 파일 내 `dangerouslySetInnerHTML` **잔여 0** (grep 확인).
- 동일 파일 내 다른 `drawerDetail.body`/`generatedContent` 참조 없음(렌더 외 사용 없음).

## 9. 신규 dependency / schema 변경 없음

- `@o4o/content-editor` 는 web-kpa-society **기존 workspace 의존**(package.json L19). 신규 dep **없음**.
- DB / migration / backend API schema / AI 생성 로직 / prompt **무변경**.
- 다른 WARNING(W1/W5/W6) 및 DANGER 항목 **미수정**.

## 10. 보안 검증

- `ContentRenderer` 내부 `sanitizeHtml` = `DOMPurify.sanitize` 기본 정책 → WO §10 벡터(`<script>` 제거 / `onclick`·`onerror` 제거 / `javascript:` 제거 / p·strong·ul·li 서식 유지)는 동일 정책으로 `CHECK-...-SANITIZE-ON-WRITE-V2 §12` runtime 확인 완료.

## 11. 검증 결과

| 항목 | 결과 |
|------|------|
| web-kpa-society `tsc --noEmit` | **PASS** (EXIT 0, 에러 0) |
| raw `__html` 잔여 | 없음(3파일 grep) |
| 신규 dependency | 없음 |
| backend/DB/API schema | 무변경 |
| 다른 WARNING 항목 | 미수정 |

> 브라우저 smoke(배포 후 권장): KPA `/content`·`/content/documents` drawer 본문 정상 표시(서식 유지) + 위험 HTML 미실행 / operator signage AI 생성 preview 정상 + 콘솔 에러 없음.

## 12. 남은 WARNING / 후속 WO

| 후속 WO | 대상 | 비고 |
|---------|------|------|
| `WO-O4O-KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1` | `/contents` body 저장 sanitize | **권장(stored-XSS write 측 보강)** — backend cms-content-mutation.handler |
| `WO-O4O-ADMIN-HTMLSETTINGS-SANITIZE-HARDENING-V1` | HTMLSettings regex/safeMode (W5) | 미착수 |
| `WO-O4O-SHARED-COMMUNITY-DETAIL-SANITIZE-CONTRACT-V1` | CommunityContentDetailView (W1) | 미착수 |
| `WO-O4O-ADMIN-RICHTEXT-EDITOR-INIT-SANITIZE-V1` | Gutenberg RichText (W6) | 미착수 |

## 13. 완료 판정

**PASS.**
- W2/W3/W4 데이터 흐름·surface·backend sanitize 조사 완료.
- 4개 raw HTML 주입 → `ContentRenderer` 안전 렌더로 보정(시각 회귀 0).
- 신규 dependency / backend / DB / API schema 변경 없음.
- web-kpa-society typecheck PASS.
- W2/W3 stored-XSS render 측 즉시 차단 + 저장 sanitize 는 후속 WO 분리.

## 14. Commit Hygiene

- 수정 4파일(3 src + 본 CHECK) **path-specific stage**, 단일 shell call 로 `add → diff --cached → commit → push` 체인(직전 V2 mixed-commit 재발 방지). 다른 세션 WIP 미접촉.

---

*Date: 2026-06-16 · KPA content/AI drawer sanitize · PASS · ContentDocumentsPage:545 / ContentListPage:447 drawerDetail.body + AiContentGenerationModal:320,381 generatedContent → ContentRenderer(sanitizeHtml) · W2/W3 = member stored-XSS(backend raw 저장) render 측 차단 · 신규 dep/backend/DB 무변경 · KPA tsc PASS · 저장 sanitize 후속 WO.*
