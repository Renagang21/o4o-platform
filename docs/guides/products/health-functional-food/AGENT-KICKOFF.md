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

| 가드 | 요지 |
|------|------|
| **분류** | 건강기능식품 = **라벨/식약처 인정 기능성만** 그대로 사용. (일반식품이면 효능 전면 금지 — general-food README) |
| **특허 인용 = 효능 아님** | "…치료·예방용 특허 조성물", "면역 증강 특허 조성물" 등은 인용이라 제품 효능으로 **사용 금지**. |
| **질병 주장 금지** | 인정 기능성이 아니면 배제(탈모 완화·당뇨·전립선·PDRN 재생 등). 비오틴=모발·손톱 "형성에 필요" O, "탈모 개선" X. |
| **부원료 중립** | 균주·복합물·전통원료는 효능 없이 원료로만. |
| **창작 금지(R2)** | 없는 섭취량·원산지·성분 창작 금지. |
| **CTA** | "매장 내 전문성이 있는 도우미"(中 `店内专业人员`, 영 `in-store specialist helper`). |
| **폰트(R8)** | 본문 ≥15.5px, 소제목 크게(예 18px+), 제목 27px+. |
| **CTA 톤** | 경고문 같은 강한 색 금지 — 전체와 어울리는 연한 톤. |

---

## 5. 콘텐츠 형식 + **반응형 디자인**

**[examples/byeonenjang-probiotics.responsive.html](examples/byeonenjang-probiotics.responsive.html) 형식을 그대로 따른다.**

- **self-contained scoped fragment** — `<div class="xx-desc">` + 그 안에 `<style>`로 `.xx-desc …` 고유 class 스코프. 저장 시 sanitizer(DOMPurify 기본)가 `<style>`·class·inline style **보존**, `<script>`만 제거.
- **번호·편집 라벨 금지**(R6-c). 소비자 랜딩 카피만. **10단 랜딩**(히어로→왜→핵심 구성 카드→이런 분께→섭취 안내→선물→트러스트→구성→상담).
- **반응형 필수 — `@container` 컨테이너 쿼리**: 설명서는 폰 모달·매장 태블릿 등 폭이 다른 컨테이너에 삽입되므로 **뷰포트가 아니라 자기 컨테이너 폭**에 반응해야 한다.
  - `.xx-desc{container-type:inline-size}` → `@container (min-width:640px){…}` 로 태블릿에서 **핵심 구성 2열·리스트 2열·타입 확대**, `(min-width:900px)` 3열.
  - 좁으면 1열(폰), 넓게 주면 2~3열(태블릿) — 같은 fragment 하나로 폰·태블릿 대응.
- **테마**: 토큰(`:root` custom props) + `@media (prefers-color-scheme:dark)` + `:root[data-theme]` 로 라이트/다크 둘 다.
- **디자인 톤**: 카테고리/제품 색 반영(유산균=블루 등). 소제목은 작지 않게(18px 볼드 + 강조바). 중국어/영어는 현지 톤·서체.

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

- **변엔장** (제월당/노바렉스 제조, 프로바이오틱스 100억 CFU) — 식약처 `mainFunction`(장 건강) + 웹(시판·제월당·30포)로 ko 설명서 제작, 반응형 렌더 검증. 정본 형식 예제 = [examples/byeonenjang-probiotics.responsive.html](examples/byeonenjang-probiotics.responsive.html).

## 참조
- 규칙 SSOT: [general-food/README.md](../general-food/README.md) (R1~R10)
- type-generic 저장 API: [CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-MULTILINGUAL-CAPABILITY-V1](../../../checks/CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-MULTILINGUAL-CAPABILITY-V1.md)
- 등록 아키텍처: [IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1](../../../investigations/IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1.md) · 바코드리스 등록 WO
- 정비/후보: [IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1](../../../investigations/IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1.md)
