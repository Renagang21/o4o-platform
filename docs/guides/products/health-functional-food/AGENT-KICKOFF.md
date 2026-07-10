# AGENT KICKOFF — 제품 이미지 → 매장용 설명서 (건강기능식품·일반식품) · DB 저장 배치

> **다른 작업 공간(세션)에서 이 작업을 시작할 때, 이 문서를 맨 처음 읽으세요.**
> 그리고 **예제 문서**([examples/](examples/))와 **진행 원장**([PROCESSED-LEDGER.md](PROCESSED-LEDGER.md))을 함께 확인하세요.
> 규칙 SSOT(R1~R10·R6-a~e)는 [general-food/README.md](../general-food/README.md) — **본 문서는 그 위에 "건기식 + DB 저장 + 자동완주" 실무를 얹은 kickoff**입니다.

---

## 0. 무엇을 하는 작업인가

매대에 놓인 **제품 사진**을 받아 **매장 내(STORE)용 한국어·중국어 설명서**를 만들어 **프로덕션 DB에 저장**한다. 설명서는 **QR로 여는 모바일 화면**이며, 매장 내 전문가 상담 보조 자료다(`descriptionType = STORE`). 저장하면 매장 취급상품 화면에 **QR 1개 → 언어 탭(한국어/中文)**으로 노출된다.

- **저장 목적지 = DB** (`shared_product_descriptions`, STORE canonical, 언어별). **파일(samples/)이 아니다.**
- 대상: 건강기능식품 + 일반식품(기타가공품·혼합음료·기타식물성유지·액상 등).

---

## 1. 작업 순서 (자동 완주 — 중간 승인 없음)

> **2026-07-10 사용자 지시**: 품질이 검증되어 **중간 승인 게이트 생략**. 제품 사진을 주면 아래를 끝까지 자동 진행한다. (초기 general-food README의 "한국어 승인 게이트"는 이 배치에선 waived — 최신 지시 우선.)

1. **이미지 사실 파악** — 제품명·성분(mg/함량)·인증·**분류**·바코드·기능성 문구·용량·원산지·판매채널.
2. **웹 검색 보강** — 제조사·규격·성분 정체성(사실만). **효능/질병 후기·마케팅 과장 채택 금지**(R10).
3. **분류 판정** (§2) → 표현 수위 결정.
4. **존재 가드** (§4) — 이미 만들어졌으면(zh canonical 有) **skip**.
5. **한국어 10단 랜딩 카피** (§5 형식) → **제품 톤 scoped 디자인 fragment**.
6. **중국어 번역·디자인** (현지 톤, 기능성은 `韩国食药处认证` 프레임, CTA=`店内专业人员`).
7. **저장** (§6) — master 등록(바코드 없이) → ko·zh STORE canonical upsert → 검증.
8. 결과 보고 + **[원장](PROCESSED-LEDGER.md) append**.

---

## 2. 분류 판정 (가장 중요한 가드)

박스에 **한국 "건강기능식품" 인증 도안(식약처)**이 있는지로 판정한다.

| 분류 | 판정 근거 | 표현 수위 |
|------|-----------|-----------|
| **건강기능식품** | 건기식 도안 有 | **라벨에 표시된 식약처 인정 기능성만** 박스 문구 그대로 사용(예: 면역기능 개선, 항산화, 장 건강, 식후 혈당 상승 억제, 뼈·치아 형성, 인지력 개선). |
| **일반식품** | 건기식 도안 無 (HACCP·GRAS만, "혼합음료/기타가공품/기타식물성유지" 등) | **효능·건강 주장 전면 금지.** 성분·제법·원료·맛·프리미엄만. 오메가·혈행·관절·피부·재생 등 일절 금지. |

> ⚠️ FDA GRAS·HACCP·특허·해외 인증은 **건기식 기능성 인정이 아니다.** 오직 한국 건기식 도안으로만 판정.

---

## 3. 지뢰 가드 (놓치면 규정 위반)

- **특허 인용 = 효능 아님.** 박스의 "…치료 또는 예방용 약제학적 특허 조성물", "면역 증강용 특허 조성물" 등은 **특허 문구 인용**이라 **제품 효능으로 사용 금지**. 해당 원료는 부원료로만.
- **질병 주장 금지** (건기식이어도): 탈모 완화·개선/방지, 당뇨, 전립선염·비대증, 치매, PDRN 피부재생·상처, 혈전 등 **질병 치료·예방·개선 단정**은 인정 기능성이 아니면 배제. (예: 비오틴=모발·손톱 "형성에 필요"는 OK, "탈모 개선"은 금지.)
- **부원료·균주·복합물은 중립 원료로만** — 효능 붙이지 않음(겨우살이·동충하초·침향·삼백초·희렴·PDRN·프리바이오틱스·유산균사균체 등).
- **라벨에 없는 정보 창작 금지**(R2) — 없는 섭취량·원산지·성분 함량·"매장 전용" 표기는 넣지 않음.
- **CTA 용어 = "매장 내 전문성이 있는 도우미"** (中 `店内专业人员`). "약사" 금지.
- **모바일 폰트(R8)**: 본문 ≥15.5px, 태그 ≥13px, 제목 27px+.
- **CTA 톤**: 꽉 찬 강한 색(경고문 느낌) 금지 — 전체 디자인과 어울리는 연한 톤.

---

## 4. 존재 가드 (중복 방지 — 저장 전 필수)

같은 제품을 R2 스튜디오나 이전 세션이 이미 만들었을 수 있다. **저장 전 반드시 확인**한다.

```
GET /api/v1/neture/products/library/search?q=<상품명>   → 이름 정확일치 master 찾기
GET /api/v1/admin/o4o-product-db/masters/:id/store-descriptions
   → 그 master에 status=canonical & language='zh' 가 있으면 = "이미 만들어진 것" → SKIP(작업 안 함).
```

> **판정 기준: 중국어(zh) canonical이 있으면 완성된 것.** zh 없을 때만 신규 작업. (dedup은 이름+제조사 기준이라, 확인 없이 저장하면 기존 것을 덮어쓸 수 있음 — 이가돌 맥스 사례.)

---

## 5. 콘텐츠 형식 (예제와 동일하게)

**반드시 [examples/lacto-balance-probiotics-zinc.ko.html](examples/lacto-balance-probiotics-zinc.ko.html) / [.zh.html](examples/lacto-balance-probiotics-zinc.zh.html) 형식을 그대로 따른다.**

- **self-contained scoped fragment** — 전체 `<!doctype>` 문서 아님. `<div class="xx-desc">` 래퍼 + 그 안에 `<style>`로 `.xx-desc ...` **고유 class 스코프**(스타일 누수 방지). 저장 시 sanitizer(DOMPurify 기본)가 `<style>`·class·inline style은 **보존**, `<script>`만 제거.
- **번호·편집 라벨 금지**(R6-c): ①②③이나 "왜 이 제품인가는 관심유발 섹션" 같은 편집 문구 금지. 소비자가 읽는 랜딩 카피만.
- **10단 랜딩 구조**(R6-e): 제목줄 → 메타줄 → 히어로 문단 → `왜 이 제품인가` → `핵심 구성`(카드: 이름/짧은 태그/설명) → `이런 분께` → `섭취 안내` → `선물로도, 나를 위해서도` → `믿을 수 있는 구성`(칩) → `구성:` → `매장 상담`.
- **디자인 톤**: 제품 패키지 색을 반영(다크+골드/블루/틸/핑크/펄 등). 중국어는 PingFang 서체 + 현지 톤.
- **성분 풀이(R9)**: 핵심 성분에 중립 한 줄. 건기식은 "식약처가 인정한 기능성 …", 부원료는 효능 없이.

---

## 6. 저장 경로 (API)

**자격증명**: admin = `sohae2100@gmail.com`(neture:admin). 비밀번호는 **SSOT([docs/local/TEST-ACCOUNTS.local.md](../../../local/TEST-ACCOUNTS.local.md))에서 런타임 read** — 로그/코드/커밋에 절대 노출 금지. API host = `o4o-core-api` Cloud Run.

1. **로그인** → `POST /api/v1/auth/login` `{email,password,includeLegacyTokens:true}` → `data.tokens.accessToken`.
2. **master 등록** (바코드 없이) → `POST /api/v1/admin/o4o-product-db/masters` `{name, regulatoryType, specification, originCountry, tags}` → `data.id` (barcode=NULL). 정체성=UUID.
3. **설명서 저장** → `POST /api/v1/admin/o4o-product-db/masters/:id/store-descriptions` `{language:'ko'|'zh', content:<fragment>, summary}` → createCandidate→setCanonical(언어별 canonical 공존).
4. **검증** → `GET .../store-descriptions` → ko·zh 둘 다 `status=canonical` 확인.

> master·설명서 저장은 **프로덕션 write** — 자동 완주 승인은 사용자가 이 배치에 부여함(2026-07-10). 그 외 프로덕션 write는 개별 승인.

---

## 7. 세션 시작 체크리스트

- [ ] 이 문서(§1~6) 읽기
- [ ] [예제 ko/zh](examples/) 읽기 — 형식·톤 기준
- [ ] [진행 원장](PROCESSED-LEDGER.md) 확인 — 커버리지·다음 대상
- [ ] 제품 사진마다: 사실→분류→검색→**존재 가드**→ko 10단→디자인→zh→저장→원장 append

---

## 참조

- 규칙 SSOT: [general-food/README.md](../general-food/README.md) (R1~R10, R6-a~e, §2 구조)
- 제품 단위 설명서: [O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1](../O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md)
- 등록 아키텍처: [IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1](../../../investigations/IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1.md) · 바코드리스 등록 WO
- 스튜디오(반자동화 개발): [WO-O4O-ADMIN-STORE-DESCRIPTION-AUTHORING-STUDIO-V1](../../../work-orders/WO-O4O-ADMIN-STORE-DESCRIPTION-AUTHORING-STUDIO-V1.md)
