# O4O 태그 정책 v1 — 자유입력형 (Free-form Tags)

> **Status**: Active | **Since**: 2026-04-25 | **Reference Implementation**: Digital Signage (Media / Playlist)

---

## 1. 목적

태그는 **검색 보조 데이터**이다. 분류 체계가 아니며, 운영자 관리 대상이 아니다.

---

## 2. 기본 원칙

- 태그는 자유입력 (Free-form) — 사전 정의 태그 없음
- 운영자 태그 관리 기능 없음
- 추천 태그는 선택 보조 UI일 뿐, 강제 아님

---

## 3. 입력 규칙

| 규칙 | 설명 |
|------|------|
| 최소 개수 | 1개 이상 필수 |
| `#` 제거 | 입력 시 `#` 접두사 자동 제거 후 저장 |
| trim | 앞뒤 공백 제거 |
| 빈 값 제거 | 공백만 입력된 태그 무시 |
| 중복 제거 | 동일 태그 1개만 저장 |
| 길이 제한 | 태그 1개당 최대 30자 |

---

## 4. 저장 구조

- PostgreSQL `text[]` 컬럼 사용
- 별도 태그 테이블 없음 — 정규화 테이블 사용하지 않음
- 기본값: `'{}'` (빈 배열)

---

## 5. 검색 정책

- **통합 검색**: 제목 + 설명 + 태그를 하나의 검색어로 검색
- **태그 배열 검색**: PostgreSQL `&&` 연산자로 태그 overlap 검색 가능
- **텍스트 검색**: `array_to_string(tags, ' ') ILIKE '%keyword%'` 패턴

---

## 6. UI 원칙

- 입력: chip/텍스트 기반 자유 입력 (Enter 또는 `,`로 구분)
- 추천 태그: 선택 보조 — 사전 정의 목록에서 클릭으로 추가 (optional)
- 목록 표시: 최대 2개 표시 + 초과 시 `+N` 뱃지
- 태그 클릭 필터: 필수 아님 (서비스별 선택)

---

## 7. 수정 정책

- 태그는 언제든 수정 가능
- write-once 구조 금지 — 등록 후 수정 불가 정책 허용하지 않음

---

## 8. 금지 사항

다음은 구현하지 않는다:

- 태그 사전 관리 기능 (태그 CRUD 관리 화면)
- 태그 승인/검수 시스템
- 태그 기반 강제 분류 구조
- 태그 정렬/랭킹 시스템
- 태그 정규화 테이블 (tag_id ↔ entity_id 매핑)

---

## 9. 적용 대상

| 도메인 | 상태 |
|--------|------|
| **Signage** (Media / Playlist) | 적용 완료 (기준 구현) |
| **Forum** (Category / Post) | 적용 완료 (정책 정렬) |
| **Content** (Working / Published) | 적용 완료 (정책 정렬) |
| **LMS** (Course) | 적용 완료 (정책 정렬) |
| 기타 텍스트 기반 콘텐츠 | 미적용 |

신규 서비스에서 태그를 도입할 때 본 정책을 따른다.

---

## 10. Implementation Status

### Signage — 기준 구현

- Media / Playlist 모두 tags `text[]` 저장
- 태그 자유입력 + sanitize 적용
- 태그 검색 (title + description + tags)
- 태그 수정 가능 (PATCH)
- UI: chip 입력 + 목록 `+N` 표시

### Forum — 정책 정렬 완료

- 사전 정의 태그 제거 → 자유입력 전환
- `forum_tag` 정규화 테이블 제거
- ForumCategory / ForumPost tags `text[]` 통일
- 태그 sanitize · 검색 · 운영자 수정 적용

### Content — 정책 정렬 완료

- Working Content / Published Content 모두 sanitize 적용
- 태그 최소 1개 필수 (400 응답)
- Working Content 검색에 tags 통합
- Frontend 검증 (#strip, 30char, required)

### LMS — 정책 정렬 완료

- Course tags: `simple-array` (TEXT) → `text[]` 마이그레이션
- Backend sanitize (create/update) + 최소 1개 필수
- 검색 통합 (title + description + tags)
- Frontend 검증 (#strip, 30char, required)
- LmsHubTemplate 목록 태그 +N 표시

### 미적용 대상

- Product 관련 보조 태그 (선택적)

→ 이후 단계에서 순차 적용

---

## 11. Policy Exception: AI-Generated Tags

> AI에 의해 생성되는 태그는 일반 사용자 입력 태그와 목적·구조가 다르다.
> 본 정책의 일반 규칙(Section 1–8)과 별개의 예외 영역으로 정의한다.

### 11-1. 차이점

| 항목 | 일반 태그 | AI 태그 |
|------|----------|---------|
| 입력 주체 | 사용자 | AI |
| 저장 구조 | `text[]` 컬럼 | 별도 테이블 |
| 메타데이터 | 없음 | confidence, source 등 |
| 목적 | 검색 보조 | 분석 / 추천 / 자동 분류 |

### 11-2. 구조 원칙

AI 태그는 다음을 허용한다:

- 정규화 테이블 사용 가능
- usageCount / score / confidence 유지 가능
- source 추적 가능

### 11-3. 제한

AI 태그는 다음을 하지 않는다:

- 사용자 입력 태그를 대체하지 않는다
- UI에서 강제 선택 항목으로 사용하지 않는다
- 태그 관리 기능으로 확장하지 않는다

### 11-4. 관계

- 사용자 태그 → **Primary** (검색 보조)
- AI 태그 → **Secondary** (보조 데이터)

### 11-5. 적용 대상

| 대상 | 테이블 |
|------|--------|
| Product AI Tags | `product_ai_tags` |

---

*Updated: 2026-04-25*
