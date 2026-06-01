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
- `investigations/` — 조사·감사·완료 검증 기록 (IR-* / CHECK-* / AUDIT-*)
- `audit/` — 현상 감사 기록

### 기타
- `templates/` — 서비스·API 템플릿
- `local/` — 로컬 전용 문서 (gitignore, TEST-ACCOUNTS 등)

## 문서 정리 원칙

- **현재 기준 문서**: `baseline/`, `architecture/`, `rbac/` — 유지, 수정 시 WO 필요
- **조사/검증 완료 기록**: `investigations/`, `audit/` — 후속 작업에서 archive 이동 예정
- **삭제**: 별도 IR 확인 후 수행 (단독 판단 금지)

## 참조

현재 활성 Freeze 문서 목록은 `CLAUDE.md §14 Frozen Baselines` 참조.
