# IR-O4O-KPA-QR-MULTILINGUAL-LANGUAGE-OPTION-AUDIT-V1

> 조사: QR 공개 랜딩의 다국어 언어 선택 노출 정책 현황 (read-only, 코드 변경 없음)
> 대상 URL: https://kpa-society.co.kr/qr/:slug
> 일자: 2026-06-25 / 범위: KPA, page 타입 QR 중심 (video 타입 미대상)

---

## 0. 한 줄 결론

**원하시는 정책("하나의 QR + 실제 본문 있는 언어만 노출 + 단일 언어면 바로 표시 + 없는 lang fallback")은 이미 별도의 다국어 시스템(`store_multilingual_product_content_*`)에 완벽히 구현되어 있습니다.** 다만 그 시스템은 **자체 publicKey URL** 로만 열리고, **QR 랜딩(`landingType=page`)에는 연결되어 있지 않습니다.** QR page 랜딩이 가리키는 `kpa_contents`(콘텐츠 허브)는 **단일 언어 전용**(다국어 필드 없음)이라 그 경로에는 언어 선택 개념 자체가 없습니다.

→ 즉 "전혀 없음"이 아니라 **"정책은 이미 구현됨, 단 QR 진입과 미연결"** 상태입니다.

---

## 1. 현재 구조 요약

### 1-1. QR 공개 API — `/api/v1/kpa/qr/public/:slug`
`apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
- `landingType='page'` 이면 `kpa_contents` 를 **id 참조형(live 조회)** 으로 inline 렌더 (line 182-223):
  ```sql
  SELECT title, summary, body, blocks, status FROM kpa_contents WHERE id=$1 AND is_deleted=false
  ```
  → 응답 `pageContent = { available, title, summary, body, blocks, source:'content_hub' }`
- **`?lang=` 쿼리 파라미터 처리 없음.** 언어 분기 로직 없음.
- 응답 payload(`QrLandingData`)에 **언어/다국어 필드 없음** (단일 body/blocks).

### 1-2. QR 공개 랜딩 frontend — `QrLandingPage`
`services/web-kpa-society/src/pages/qr/QrLandingPage.tsx`
- page 타입(line 137-173): `pageContent.body` → `ContentRenderer`, 없으면 `blocks` → `BlockRenderer`.
- **언어 선택 UI 전무.** 단일 본문만 렌더.

### 1-3. kpa_contents 데이터 구조 (QR page 대상)
`apps/api-server/src/routes/kpa/entities/kpa-content.entity.ts` + migration `20260422300000-KpaContentHubCommunity.ts`
- 본문: 단일 `body TEXT` + `blocks JSONB`.
- **다국어 필드 없음** — `translations` / `localized_bodies` / `language` / `locale` / `body_ko·zh·en` 전부 **없음**.

### 1-4. store_qr_codes 스키마
`apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts`
- `lang` / `locale` / `language` 컬럼 **없음**. **언어별 QR 분리 개념 없음** (= "하나의 QR" 정책과 부합).

### 1-5. 별도 다국어 시스템 (이미 완성)
`store_multilingual_product_content_groups` / `store_multilingual_product_content_pages`
(+ operator 원본 한 쌍). locale = `ko|en|zh|ja|vi|th|id`, page 행 단위 언어별 본문, `status`(draft/published/archived).
- 공개 엔드포인트: `/api/v1/kpa/public/multilingual-product-contents/:publicKey?locale=`
  (`multilingual-product-content.controller.ts:188-265`)
  - **published locale 만** 조회: `WHERE group_id=$1 AND status='published'` (line 220)
  - 응답에 `availableLocales`(published 인 locale 목록) + fallback 메타 제공.
  - fallback 우선순위: 요청 locale → en → defaultLocale → ko (`pickFallbackPage`, line 148-160).
- 공개 랜딩 컴포넌트: `services/web-kpa-society/src/pages/public/MultilingualProductPublicLandingPage.tsx`
  - 언어 탭은 **`availableLocales.length > 1` 일 때만** 노출 (line 231-250) → 단일 언어면 탭 없이 바로 본문.
  - 없는 언어 요청 시 fallback + "요청하신 언어 콘텐츠가 없어 다른 언어로 표시합니다" 안내.
- **QR 와 미연결**: 이 시스템은 자체 `publicKey` URL 로만 진입. product 타입 QR(`landingType=product`)은
  `supplier_product_offers` 단일만 조회(다국어 미참조).

---

## 2. 현재 동작 판정

> 두 경로를 분리해 판정. **(A) QR page 랜딩(kpa_contents)** = 사용자가 조사 요청한 경로 / **(B) 다국어 product content 시스템** = 정책이 이미 구현된 곳.

| 항목 | (A) QR page 랜딩 | (B) 다국어 시스템 | 종합 판정 |
|---|---|---|---|
| 언어 선택 UI 존재 | 아니오 (단일 본문) | 예 (언어 탭) | **부분** — 정책 구현체는 있으나 QR 미연결 |
| 실제 본문 있는 언어만 노출 | N/A (다국어 없음) | 예 (published locale만) | **PASS (B)** |
| 단일 언어일 때 바로 표시 | 예 (단일 body 직출력) | 예 (탭 >1 일 때만) | **PASS** |
| 없는 `?lang` fallback | 미지원(lang 무시) | 예 (요청→en→default→ko) | **PASS (B) / N/A (A)** |
| QR 언어별 분리 의존성 | 없음 | 없음 | **PASS** (하나의 QR 정책 부합) |

**해석:**
- 정책 자체(본문 있는 언어만, 단일이면 바로, 없는 언어 미노출, 안전한 fallback, 언어별 QR 불필요)는
  **(B) 다국어 시스템에서 이미 100% 충족.** Q1~Q5 기준으로 (B)는 전부 PASS.
- 단, 사용자가 말한 "QR 로 여는 제품 설명 콘텐츠가 다국어"가 실현되려면 **QR → (B) 연결**이 필요.
  현재는 QR page 가 (A) 단일 언어 `kpa_contents` 만 연다.

---

## 3. 수정 필요 시 최소 수정안 (구현하지 않음 — 제안만)

다국어 본문이 이미 (B) 에 잘 모델링·렌더되므로, **kpa_contents 를 다국어로 확장하지 말 것**(스키마/마이그레이션 大공사, 정책 구현체 중복). 대신 **QR 을 (B) 공개 랜딩에 연결**하는 것이 최소·정합.

### 권장: 안 1 — QR `landingType='link'` 로 다국어 publicKey 연결 (백엔드 변경 0)
- QR 생성 시 대상으로 "다국어 제품 콘텐츠 그룹"을 고르면, 그 그룹의 publicKey 를 발급
  (`POST /pharmacy/multilingual-product-contents/:groupId/public-key` — **이미 존재**)하고,
  `landingType='link'`, `landingTargetId = ${origin}/multilingual-products/:publicKey` 로 저장.
- 스캔 시 기존 `MultilingualProductPublicLandingPage` 가 그대로 열려 **언어 탭/본문-있는-언어-노출/fallback 전부 자동 충족.**
- **수정 대상:** frontend 만 — QR 선택 모달(`QrTargetSelectorModal`/`StoreAssetSelectorModal`)에 "다국어 제품 콘텐츠" 소스 탭 추가 + publicKey 발급 호출.
- **backend payload 보강:** 불필요 (link 타입 + 기존 public 엔드포인트 재사용).
- **DB migration:** 불필요.
- **기존 QR/콘텐츠 영향:** 없음 (신규 소스 탭만 추가, 기존 page/link/video 경로 불변).
- **단점:** QR 랜딩 카드 UI 가 아닌 다국어 전용 랜딩으로 이동(별 URL). "QR=연결 대상 저장" 철학과는 부합.

### 대안: 안 2 — QR page 랜딩이 다국어 그룹을 inline 해석 (백엔드 소폭 보강)
- `landingTargetId` 가 다국어 그룹을 가리키면(예: 별도 식별자/landingType='mlc'),
  `/qr/public/:slug` 가 `availableLocales` + 요청 locale page 를 내려주고, `QrLandingPage` 가 언어 탭 렌더.
- `?lang=` 처리도 이때 추가. fallback 로직은 (B) `pickFallbackPage` 재사용.
- **수정 대상:** backend(store-qr-landing.controller payload 확장 + lang 처리) + frontend(QrLandingPage 언어 탭).
- **migration:** 불필요(참조형). 단 QR↔그룹 식별 방법 설계 필요.
- **장점:** QR 랜딩 카드 UI 통일. **단점:** 안 1 보다 코드량 큼(중복 렌더 로직 생길 수 있음).

> 권장 순서: **안 1 우선**(거의 프론트만, 완성된 (B) 재사용) → 카드형 통일이 꼭 필요하면 안 2 검토.
> kpa_contents 다국어화(안 3)는 **비권장**(정책 구현체 중복 + 대규모 스키마 변경).

---

## 4. "가져오기=복사" / 원본 영향 (부가 확인)

- QR `landingType=page` 는 `kpa_contents.id` **참조형(live 조회)** — 사본 아님.
  → 운영자 원본 수정은 즉시 반영, 삭제/비발행 시 QR 랜딩이 `available:false`(미발행) 또는 미해석으로 빠짐.
  "가져오기=복사" 원칙과 별개로 QR 은 "연결 대상 저장"이라 충돌 없음.
- (B) 다국어 시스템은 operator 원본 ↔ store 사본을 **별도 테이블로 분리 복사** 보존(사본 독립).
  안 1 채택 시 매장 사본 그룹의 publicKey 를 연결하므로 "복사" 원칙과 정합.

---

## 5. 권장 smoke 시나리오 (수정 진행 시)

1. 한국어 본문만 → 언어 선택 없이 한국어 바로 표시
2. 한국어 + 중국어 → 한/중 선택지 표시
3. 한국어 + 중국어(영어 없음) → 영어 선택지 미표시
4. `?locale=zh` + 중국어 있음 → 중국어 우선 표시
5. `?locale=zh` + 중국어 없음 → 기본 언어 fallback + 중국어 선택지 미표시 + 안내문

> (B) 다국어 시스템은 위 1~5 를 현재도 충족하므로, 안 1 채택 시 "QR → publicKey 진입" 한 단계만 추가 검증하면 됨.

---

## 6. 결론 / 다음 단계

- **정책은 이미 구현됨**(다국어 시스템 (B)에서 PASS). **빠진 것은 QR 진입 연결 1건.**
- QR page 가 여는 `kpa_contents` 자체는 단일 언어이므로, 다국어가 필요하면 **(B) 다국어 제품 콘텐츠를 QR 대상으로 연결**(안 1, 거의 프론트만)이 최소·정합.
- 언어별 QR 분리는 스키마에 없음 → "하나의 QR" 정책과 이미 부합. 별도 작업 불필요.
- 실제 구현은 별도 WO 로 분리. 본 문서는 조사·판정까지.

### 핵심 코드 참조
| 위치 | 파일:라인 |
|---|---|
| QR page 본문 resolve (단일 body) | `o4o-store/controllers/store-qr-landing.controller.ts:182-223` |
| QR 랜딩 page 렌더 (언어 UI 없음) | `web-kpa-society/src/pages/qr/QrLandingPage.tsx:137-173` |
| kpa_contents body 컬럼 추가(단일) | `database/migrations/20260422300000-KpaContentHubCommunity.ts:14-22` |
| 다국어 공개 API (published locale만) | `o4o-store/controllers/multilingual-product-content.controller.ts:188-265` |
| 다국어 fallback 우선순위 | `multilingual-product-content.controller.ts:148-160` |
| 다국어 언어 탭 UI (>1 일 때만) | `web-kpa-society/src/pages/public/MultilingualProductPublicLandingPage.tsx:231-250` |
| publicKey 발급(기존) | `multilingual-product-content.controller.ts:417-501` |
| store_qr_codes 스키마(lang 없음) | `platform/entities/store-qr-code.entity.ts:21-61` |
