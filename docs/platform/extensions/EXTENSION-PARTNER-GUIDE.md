# Extension 파트너 개발 가이드

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: 외부 파트너 Extension 개발
> **관련 문서**: `EXTENSION-GENERAL-GUIDE.md`, `LMS-CORE-CONTRACT.md`

---

## 1. 파트너 Extension이란

파트너 Extension은 o4o 플랫폼 외부 파트너가 개발하는 Extension이다.

### 1.1 내부 vs 파트너 Extension

| 구분 | 내부 Extension | 파트너 Extension |
|------|---------------|-----------------|
| 개발 주체 | o4o 플랫폼 팀 | 외부 파트너 |
| Core 접근 | 전체 API | 공개 API만 |
| 권한 | 전체 권한 가능 | 제한된 권한 |
| 배포 | 직접 배포 | 승인 후 배포 |

### 1.2 파트너 Extension 예시

- 수료증 발급 Extension
- 외부 LMS 연동 Extension
- 학습 분석 Extension
- 알림 서비스 Extension

---

## 2. 개발 시작하기

### 2.1 사전 요구사항

1. 파트너 등록 완료
2. API 키 발급
3. 개발 환경 접근 권한
4. Extension 개발 가이드 숙지

### 2.2 개발 환경 설정

```bash
# Extension 템플릿 클론
git clone https://github.com/o4o-platform/extension-template.git my-extension

# 의존성 설치
cd my-extension
npm install

# 개발 서버 시작
npm run dev
```

### 2.3 API 키 설정

```env
# .env.development
O4O_API_KEY=your-api-key
O4O_API_ENDPOINT=https://dev-api.o4o-platform.com
```

---

## 3. 공개 API 사용

### 3.1 인증

```typescript
import { O4OClient } from '@o4o/sdk';

const client = new O4OClient({
  apiKey: process.env.O4O_API_KEY,
  endpoint: process.env.O4O_API_ENDPOINT
});
```

### 3.2 사용 가능한 API

| API | 설명 | 권한 |
|-----|------|------|
| Enrollment | 수강 등록 조회 | `enrollment.read` |
| Progress | 학습 진도 조회 | `progress.read` |
| Course | 강좌 정보 조회 | `course.read` |
| User | 사용자 정보 조회 | `user.read` |

### 3.3 API 호출 예시

```typescript
// 수강 등록 조회
const enrollments = await client.enrollment.list({
  courseId: 'course-1',
  status: 'active'
});

// 학습 진도 조회
const progress = await client.progress.get({
  enrollmentId: 'enr-1'
});
```

---

## 4. 이벤트 구독

### 4.1 구독 가능한 이벤트

| 이벤트 | 설명 |
|--------|------|
| `lms.enrollment.created` | 수강 등록 생성 |
| `lms.enrollment.deleted` | 수강 등록 삭제 |
| `lms.lesson.completed` | 레슨 완료 |
| `lms.course.completed` | 강좌 완료 |

### 4.2 Webhook 설정

```typescript
// manifest.json
{
  "webhooks": {
    "endpoint": "https://your-domain.com/webhooks/o4o",
    "events": ["lms.enrollment.created", "lms.course.completed"],
    "secret": "webhook-secret"
  }
}
```

### 4.3 Webhook 핸들러

```typescript
// Express 예시
app.post('/webhooks/o4o', (req, res) => {
  const signature = req.headers['x-o4o-signature'];

  // 서명 검증
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  switch (event.eventType) {
    case 'lms.enrollment.created':
      handleEnrollmentCreated(event.payload);
      break;
    case 'lms.course.completed':
      handleCourseCompleted(event.payload);
      break;
  }

  res.status(200).send('OK');
});
```

---

## 5. 데이터 저장

### 5.1 파트너 데이터 영역

- 파트너 Extension은 자체 데이터베이스 사용
- o4o 플랫폼 DB에 직접 접근 불가
- 필요한 데이터는 API로 조회 후 캐싱

### 5.2 데이터 동기화

```typescript
// 권장: 이벤트 기반 동기화
async function handleEnrollmentCreated(payload) {
  const { enrollmentId, userId, courseId } = payload;

  // 로컬 DB에 필요한 정보 저장
  await localDb.enrollments.create({
    o4oEnrollmentId: enrollmentId,
    o4oUserId: userId,
    o4oCourseId: courseId,
    syncedAt: new Date()
  });
}
```

---

## 6. 권한 관리

### 6.1 권한 신청

```json
// manifest.json
{
  "permissions": {
    "required": ["enrollment.read", "progress.read"],
    "optional": ["user.read"]
  }
}
```

### 6.2 권한 승인 절차

1. manifest.json에 권한 선언
2. Extension 제출 시 권한 검토
3. o4o 플랫폼 팀 승인
4. 운영자가 Extension 설치 시 최종 승인

### 6.3 권한 제한

| 금지 권한 | 사유 |
|----------|------|
| `*.write` | 파트너는 데이터 수정 불가 |
| `admin.*` | 관리자 기능 접근 불가 |
| `system.*` | 시스템 설정 접근 불가 |

---

## 7. UI 통합

### 7.1 대시보드 위젯

```typescript
// 위젯 등록
{
  widgetId: 'partner-analytics',
  displayName: '학습 분석',
  component: AnalyticsWidget,
  position: 'dashboard-sidebar',
  permissions: ['analytics.view']
}
```

### 7.2 UI 가이드라인

| 항목 | 규칙 |
|------|------|
| 스타일 | o4o 디자인 시스템 사용 |
| 아이콘 | 플랫폼 아이콘 세트 사용 |
| 레이아웃 | 지정된 영역 내에서만 |
| 반응형 | 모든 브레이크포인트 지원 |

---

## 8. 테스트 환경

### 8.1 개발 환경

- 별도 개발 환경 제공
- 테스트 데이터 사용
- API 호출 로깅

### 8.2 테스트 계정

```env
# 테스트 계정 (개발 환경 전용)
TEST_USER_ID=test-user-1
TEST_COURSE_ID=test-course-1
```

---

## 9. 제출 및 승인

### 9.1 제출 체크리스트

- [ ] manifest.json 완성
- [ ] 모든 테스트 통과
- [ ] 문서화 완료
- [ ] 보안 검토 완료
- [ ] 성능 테스트 통과

### 9.2 제출 절차

1. Extension 패키지 생성
2. 파트너 포털에서 제출
3. 자동 검증 (린트, 테스트)
4. 보안 검토
5. 기능 검토
6. 승인 또는 피드백

### 9.3 승인 기준

| 항목 | 기준 |
|------|------|
| 보안 | 취약점 없음 |
| 성능 | API 응답 < 500ms |
| 안정성 | 에러율 < 0.1% |
| 문서 | 사용자 가이드 포함 |

---

## 10. 운영

### 10.1 모니터링

- API 호출 대시보드 제공
- 에러 알림 설정 가능
- 사용량 통계 확인

### 10.2 지원

| 채널 | 용도 |
|------|------|
| 파트너 포럼 | 일반 질문 |
| 이메일 | 기술 지원 |
| 긴급 연락처 | 장애 대응 |

---

## 11. 제한 사항

### 11.1 API 제한

| 항목 | 제한 |
|------|------|
| 요청 수 | 1000회/분 |
| 페이로드 | 1MB/요청 |
| 동시 연결 | 100개 |

### 11.2 기능 제한

- Core 기능 수정 불가
- 다른 Extension 접근 불가
- 운영자 권한 기능 불가

---

## 12. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
