# WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1

> **성격: 설계 + 구현 WO (조사 완료, 구현 대기).**
> 목적: 매장 콘텐츠 리스트(`kpa_contents`)의 문서를 **나라별로 AI 번역**하여 다국어 버전을 보유·제공한다.
> 관련: [`IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1`](../ir/IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1.md) (§11-B 서비스 범위 결정)
> 작성: 2026-06-24 · 상태: 설계 확정 대기(§6 오픈 질문)

---

## 1. 요구 (사용자 구상)

- 매장 콘텐츠 리스트(`/content`)에서 **항목 체크 → 나라 선택 → 다국어 변환** → 진행.
- **나라마다 1회씩** 변환(배치 아님 — 코드 단순).
- "반응형"은 콘텐츠가 HTML이라 자동 → 실제 작업은 **번역**뿐.
- 다국어 변환은 **매장** 기능 (운영자 불필요 — 매장마다 필요 언어가 다름). 운영자 = 한국어 원본 저작.

## 2. 조사 결과 (재사용 vs 신규)

### 2.1 핵심 발견 — 기존 다국어 모델은 "상품 바인딩"

| | 콘텐츠 리스트 | 기존 다국어 모델 |
|---|---|---|
| 테이블 | `kpa_contents` (일반 문서) | `(operator\|store)_multilingual_product_content_*` |
| 묶임 | 작성자/문서 | **상품(`target_kind`+`target_id`) 필수** |
| 다국어 | 없음 | 7언어(ko/en/zh/ja/vi/th/id) page 구조 |

→ 콘텐츠 리스트 항목은 상품이 아니므로 **상품-다국어 모델 직접 재사용 불가**(바인딩 불일치).

### 2.2 번역 AI 현황
- AI 인프라 존재: `AiPolicyExecutorService`(retry/policy/usage logging), `@o4o/ai-core`, `@o4o/ai-prompts`, API 키(GEMINI/OPENAI).
- **번역 서비스·프롬프트·엔드포인트는 없음** → 신규.

### 2.3 재사용 가능
- AI 호출 인프라(`AiPolicyExecutorService`), 프롬프트 패키지 패턴(`@o4o/ai-prompts`).
- 콘텐츠 리스트 UI 패턴(BaseTable + ActionBar + 체크박스 선택 이미 존재).
- 7언어 locale 정의(ko/en/zh/ja/vi/th/id).

## 3. 설계 결정 (✅ 2026-06-24)

> **상품-다국어 모델에 끼우지 않고, 콘텐츠 네이티브 방식.** (최소수정 + 리스트 정합)

- **신규 테이블 `kpa_content_translations`**: `content_id`(FK kpa_contents) + `locale` + `title` + `summary` + `body`(html) + `status`(draft/ready) + 표준 타임스탬프. (content_id, locale) UNIQUE.
- **번역 = AI 초안**(`AiPolicyExecutorService` 재사용) → 매장이 수정 가능. (우리 원칙: 최대한 자동 + 미세조정은 사람)
- **번역 엔진 = 외부 AI API 빌림, 결과는 o4o 스키마(kpa_content_translations)로 저장.** (엔진은 빌려도 그릇은 내가)
- **트리거 = 매장.** 운영자 경유 아님.

### 3.1 흐름
```
[매장] 콘텐츠 리스트(/content) → 항목 체크
  → 나라 1개 선택(en/zh/ja/vi/th/id)
  → POST 번역 (content body/title/summary → 대상 언어 AI 번역)
  → kpa_content_translations upsert (status=draft)
  → 매장 필요시 수정
  → (표시 단계: §6 결정에 따름)
  → 나라마다 반복
```

## 4. 구현 범위 (확정 후)

**백엔드**
1. Migration `kpa_content_translations` (타임스탬프=직전+1 규칙).
2. Entity `KpaContentTranslation` (ESM: import type + 문자열 관계명).
3. 번역 프롬프트 `@o4o/ai-prompts` (언어별 마케팅 번역, 고유명사 보존 지시).
4. `ContentTranslationService` (`AiPolicyExecutorService` 호출 → title/summary/body 번역).
5. 엔드포인트: `POST /api/v1/kpa/store/contents/:id/translate` (locale 1개), `GET .../translations`, `PUT .../translations/:locale`. 가드 = store_owner + org 스코프.

**프론트엔드**
6. `contentTranslation.ts` API client.
7. `ContentTranslateModal.tsx` (나라 선택 1개 + 진행 + 결과 preview/save).
8. ContentListPage ActionBar 에 "다국어 변환" 액션(체크 시 노출).

## 5. 검증
- tsc/build PASS(api + web-kpa-society).
- 실제 브라우저 smoke: 콘텐츠 체크 → 나라 선택 → 번역 → translations 저장 확인(실제 화면, 스크린샷).
- AI 키 없을 때 graceful(번역 비활성/안내).

## 6. 오픈 질문 (구현 전 결정 필요) ⚠️

**번역한 콘텐츠를 외국인 고객이 "어디서" 보나?** (표시 경로)
- 저장은 본 WO로 가능. 그러나 **표시**(locale별 공개 화면)가 있어야 가치 완성.
- 기존 상품-다국어엔 공개 landing(`resolvePublicMlc`)이 있으나, 일반 콘텐츠엔 locale별 공개 화면 유무 불확실.
- **(가)** QR/공개 페이지 locale 표시까지 이번 범위 / **(나)** 번역 저장·관리(매장 내부)까지만, 표시는 후속.

→ (가)/(나) 결정 후 §4 범위 확정.

---

## 7. 비범위 / 주의
- 동영상(MP4) 변환·이미지 in-place 번역 = 본 WO 무관(IR §11-A/§11-B 보류·미포함).
- 상품-다국어(`*_multilingual_product_content_*`)는 건드리지 않음(별개 도메인).
- Shared Module: ContentListPage/콘텐츠 API 변경 시 KPA 외 소비처 영향 확인.

---

*조사 완료. §6 결정 후 구현 착수.*
