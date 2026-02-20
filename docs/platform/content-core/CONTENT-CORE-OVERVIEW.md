# Content Core Overview

> **상태**: Baseline (확정)
> **적용 범위**: o4o 플랫폼 전체
> **관련**: `LMS-CORE-EXTENSION-PRINCIPLES.md`, `EXTENSION-GENERAL-GUIDE.md`

---

## 1. Content Core란

Content Core는 **모든 콘텐츠의 생성·저장·관리·배포를 담당하는 핵심 계층**이다.

### 핵심 원칙

1. **단일 소스 (Single Source of Truth)** — Extension의 독자 콘텐츠 저장소 금지
2. **콘텐츠 독립성** — Extension 제거 후에도 콘텐츠는 Core에 보존
3. **타입 확장성** — Extension은 CPT(Custom Post Type)로 타입 확장

---

## 2. 소유 범위

| Core 소유 | Extension/서비스 소유 |
|-----------|---------------------|
| 콘텐츠 저장·버전·메타 | 소비 방식, 표시 UI |
| 콘텐츠 권한 기본 체계 | 비즈니스 로직 |
| 블록 시스템 (Gutenberg 호환) | 외부 연동 |

### 허용 패턴

- Extension이 Content Core API를 통해 콘텐츠 CRUD
- Extension이 CPT 등록으로 새 콘텐츠 타입 정의
- Extension이 콘텐츠에 추가 메타 연결 (별도 테이블)

### 금지 패턴

- Extension이 Core 테이블 직접 수정 ❌
- Extension이 독자 콘텐츠 저장 테이블 생성 ❌
- Extension이 콘텐츠 권한 체계 우회 ❌

---

## 3. Content = 해석 계층 (Phase 2 재정의)

> Content Core는 **저장이 아니라 해석**이다.

### 핵심 전환

| 이전 | Phase 2 이후 |
|------|-------------|
| CMS = 콘텐츠 저장소 | CMS = 자산 관리 (Media/Block) |
| Content = CMS의 부속 | **Content = 해석 계층** |

### Lesson = 최소 콘텐츠 단위

- Lesson은 CMS 자산 없이도 독립 존재 (videoUrl만으로 성립)
- LMS Extension이 Lesson을 만들지만 **소유는 Content Core**
- Lesson은 CMS의 하위가 아님

### Content Core의 실제 역할

1. Lesson·Block·Media를 조합하여 **소비 가능한 콘텐츠 생성**
2. Course 구조 정의 (Module → Lesson 편성)
3. 콘텐츠 버전·접근 제어

---

## 4. 소비 원칙 (Read-Only)

> Content Core는 소비를 **직접 수행하지 않는다**.

### 소비 정의

Content Core의 "소비"란:
- 해석된 콘텐츠를 최종 사용자에게 전달하는 행위
- Lesson 시청, Course 수강, 게시물 열람 등

### 규칙

| 원칙 | 설명 |
|------|------|
| Core는 해석만 | 소비 UI·로직은 Extension/서비스 소유 |
| 진도·이력은 Extension | `LessonProgress` 등은 LMS Extension 소유 |
| Core 기록은 메타만 | 조회수, 최종접근일 등 통계적 기록 |

### 서비스별 소비 패턴

| 서비스 | 소비 형태 | 소유 |
|--------|----------|------|
| LMS | 수강 (진도 추적) | LMS Extension |
| Signage | 플레이 (스케줄 기반) | Signage Extension |
| Forum | 열람 (댓글/반응) | Forum Extension |
| CMS 관리 | 편집 프리뷰 | CMS 자체 |

---

## 5. Media 전략 (v1 고정)

> Media는 3영역 분리를 유지한다. 통합 금지.

| 영역 | 저장 위치 | 역할 |
|------|----------|------|
| CMS Media | `cms_media` | 콘텐츠 자산 (이미지/영상/문서) |
| Signage Media | `signage_media` | 플레이 전용 자산 |
| LMS Lesson | `lesson.videoUrl` | 강의 소비용 영상 URL |

### v1 정책

1. **분리 유지** — CMS·Signage·LMS 각각 독립
2. **URL 참조만 허용** — mediaId 교차 사용 금지, FK 연결 금지
3. **동기화 금지** — 자동 복제, 삭제 이벤트 연동, 공유 상태 관리 모두 금지
4. **독립 삭제** — 각 Media 삭제 시 타 영역 무영향

### 장기 방향 (v3+)

CMS를 단일 Media Source로 승격 후보이나 v1/v2에서는 시도하지 않음.

- Media Core 생성 ❌
- Schema 변경 ❌

---

*이 문서는 CLAUDE.md §16에서 참조하는 기준 문서이다.*
