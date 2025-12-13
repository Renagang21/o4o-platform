# diabetes-pharmacy

DiabetesCare Pharmacy Extension App - 혈당관리 세미프랜차이즈 약국 운영 실행 App

## 개요

diabetes-core의 Pattern 결과를 약국이 '실행 가능한 Action'으로 확인하고 선택할 수 있는 Extension App입니다.

## App Identity

| 항목 | 값 |
|------|-----|
| App ID | `diabetes-pharmacy` |
| Type | `extension` |
| 역할 | 혈당관리 세미프랜차이즈 약국 운영 실행 App |
| Core 의존성 | `diabetes-core` |

## Action Types

| Type | 설명 |
|------|------|
| COACHING | 코칭 세션 시작 |
| DISPLAY | 정보 표시 (리포트, 패턴 설명) |
| SURVEY | 설문/조사 요청 |
| COMMERCE | 상품 연결 (비의약품만) |
| NONE | Action 안 함 |

## 설치

```bash
pnpm install
pnpm build
```

## 주요 기능

- Dashboard: 관리 대상자 수, 패턴 감지 수, 실행 가능한 Action 개수 표시
- Actions: Pattern에서 파생된 Action 목록 표시 및 실행

## API Endpoints

- `GET /api/v1/diabetes-pharmacy/dashboard` - 대시보드 요약
- `GET /api/v1/diabetes-pharmacy/actions` - Action 목록

## Phase 2 범위

- diabetes-pharmacy Extension App 설치 가능
- Dashboard 진입 가능
- Actions 목록 표시
- Action 클릭 시 다른 App 이동 또는 준비중 처리

## 관련 문서

- Work Order: Phase 2 Work Order
- 조사 보고서: docs/reports/pharmacy-ops-investigation-report.md
