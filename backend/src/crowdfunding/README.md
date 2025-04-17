# Crowdfunding Backend

크라우드펀딩 서비스의 백엔드 모듈입니다.

## 구조

### 프로젝트 관리
- `projects/`: 프로젝트 관련 기능
  - 프로젝트 CRUD
  - 상태 관리
  - 카테고리 관리
  - 검색/필터링

### 후원 관리
- `pledges/`: 후원 관련 기능
  - 후원 처리
  - 결제 연동
  - 리워드 관리
  - 환불 처리

### 창작자 관리
- `creators/`: 창작자 관련 기능
  - 창작자 인증
  - 프로필 관리
  - 정산 처리
  - 실적 관리

### 결제/정산
- `payments/`: 결제 관련 기능
  - PG사 연동
  - 에스크로 관리
  - 정산 스케줄링
  - 세금 계산

### 커뮤니티
- `community/`: 커뮤니티 기능
  - 댓글 관리
  - 업데이트 관리
  - 알림 시스템
  - 메시징

## API 구조
- RESTful API
  - 프로젝트 API
  - 후원 API
  - 결제 API
  - 사용자 API
  - 통계 API

- WebSocket
  - 실시간 후원 현황
  - 실시간 알림
  - 채팅 기능

## 데이터 모델
- Project
- Pledge
- Reward
- Creator
- Backer
- Payment
- Update
- Comment

## 기술 스택
- Node.js/Express
- TypeScript
- PostgreSQL
- Redis
- MongoDB (로그/통계)
- RabbitMQ
- Elasticsearch 