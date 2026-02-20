# LMS Core 계약 (Contract) + 이벤트 표준

> **상태**: Baseline (확정)
> **적용 범위**: LMS Core–Extension 인터페이스 및 이벤트
> **관련**: `LMS-CORE-EXTENSION-PRINCIPLES.md`, `LMS-INSTRUCTOR-ROLE-V1-FREEZE.md`

---

## 1. 계약이란

Core–Extension 간 **명시적 인터페이스 정의**이다.
- Extension은 이 계약을 통해서만 Core와 상호작용
- Core는 계약 유지 시 내부 구현 자유 변경 가능
- 계약 변경 시 버전 관리 필수

---

## 2. 서비스 인터페이스

| 서비스 | 제공 기능 |
|--------|----------|
| CourseService | 강좌 조회, 생성, 수정 |
| EnrollmentService | 수강 등록, 해제, 조회 |
| ProgressService | 진도 조회, 업데이트 |
| CompletionService | 완료 처리, 완료 조회 |

### 데이터 타입

| 타입 | 용도 |
|------|------|
| Course | 강좌 정보 DTO |
| Enrollment | 수강 등록 DTO |
| Progress | 진도 상태 DTO |
| Completion | 완료 정보 DTO |

---

## 3. 이벤트 표준

### 네이밍: `{domain}.{entity}.{action}`

- 도메인: 소문자 단수 (`lms`, `content`)
- 엔티티: 소문자 단수 (`course`, `enrollment`)
- 액션: 과거형 (`created`, `completed`)

### 페이로드

```typescript
interface BaseEvent {
  eventId: string;        // UUID
  eventType: string;      // 이벤트 이름
  timestamp: string;      // ISO 8601
  version: string;        // 스키마 버전
  source: string;         // "lms-core"
}
```

### Core 발행 이벤트 (v1.0)

| 이벤트 | 발생 시점 |
|--------|----------|
| `lms.enrollment.created` | 수강 등록 |
| `lms.enrollment.deleted` | 수강 취소 |
| `lms.lesson.started` | 레슨 최초 시작 |
| `lms.lesson.completed` | 레슨 완료 |
| `lms.progress.updated` | 진도 변경 |
| `lms.course.completed` | 강좌 수료 조건 충족 |

### 이벤트 버전 호환

| 변경 유형 | 버전 | 하위 호환 |
|----------|------|----------|
| optional 필드 추가 | minor | ✅ |
| required 필드 추가/삭제/변경 | major | ❌ |

---

## 4. Extension 규칙

### 등록 시 필수 정보
- Extension 고유 ID
- 제공하는 훅/콜백 목록
- 필요한 권한 목록

### 이벤트 핸들러 규칙
1. **멱등성 보장** — 동일 이벤트 중복 수신 시 동일 결과
2. **실패 격리** — 핸들러 실패가 Core 동작 중단시키지 않음
3. **비동기 처리** — 긴 작업은 백그라운드 위임

### 이벤트 발행 순서
```
비즈니스 로직 → 데이터 저장 → 트랜잭션 커밋 → 이벤트 발행
```

---

## 5. 버전 관리

```
lms-core-contract@{major}.{minor}.{patch}
```

| 변경 유형 | 예고 기간 | 이전 버전 유지 |
|----------|----------|---------------|
| patch | 없음 | 없음 |
| minor | 1주 | 1개월 |
| major | 1개월 | 3개월 |

---

## 6. 위반 처리

| Core 위반 시 | Extension 위반 시 |
|-------------|-----------------|
| 버전 롤백 | Extension 비활성화 |
| 영향 Extension 확인 | 로그 기록 |
| 긴급 패치 배포 | 관리자 알림 |

---

*이 문서는 CLAUDE.md §16에서 참조하는 기준 문서이다.*
