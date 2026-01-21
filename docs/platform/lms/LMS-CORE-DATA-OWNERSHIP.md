# LMS Core 데이터 소유권

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: LMS 데이터 설계 및 접근
> **관련 문서**: `LMS-CORE-EXTENSION-PRINCIPLES.md`, `LMS-CORE-CONTRACT.md`

---

## 1. 왜 데이터 소유권을 명확히 하는가

데이터 소유권이 불명확하면:
- Extension이 Core 데이터를 직접 수정하여 무결성 훼손
- Extension 제거 시 데이터 정합성 문제 발생
- 중복 데이터 저장으로 동기화 이슈 발생

---

## 2. Core가 소유하는 데이터

| 데이터 | 테이블 (예시) | 설명 |
|--------|-------------|------|
| 강좌 정보 | `lms_courses` | 강좌 기본 정보 |
| 섹션/레슨 구조 | `lms_sections`, `lms_lessons` | 커리큘럼 구조 |
| 수강 등록 | `lms_enrollments` | 수강 등록 정보 |
| 학습 진도 | `lms_progress` | 진도 상태 |
| 기본 완료 기록 | `lms_completions` | 레슨/강좌 완료 |

### Core 데이터 접근 규칙

- ✅ Extension은 Core API를 통해 **읽기** 가능
- ✅ Extension은 Core API를 통해 **쓰기** 가능 (정해진 인터페이스 사용)
- ❌ Extension은 Core 테이블을 **직접 쿼리/수정** 불가

---

## 3. Extension이 소유하는 데이터

| 데이터 | 테이블 (예시) | 설명 |
|--------|-------------|------|
| 인증 포인트 | `yaksa_certification_points` | 약사회 평점 |
| 도메인 설정 | `yaksa_settings` | 약사회 특화 설정 |
| 외부 연동 로그 | `yaksa_sync_logs` | 외부 시스템 동기화 |
| 특화 완료 조건 | `yaksa_completion_rules` | 도메인 특화 규칙 |

### Extension 데이터 규칙

- Extension 데이터는 해당 Extension이 전적으로 관리
- Extension 제거 시 해당 데이터도 함께 제거 가능
- Core는 Extension 데이터에 접근하지 않음

---

## 4. 데이터 연결 패턴

### 허용되는 패턴

```
Extension 테이블 → Core 테이블 (FK 참조)
```

예: `yaksa_certification_points.enrollment_id → lms_enrollments.id`

### 금지되는 패턴

```
Core 테이블 → Extension 테이블 (FK 참조)
```

- Core가 Extension을 알게 되는 구조는 금지

---

## 5. 공유 데이터 처리

Core와 Extension이 모두 필요로 하는 데이터가 있을 때:

1. **Core에 저장**: 기본 데이터는 Core가 소유
2. **Extension에서 확장**: Extension 특화 메타데이터는 별도 테이블
3. **이벤트로 동기화**: Core 데이터 변경 시 이벤트 발행

---

## 6. 마이그레이션 규칙

### Core 테이블 마이그레이션

- Core 팀만 수행
- 모든 Extension에 영향도 분석 필수
- 하위 호환성 유지

### Extension 테이블 마이그레이션

- 해당 Extension 팀이 수행
- Core에 영향 없음
- 독립적으로 버전 관리

---

## 7. 기준 적용 시점

이 기준은 다음 작업에 선행하여 적용된다:

- LMS 데이터베이스 스키마 설계
- LMS 관련 엔티티 생성
- LMS 데이터 접근 코드 작성

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
