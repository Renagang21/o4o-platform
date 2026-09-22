# WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1

> **상태**: HANDOFF ONLY — **차단: 유효한 store-owner 테스트 계정**. 계정 확보 전에는 착수하지 않는다. · **접수**: 2026-09-22 · **CHECK**: (실행 후 `docs/checks/CHECK-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1.md`)
> 내 매장 AI First 리팩터링 **5단계(마지막)**. WO1 [`EDITOR-BOUNDARY`](WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md) · WO2 [`EXTERNAL-LLM-CONTENT-AUTHORING`](WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md) · WO3 [`PRODUCTION-EXTERNAL-LLM-REALIGNMENT`](WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md) · WO4 [`INTERNAL-AI-RETIREMENT`](WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md) 가 남긴 **브라우저 smoke PENDING_USER_VERIFICATION 을 일괄 실측**해 트랙을 닫는다. 새 기능·리팩터링은 하지 않는다.

## 0. 현재 상태 (접수 시점)

| WO | 코드 | 판정 | 남은 것 |
|---|---|---|---|
| WO1 | `c996691c0` 외 | COMPLETE_WITH_SMOKE_PENDING | 브라우저 smoke |
| WO2 | `5a91a3970` | COMPLETE_WITH_SMOKE_PENDING | 브라우저 smoke |
| WO3 | `3a41a04fe` | COMPLETE_WITH_SMOKE_PENDING | 브라우저 smoke |
| WO4 | `366e5965b` · `e1cc661ee` | COMPLETE_WITH_SMOKE_PENDING | 브라우저 smoke |

코드·계약·빌드·배포·bundle·운영 API(`/api/ai/qr-description` 404 · `/api/ai/content` 401)는 이미 검증됐다. 2026-09-22 최신 main(`3960af039`) 재실행: api-server 4 spec **202/202** · store-ui-core vitest **125/125** PASS(회귀 0).

## 1. 선행 조건 (차단 해소 전 착수 금지)

로그인 가능한 **store-owner(매장 경영자) 계정**이 필요하다. 현재 불가 사유:

- `docs/local/TEST-ACCOUNTS.local.md` §7 내 매장 smoke 전용 계정 2개 = `suspended`(smoke 종료 후 비활성화, 2026-08-13).
- `renagang21` = Google-only 계정(`users.password` NULL) → 폼 로그인 불가.
- WO1 CHECK 실측: store-owner 계정 KPA·PH `401 INVALID_USER`, 보조 계정 KPA `403` lockout. 이후 users reset 으로 테스트 계정 0.

해소 경로(사용자 선택):

```text
(a) §7 smoke 계정 재활성화 + L2 service_credential 재발급 (승인 필요 — write)
(b) 새 store-owner 테스트 계정 생성 + 매장 org 멤버십 부여 (승인 필요 — write)
(c) 사용자가 직접 로그인한 브라우저에서 §3 스크립트를 수행하고 결과를 전달
```

**계정 write(생성·재활성화·권한 부여)는 중지 조건**이다. 사용자 명시 승인 없이 수행하지 않는다. 로그인 재시도도 lockout 위험 때문에 승인 전 금지.

## 2. 범위

- **한다**: WO1~4 가 만든 Store 제작 흐름의 브라우저 실측 · 저장 결과 read-only 확인 · 4개 CHECK 의 smoke 열 갱신 · 트랙 종결 선언.
- **하지 않는다**: 코드 수정(실측 중 발견한 버그는 보고 후 별도 WO) · auth 수정 · 범위 ②(`content-editor` 공통 AI 처분) · 데이터 정리 · 스키마 rename.
- 실측 중 **회귀가 발견되면** 해당 항목만 FAIL 로 기록하고 원인·재현 절차를 CHECK 에 남긴 뒤 수정은 별도 WO 로 분리한다.

## 3. Smoke 스크립트 (그룹 5 + 경계 3)

공통 원칙: **저장까지 실제로 수행**하고 재조회로 확인한다(원복 금지). toast + API 응답을 함께 본다. 콘솔 0 만으로 PASS 로 적지 않는다.

### 3-1 BLOG

```text
KPA  /store/content/blog → 글쓰기
KCos /store/content/blog → 글쓰기
PH   /store-owner/blog → 새 글
```

1. 편집기 툴바에 내부 AI 버튼 없음(WO1)
2. `[ChatGPT로 작업]` 노출 → "작업 안내 복사" → 클립보드에 `h1 은 사용하지 마세요` · `[결과 조건]` 포함(WO3 blog task)
3. 임의 HTML 붙여넣기 → "편집기에 넣기" → 본문 즉시 반영
4. 제목 입력 → 저장 → 목록 재조회 시 본문 = 붙여넣은 HTML

### 3-2 POP

```text
KPA  /store/pop (사본 수정)
KCos /store/pop/staff
PH   /store-owner/pop
```

1~4 동일. 안내문에 `짧은 포인트 2~5개` · `POP 디자인·PDF 는 O4O 가 만듭니다` 포함. 저장 후 **POP V2 출력(PDF)** 경로 회귀 없음도 1회 확인.

### 3-3 상품 설명

```text
KPA  /store/commerce/product-descriptions · /store/commerce/local-products(등록 모달)
KCos 상품 설명
PH   /store-owner/product-descriptions
```

안내문에 `제품명만 보고 성분·효능·원산지 등을 추측해 쓰지 마세요` 포함. 저장 → 다른 상품 선택 → 재선택 시 내용 유지.

### 3-4 다국어

```text
KPA /store/products/multilingual/:kind/:id
PH  /store-owner/products/multilingual/:kind/:id
```

1. 한국어 본문이 있는 상품에서 English 탭 진입
2. `[ChatGPT로 작업]` → 안내문에 `기준 본문 언어: 한국어` · `English 로만 작성하세요` · `[기준 본문 HTML — 한국어]` 포함
3. 결과 적용 → **자동 저장·자동 발행 없음** 확인(상태 배지 '초안' 유지)
4. "임시 저장" 클릭 → 재조회 유지

### 3-5 QR (WO4 은퇴 확인 포함)

```text
KPA /store/marketing/qr/ai-description
```

1. **"AI로 설명 만들기" · "AI 다시 만들기" 버튼 부재**(WO4)
2. 상품명 입력 전에는 안내 문구, 입력 후 `[ChatGPT로 작업]` 노출
3. 안내문에 `QR 주소·slug·링크는 만들지 마세요` 포함
4. 결과 적용 → 제목·slug 확인 → "콘텐츠로 저장하고 QR 만들기"
5. 공개 `/qr/:slug` 랜딩 정상 렌더
6. 코너 모드 1회: 항목 2개 입력 → 결과 적용 → 저장 → 랜딩 확인
7. **기존 legacy QR 콘텐츠**(Gemini 시절, `aiDescription.items[].descriptionHtml` 보유) 편집 진입 → 화면 오류 없음 · 상품별 설명 읽기 전용 미리보기 표시

### 3-6 경계 확인 3

```text
E1 자료함 → 제작 시작 → 각 유형 진입(WO2/WO3 Source Context 전달)
E2 태블릿 Screen Set 코너 편집기 LlmAssistPanel 회귀 없음(string guideText 소비처)
E3 Community 글쓰기(/content/documents/new) 편집기 내부 AI 정상 동작 — 비-Store 불변(WO4 §E)
```

## 4. 저장 결과 read-only 확인 (승인된 채널)

브라우저 smoke 후 운영 DB **SELECT 만**:

```text
QR 신규 저장 콘텐츠 content_json 에 generatedBy 키 부재 (WO4 R6)
                               aiDescription.mode 존재 (목록/필터 SSOT)
블로그·POP·상품설명·다국어 저장 row 의 본문 = 붙여넣은 HTML
```

UPDATE/DELETE/DDL 금지. 민감정보 마스킹. 접속 절차는 `SETUP.md`.

## 5. 완료 기준

```text
STORE_BLOG_SMOKE=PASS
STORE_POP_SMOKE=PASS
STORE_PRODUCT_DESCRIPTION_SMOKE=PASS
STORE_MULTILINGUAL_SMOKE=PASS
STORE_QR_SMOKE=PASS

STORE_INTERNAL_AI_VISIBLE=0          (편집기 툴바·페이지 어디에도 내부 AI 진입점 없음)
QR_LEGACY_GENERATE_BUTTON=0
AUTO_SAVE_FROM_LLM=0 · AUTO_PUBLISH_FROM_LLM=0 · AUTO_QR_CREATE_FROM_LLM=0
QR_NEW_ROW_GENERATED_BY=0
LEGACY_QR_CONTENT_EDIT_REGRESSION=0
NON_STORE_AI_REGRESSION=0
TABLET_LLM_ASSIST_REGRESSION=0
POP_V2_PDF_REGRESSION=0
```

전부 PASS 시 WO1~4 CHECK 의 smoke 열을 PASS 로 갱신하고 각 판정을 `COMPLETE` 로 올린다(본 WO CHECK 에서 일괄, 원문 결론은 바꾸지 않고 smoke 행만 갱신 + 근거 링크).

## 6. 산출물

```text
docs/checks/CHECK-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1.md   (신규)
WO1~4 CHECK 의 smoke 행 갱신 (4 파일 · 최소 diff)
```

코드 변경 0 이 기본. path-specific stage/commit. 다른 세션 WIP 불가침.

## 7. 후속 (본 WO 범위 외)

- 범위 ② `content-editor` 공통 AI(`AiContentModal` · `/api/ai/content` · `StoreUseModal`) 처분 — non-Store 소비자 census 선행.
- `aiDescription` 스키마 이름 · `/store/marketing/qr/ai-description` route 명 · `tags=['AI 설명']` 라벨 정리.
