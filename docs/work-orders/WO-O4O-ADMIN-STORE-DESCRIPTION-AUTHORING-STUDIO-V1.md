# WO-O4O-ADMIN-STORE-DESCRIPTION-AUTHORING-STUDIO-V1

> **목적**: 지금까지 **수작업(이미지→검색→초안→승인→디자인→다국어→등록·저장)**으로 18종을 처리하며 확립한 매장용 상세설명서 제작 방식을, **관리자에서 반자동으로 수행하는 "스튜디오" 기능**으로 개발한다.
> **범위**: 풀 스튜디오 — 이미지/상품명 입력 → **AI 초안** → **사람 승인 게이트** → 디자인 → 다국어 → master 등록 → STORE 설명서 저장 → 매장 노출.
> **규칙**: R1~R10·R6-a~e는 **SSOT 문서를 링크**하고, 여기에는 **개발 시 강제할 가드만 발췌**한다(중복 관리 금지).
> **성격**: 개발 착수용 스펙(핸드오프). 실제 구현·DB write는 개발 WO 실행 단계에서.
> **날짜**: 2026-07-10 · 근거: 18종 실처리 검증 · 진입: [general-food README](../guides/products/general-food/README.md)

---

## 0. 한 줄 요약

관리자에서 **제품 이미지 한 장 → 매장용 STORE 설명서(한국어 canonical + 중국어 등 다국어) 제작·저장**을 AI 초안 + 필수 승인 게이트로 수행하는 스튜디오. 저장 즉시 매장 취급상품 화면(언어 탭)에 노출된다. **저장 계층·API는 이미 존재**하므로, 이 WO는 그 위에 **저작 UX + AI 연동 + 가드**를 얹는다.

---

## 1. as-is 검증된 워크플로우 (기능 명세의 근거)

18종을 이 순서로 처리했다. 스튜디오는 이 흐름을 UI로 옮긴다.

| 단계 | 내용 | 자동/수동 |
|:---:|------|:---:|
| 1 | **이미지에서 사실 파악** — 제품명·성분(mg)·용량·인증(HACCP/건기식)·분류·바코드·기능성 문구 | AI(비전) |
| 2 | **상품명 웹 검색** — 이미지에 없는 제조사·전체 성분·규격 보강 + **성분 정체성 조사**(R9용) | AI(검색) |
| 3 | **분류 판정** — 건기식 마크 유무로 `건강기능식품 / 일반식품` 판정 → **표현 수위 결정(R1)** | AI + 가드 |
| 4 | **한국어 초안 작성** — R6-e 10단 구조, R1/R6-b/R6-c/R9 준수 | AI |
| 5 | **내용 승인 게이트** — 관리자에게 한국어 "내용"을 텍스트로 보여주고 **승인**. 승인 전 디자인·번역·저장 금지 | **사람(필수)** |
| 6 | **디자인 적용** — 제품 톤 팔레트로 scoped HTML fragment 렌더(R8 폰트) | AI/시스템 |
| 7 | **다국어** — 승인된 한국어 기준으로 중국어 등 번역·디자인 | AI |
| 8 | **master 등록** — 없으면 바코드리스 내부코드로 ProductMaster 생성 | 시스템 |
| 9 | **STORE 설명서 저장** — 언어별 SPD(descriptionType=STORE) canonical upsert | 시스템 |
| 10 | **매장 노출 검증** — b2c-descriptions로 언어 탭 확인 | 시스템 |

> 상세 절차·순서 불변식은 [general-food README 「작업 단계」](../guides/products/general-food/README.md) 참조.

---

## 2. 개발 시 강제할 가드 (SSOT 링크 + 발췌)

규칙 전문은 **SSOT에만** 있다. 아래는 스튜디오가 **코드/UX로 반드시 보장**해야 할 항목만.

| 가드 | 요지 | SSOT |
|------|------|------|
| **분류→표현 수위** | 건기식 마크 없으면 **일반식품 → 효능·질병 주장 전면 금지**. 건기식이면 **라벨에 표시된 승인 기능성만** 사용 | R1 · [README §0/R1](../guides/products/general-food/README.md) |
| **grounding** | 라벨/검증된 사실만. 없는 항목은 생성 금지(placeholder 없이 생략). 검색 성분은 라벨 대조 전 "확인 필요" | R2·R10 |
| **검색 채택 필터** | 사실(성분·제조사·규격)만 채택. **블로그·쇼핑몰의 효능/질병 개선 후기·과장은 반영 금지** | R10 |
| **판매 관심(전 제품군 공통)** | 성분 나열이 아니라 **이점·상황 제안·why**로 구매 관심 유발 | R6-b · [SSOT §4](../guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md) |
| **소비자 문구만** | 편집용 라벨("관심 유발")·매장 근무자용 지시 문구 금지 | R6-c |
| **모바일 랜딩 깊이** | 스크롤형 10단(히어로→스토리→왜→핵심→이런분께→섭취→선물→트러스트→구성→상담). 얇은 요약 금지 | R6-e · [README §2](../guides/products/general-food/README.md) |
| **성분 한 줄 풀이** | 핵심 성분에 중립 "무엇인지" 한 줄. 효능 단정 금지 | R9 |
| **상담 CTA 용어** | "매장 내 전문성이 있는 도우미"(다국어: 中 店内专业人员) | R7 |
| **모바일 폰트** | 본문 ≥15.5px, 태그 ≥13px, 제목 27px+ | R8 |
| **승인 게이트** | **한국어 내용 승인 전 디자인·번역·저장 금지.** 자동 저장 금지 | README 「작업 단계」 |

> ⚠️ 특히 민감: 멜라토닌·매스틱(위)·남성(전립선)·알부민 등은 **일반식품이면 관련 효능·질병 문구 절대 금지**. 박스의 "특허 …치료용 조성물" 같은 문구는 **특허 인용이라 제품 효능으로 사용 금지**.

---

## 3. 재사용할 기존 자산 (이미 구현됨 — 신규 개발 아님)

| 자산 | 위치 | 역할 |
|------|------|------|
| **STORE 설명서 저장 API** | `POST/GET /api/v1/admin/o4o-product-db/masters/:id/store-descriptions` — [product-master-description.controller.ts](../../apps/api-server/src/modules/neture/controllers/product-master-description.controller.ts) | 언어별 STORE canonical upsert(createCandidate→setCanonical). **본 스튜디오의 저장 백엔드** |
| **per-language canonical** | `WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1` | canonical = (master, 'STORE', language). ko·zh 동시 canonical 가능 |
| **master 등록(바코드리스)** | `POST /api/v1/neture/admin/masters/resolve` — [catalog.service.ts `resolveOrCreateMaster`](../../apps/api-server/src/modules/neture/services/catalog.service.ts) / 내부코드 [gtin.ts `generateInternalBarcode`](../../apps/api-server/src/utils/gtin.ts) | 바코드 없으면 GS1 200 대역 내부코드 자동생성. 근거: [WO-...-BARCODELESS](WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md) |
| **관리자 수동 등록 UI** | `POST /api/v1/admin/o4o-product-db/masters` — product-master-create.controller.ts / [ProductMasterCreatePage] | master 신규 등록 화면(존재) |
| **저작 UI 시드** | [ProductMasterDetailPage `StoreDescriptionPanel`](../../apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx) | 이번 세션에 만든 **최소 저작 패널** — 스튜디오의 출발점 |
| **매장 노출(읽기)** | `GET /api/v1/kpa/store-contents/b2c-descriptions?listingId=` — [store-content.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts) | STORE canonical을 매장 모달에서 조회(언어 탭) |
| **저장 스키마** | `shared_product_descriptions` (descriptionType, language, status, content) — [SharedProductDescription.entity.ts](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts) | content=sanitize된 HTML. **본문 조각(fragment)** 저장 |
| **콘텐츠 샘플 18종** | `docs/guides/products/general-food/samples/` | 톤·구조·팔레트 레퍼런스 |

> **결론**: 저장·등록·조회·per-language·sanitize·스키마는 **완비**. 신규 개발은 §5의 **저작 UX + AI 연동 + 가드**에 집중.

---

## 4. AI 생성 경계 (무엇을 AI가, 무엇을 사람이)

- **AI가 생성**: 이미지→사실 추출, 상품명 검색·성분 조사, 분류 판정, 한국어 초안, 다국어 번역, scoped 디자인 fragment.
- **사람(관리자)이 결정**: **한국어 내용 승인 게이트**(필수), 최종 저장 트리거. 디자인 자체는 사람 검토 불필요(자동).
- **자동 저장 금지**: 승인 전 SPD write 금지. 승인 후 시스템이 등록·저장·검증.
- **content 형식**: 매장 모달·QR이 `dangerouslySetInnerHTML`로 렌더 → **self-contained scoped fragment**(전체 `<!doctype>` 문서 금지, 스타일은 고유 class로 스코프해 누수 방지).

---

## 5. 개발 대상 (build)

### 5-A. 관리자 스튜디오 UI (신규)
1. **입력**: 제품 이미지 업로드(+선택 상품명). 
2. **AI 초안 패널**: 추출 사실·분류·한국어 초안(10단)·성분 조사 결과 표시.
3. **승인 게이트 UI**: 한국어 "내용"을 텍스트로 보여주고 **승인/수정 반려**. (승인 전 다음 단계 잠금)
4. **디자인 프리뷰**: 승인 내용→fragment 렌더(모바일 프레임 미리보기).
5. **다국어 탭**: 대상 언어 선택→번역·디자인.
6. **등록·저장**: master 없으면 생성(바코드리스) → 언어별 STORE 저장 → 매장 노출 검증 결과 표시.

### 5-B. 백엔드 (일부 신규 + 기존 재사용)
- 재사용: §3의 저장/등록/조회 API.
- 신규 후보: 이미지→사실 추출(비전) 엔드포인트, 상품명 검색·성분조사 프록시, AI 초안·번역·디자인 렌더 서비스(가드 내장).
- **가드 엔진**: 분류→표현 수위, grounding, 검색 채택 필터, 효능 금지어(일반식품) 검출 → 초안 생성·저장 전 검증.

### 5-C. 콘텐츠·디자인 표준(구현 기준)
- 10단 구조(§2 R6-e), 제품 톤 팔레트(샘플 18종 참조), R8 폰트, scoped fragment.
- 언어별 canonical 저장(ko 기준본 우선, 나머지 언어 추가).

---

## 6. 개발자 판단·미결정 (실행 WO에서 확정)

- **이미지 사실 추출 방식**: 비전 모델 직접 / OCR(`ProductOcrService` 존재) + 파싱 조합 중 택. (OCR 자산: store-ai 모듈)
- **AI 모델·프롬프트**: 초안·번역·디자인 생성 모델과 프롬프트(가드 주입). 프롬프트에 R1~R10 요지 주입.
- **웹검색 연동**: 성분·제조사 보강 검색의 소스·채택 필터 구현.
- **승인 워크플로우 형태**: 단일 관리자 승인 / 검수 큐 여부(운영 정책).
- **디자인 렌더러**: 템플릿(팔레트+10단) 엔진 — 서버 렌더 vs 클라이언트.
- **다국어 대상 언어 셋** 및 언어별 canonical 저장 UX.

---

## 7. 산출물·검증 기준

- 관리자에서 이미지 1장 → 한국어 STORE 저장 → 매장 취급상품 「매장용 상세설명서」에 노출(언어 탭) end-to-end.
- 승인 게이트 없이는 저장 불가(가드 동작).
- 일반식품에 효능/질병 문구 미검출(가드), 건기식은 라벨 기능성만.
- 저장 시 canonical 반영(per-language) 확인.

---

## 8. 참조 문서

- **규칙 SSOT**: [general-food README (R1~R10, R6-a~e, 작업 단계, §2 구조)](../guides/products/general-food/README.md) · [제품 단위 설명서 SSOT §4](../guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md) · [DOCUMENT-INDEX](../guides/common/DOCUMENT-INDEX.md)
- **아키텍처**: [IR 등록 모듈(5 진입점)](../investigations/IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1.md) · [IR 이미지→설명서 시작점](../investigations/IR-O4O-PRODUCT-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1.md) · [바코드리스 등록 WO](WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md)
- **핸드오프**: [general-food AGENT-KICKOFF](../guides/products/general-food/AGENT-KICKOFF.md)
- **샘플 18종**: `docs/guides/products/general-food/samples/`

---

*풀 스튜디오 스펙. 저장·등록·조회·per-language canonical·sanitize·스키마는 기존 완비 → 신규는 저작 UX + AI 연동 + 가드. 규칙은 SSOT 링크·가드만 발췌. 승인 게이트 필수·자동 저장 금지. 실행은 후속 개발 WO.*
