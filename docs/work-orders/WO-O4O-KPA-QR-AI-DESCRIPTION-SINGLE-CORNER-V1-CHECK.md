# WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1 — 완료 보고 (CHECK)

> KPA 매장 QR 전용 AI 설명 생성(단일 상품 / 코너·다품목). 실시간 소비자 질문·태블릿 연계는 후속 WO.

상태: **완료 · 라이브 smoke PASS** (단일 + 코너 E2E, 공개 렌더, 목록 식별, Gemini 0 호출)

---

## 1. 데이터 계약 (신규 테이블/컬럼 없음)

매장 direct 콘텐츠(`kpa_store_contents`, `source_type='direct'`)의 `content_json` 에 additive 저장:

```jsonc
{
  "html": "<section>...</section>",          // 본문 SSOT (단일=상품 소개 / 코너=코너 소개)
  "generatedBy": "gemini-qr-description",
  "aiDescription": {
    "version": 1,
    "mode": "single | corner",
    "productName": "...",                      // single
    "cornerName": "...",                       // corner
    "emphasis": "...",
    "items": [                                 // corner 전용
      { "key": "<입력 key>", "name": "...", "emphasis": "...",
        "descriptionHtml": "<p>...</p>", "relatedKeys": ["<같은 코너 key>"] }
    ],
    "model": "gemini-2.5-flash",
    "generatedBy": "gemini-qr-description"
  }
}
```

- `tags: ['AI 설명']` 동봉 → 목록 'AI 설명' 탭/배지 식별에 재사용.
- `items[].key` 는 등록 상품 UUID 가 아니라 콘텐츠 내부 식별값(프론트 생성). 서버가 입력 key 화이트리스트로 검증·제거.
- 편집 저장(`PUT /store-contents/direct/:id`)은 기존 `content_json` 키를 보존(`...content.contentJson`)하므로 `aiDescription` metadata 유지.

## 2. 백엔드

| 변경 | 파일 |
|---|---|
| QR 설명 prompt(단일/코너, COMMON_SYSTEM_RULES + 효능 단정/진단 단언 금지 guardrail, item key 검증) | `apps/api-server/src/services/ai-prompts/qrDescription.ts` (신규) |
| `POST /api/ai/qr-description` — `aiProxyService.generateEditingRawContent(surface='qr')` 재사용, detectUsageConditions 적용 | `apps/api-server/src/routes/ai-proxy.routes.ts` |
| 공개 landing resolver: direct `content_json.aiDescription.items` → `pageContent.items`(저장본만, 스캔 시 AI 호출 0) | `store-qr-landing.controller.ts` |
| QR 목록: `aiDescriptionMode`(연결 direct content LEFT JOIN, `dc.id::text = qr.landing_target_id`) | `store-qr-landing.controller.ts` |

별도 Gemini URL/API key 직접 호출 없음. QR 전용 AI는 기존 provider abstraction 만 사용.

## 3. 프론트엔드

| 변경 | 파일 |
|---|---|
| AI 설명 생성 페이지(단일/코너 토글, 코너 항목 추가/삭제, 생성→RichTextEditor 확인·수정→direct 저장→QR 생성, 콘텐츠 저장 후 QR 실패 재시도) | `StoreQrAiDescriptionPage.tsx` (신규) |
| QR 목록 헤더 'AI 설명 QR 만들기' 진입 + 행 'AI 설명/·코너' 배지 | `StoreQRPage.tsx` |
| 콘텐츠 목록 출처 탭 'AI 설명'(tag 필터 재사용) + 행 'AI 설명' 배지 | `StoreContentsSelector.tsx` |
| 공개 QR 페이지 코너 아코디언(상품명 토글→저장 descriptionHtml, relatedKeys=같은 코너 이름) | `QrLandingPage.tsx` |
| 라우트 `marketing/qr/ai-description` | `App.tsx` |
| `QrPublicItem` / `aiDescriptionMode` 타입 | `api/storeQr.ts` |

## 4. QR 계약 (변경 없음)

- AI 설명 QR = 기존 `landingType='page'`, `landingTargetId=직접콘텐츠 id`. 신규 landingType 없음.
- content_hub 사본 가드(`ensureStoreCopyForPageTarget`)는 direct content(=kpa_contents 원본 아님)에 영향 없음.
- 공개 스캔 시 저장된 콘텐츠만 렌더 — Gemini 호출 0 (smoke 네트워크로 확인).

## 5. Smoke (renagang21 / 테스트 약국 매장, 라이브)

| 검증 | 결과 |
|---|---|
| 단일: 종합비타민 골드 생성→저장→QR(qr-mqypu1b4)→공개 렌더 | PASS (효능 단정 없음) |
| 코너: 환절기 면역 코너(비타민C 1000/아연 미네랄) 생성→저장→QR(qr-mqypx7z1) | PASS (입력 항목만 설명) |
| 공개 코너 아코디언 펼침 + "함께 보기: 아연 미네랄"(relatedKeys) | PASS |
| 공개 스캔 네트워크 = `/qr/public/:slug` 만 (Gemini 0) | PASS (단일·코너) |
| 콘텐츠 목록 'AI 설명' 탭 필터 = 2건 + 행 배지 | PASS |
| QR 목록 'AI 설명' / 'AI 설명·코너' 배지 | PASS |
| 비-UUID landing_target_id(/qr/type-3 등) 포함 9건 목록 정상 | PASS (uuid 캐스트 핫픽스 후) |

## 6. 함정/수정

- **QR 목록 쿼리 깨짐**: `aiDescriptionMode` JOIN 을 `dc.id(uuid)=qr.landing_target_id(varchar)` 로 두어 링크 QR(비-UUID)에서 `invalid input syntax for type uuid` → 목록 전체 실패. `dc.id::text = qr.landing_target_id` 로 수정(2cebe4653).
- **publicUrl 호스트**: 공개 QR 페이지는 웹 호스트(/qr/:slug)인데 API 호스트로 링크 → `window.location.origin` 으로 정정.

## 7. 후속(이번 WO 범위 외)

- QR 행 '구성 편집'(코너 items 본문 수정 전용 UI), 'AI 다시 만들기' 진입(현재는 신규 생성 페이지에서 재생성). 내용 편집은 연결 direct 콘텐츠 편집(`/store/content/direct/:id?edit=1`)으로 가능.
- QR 목록 'AI 설명' 필터 탭(현재 배지만).
- 실시간 소비자 질문·코너 선택형 연관 상품 응답, 태블릿 연계.

## 8. 커밋

`45300cecf`(공통 기반) · `e17e5078f`(단일) · `3f14865a4`(코너+공개) · `393e4100e`(목록 식별+publicUrl) · `2cebe4653`(QR 목록 핫픽스)

---

## 9. 관리 closure (재개 — additive, 핵심 E2E 미회귀)

핵심 생성·공개는 PASS였으나 "QR 목록에서 이해하기 쉽게 수정" 관리 UX 가 미완 → 같은 WO 재개로 보완. 커밋 `9f6f35b6f`.

| # | 항목 | 구현 | smoke |
|---|------|------|-------|
| 1 | QR 목록 필터 탭 | StoreQRPage 전체/콘텐츠 연결/AI 설명(count) — client filter(aiDescriptionMode) | 전체9/콘텐츠7/AI 2, 필터 OK |
| 2 | AI QR 행 액션 | 내용 수정(연결 direct `?edit=1`) / AI 입력·다시 만들기(`?content=&qr=`) / QR 설정 모달 | 표시·이동 OK, 일반 QR=설정만 |
| 3 | 생성·재생성 입력 편집 | 생성 후 `disabled` 제거(강조점·items 편집) → 'AI 다시 만들기' 새 초안(저장 전 기존 불변) | 강조점 변경→재생성 OK |
| 4 | edit 모드 | `?content=` GET prefill → PUT 갱신(같은 id). 신규 QR 생성 없음 → QR id/slug/landingTarget 유지 | 저장 후 공개=동일 slug 갱신 반영 |
| 5 | 취소 원본 불변 | 재생성은 로컬 draft 만, PUT 은 '수정 저장' 클릭 시에만 | 미저장 이탈→공개 저장본 유지 |
| 6 | QR 설정 | 모달(제목·slug·상담 CTA) → `updateStoreQrCode` PUT | 제목 변경 저장, slug·배지 유지 |
| 7 | 분류 SSOT | `content_json.aiDescription.mode` (feed `ai_mode` 컬럼/필터 `source='ai-description'`). 태그는 보조 | 콘텐츠 배지 'AI 설명·단일/·코너', 탭 2건 |
| 8 | generatedAt | AI endpoint aiDescription.generatedAt(신규·재생성) | edit reload 영속 확인 |
| 9 | 코너 미리보기 | `dangerouslySetInnerHTML` 제거 → `ContentRenderer` | 코너 공개 아코디언 ContentRenderer |
| 10 | 안내문 일치 | "구성 편집" 문구 → 실제 'AI 다시 만들기' 진입 안내로 교체 | — |

### closure 함정
- **QR 목록 쿼리 재깨짐 위험**: aiDescriptionMode JOIN 은 §6(2cebe4653)에서 `dc.id::text = qr.landing_target_id` 로 이미 안전. 본 closure 는 consultation 필드만 SELECT 추가(영향 없음, 9건 정상 로드 재확인).
