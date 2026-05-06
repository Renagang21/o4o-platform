# O4O Guide Schema Validation

> **WO-O4O-GUIDE-SCHEMA-VALIDATION-V1**
>
> 운영자가 `/operator/guide-contents`에서 저장하는 GuideBlock JSON에
> 최소 schema validation을 추가하여 Guide 시스템 운영 안정성 강화.

---

## 1. Schema 구조

GuideBlock이 소비하는 JSON 형식:

```json
{
  "title": "string",
  "description": "string (optional)",
  "steps": ["string", "..."],
  "variant": "info | warning | success | neutral"
}
```

DB `guide_contents.content` 컬럼에 `JSON.stringify` 후 저장.

---

## 2. Validation 규칙

구현 위치: `packages/operator-core-ui/src/modules/guide-contents/validateGuideContent.ts`

### title

| 규칙 | 값 |
|------|-----|
| required | ✅ |
| type | string |
| trim 후 비어있으면 | 실패 |
| 최대 길이 | 200자 |

### description

| 규칙 | 값 |
|------|-----|
| required | ❌ (optional) |
| type | string |
| 최대 길이 | 2000자 |

### steps

| 규칙 | 값 |
|------|-----|
| required | ✅ |
| type | string[] |
| 최소 항목 수 | 1 |
| 최대 항목 수 | 10 |
| 각 항목 type | string |
| 빈 문자열 항목 | 실패 |

---

## 3. 에러 메시지

| 케이스 | 메시지 |
|--------|--------|
| title 없음 | `제목을 입력해 주세요.` |
| title 200자 초과 | `제목은 200자 이하로 입력해 주세요.` |
| description 2000자 초과 | `설명은 2000자 이하로 입력해 주세요.` |
| steps 없음 또는 빈 배열 | `단계 안내를 1개 이상 입력해 주세요.` |
| steps 10개 초과 | `단계 안내는 최대 10개까지 입력할 수 있습니다.` |
| steps 항목이 문자열 아님 | `단계 안내 항목은 문자열이어야 합니다. (N번째 항목)` |
| steps 항목이 빈 문자열 | `빈 단계 안내 항목이 있습니다. (N번째 항목)` |

---

## 4. 저장 흐름 (validation 적용 후)

```
handleSave 호출
  → validateGuideContent(payload)
  → valid=false: setErr(error) + return (POST 차단)
  → valid=true: client.saveGuideContent(JSON.stringify(payload))
```

validation 실패 시 `setSaving(true)` 호출 없음 — spinner 불필요.

---

## 5. Fallback 유지 이유

validation은 **신규 저장 경로에서만 동작**한다.

읽기 경로(`fetchGuidePageContent`)의 기존 `try/catch → fallback` 구조는 그대로 유지된다:

```
DB row 읽기
  → JSON.parse 시도
  → 실패 시: hasLegacy=true, plain text를 description에 표시
  → GuideBlock은 static fallback 또는 DB override 값 사용
```

이유:
- 기존 DB에 저장된 invalid JSON / plain text row가 존재할 수 있음
- migration 수행 없이 기존 데이터 그대로 보존
- GuideBlock 컴포넌트(소비 쪽)의 `try/catch` fallback도 별도로 유지됨

---

## 6. Invalid JSON 대응

기존 plain text 형식이 DB에 있을 경우:

1. `fetchGuidePageContent` → `JSON.parse` 실패
2. `hasLegacy=true`로 form에 임시 표시 (description 필드에 원문 노출)
3. 운영자가 수정 후 저장 시 validation 통과하면 JSON 형식으로 덮어씀
4. 이후 해당 row는 정상 JSON으로 관리됨

---

## 7. Migration 미수행 정책

| 항목 | 결정 |
|------|------|
| DB migration | ❌ 미수행 |
| guide_contents schema 변경 | ❌ 금지 |
| 기존 row 강제 수정 | ❌ 금지 |
| 신규 저장부터 validation 적용 | ✅ |

기존 invalid DB row는 읽기 시 hasLegacy fallback으로 처리하며,
운영자가 재저장할 때 자연스럽게 valid JSON으로 전환된다.

---

## 8. 구현 파일

| 파일 | 역할 |
|------|------|
| `packages/operator-core-ui/src/modules/guide-contents/validateGuideContent.ts` | validation 함수 + 타입 |
| `packages/operator-core-ui/src/modules/guide-contents/GuideContentsManager.tsx` | handleSave에 validation 호출 |
| `packages/operator-core-ui/src/modules/guide-contents/index.ts` | validateGuideContent 공개 export |

---

## 9. 검증 케이스

### 정상 저장

```json
{
  "title": "상품 등록 안내",
  "description": "기본 정보를 입력합니다",
  "steps": ["상품명 입력", "이미지 등록"]
}
```

→ `valid: true` → 저장 성공

### 실패 케이스

| 입력 | 결과 |
|------|------|
| `{ "steps": ["a"] }` (title 없음) | 저장 차단 — `제목을 입력해 주세요.` |
| `{ "title": "안내", "steps": [] }` (steps 빈 배열) | 저장 차단 — `단계 안내를 1개 이상 입력해 주세요.` |
| `{ "title": "안내", "steps": [123] }` (steps 숫자) | 저장 차단 — `단계 안내 항목은 문자열이어야 합니다.` |
| 11개 steps | 저장 차단 — `단계 안내는 최대 10개까지 입력할 수 있습니다.` |

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| GuideBlock 서비스 전체 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1.md` |
| Guide sectionKey 충돌 정책 | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-SCHEMA-VALIDATION-V1*
*상태: PASS*
