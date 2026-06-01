# O4O Platform Documentation

O4O Platform의 설계 기준, 아키텍처, 조사 기록을 담은 문서 폴더입니다.

## 문서 우선 순위

1. `../CLAUDE.md` — 최상위 개발 규칙 (모든 문서보다 우선)
2. `baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` — 사업 철학 SSOT
3. `baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` — 3자 Canonical Flow SSOT
4. 영역별 Freeze / Baseline 문서

## 폴더 구조

### 기준 문서
- `baseline/` — Frozen 정책 · Baseline 기준선 (CLAUDE.md §14 참조)
- `architecture/` — 아키텍처 설계 · Domain Boundary · Guard Rules
- `rbac/` — RBAC 기준선 · Runbook · Role Catalog
- `platform/` — 플랫폼 공통 기능 (Content / LMS / HUB / Navigation / Debug)
- `services/` — 서비스 정의 · Core APP 구조
- `rules/` — 거버넌스 규칙 (Design Core 등)
- `reference/` — 참조 문서 (ESM 등)

### 작업 문서
- `work-orders/` — 실행 계획 · WO 문서
- `investigations/` — 판단 보류 문서 (WO- 형식 등, 이동 전 검토 필요)

### archive (완료 기록)
- `archive/investigations/` — 완료된 IR 조사 기록 (IR-*, WO-* 완료 기록)
- `archive/checks/` — 완료된 CHECK 검증 기록
- `archive/audits/` — 완료된 감사 기록
- `archive/reports/` — 완료 보고서 (REPORT, COMPLETION, ROLLOUT 등)
- `archive/obsolete/` — 폐기된 기능 문서 (Care, GlucoseView 등)

> archive 폴더의 문서는 현재 기준 문서가 아닙니다.
> 현재 기준은 `baseline/`, `architecture/`, `rbac/` 폴더를 참조하세요.

### 기타
- `templates/` — 서비스·API 템플릿
- `local/` — 로컬 전용 문서 (gitignore, TEST-ACCOUNTS 등)

## 문서 정리 원칙

- **현재 기준 문서**: `baseline/`, `architecture/`, `rbac/` — 유지, 수정 시 WO 필요
- **조사/검증 완료 기록**: `archive/investigations/`, `archive/checks/`, `archive/audits/`, `archive/reports/` — Phase 1 이동 완료 (2026-06-01)
- **삭제**: 별도 IR 확인 후 수행 (단독 판단 금지)

## 참조

현재 활성 Freeze 문서 목록은 `CLAUDE.md §14 Frozen Baselines` 참조.
