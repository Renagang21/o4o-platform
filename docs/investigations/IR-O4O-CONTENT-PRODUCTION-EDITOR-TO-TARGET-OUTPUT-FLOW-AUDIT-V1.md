# IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/route/UI **무변경**. 제작 프로세스 전체의 기준 재정립.
> **판정: B (부분 정합) + D (기능별 drift) + E (서비스 drift) 복합.**
> POP 가 canonical 모범(대상→자료→AI→**용도별 콘텐츠(store_pops)**→템플릿(생성 시)→**산출물(PDF)**). 최근 POP/QR 작업은 사용자 철학과 **충돌 없음**. drift 는 대상별 저장 모델 불균형 + 일부 대상의 "용도별 콘텐츠 ↔ 산출물" 분리 미완.
> 선행: `IR-O4O-POP-PRODUCTION-FLOW-OPERATOR-STORE-AUDIT-V1` · `IR-O4O-QR-CODE-PRODUCTION-FLOW-AUDIT-V1` — 2026-06-16

---

## 1. Canonical 제작 프로세스 (사용자 확정 기준)

```text
대상 선택 → 편집기에 자료 투입 → AI 정리 / 직접 수정
→ 용도별 콘텐츠 저장 → 템플릿 선택 → 실사용 산출물 생성
```

**핵심 판단 2가지 (본 IR 의 평가 축):**

1. **재사용 저장 = "용도별 콘텐츠"** (재편집 가능한 텍스트/구조), **산출물 저장 = 최종 양식 입힌 PDF/이미지/게시물/표시물**. 둘은 구분되어야 한다.
2. **템플릿은 실사용 산출물 생성 시점에 적용**한다. 재사용 콘텐츠는 최종 양식을 포함할 필요가 없다.

---

## 2. 공통 제작 골격 (이미 존재 — 긍정적 토대)

3개 서비스가 **공유하는 제작 진입·편집·템플릿 골격**이 이미 구축되어 있다 (KPA reference, GP/KCos 동형):

| 골격 | 위치 | 역할 |
|------|------|------|
| **대상 선택 진입** | `packages/store-ui-core/.../StartProductionModal.tsx:99` · `ProductionTypeSelectorModal.tsx:51` | 2-step(대상→템플릿). targets = **pop / qr / blog / product-description** |
| **Router state 표준** | `@o4o/types/production.ts:63` (`ProductionRouterState{ source, target, selectedTemplateId }`) | "자료함 → 제작 시작 → 대상" 라우팅 표준 |
| **공통 편집기/AI** | `packages/content-editor/.../AiContentModal.tsx` | initialMode = pop / blog / store_qr / title_suggest. templateSystemPrompt/ForcedOptions 수용 |
| **RichTextEditor** | `@o4o/content-editor` | manual 편집 공통 |
| **템플릿 레지스트리** | `productionTemplates.ts:49`(KPA) / `@o4o/types/production-template`(GP·KCos) | 10 seed (POP 3·Blog 3·QR 3·Desc 2). `systemPromptOverride`+`starterHtml`+`forcedOptions` |
| **산출물(OUTPUT) 테이블** | `store-execution-asset.entity.ts:22` (`sourceType=generated`, `usageType=pop/qr/signage/banner/notice`) | 생성/업로드 결과물. **재편집 대상 아님** |

> **중요:** `store_execution_assets` 는 **산출물(OUTPUT)** 전용이며, **재편집 콘텐츠는 대상별 테이블**(`store_pops`/`store_qr_codes`/`store_blog_posts`/`product_ai_contents`/`kpa_store_contents`)에 저장된다 — 이 분리는 사용자 철학과 **정확히 일치**한다.
> **템플릿 영속화:** `templateId` 는 `store_execution_assets.sourceMetadata`(산출물 audit)에만 저장되고, **재사용 콘텐츠 테이블엔 미저장** → "템플릿은 산출물 생성 시 적용, 재사용 콘텐츠엔 미포함" 철학과 **일치**.

---

## 3. 대상별 현재 흐름 매트릭스 (6단계)

범례: ● 정합 / ◐ 부분 / ✗ 부재·미정의

| 대상 | ① 대상선택 | ② 자료투입 | ③ 편집·AI | ④ 용도별 콘텐츠 저장 | ⑤ 템플릿 | ⑥ 실사용 산출물 |
|------|:--:|:--:|:--:|------|:--:|------|
| **POP** | ● 공통 modal | ● HUB import·snapshot·direct·library | ● RichText + AiContentModal(pop) | ● **`store_pops`**(재편집, author_role=store) | ● 생성 시 layout/template | ● **PDF → `store_execution_assets`** |
| **QR** | ● 공통 modal | ◐ 직접입력 위주 | ◐ AiContentModal(store_qr) **KPA만 실효** | ● **`store_qr_codes`**(엔티티=콘텐츠+랜딩설정+재편집) | ◐ operator_qr_template | ● 이미지/PDF on-demand |
| **블로그** | ● 공통 modal | ● 직접·HUB import·template starterHtml | ● RichText + AiContentModal(blog) | ● **`store_blog_posts`**(콘텐츠=게시물 **이중 역할**) | ● starterHtml + AI prompt | ● 게시글(같은 테이블, status=published) |
| **상품설명** | ◐ 상품 sidebar(신규진입 제약) | ◐ product_ai_contents 로드·prefill | ● RichText + AiContentModal | ● **`product_ai_contents`**(product_description, 재편집) | ● starterHtml + AI prompt | **✗ 산출물 노출 미정의** (상품 상세 렌더 경로 불명) |
| **사이니지** | ◐ HUB 라이브러리(별도 진입) | ◐ media/playlist 조립(텍스트 편집기 ✗) | **✗ 편집기/AI 없음** | ◐ `store_playlists`(설정/조립, "용도별 콘텐츠" 텍스트 부재) | ◐ operator TemplateLayoutConfig(별 체계) | ● `/public/signage` 재생 |
| **고객 안내문** | **✗ 부재** | ✗ | ✗ | **✗ 전용 저장 없음** | ✗ | ✗ |

---

## 4. 단계별 평가

### 4.1 ④ 용도별 콘텐츠 저장 (가장 중요)

- **POP** — `store_pops`(author_role='store') 에 재편집 콘텐츠 저장. **WO-O4O-POP-SAVE-AS-CONTENT-V1** 로 "POP 콘텐츠로 저장" 신설 → **용도별 콘텐츠 / 산출물(PDF) 분리가 명확히 구현된 유일한 모범**.
- **QR** — `store_qr_codes` 가 콘텐츠(title/desc)+랜딩설정+산출물 source 를 **한 엔티티에 통합**. 재편집은 되나 "콘텐츠 vs 설정" 분리는 없음. 의미상 자연스러운 형태(QR 은 랜딩=콘텐츠).
- **블로그** — `store_blog_posts` 가 **재사용 콘텐츠이자 게시 산출물**(이중 역할). 게시물 자체가 재편집 콘텐츠이므로 철학 위배 아님(템플릿은 렌더 시 적용).
- **상품설명** — `product_ai_contents`(product_description) 에 재편집 콘텐츠 저장 ● 이나 **⑥ 산출물(상품 상세 노출) 경로 미정의** → 꼬리(tail)가 끊김.
- **사이니지** — 텍스트 "용도별 콘텐츠" 개념 부재. media+playlist 조립 패러다임. `store_playlists` 는 설정/산출물에 가까움.
- **안내문** — 저장 위치 자체 부재.

### 4.2 ⑤ 템플릿 적용 시점

- POP/Blog/QR/Desc 모두 **AI 생성 시 systemPromptOverride + starterHtml** 로 적용, **재사용 콘텐츠 테이블엔 templateId 미저장** → 철학 **일치**.
- 사이니지만 operator `TemplateLayoutConfig`(레이아웃 양식)로 **별 체계** — 제작 템플릿 레지스트리와 분리.

### 4.3 ⑥ 실사용 산출물 / `store_execution_assets`

- `store_execution_assets` = **산출물 전용**(generated/uploaded, usageType=pop/qr/signage/banner/notice), 재편집 대상 아님 — 철학 **일치**.
- 상품설명만 산출물 노출 경로 **미정의**, 안내문은 산출물 자체 부재.

---

## 5. 최근 POP/QR 작업과의 정합성 평가

**충돌 없음 — 오히려 철학을 강화함:**

| 최근 작업 | 철학 정합 |
|------|------|
| POP 운영자 발행→HUB→가져오기→사본→제작→PDF | ● 대상별 import = 복사 단절 + 산출물 분리 |
| **POP 콘텐츠로 저장**(`store_pops`, author_role=store) | ● **"용도별 콘텐츠" 재사용 저장 명시 구현** (canonical 모범) |
| POP-QR selector(generate 시 qrId) | ● 템플릿/QR 결합을 **산출물 생성 시점**에 적용 → 철학 일치 |
| QR 편집 폼 parity(PUT) | ● 재편집 콘텐츠 보장 |

→ 최근 작업이 잘못 맞춰진 부분은 없음. 정비 대상은 **아직 canonical 에 도달 못 한 축**(상품설명 산출물·사이니지 패러다임·안내문 부재)과 **서비스 drift**.

---

## 6. 판정 근거 (A/B/C/D/E)

- **B (부분 정합)** — POP/블로그는 6단계 정합, 상품설명은 ④까지·⑥ 미완, 사이니지·안내문은 패러다임 이탈/부재.
- **D (기능별 drift)** — 저장 모델이 대상마다 상이: POP(콘텐츠+산출물 분리) / QR(단일 엔티티 통합) / 블로그(이중 역할) / 상품설명(콘텐츠만·산출물 없음) / 사이니지(조립) / 안내문(없음).
- **E (서비스 drift)** — QR AI(qr_description) KPA만 실효 · 상품설명 derivation tracking KPA만 · 사이니지 탭 KPA(3)>GP(2)>KCos(1) · `productionTemplates.ts` KPA 로컬 vs GP/KCos 공유패키지 경로.
- **NOT C** — 산출물만 저장하는 게 아니라 재사용 콘텐츠 분리가 다수 대상에서 이미 존재.
- **NOT A** — 6대상 전부가 동일 canonical 을 따르지는 않음.

---

## 7. 잘못 만들어진 / 미완 부분 (정비 후보)

1. **상품설명 ⑥ 산출물 미정의** — `product_ai_contents[product_description]` 가 storefront 상품 상세에서 어떻게 노출되는지 경로 불명. "신규 생성" 진입점도 자료함 경유만(블로그와 비대칭).
2. **사이니지 패러다임 이탈** — 제작 골격(StartProductionModal targets)에 미포함, 편집기/AI/제작 템플릿 부재. canonical 에 편입할지 / 별 패러다임으로 명시할지 **미결정**.
3. **고객 안내문 전면 부재** — `STORE-MENU-CANONICAL-TREE-V1` 6항목 중 6번째인데 3서비스 모두 메뉴·페이지·저장·산출물 없음. (operator `/operator/guide-contents` 는 LMS 교육용으로 별개.)
4. **서비스 drift(E)** — QR AI·상품설명 derivation·사이니지 탭·템플릿 레지스트리 경로.
5. **저장 모델 비표준(D)** — "용도별 콘텐츠 저장" 의 공통 계약 부재(대상별 ad-hoc).

---

## 8. 후속 WO 우선순위

| 순위 | WO | 범위 | 근거 |
|:--:|------|------|------|
| **P1** | `WO-O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-DOCUMENTATION-V1` | 6단계 canonical + "용도별 콘텐츠↔산출물" 분리 + "템플릿=산출물 시점" 을 baseline SSOT 로 문서화 (코드 무변경) | 모든 후속 정비의 기준. POP 모범을 표준으로 고정 |
| **P2** | `WO-O4O-PRODUCT-DESCRIPTION-PRODUCTION-FLOW-AUDIT-V1` | 상품설명 ⑥ 산출물(상품 상세 노출) 경로 확정 + 신규 진입점 + derivation parity | 구현된 대상 중 유일하게 꼬리 끊김 |
| **P2** | `WO-O4O-EDITOR-TO-TARGET-CONTENT-SAVE-STANDARD-V1` | "용도별 콘텐츠 저장" 공통 계약(어떤 대상이 어떤 재편집 테이블에) 표준화 | D(저장 모델 drift) 해소 |
| **P3** | `WO-O4O-SIGNAGE-AND-NOTICE-PRODUCTION-FLOW-AUDIT-V1` | 사이니지 canonical 편입 여부 결정 + 고객 안내문 구현/보류 결정 | 패러다임·부재 결정 선행 |
| **P3** | `WO-O4O-QR-FLOW-ALIGNMENT-TO-CANONICAL-V1` (선택) | QR AI(qr_description)·통계 GP/KCos parity, 템플릿 레지스트리 경로 통일 | E(서비스 drift) 잔여 |

> POP/블로그는 이미 canonical 정합이므로 별도 alignment WO 불요 (P1 문서로 모범 사례로 인용).

---

## 9. 무변경 확인

- 코드/DB/마이그레이션/route/UI/공통 컴포넌트/템플릿/AI prompt **변경 0**.
- 조사 문서 1개만 생성 (path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용.

---

*Date: 2026-06-16 · 제작 프로세스 전체 재정립 조사 · 판정 B+D+E · POP=canonical 모범, 최근 POP/QR 작업 철학 충돌 없음 · 정비 대상=상품설명 산출물/사이니지 패러다임/안내문 부재/서비스 drift · 후속 P1 문서화→P2 상품설명·저장표준→P3 사이니지·안내문·QR parity.*
