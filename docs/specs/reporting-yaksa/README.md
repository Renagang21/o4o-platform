# Reporting-Yaksa Extension App

> 약사회 신상신고 시스템

---

## Overview

`reporting-yaksa`는 약사회 회원의 연간 신상신고서를 관리하는 Extension App입니다.

### 핵심 기능

- 연간 신상신고서 작성/제출
- 관리자 승인/반려 워크플로우
- 승인 시 Membership-Yaksa 자동 동기화
- 감사 로그 자동 기록
- 동적 템플릿 기반 폼

---

## Architecture

```
reporting-yaksa (Extension App)
    ↓ depends on
membership-yaksa (Extension App)
    ↓ depends on
organization-core (Core App)
```

---

## Entities

| Entity | Table | Description |
|--------|-------|-------------|
| AnnualReport | `yaksa_annual_reports` | 신상신고서 |
| ReportFieldTemplate | `yaksa_report_field_templates` | 연도별 필드 템플릿 |
| ReportLog | `yaksa_report_logs` | 감사 로그 |
| ReportAssignment | `yaksa_report_assignments` | 승인 담당자 지정 |

---

## API Endpoints

### 회원용

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reporting/my-report` | 내 신고서 조회 (현재 연도) |
| GET | `/api/reporting/my-reports` | 내 모든 신고서 목록 |
| POST | `/api/reporting/my-report` | 신고서 생성 |
| PUT | `/api/reporting/my-report` | 신고서 수정 |
| POST | `/api/reporting/my-report/submit` | 신고서 제출 |
| GET | `/api/reporting/my-report/:id/logs` | 신고서 로그 조회 |

### 관리자용

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reporting/reports` | 신고서 목록 |
| GET | `/api/reporting/reports/stats` | 통계 |
| GET | `/api/reporting/reports/:id` | 상세 조회 |
| PATCH | `/api/reporting/reports/:id/approve` | 승인 |
| PATCH | `/api/reporting/reports/:id/reject` | 반려 |
| PATCH | `/api/reporting/reports/:id/request-revision` | 수정 요청 |
| POST | `/api/reporting/reports/:id/sync` | 수동 동기화 |
| POST | `/api/reporting/sync-all` | 일괄 동기화 |

### 템플릿 관리

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reporting/templates` | 템플릿 목록 |
| GET | `/api/reporting/templates/current` | 현재 활성 템플릿 |
| POST | `/api/reporting/templates` | 템플릿 생성 |
| PUT | `/api/reporting/templates/:id` | 템플릿 수정 |
| PATCH | `/api/reporting/templates/:id/activate` | 활성화 |
| POST | `/api/reporting/templates/:id/duplicate` | 복제 |

---

## Workflow

```
[draft] → [submitted] → [approved] → (synced to membership)
                      ↘ [rejected]
                      ↘ [revision_requested] → [draft]
```

1. 회원이 신고서 작성 (draft)
2. 회원이 제출 (submitted)
3. 관리자 검토
   - 승인 → approved → Membership-Yaksa에 데이터 동기화
   - 반려 → rejected (사유 기록)
   - 수정 요청 → revision_requested → draft로 복귀

---

## Permissions

| ID | Name | Description |
|----|------|-------------|
| `reporting.my.read` | 내 신고서 조회 | 자신의 신고서 조회 |
| `reporting.my.write` | 내 신고서 작성 | 신고서 작성/수정/제출 |
| `reporting.admin.read` | 관리 조회 | 전체 신고서 조회 |
| `reporting.admin.approve` | 승인/반려 | 신고서 승인 권한 |
| `reporting.admin.sync` | 동기화 | 회원정보 동기화 권한 |
| `reporting.template.read` | 템플릿 조회 | 템플릿 조회 권한 |
| `reporting.template.manage` | 템플릿 관리 | 템플릿 CRUD 권한 |

---

## Related Documents

- [Extension App Guideline](../../app-guidelines/extension-app-guideline.md)
- [Manifest Specification](../../app-guidelines/manifest-specification.md)
- [Backend Structure](../../app-guidelines/backend-structure.md)

---

*최종 업데이트: 2025-12-10*
