# Digital Signage Backend

디지털 사이니지 서비스의 백엔드 모듈입니다.

## 구조

### 콘텐츠 관리
- `contents/`: 콘텐츠 관련 기능
  - 미디어 파일 관리
  - 메타데이터 관리
  - 트랜스코딩
  - 버전 관리

### 디바이스 관리
- `devices/`: 디바이스 관련 기능
  - 디바이스 등록/인증
  - 상태 모니터링
  - 원격 제어
  - 그룹 관리

### 스케줄링
- `scheduling/`: 스케줄링 기능
  - 재생 일정 관리
  - 조건부 재생 로직
  - 우선순위 관리
  - 이벤트 처리

### 모니터링
- `monitoring/`: 모니터링 기능
  - 실시간 상태 추적
  - 로그 수집
  - 알림 처리
  - 문제 진단

### 분석
- `analytics/`: 분석 기능
  - 재생 통계
  - 성능 분석
  - 사용 패턴 분석
  - 리포트 생성

## API 구조
- RESTful API
  - 콘텐츠 API
  - 디바이스 API
  - 스케줄 API
  - 모니터링 API
  - 분석 API

- WebSocket
  - 실시간 디바이스 상태
  - 실시간 콘텐츠 업데이트
  - 긴급 알림
  - 원격 제어

## 데이터 모델
- Content
- Device
- Schedule
- Playlist
- Template
- Log
- Alert
- Report

## 기술 스택
- Node.js/Express
- TypeScript
- PostgreSQL
- Redis
- InfluxDB (시계열 데이터)
- MQTT (디바이스 통신)
- FFmpeg (미디어 처리) 