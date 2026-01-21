# LMS 이벤트 표준

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: LMS Core 이벤트 발행 및 구독
> **관련 문서**: `LMS-CORE-CONTRACT.md`, `LMS-CORE-EXTENSION-PRINCIPLES.md`

---

## 1. 왜 이벤트 표준이 필요한가

이벤트 기반 통신은 Core와 Extension의 느슨한 결합을 가능하게 한다.

- Core는 이벤트를 발행할 뿐, 누가 구독하는지 알지 못한다
- Extension은 필요한 이벤트만 구독하여 반응한다
- 새로운 Extension 추가 시 Core 수정 불필요

---

## 2. 이벤트 네이밍 규칙

### 형식

```
{domain}.{entity}.{action}
```

### 예시

| 이벤트 이름 | 설명 |
|------------|------|
| `lms.enrollment.created` | 수강 등록 생성 |
| `lms.enrollment.deleted` | 수강 등록 삭제 |
| `lms.lesson.started` | 레슨 시작 |
| `lms.lesson.completed` | 레슨 완료 |
| `lms.course.completed` | 강좌 완료 |
| `lms.progress.updated` | 진도 업데이트 |

### 명명 규칙

- 도메인: 소문자, 단수형 (`lms`, `content`, `auth`)
- 엔티티: 소문자, 단수형 (`course`, `enrollment`, `lesson`)
- 액션: 과거형 (`created`, `updated`, `deleted`, `completed`)

---

## 3. 이벤트 페이로드 표준

### 공통 필드

모든 이벤트는 다음 필드를 포함한다:

```typescript
interface BaseEvent {
  eventId: string;        // UUID
  eventType: string;      // 이벤트 이름
  timestamp: string;      // ISO 8601
  version: string;        // 이벤트 스키마 버전
  source: string;         // 발행 주체 (예: "lms-core")
}
```

### 도메인 페이로드

```typescript
interface LmsEnrollmentCreatedEvent extends BaseEvent {
  eventType: 'lms.enrollment.created';
  payload: {
    enrollmentId: string;
    userId: string;
    courseId: string;
    enrolledAt: string;
  };
}
```

---

## 4. 이벤트 버전 관리

### 버전 형식

```
{major}.{minor}
```

### 버전 호환성 규칙

| 변경 유형 | 버전 변경 | 하위 호환 |
|----------|----------|----------|
| 필드 추가 (optional) | minor | ✅ |
| 필드 추가 (required) | major | ❌ |
| 필드 삭제 | major | ❌ |
| 필드 타입 변경 | major | ❌ |
| 필드명 변경 | major | ❌ |

---

## 5. Core 발행 이벤트 목록

### 수강 등록 관련

| 이벤트 | 발생 시점 | 버전 |
|--------|----------|------|
| `lms.enrollment.created` | 수강 등록 완료 | 1.0 |
| `lms.enrollment.deleted` | 수강 등록 취소 | 1.0 |

### 학습 진도 관련

| 이벤트 | 발생 시점 | 버전 |
|--------|----------|------|
| `lms.lesson.started` | 레슨 최초 시작 | 1.0 |
| `lms.lesson.completed` | 레슨 완료 처리 | 1.0 |
| `lms.progress.updated` | 진도율 변경 | 1.0 |

### 강좌 완료 관련

| 이벤트 | 발생 시점 | 버전 |
|--------|----------|------|
| `lms.course.completed` | 강좌 수료 조건 충족 | 1.0 |

---

## 6. Extension 이벤트 핸들러 규칙

### 필수 규칙

1. **멱등성 보장**: 동일 이벤트 중복 수신 시 동일 결과
2. **실패 격리**: 핸들러 실패가 다른 핸들러에 영향 없음
3. **비동기 처리**: 긴 작업은 백그라운드로 위임

### 권장 규칙

1. **타임아웃 설정**: 핸들러 실행 시간 제한
2. **재시도 로직**: 일시적 실패 대응
3. **로깅**: 처리 결과 기록

---

## 7. 이벤트 발행 규칙

### Core 발행 시 규칙

1. 트랜잭션 커밋 **후** 발행
2. 발행 실패 시 재시도 큐 사용
3. 발행 기록 로깅

### 발행 순서

```
1. 비즈니스 로직 수행
2. 데이터 저장 (트랜잭션)
3. 트랜잭션 커밋
4. 이벤트 발행
```

---

## 8. 기준 적용 시점

이 기준은 다음 작업에 선행하여 적용된다:

- LMS 이벤트 정의
- LMS 이벤트 핸들러 개발
- LMS 이벤트 기반 Extension 개발

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
