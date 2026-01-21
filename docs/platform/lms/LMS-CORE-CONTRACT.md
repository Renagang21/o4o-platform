# LMS Core 계약 (Contract)

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: LMS Core와 Extension 간 인터페이스
> **관련 문서**: `LMS-CORE-EXTENSION-PRINCIPLES.md`, `LMS-EVENT-STANDARD.md`

---

## 1. 계약(Contract)이란

LMS Core와 Extension 사이의 **명시적 인터페이스 정의**이다.

- Extension은 이 계약을 통해서만 Core와 상호작용한다
- Core는 계약을 유지하는 한 내부 구현을 자유롭게 변경할 수 있다
- 계약 변경 시 버전 관리가 필수이다

---

## 2. Core가 제공하는 계약

### 2.1 서비스 인터페이스

| 서비스 | 제공 기능 |
|--------|----------|
| CourseService | 강좌 조회, 생성, 수정 |
| EnrollmentService | 수강 등록, 해제, 조회 |
| ProgressService | 진도 조회, 업데이트 |
| CompletionService | 완료 처리, 완료 조회 |

### 2.2 데이터 타입

| 타입 | 용도 |
|------|------|
| Course | 강좌 정보 DTO |
| Enrollment | 수강 등록 DTO |
| Progress | 진도 상태 DTO |
| Completion | 완료 정보 DTO |

### 2.3 이벤트 계약

| 이벤트 | 발생 시점 |
|--------|----------|
| `lms.enrollment.created` | 수강 등록 시 |
| `lms.lesson.completed` | 레슨 완료 시 |
| `lms.course.completed` | 강좌 완료 시 |
| `lms.progress.updated` | 진도 변경 시 |

---

## 3. Extension이 준수해야 하는 계약

### 3.1 Extension 등록 인터페이스

Extension은 다음 정보를 Core에 등록해야 한다:

- Extension 식별자 (고유 ID)
- 제공하는 훅/콜백 목록
- 필요한 권한 목록

### 3.2 이벤트 핸들러 규칙

- 이벤트 핸들러는 동기 처리를 피한다
- 핸들러 실패가 Core 동작을 중단시키지 않아야 한다
- 멱등성(idempotency)을 보장해야 한다

---

## 4. 버전 관리

### 계약 버전 체계

```
lms-core-contract@{major}.{minor}.{patch}
```

- **major**: 하위 호환성 없는 변경
- **minor**: 하위 호환성 있는 기능 추가
- **patch**: 버그 수정

### 버전 업그레이드 정책

| 변경 유형 | 예고 기간 | 이전 버전 유지 |
|----------|----------|---------------|
| patch | 없음 | 없음 |
| minor | 1주 | 1개월 |
| major | 1개월 | 3개월 |

---

## 5. 계약 위반 처리

### Extension이 계약을 위반하면

1. 해당 Extension 기능 비활성화
2. 로그에 위반 사항 기록
3. 관리자에게 알림

### Core가 계약을 위반하면

1. 버전 롤백 수행
2. 영향받는 Extension 목록 확인
3. 긴급 패치 배포

---

## 6. 계약 문서화 규칙

모든 계약은 다음 형식으로 문서화된다:

```typescript
/**
 * @contract lms-core-contract@1.0.0
 * @since 2026-01-19
 * @deprecated (해당 시 명시)
 */
interface CourseService {
  // ...
}
```

---

## 7. 기준 적용 시점

이 기준은 다음 작업에 선행하여 적용된다:

- LMS Core API 설계
- LMS Extension 개발
- LMS 이벤트 시스템 구현

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
