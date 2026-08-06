# O4O Platform Documentation

O4O Platform의 설계 기준, 아키텍처, 조사 기록을 담은 문서 폴더입니다.

> **현행화 기준**: 2026-08-06 · 최상위 폴더 **27개** · 추적 `.md` **2,952개**
> 이 문서는 `docs/**` 최상위 폴더의 **색인(index)** 이며, 정책 SSOT 가 아닙니다.
> 문서의 상태·보관 규칙은 [`rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) 를 따릅니다.

## 문서 우선 순위

1. `../CLAUDE.md` — 최상위 개발 규칙 (모든 문서보다 우선)
2. `baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` — 사업 철학 SSOT
3. `baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` — 3자 Canonical Flow SSOT
4. 영역별 Freeze / Baseline 문서

## 폴더 구조 (전체 27개)

### 기준 문서 (현재 정책)

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `baseline/` | 52 | Frozen 정책 · Baseline 기준선 (CLAUDE.md §14) |
| `architecture/` | 60 | 아키텍처 설계 · Domain Boundary · Guard Rules |
| `rbac/` | 6 | RBAC 기준선 · Runbook · Role Catalog |
| `platform/` | 27 | 플랫폼 공통 기능 (Content / LMS / HUB / Navigation / Debug) |
| `services/` | 11 | 서비스 정의 · Core APP 구조 |
| `rules/` | 4 | 거버넌스 규칙 (Design Core · Card Design · 문서 생명주기 등) |
| `guides/` | 61 | 콘텐츠 저작 규칙 체계. 진입점 = [`guides/common/DOCUMENT-INDEX.md`](guides/common/DOCUMENT-INDEX.md) (CLAUDE.md 직접 참조) |
| `reference/` | 5 | 참조 문서 (ESM 등) |

### 의사결정 기록

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `adr/` | 4 | Architecture Decision Record (`ADR-0001`, `ADR-0002`, `ADR-TEMPLATE`, README) |
| `decisions/` | 1 | `DECISION-` 형식 단건 결정 기록 |

> `adr/` 과 `decisions/` 는 **역할이 겹친다**. 통합 여부는 아직 판정하지 않았다 (본 색인 범위 밖).

### 작업 문서

| 폴더 | 문서 수 | 역할 | 진입 문서 |
|------|--------:|------|-----------|
| `work-orders/` | 199 | 실행 전·진행 중 WO, 반복 참조 WO | [README](work-orders/README.md) |
| `checks/` | 1,232 | 단일 주제 검증·조사 회차 기록 (`CHECK-` 다수) | [README](checks/README.md) |
| `investigations/` | 714 | IR 조사 기록 · 판단 보류 문서 | [README](investigations/README.md) |
| `ir/` | 23 | IR 조사 기록 (`investigations/` 와 역할 중복) | [README](ir/README.md) |

> **파일명 prefix ≠ 폴더**. `checks/` 에 `WO-` 52건, `investigations/` 에 `CHECK-` 352건이 있다.
> 폴더 판정은 prefix 가 아니라 **문서 내용과 생명주기 상태**로 한다.

### 감사 기록

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `audits/` | 1 | 관리자 권한 감사 기록 |
| `data-audits/` | 1 | 데이터 감사 기록 (`AUDIT-` md + JSON 스냅샷) |

### archive (완료 기록)

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `archive/investigations/` | 289 | 완료된 IR 조사 기록 |
| `archive/audits/` | 153 | 완료된 감사 기록 |
| `archive/checks/` | 29 | 완료된 CHECK 검증 기록 |
| `archive/reports/` | 20 | 완료 보고서 (REPORT · COMPLETION · ROLLOUT 등) |
| `archive/obsolete/` | 10 | 폐기된 기능 문서 (Care · GlucoseView · Point Policy 등) |
| `archive/work-orders/` | 4 | 완료된 일회성 WO 이력 |

> archive 폴더의 문서는 **현재 기준 문서가 아니다**.
> 현재 기준은 `baseline/`, `architecture/`, `rbac/` 를 참조한다.

### 설계·운영 부속

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `design/` | 7 | Design System Baseline · Template Presets · `DESIGN-` 문서 |
| `runbooks/` | 1 | 운영 실행 절차 (의료기기 seed runbook) |
| `registries/` | 1 | 레지스트리 정의 (OTC 그룹 registry) |
| `event-offer/` | 2 | Event Offer 도메인 문서 |

### 서비스별·실험

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `kpa/` | 5 | KPA-Society 서비스 IR·구조 분석 (README 있음) |
| `neture/` | 4 | Neture 서비스 IR·도메인 구조 분석 (README 있음) |
| `market-trial/` | 1 | Neture Market Trial canonical baseline (Extension App, Active) |

### 기타

| 폴더 | 문서 수 | 역할 |
|------|--------:|------|
| `templates/` | 20 | 서비스·API 템플릿 |
| `manual/` | 1 | 사용자 매뉴얼 **빈 골격** (README 외 전부 `.gitkeep`) |
| `local/` | 2 | 로컬 전용 문서 (`*.local.md` 는 gitignore — TEST-ACCOUNTS 등) |

## 문서 정리 원칙

- **현재 기준 문서**: `baseline/`, `architecture/`, `rbac/` — 유지, 수정 시 WO 필요
- **상태·보관 규칙**: [`rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)
- **archive 후보 산출 방법**: [`investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md)
- **삭제**: 별도 IR 확인 후 수행 (단독 판단 금지)

## 참조

현재 활성 Freeze 문서 목록은 `CLAUDE.md §14 Frozen Baselines` 참조.
