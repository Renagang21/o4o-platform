# LMS Backend

학습 관리 시스템의 백엔드 모듈입니다.

## 구조

### 코스 관리
- `courses/`: 코스 관련 기능
  - 코스 CRUD
  - 커리큘럼 관리
  - 콘텐츠 관리
  - 진도 관리

### 사용자 관리
- `users/`: 사용자 관련 기능
  - 학습자 관리
  - 강사 관리
  - 권한 관리
  - 그룹 관리

### 학습 활동
- `activities/`: 학습 활동 관리
  - 과제 관리
  - 퀴즈/시험
  - 토론/포럼
  - 진도 추적

### 평가
- `assessment/`: 평가 관련 기능
  - 시험 관리
  - 자동 채점
  - 성적 관리
  - 피드백 관리

### 분석
- `analytics/`: 학습 분석 기능
  - 학습 진도 분석
  - 성과 분석
  - 참여도 분석
  - 맞춤형 추천

## API 구조
- RESTful API
  - 코스 API
  - 사용자 API
  - 학습 활동 API
  - 평가 API
  - 분석 API

- WebSocket
  - 실시간 토론
  - 실시간 알림
  - 온라인 상태 관리
  - 실시간 피드백

## 데이터 모델
- Course
- User
- Enrollment
- Activity
- Assessment
- Progress
- Grade
- Discussion

## 기술 스택
- Node.js/Express
- TypeScript
- PostgreSQL
- Redis
- MongoDB (학습 데이터)
- Elasticsearch (검색)
- RabbitMQ (메시징) 