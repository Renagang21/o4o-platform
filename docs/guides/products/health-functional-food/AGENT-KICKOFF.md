# AGENT KICKOFF — 건강기능식품 매장용 설명서 제작 (식약처 기반 · DB 저장)

> **다른 작업 공간(세션/컴퓨터)에서 이 작업을 시작할 때, 이 문서를 맨 처음 읽으세요.**
> 함께 볼 것: **[examples/](examples/)** (정본 형식·반응형 예제) · **[PROCESSED-LEDGER.md](PROCESSED-LEDGER.md)** (처리 원장).
> 규칙 SSOT(R1~R10·R6-a~e)는 [general-food/README.md](../general-food/README.md).

---

## 0. 무엇을 / 어디에

건강기능식품의 **매장 내(STORE)용 상세설명서**를 만들어 **프로덕션 O4O DB에 저장**한다. 설명서는 **QR로 여는 모바일 + 매장 태블릿** 화면(`descriptionType=STORE`), 매장 상담 보조 자료다.

- **저장 = DB** (`shared_product_descriptions`, canonical). 파일 아님.
- **정본 데이터원 = 식약처(MFDS) 정보.** O4O 상품 DB의 기본은 식약처다.
- ⚠️ 사진으로 만든 것(맨파워포텐 등 photo 배치)은 **임시 예제**(문장 예시용, 추후 삭제 예정) — 정본 아님.

---

## 1. 대상 = 식약처 건강기능식품 (핵심)

- 대상 풀 = `product_candidates` 중 `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` (약 41,261건, 공식 데이터).
- 이 후보는 **바코드/SKU 없음**(HOLD)이지만 **설명서 grounding 자료는 풍부**하다 — `raw_payload` 안:
  - `source.PRDUCT` = 공식 상품명 · `source.ENTRPS` = 제조사
  - **`mainFunction` / `source.MAIN_FNCTN` = 식약처 인정 기능성 문구(전문)** ← 가장 중요한 grounding
  - `source.SRV_USE` = 섭취방법 · `source.BASE_STANDARD` = 성분·기준규격(CFU 등) · `source.INTAKE_HINT1` = 주의사항
  - `sourceRowKey='STTEMNT_NO'` = 품목보고번호(공식 식별자)
- **→ 사진 없이도 정확·안전한 건기식 설명서가 가능**하다(인정 기능성이 데이터에 이미 있음).

---

## 2. 파이프라인 (후보 → 검색 → 시판? → 설명서 / SKIP)

```
식약처 HFF 후보 (공식명·제조사·인정기능성·품목번호)
  → ① 상품명 웹 검색
       → 검색 안 됨 = 허가만/시장 퇴출/구제품(대부분)  → SKIP (설명서 안 만듦, 후보 표시)
       → 시판 중  → ② 회사 홈페이지 = 보조 자료(마케팅 앵글·이미지·상세 성분)
                 → ③ master 생성 (바코드리스: 공식명·제조사·regulatoryType='건강기능식품'·품목번호 태그)
                 → ④ STORE 설명서 **ko + en** 작성·저장  → ⑤ B2B 복사(ko+en)
                 → ⑥ 원장 기록
```

- **grounding = 식약처 인정 기능성(mainFunction) 우선**, 웹은 **보조**(시판 확인·마케팅·이미지·상세성분). 웹의 효능/과장은 채택 금지(R10).
- **자료없음 처리**: 상품명 검색이 안 되면 설명서를 만들지 말고 후보에 표시(예: 후보 review_note/status 또는 tag `desc:no-source`)해 재검색 반복을 막는다.

---

## 3. 언어 = **한글 + 영어(ko + en)**

- 건기식 STORE는 **ko + en 우선**. (과거 기본이던 zh 아님 — 2026-07-11 지시.)
- 해외 다국어 서비스 대비. en은 번역이 아니라 **영어권 소비자 톤**으로. 기능성은 `MFDS-recognized` 프레임.

---

## 4. 분류 판정 + 지뢰 가드

> **표현 수위 원칙 (2026-07-11 정정)**: 이전 "질병 주장 금지 — 인정 기능성 아니면 배제" 가드는 상위 지침(README R1·CR-001·CR-003)보다 과하게 좁아 **증상 소구까지 막아 밋밋한 스펙 시트**를 유발했다. 아래로 정정한다. 매장용(STORE)은 매장 내부·전문인 상주·하단 상담 CTA 전제라 **증상·생활 고민을 소구로 쓸 수 있고**(CR-001 "소비자 진입은 증상·용도 축"), 금지는 **세 가지 단정뿐**이다.

| 가드 | 요지 |
|------|------|
| **표현 수위 (STORE 맥락 — 증상·고민 소구 허용)** | 매장 내부·전문인 상주·하단 상담 CTA 전제 → B2C 규제 프레임 미적용(README R1). **소비자 진입은 증상·용도 축**(CR-001). **질병·증상·생활 고민을 소구·맥락으로 쓸 수 있다.** 예: "전립선 건강이 신경 쓰이는 분", "유해산소·피로가 걱정되는 분", "머리숱이 고민인 분". 밋밋한 성분 나열 금지(R6-b). |
| **금지 = 3가지 단정만** | ① **치료·예방·효과 보장** 단정(의약품형, CR-003/AGENT-GUIDE §4): "OO병을 치료·예방·낫게 한다" X. ② **비인정 기능성**을 제품 기능으로 단정(건기식 표시): base 비타민C에 "면역·피로회복" 기능 X. ③ **웹의 "OO병 개선" 마케팅을 사실로 채택**(R10). |
| **기능성 단정 범위** | 제품의 **기능(성) 단정은 식약처 인정 기능성 문구만** — 표시 그대로("~에 필요"/"~에 도움을 줄 수 있음"). *(일반식품이면 기능성 표현 자체 금지 — general-food README.)* |
| **비오틴 예시** | "모발·손톱 형성에 필요"(인정 기능성) O + "머리카락·손톱이 신경 쓰이는 분"(증상 소구) O / "탈모를 개선·치료한다"(치료 단정) **X**. |
| **특허 인용 = 효능 아님** | "…치료·예방용 특허 조성물" 등은 인용이라 제품 효능으로 **사용 금지**(위 ①과 동일 취지). |
| **부원료 중립** | 균주·복합물·전통원료는 (기능) 효능 단정 없이 원료로만. 단 **유래·희소성·프리미엄 스토리는 R6-b로 활용 가능**. |
| **창작 금지(R2)** | 없는 섭취량·원산지·성분 창작 금지. |
| **CTA** | "매장 내 전문성이 있는 도우미"(中 `店内专业人员`, 영 `in-store specialist helper`). |
| **폰트(R8)** | 본문 ≥15.5px, 소제목 크게(예 18px+), 제목 27px+. |
| **CTA 톤** | 경고문 같은 강한 색 금지 — 전체와 어울리는 연한 톤. |

---

## 5. 콘텐츠 형식 — **시맨틱 HTML** (반응형 디자인은 렌더러가 담당)

> **⚠️ 형식 변경 (2026-07-11) — `<style>` 금지.**
> 저장 sanitizer(`sanitize-description-html.util.ts`, DOMPurify 기본)가 **`<style>`을 태그째 제거**한다(검증됨). 그래서 설명서 콘텐츠에는 **`<style>`을 넣지 않는다.** 반응형·색·다크모드는 공용 렌더러 **`ContentRenderer variant="store-description"`**(WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1)가 스코프 CSS로 담당한다. 콘텐츠는 **시맨틱 HTML(아래 `sd-*` 클래스)만** 저장한다 — sanitizer가 시맨틱 태그·class 를 100% 보존한다(검증됨). 과거 `<style>` fragment 예제([examples/byeonenjang-probiotics.responsive.html](examples/byeonenjang-probiotics.responsive.html))는 **더 이상 쓰지 않는다**(참고용 보관).

**[examples/byeonenjang.semantic.html](examples/byeonenjang.semantic.html) 형식을 그대로 따른다.** — class 어휘가 디자인 시스템과의 **계약**이다(임의 class 금지).

**클래스 어휘 (sd-*):**
- `sd-card` (최상위) → `sd-hero`(내부: `<h1>…<small>부제</small></h1>`, `sd-badges > sd-badge`[강조는 `.is-solid`], `sd-meta`) + `sd-body`.
- `sd-body` 내부: `sd-intro`(`<b>` 강조) · `<h2>`(섹션 제목) · `sd-why`/`sd-who`(`<ul><li>`) · `sd-core > sd-item`(`sd-tag`, `<h3>`, `<p>`) · `sd-intake`(`<small>`) · `sd-chips`(`<ul><li>`) · `sd-spec` · `sd-cta`(`sd-cta-k`, `<p>`) · `sd-foot`.

**규칙:**
- **`<style>`·인라인 style·임의 class 금지.** 위 `sd-*` 구조만 맞추면 렌더러가 디자인을 입힌다.
- **반응형은 자동** — 렌더러가 `@container` 로 폰 1열 / 태블릿(640px↑) 2열 / (900px↑) 3열. 저자는 구조만.
- **테마 자동** — 렌더러가 라이트/다크 토큰 제공.
- **번호·편집 라벨 금지**(R6-c). 소비자 랜딩 카피만. **10단 랜딩** 구조(히어로→왜→핵심 구성→이런 분께→섭취→트러스트→구성→상담).
- **카테고리 테마**: 콘텐츠 루트를 `<div class="sd-card sd-theme-red">`처럼 지정하면 렌더러가 accent(홍/골드 등)를 교체한다(general-food §2 "패키지 톤 반영"). 현재 `sd-theme-red`(홍삼·전통보양), `sd-theme-green`(유산균·식물), 미지정=블루(기본). 예제 [examples/hongsam-red-ginseng.semantic.html](examples/hongsam-red-ginseng.semantic.html).
- 그 외 서체·세부 톤은 렌더러 소관 — 저자는 **문구와 구조**에 집중.

> 디자인 시스템 정의: [packages/content-editor `ContentRenderer.tsx`](../../../../packages/content-editor/src/components/ContentRenderer.tsx) `storeDescriptionCss`. 소비 표면(현재 전환됨): KPA `StoreDescriptionViewModal`, Neture `ProductLandingPage`(QR 모바일). 태블릿 키오스크·다국어 랜딩은 후속 전환(혼재 슬롯 구분 필요).

---

## 6. 저장 경로 (API)

**자격증명**: admin `sohae2100@gmail.com`(neture:admin), 비번은 **SSOT([docs/local/TEST-ACCOUNTS.local.md](../../../local/TEST-ACCOUNTS.local.md))에서 런타임 read** — 로그/커밋 노출 금지. host=`o4o-core-api` Cloud Run.

1. 로그인 → `POST /api/v1/auth/login` `{email,password,includeLegacyTokens:true}` → `data.tokens.accessToken`.
2. master 등록(바코드 없이) → `POST /api/v1/admin/o4o-product-db/masters` `{name, regulatoryType:'건강기능식품', specification, originCountry, tags}` → `data.id` (barcode=NULL, 정체성=UUID).
3. 설명서 저장 → `POST /api/v1/admin/o4o-product-db/masters/:id/store-descriptions` `{descriptionType, language, content, summary}`
   - **descriptionType**: `STORE`(기본) / `B2B` / `B2C` / `SUPPLIER_STORE` — type-generic (CHECK-...-MULTILINGUAL-CAPABILITY-V1).
   - canonical = **(master, type, language)당 1개** → STORE·B2B × ko·en·… 공존. B2B 저장이 STORE 무영향.
4. 조회/검증 → `GET .../store-descriptions?descriptionType=STORE|B2B|all`.
5. **B2B 복사**: STORE canonical 내용을 그대로 `descriptionType='B2B'`로 저장(ko+en).

---

## 7. 작업 큐 · 재작업 방지 · 멀티 머신

- **DB가 진실**: master에 `STORE canonical` 있으면 **done**. 작업 큐 = **"건기식 master 중 STORE canonical 없는 것"**(또는 아직 master 안 된 시판 후보).
- **재작업 방지 = 존재 가드**: 저장 전 그 제품에 STORE(특히 목표 언어) 있는지 DB 확인 → 있으면 SKIP.
- **여러 컴퓨터 무혼선**:
  1. **결정론적 분할** — 머신마다 disjoint 그룹(카테고리별, 또는 `id/이름 해시 % N`). 사전 조율 없이 안 겹침.
  2. **DB 존재 가드(안전망)** — 겹쳐도 저장 직전 체크로 중복 방지. 최악이라도 재생성 낭비뿐(canonical은 (master,type,lang)당 1개 = 마지막 것만).
  3. (대규모 시) 정비 화면/큐 테이블 — 지금 규모(건기식 master 15)엔 불필요.
- **그룹 순서(카테고리)**: 유산균/장 → 면역/항산화 → 혈행·기억력 → 뼈·관절·치아 → 눈 → 피부·모발 → 남성·여성 → 에너지.

---

## 8. 알려진 정비 과제 (선행/병행)

- **regulatory_type 표기 불일치**: 같은 개념이 여러 리터럴 — 일반식품 `일반`(15) vs `GENERAL`(4), 건기식 `건강기능식품`(정상) + **인코딩 깨진 1건**(`efbfbd…`, name도 깨짐 = U+FFFD 소실). 작업 큐 필터가 새지 않게 **값 정규화** 필요(DB write=승인).
- **식약처 매칭(사진 제품↔공식 레코드)**: 이름만으론 fuzzy(오프라인 수입은 0매칭 다수). 정확 매칭엔 품목보고번호/제조사가 필요 → 보류.
- **정비 화면(maintenance)**: 규모 커질 때 `/admin/o4o-product-db/maintenance`에 "건기식 STORE 미작성 목록"(읽기전용). 지금은 즉석 쿼리로 충분.

---

## 9. 세션 시작 체크리스트

- [ ] 이 문서 읽기
- [ ] [예제(반응형)](examples/) 읽기 — 형식·톤·`@container` 기준
- [ ] [원장](PROCESSED-LEDGER.md) 확인 — 커버리지·다음 대상·내 그룹
- [ ] 후보/제품마다: (식약처 데이터 확보) → 상품명 검색(시판?) → **SKIP or** ko 설명서(반응형)→디자인→en → master+STORE 저장 → B2B 복사 → 원장 append

---

## 부록. 파일럿 (검증 완료, 2026-07-11)

- **변엔장** (노바렉스 제조, 프로바이오틱스 100억 CFU, 품목보고 200400200082915) — 식약처 `mainFunction`(장 건강) grounding으로 **시맨틱 ko+en** 제작, master `38a9d3e4-56be-4967-aa7b-0cb2d2e6baff` 등록, STORE·B2B ko+en canonical 저장 완료(2026-07-11). **정본 형식 예제 = [examples/byeonenjang.semantic.html](examples/byeonenjang.semantic.html)** (시맨틱 sd-*, `<style>` 없음). 반응형 프리뷰 검증 완료.

## 참조
- 규칙 SSOT: [general-food/README.md](../general-food/README.md) (R1~R10)
- type-generic 저장 API: [CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-MULTILINGUAL-CAPABILITY-V1](../../../checks/CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-MULTILINGUAL-CAPABILITY-V1.md)
- 등록 아키텍처: [IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1](../../../investigations/IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1.md) · 바코드리스 등록 WO
- 정비/후보: [IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1](../../../investigations/IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1.md)
