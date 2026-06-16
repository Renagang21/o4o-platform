# CHECK-O4O-KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1

> **작업명:** WO-O4O-KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1
> **유형:** backend write-path sanitize (KPA content body, defense-in-depth 1차 방어선)
> **판정: PASS.** KPA content create/update write path 의 `body` 를 저장 전 backend-safe sanitizer(jsdom+DOMPurify)로 정화. render 단계 `ContentRenderer`(2차) 유지 → **2겹 방어선 완성**. 신규 dependency·DB schema·migration·frontend 변경 없음. 변경 파일 api-server typecheck clean.
> 선행: KPA-CONTENT-AI-DRAWER-SANITIZE-V1 · PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2 — 2026-06-16

---

## 1. W2/W3 stored-XSS 위험 근거

`CHECK-...-KPA-CONTENT-AI-DRAWER-SANITIZE-V1` 에서 확인:
- KPA content hub `/content`·`/content/documents`·`/content/resources` 는 **member(약사) surface**.
- `body` 는 member 가 작성(`contentApi.create/update`)한 뒤 **backend 가 raw 저장** → 다른 member 가 drawer 열람 시 렌더 → **member-to-member stored-XSS 경로**.
- 직전 WO 에서 **render 단계**(`ContentRenderer`)는 차단했으나 **저장 단계는 여전히 raw**. 본 WO 가 write 측 보강.

## 2. backend create/update write path (정정 포함)

> **정정:** 직전 CHECK 는 핸들러를 `cms-content/cms-content-mutation.handler.ts` 로 기재했으나, KPA `/contents` 의 실제 핸들러는 **`apps/api-server/src/routes/kpa/kpa.routes.ts` 의 inline `contentRouter`** 이며 대상 테이블은 **`kpa_contents`**(cms_contents 아님). 본 WO 는 실제 핸들러를 수정.

| 경로 | 위치 | body 처리(before) |
|------|------|------|
| create | `kpa.routes.ts` `contentRouter.post('/')` (L1493~), INSERT `kpa_contents` | `body \|\| null` (raw, $12) |
| update | `kpa.routes.ts` `contentRouter.patch('/:id')` (L1616~), UPDATE `kpa_contents` | `if (body !== undefined) params.push(body \|\| null)` (raw) |

`mount`: `kpa.routes.ts` `router.use('/contents', contentRouter)`.

## 3. 사용한 sanitizer (재사용)

- `sanitizeDescriptionHtml` (`apps/api-server/src/modules/neture/utils/sanitize-description-html.util.ts`) — `WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2` 에서 추가된 **jsdom + DOMPurify 기본 정책** backend-safe sanitizer. `purify.sanitize(value ?? '').trim()`.
- **신규 dependency 없음**(dompurify/jsdom 기존 보유), **regex sanitizer 없음**.
- import: `kpa.routes.ts` 상단에 `import { sanitizeDescriptionHtml } from '../../modules/neture/utils/sanitize-description-html.util.js';` — 동일 파일에 이미 neture 모듈 cross-import 선례 존재(L61 service-recruitment proxy)라 패턴 일관.
- **명명/위치 공통화는 본 WO 범위 밖** → 후속 `WO-O4O-BACKEND-SAFE-HTML-SANITIZER-COMMONIZATION-V1` (WO §6.2 A안 채택, 큰 리팩터 금지).

## 4. create / update 적용 방식

```ts
// create (INSERT params, body 위치)
sanitizeDescriptionHtml(body) || null,

// update
if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(sanitizeDescriptionHtml(body) || null); }
```

- `sanitizeDescriptionHtml` 가 null/undefined → '' 처리 + trim → `|| null` 로 **빈 값은 종전대로 null 저장**(동작 보존).
- update 는 기존 `body !== undefined` 가드 유지 → body 미제공 시 미변경(종전 동작 동일).

## 5. 빈 body 처리 방식

- 새 validation **추가 안 함**(WO §6.3). 기존 정책 유지:
  - create: `title` 필수 + tag ≥1 + COPY 타입은 blocks/body 필요(raw 기준) — **그대로**.
  - sanitize 후 빈 문자열은 `|| null` 로 null 저장(기존 `body || null` 과 동일 결과).
- KPA content body 는 게시글/문서 content 라 빈 값 skip/400 같은 신규 차단을 만들지 않음(상품설명 candidate 와 다름).

## 6. 기존 데이터 cleanup 제외 확인

- 신규 write 부터 sanitize. 기존 `kpa_contents.body` 일괄 sanitize / DB update / migration **없음**.
- 필요 시 후속 `WO-O4O-KPA-CONTENT-BODY-HTML-CLEANUP-V1`.

## 7. frontend / render 유지 확인

- frontend **변경 없음**. render 단계 `ContentRenderer`(ContentDocumentsPage / ContentListPage drawer) **유지** — 2차 방어선 제거 안 함.

## 8. DB / schema / migration / API response 무변경 확인

- DB schema / migration **없음**(같은 컬럼에 저장값만 sanitize).
- API request/response schema **무변경**(필드 추가/제거 없음). 권한/route **무변경**.

## 9. 보안 검증

- `sanitizeDescriptionHtml` = DOMPurify 기본 정책. WO §9 벡터는 동일 util 로 `CHECK-...-SANITIZE-ON-WRITE-V2 §12` runtime 확인 완료:
  - `<script>alert(1)</script><p>정상</p>` → `<p>정상</p>` ✅
  - `<p onclick="alert(1)">설명</p>` → `<p>설명</p>` ✅
  - `<a href="javascript:alert(1)">링크</a>` → `<a>링크</a>` ✅ (javascript: 제거)
  - 유효 서식(p/strong/ul/li 등) 유지 ✅

## 10. 검증 결과

| 항목 | 결과 |
|------|------|
| api-server `tsc -p tsconfig.build.json --noEmit` | 변경 파일(`kpa.routes.ts`) **에러 0**. 전체 1건 에러 = `marketTrialController.ts(105)` TS2353 — **본 WO 미변경 파일의 pre-existing baseline 에러**(market-trial 도메인, 무관). |
| 신규 dependency | 없음 |
| regex sanitizer | 없음 |
| DB/schema/migration | 무변경 |
| frontend / ContentRenderer | 무변경(유지) |
| 동작(API E2E) | 운영 DB 방화벽 + 테스트 환경 부재로 미실행. 검증 절차: `POST /api/v1/kpa/contents` body=`<script>alert(1)</script><p>정상</p>` → `GET /contents/:id` 의 `body` 가 `<p>정상</p>` 인지 확인(배포 후 권장). sanitizer 자체 동작은 §9(V2 runtime) 로 확인. |

## 11. 완료 판정

**PASS.**
- KPA content create/update `body` 저장 전 sanitize 적용(`sanitizeDescriptionHtml`).
- 기존 backend DOMPurify sanitizer 재사용, 신규 dependency 없음.
- DB/schema/migration/frontend/API schema 변경 없음, render `ContentRenderer` 유지.
- 변경 파일 api-server typecheck clean(pre-existing market-trial 1건만).
- **2겹 방어선 완성**: write sanitize(본 WO) + render sanitize(직전 WO).

## 12. 후속 WO

| 후속 WO | 목표 |
|---------|------|
| `WO-O4O-KPA-CONTENT-BODY-HTML-CLEANUP-V1` | 기존 `kpa_contents.body` sanitize 정책 점검/정리 |
| `WO-O4O-BACKEND-SAFE-HTML-SANITIZER-COMMONIZATION-V1` | neture 전용 `sanitizeDescriptionHtml` → api-server 공통 sanitizer 명명/위치 정리(kpa·product-description 공유) |
| `WO-O4O-ADMIN-HTMLSETTINGS-SANITIZE-HARDENING-V1` / `WO-O4O-SHARED-COMMUNITY-DETAIL-SANITIZE-CONTRACT-V1` / `WO-O4O-ADMIN-RICHTEXT-EDITOR-INIT-SANITIZE-V1` | 남은 WARNING(W5/W1/W6) 순차 정리 |

## 13. Commit Hygiene

- 수정 `kpa.routes.ts` + 본 CHECK 만 **path-specific stage**, 단일 shell call 로 `add → diff --cached → commit → push` 체인.
- 작업 중 working tree 의 **다른 세션 WIP**(`web-neture` admin/operator 페이지 4건 + `CHECK-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1.md`) **미접촉** — 스테이지 제외.

---

*Date: 2026-06-16 · KPA content body write-path sanitize · PASS · kpa.routes.ts contentRouter create(L1493)/update(L1616) body → sanitizeDescriptionHtml(body)||null · 실제 핸들러=kpa.routes inline / 테이블 kpa_contents (직전 CHECK 의 cms-content 참조 정정) · 기존 sanitizer 재사용·신규 dep 없음 · DB/migration/frontend 무변경 · render ContentRenderer 유지 · 변경 파일 tsc clean(market-trial pre-existing 1건) · 2겹 방어선 완성.*
