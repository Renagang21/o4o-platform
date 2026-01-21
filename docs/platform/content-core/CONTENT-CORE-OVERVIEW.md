# Content Core Overview

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: o4o 플랫폼 전체
> **관련 문서**: `LMS-CORE-EXTENSION-PRINCIPLES.md`, `EXTENSION-GENERAL-GUIDE.md`

---

## 1. Content Core란 무엇인가

Content Core는 o4o 플랫폼에서 **모든 콘텐츠의 생성, 저장, 관리, 배포를 담당하는 핵심 계층**이다.

### 핵심 원칙

1. **단일 소스 (Single Source of Truth)**
   - 모든 콘텐츠는 Content Core를 통해 관리된다
   - Extension이 독자적인 콘텐츠 저장소를 생성하는 것은 금지된다

2. **콘텐츠 독립성**
   - 콘텐츠는 특정 Extension에 종속되지 않는다
   - Extension이 제거되어도 콘텐츠는 Core에 보존된다

3. **타입 확장성**
   - Content Core는 기본 콘텐츠 타입을 정의한다
   - Extension은 Custom Post Type(CPT)을 통해 타입을 확장할 수 있다

---

## 2. Content Core가 소유하는 것

| 영역 | 설명 |
|------|------|
| 콘텐츠 저장 | 모든 콘텐츠 데이터의 영구 저장 |
| 콘텐츠 버전 | 콘텐츠 히스토리 및 버전 관리 |
| 콘텐츠 메타 | 공통 메타데이터 (작성자, 생성일, 상태 등) |
| 콘텐츠 권한 | 콘텐츠 접근/수정 권한 기본 체계 |
| 블록 시스템 | Gutenberg 호환 블록 렌더링 |

---

## 3. Content Core가 소유하지 않는 것

| 영역 | 소유 주체 |
|------|----------|
| 콘텐츠 소비 방식 | 각 Extension |
| 콘텐츠 표시 UI | 각 서비스 (Web App) |
| 비즈니스 로직 | 각 Extension |
| 외부 연동 | 각 Extension |

---

## 4. Extension과의 관계

### 허용되는 패턴

- Extension이 Content Core의 API를 통해 콘텐츠를 생성/조회/수정
- Extension이 CPT를 등록하여 새로운 콘텐츠 타입 정의
- Extension이 콘텐츠에 추가 메타데이터를 연결 (별도 테이블)

### 금지되는 패턴

- Extension이 Content Core 테이블을 직접 수정 ❌
- Extension이 독자적인 콘텐츠 저장 테이블 생성 ❌
- Extension이 콘텐츠 권한 체계를 우회 ❌

---

## 5. 기준 적용 시점

이 기준은 다음 작업에 선행하여 적용된다:

- 새로운 콘텐츠 타입 추가
- 콘텐츠 관련 Extension 개발
- 콘텐츠 관리 UI 설계
- 콘텐츠 API 확장

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
