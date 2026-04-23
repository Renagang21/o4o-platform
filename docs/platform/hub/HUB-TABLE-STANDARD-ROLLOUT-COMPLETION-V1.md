# O4O HUB 표준 테이블 구조 정렬 완료 보고

**문서 ID**: O4O-HUB-TABLE-STANDARD-ROLLOUT-COMPLETION-REPORT-V1  
**완료일**: 2026-04-23  
**대상 서비스**: KPA Society (`services/web-kpa-society`)  
**상태**: ✅ 완료

---

## 1. 작업 개요

O4O 플랫폼 내 주요 HUB 영역에 대해  
**표준 테이블 구조 (BaseTable + Selection + Bulk Action)** 적용을 완료하였다.

적용 대상:

| HUB | 경로 | 파일 |
|-----|------|------|
| 콘텐츠 | `/content` | `ContentHubPage.tsx` |
| 강의 | `/lms` | `EducationPage.tsx` |
| 포럼 | `/forum` | `ForumListPage.tsx` |
| 자료실 | `/resources` | `ResourcesHubPage.tsx` |

---

## 2. 핵심 구조 (공통 기준)

### 2.1 테이블 기반

```
[✓] | (타입/도메인 컬럼) | 제목 | 작성자/소유자 | 생성일 | (지표) | 액션
```

### 2.2 Selection 구조

- `BaseTable selectable` 체크박스 기본 포함
- multi-select 가능

### 2.3 Bulk Action (`ActionBar`)

- 복사 (핵심) — URL 또는 source_url 클립보드 복사
- 삭제 (권한 기반, confirm 포함)

### 2.4 Row Action (`RowActionMenu`)

- kebab 메뉴: 수정 / 삭제 (권한 기반)

### 2.5 역할 분리

HUB는 다음 역할만 수행:

- 조회 / 선택 / 복사 / 기본 관리

AI 기능 없음 — 사용처(store 등)에서 처리

---

## 3. HUB별 적용 결과

### 3.1 `/content` — 콘텐츠 허브

- **상태**: ✅ 완료 (기존 구현 확인, 추가 작업 불필요)
- **구조**: 타입 선택 생성 흐름 + 표준 테이블 + multi-select + bulk copy
- **특징**: 콘텐츠 Asset 기준 구조 이미 확립됨

---

### 3.2 `/lms` — 강의

- **상태**: ✅ 완료 (`WO-LMS-HUB-TABLE-STANDARD-V1`)
- **구조**: BaseTable + selectable + bulk copy/delete + RowActionMenu
- **컬럼**: 제목 / 강사 / 유형 / 강의수 / 상태 / 액션
- **특징**: LMS 제작자 자격 확인 + 수강 흐름 완전 보존
- **비고**: 👍💬 없음 — `Course` 타입 미지원, 도메인 특성상 보류

---

### 3.3 `/forum` — 포럼

- **상태**: ✅ 완료 (`WO-FORUM-HUB-TABLE-STANDARD-V1`)
- **구조**: 커스텀 table → BaseTable 전환 + selectable + bulk action
- **컬럼**: 포럼 / 제목 / 작성자 / 작성일 / 👍 / 👁 / 💬 / 액션
- **특징**:
  - 비공개 포럼 접근 제한(`closedCategoryAccess`) 로직 완전 보존
  - 카테고리 필터 UX 보존
  - `emptyMessage`로 비공개 포럼 UX 통합

---

### 3.4 `/resources` — 자료실

- **상태**: ✅ 완료 (부분 표준화, `WO-RESOURCES-HUB-TABLE-PARTIAL-V1`)
- **구조**: BaseTable + selectable + bulk copy/delete + RowActionMenu
- **컬럼**: 파일명/제목 / 등록자 / 등록일 / 👁 / 액션
- **특징**:
  - `BaseDetailDrawer` UX 완전 유지 (row 클릭 → 드로어 오픈)
  - `source_url` 기반 링크 복사
  - `view_count` 컬럼 리스트로 승격
  - 체크박스 ↔ row 클릭 이벤트 충돌 없음
- **정책**: 👍💬 미적용 / RowActionMenu operator 전용

---

## 4. 최종 구조 통합 흐름

```
HUB (content / lms / forum / resources)
   ↓
선택 (체크박스)
   ↓
복사 (URL / source_url / 파일 링크)
   ↓
사용처 (store 등)
   ↓
AI / 가공 / 실행
```

---

## 5. 핵심 성과

### 5.1 구조 통일

모든 HUB가 동일한 Selection 기반 구조로 정렬됨.  
`BaseTable + ActionBar + RowActionMenu` 3요소 공통 패턴 확립.

### 5.2 O4O 핵심 흐름 확립

> "선택 → 복사 → 사용처 → 실행"

플랫폼 전반에 일관된 흐름 구축. HUB는 **공급 계층**, 사용처는 **실행 계층**으로 역할 분리.

### 5.3 확장 기반 확보

향후 단계적 확장 가능:

- AI 처리 (사용처)
- 매장 적용 (Store Hub)
- POP / QR / Signage 연계
- 외부 LLM 파이프라인 연결

### 5.4 도메인 보존

- LMS 자격 구조 유지
- 포럼 접근 제어 유지
- 자료실 드로어 UX 유지

표준화 과정에서 도메인 손상 없음.

---

## 6. 의도적 비적용 항목

다음은 이번 단계에서 제외. 운영 데이터 확보 후 단계적 적용:

| 항목 | 사유 |
|------|------|
| AI 기능 | HUB 역할 아님 — 사용처에서 처리 |
| 인기순 정렬 | 운영 데이터 필요 |
| 추천/노출 로직 | 별도 WO |
| 👍💬 (자료실, LMS) | 타입 미지원 또는 도메인 특성 |
| 사용처 표시 | 다음 단계 |

---

## 7. 다음 단계

> "사용처 (`/store` 등)에서 복사된 콘텐츠를 어떻게 받는가"

HUB의 **공급 계층이 완성된 이 시점**이 사용처 실행 계층 설계의 시작점이다.

---

## 8. 한 줄 핵심

> O4O는 이제 **"무엇을 만들었는가"가 아니라  
> "무엇을 선택해서 어떻게 쓸 것인가"의 플랫폼으로 전환되었다.**
