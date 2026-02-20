# platform-core/

## 디렉토리 목적

**플랫폼 전반의 기준 문서, 아키텍처, 정책, 운영 규칙**

이 디렉토리는 o4o-platform의 핵심 원칙, 아키텍처 결정, 운영 가이드라인, 정책 문서를 포함합니다.

## 주요 내용

### 아키텍처
- `app-api-architecture.md`: API 아키텍처 구조
- `web-server-architecture.md`: 웹 서버 아키텍처
- `core-boundary.md`: 코어 경계 정의

### 정책 및 규칙
- `document-policy.md`: 문서 정책
- `reference-freeze-policy.md`: 레퍼런스 동결 정책
- `beta-lock-rules.md`, `prod-lock-rules.md`: 배포 잠금 규칙

### 운영
- `platform-maintenance-baseline.md`: 플랫폼 유지보수 기준
- `prod-entry-checklist.md`: 프로덕션 진입 체크리스트
- `health-endpoint-standard.md`: 헬스 엔드포인트 표준

### 조사 및 분석
- Cloud SQL 조사
- 마이그레이션 실패 분석
- 배포 실패 타임라인 분석

### 서비스별 구조 문서
- KPA Society 관련 구조 및 표준
- E-Commerce 계약 구조
- Supply 관련 문서

## 관련 디렉토리

- `platform/`: 기능별 상세 스펙 문서
- `architecture/`: 상세 아키텍처 문서
- `operations/`: 운영 관련 문서

## 문서 규칙

- 기준 문서는 반드시 이 디렉토리에 위치
- 최신 상태 유지 필수
- 변경 시 관련 팀 검토 필요
