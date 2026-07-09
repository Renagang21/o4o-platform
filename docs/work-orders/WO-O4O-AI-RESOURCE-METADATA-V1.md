# WO-O4O-AI-RESOURCE-METADATA-V1

## 1. 작업명

WO-O4O-AI-RESOURCE-METADATA-V1

---

## 2. 배경

Metadata · Unified Search · Usage Trace · Ownership · Hash · Version 체계가 마련되면서 Content Resource 는 관리 가능한 자산이 되었다. 그러나 AI 가 Resource 를 검색·추천할 수 있는 정보는 아직 없다 — 현재 AI 는 Resource 를 이해하지 못하고, 제목·태그 정도만 사용하며, 어떤 용도에 적합한지 판단할 수 없다.

**이번 WO 는 AI 추천을 만드는 것이 아니라, AI 가 이해할 수 있는 Metadata 를 추가**한다.

## 3. 목적

모든 Content Resource 가 AI 의 검색·추천·재사용 판단에 사용할 수 있는 Metadata 를 갖게 한다. **추천 알고리즘은 만들지 않는다.**

## 4. 적용 대상

- `media_assets`

## 5. 구현 원칙

### 5.1 AI Metadata 는 사람 Metadata 와 분리
`title` / `description` / `tags` 는 사람을 위한 Metadata 다. AI Metadata 는 AI 가 사용하는 별도 필드다.

### 5.2 이번 WO 에서는 AI 가 자동 생성하지 않는다
AI Metadata 는 **관리자가 입력**한다. 자동 생성은 후속 WO(§15).

### 5.3 Resource 자체를 변경하지 않는다
AI Metadata 는 Resource 를 **설명**한다. 파일·HTML·URL 을 수정하지 않는다(파일 속성 불변 — Metadata WO 와 동일).

### 5.4 Additive
기존 Metadata 변경 없음. 신규 컬럼 전부 nullable, Backfill 없음.

### 5.5 AI Metadata 는 추천 힌트일 뿐이다
AI 는 이 Metadata 를 **참고**한다. 반드시 따라야 하는 규칙이 아니다(hint, not constraint).

### 5.6 AI Metadata = "AI 가 활용하는" 메타데이터 (생성 주체 무관 — 핵심)
- AI Metadata 는 **"AI 가 생성한 메타데이터"가 아니라 "AI 가 활용하는 메타데이터"** 다.
- 사람이 입력한 AI Summary 도 AI Metadata 이고, 향후 AI 가 자동 생성한 Summary 도 **같은 필드**를 사용한다.
- 중요한 것은 **생성 주체가 아니라 활용 목적**이다.
- → 이후 AI 자동 태깅·자동 요약을 추가해도 **스키마 변경 없이** 자연스럽게 확장된다. (필요 시 생성 주체 구분은 `ai_source` 같은 표기 컬럼을 후속에서 additive 로 추가 — 이번 WO 범위 아님.)

## 6. 데이터 모델 (신규 컬럼, 전부 nullable)

```
ai_summary   text
ai_keywords  jsonb
ai_usage     jsonb
ai_audience  jsonb
ai_priority  integer
```

## 7. 필드 의미

### ai_summary
AI 가 이해하기 쉬운 1~3문장 요약. 예: "약국 POP 에서 사용할 대표 이미지 / 비타민C 제품 설명에 적합 / 가독성 높음".

### ai_keywords
```
["비타민C","POP","대표이미지"]
```

### ai_usage
AI 가 어디에 추천할 수 있는지. `["pop","qr","blog","tablet"]` (usage surface 후보).

### ai_audience
대상 독자. 예: `["consumer"]` · `["pharmacist"]` · `["supplier"]`.

### ai_priority
정수, 기본 0. 높을수록 우선 추천. (nullable — 미지정 시 0 으로 간주하거나 NULL 유지, CHECK 명시.)

## 8. Admin

Resource 상세에 추가(편집 가능):
```
AI Summary · AI Keywords · AI Usage · AI Audience · Priority
```
- ai_keywords/ai_usage/ai_audience 는 쉼표/배열 입력(기존 tags/keywords UI 패턴 재사용).

## 9. API

기존 `GET /platform/media-library` · 상세 · metadata PATCH 응답에 필드 추가(additive):
```
aiSummary · aiKeywords · aiUsage · aiAudience · aiPriority
```
- PATCH metadata 화이트리스트에 위 필드 추가(파일 속성은 여전히 차단).

## 10. Migration

위 5개 컬럼 `ADD COLUMN IF NOT EXISTS`, 전부 nullable. Backfill 없음. 타임스탬프 = 순차 카운터 규칙 준수.

## 11. 검증

- AI Metadata 저장/수정(관리자 입력).
- API 반환.
- 기존 Metadata/Search/목록/업로드 회귀 없음.
- typecheck · build · 배포 · 브라우저 smoke · 콘솔 에러 없음.

## 12. 완료 기준

AI Metadata 저장 · Admin 관리 · API 제공 · 기존 회귀 없음 · CHECK · commit/push.

## 13. 제외

AI 자동 작성 · Embedding · Vector Search · Semantic Search · OCR · Image Caption · Auto Tagging · LLM 추천 — 모두 제외.

## 14. 작업 원칙

Additive · Nullable · Backfill 없음 · Resource(파일/HTML/URL) 변경 없음 · Metadata 만 추가 · AI Metadata=활용 목적(생성 주체 무관, §5.6).

## 15. 산출물

CHECK — `CHECK-O4O-AI-RESOURCE-METADATA-V1.md`

## 16. 후속 WO

```text
WO-O4O-AI-RESOURCE-METADATA-V1  (본 WO)
      ↓
WO-O4O-CONTENT-RESOURCE-AI-RECOMMENDATION-V1
      ↓
WO-O4O-CONTENT-RESOURCE-AI-AUTOTAGGING-V1
      ↓
WO-O4O-CONTENT-RESOURCE-SEMANTIC-SEARCH-V1
```

---

## 목표

Content Resource 는 사람이 관리하는 Metadata 뿐 아니라 **AI 가 이해하고 활용할 수 있는 Metadata** 를 갖는다. 이번 WO 는 추천 엔진을 구현하는 것이 아니라, AI 가 Resource 를 검색·선택·재사용할 수 있는 공통 기반을 구축한다. AI Metadata 는 생성 주체와 무관하게(사람 입력이든 향후 AI 자동생성이든) 같은 필드를 공유하므로(§5.6), 스키마 변경 없이 자동 태깅·자동 요약으로 확장된다.

> **시리즈 완성:** 이 WO 로 Content Resource Management 기반 8단계(Metadata → Unified Search → Usage Trace → Delete Guard → Ownership → Dedup(Hash) → Versioning → AI Metadata)가 문서상 완결된다.

---

*Status: 확정 (핸드오프 대기). AI Metadata=활용 목적(생성 주체 무관). 자동 생성/추천은 후속 WO. 실행은 별도 지시로 착수.*
