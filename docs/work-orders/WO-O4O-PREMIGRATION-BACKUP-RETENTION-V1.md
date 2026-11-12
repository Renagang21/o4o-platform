# migration 전 Cloud SQL 백업 보관 · 정리

> **상태**: ACTIVE
> **작성일**: 2026-11-12 · **최종 갱신**: 2026-11-12
> **실행 위치**: BOTH (권한 LOCAL 완료 · 코드 CLOUD)
> **인계**: wo/premigration-backup-retention · push 전 · 다음 실행자 CLOUD
> **근거**: 2026-11-12 통합 담당 확정(보관 30일 + 최근 5개 · 정리 단계 추가 · 삭제 권한 승인) · PR #1028(migration 전 백업 단계 도입)

## 1. 배경

- PR #1028 이 `deploy-api.yml` 에 「Back up Cloud SQL before migrations」 단계를 넣는다.
  - 인스턴스 `o4o-platform-db` 의 on-demand 백업을 만든다.
  - 설명은 `pre-migration-<IMAGE_TAG 앞 12자>-<GITHUB_RUN_ID>-<GITHUB_RUN_ATTEMPT>` 이다.
  - 백업이 `SUCCESSFUL` 이 아니면 migration · 배포를 멈춘다(fail-closed).
- on-demand 백업은 Cloud SQL 이 자동으로 지우지 않는다. 그대로 두면 migration 할 때마다 쌓이고 저장 비용이 는다.
- 자동 일일 백업(인스턴스 설정의 보존 개수)은 이 문서의 대상이 아니다.

## 2. 사용자 확정 (2026-11-12)

- 보관 기준: **30일**. 단 **최근 5개는 기간과 상관없이 남긴다**.
- 정리는 배포 workflow 안에서 한다. 백업과 migration 이 성공한 뒤에만 실행한다.
- 배포 계정의 커스텀 역할에 삭제 권한을 추가한다.

## 3. 설계 판단

| 항목 | 결정 | 근거 |
|---|---|---|
| 대상 | `type=ON_DEMAND` 이면서 설명이 `pre-migration-` 으로 시작하는 백업만 | 자동 백업 · 사람이 따로 만든 백업을 지우지 않는다 |
| 삭제 조건 | 최신순 6번째 이후 **이고** 생성 30일 초과 | 두 조건을 모두 만족할 때만 지운다. migration 이 뜸해도 최소 5개가 남는다 |
| 실행 시점 | migration 단계 성공 직후 | 방금 만든 백업이 확인된 뒤에만 오래된 것을 지운다 |
| 실패 처리 | 정리 실패는 **경고만** 남기고 배포를 계속한다(`continue-on-error` 또는 `::warning::`) | 정리는 비용 문제다. 배포를 막을 이유가 아니다 |
| 한 번에 지울 수 | 최대 10개 | 필터 오류로 대량 삭제되는 것을 막는다 |
| 기록 | 지운 백업의 설명과 생성일을 `GITHUB_STEP_SUMMARY` 에 적는다 | 나중에 무엇이 지워졌는지 확인할 수 있다 |
| 권한 | 커스텀 역할 `o4oCloudSqlPreMigrationBackup` 에 `cloudsql.backupRuns.delete` 추가 — **2026-11-12 LOCAL 완료**(통합 담당 승인). 역할은 `github-actions` 배포 계정에 프로젝트 단위로 붙어 있다 | 넓은 기존 역할(`cloudsql.admin` 등)을 쓰지 않는다 |

## 4. 범위 밖

- 자동 일일 백업 보존 설정 변경.
- 이미 쌓인 백업의 수동 일괄 삭제(첫 정리 실행이 처리한다 — 최대 10개씩).
- 백업 단계 자체(#1028)의 동작 변경.

## 5. TODO

- [x] T0 [LOCAL] 커스텀 역할에 `cloudsql.backupRuns.delete` 추가 — 2026-11-12 완료. 현재 권한: `create` · `delete` · `get` · `list`
- [ ] T1 [CLOUD] PR #1028 병합 확인 후 최신 `origin/main` 에서 시작
- [ ] T2 [CLOUD] `deploy-api.yml` 의 migration 단계 뒤에 정리 단계 추가(§3 표 그대로)
  - 백업 단계가 꺼진 실행(`backup_before_migration == 'false'`)에서도 정리 단계는 돌아도 된다. 단 migration 이 실패하면 돌지 않는다.
  - 정렬 · 필터 로직은 셸 한 줄로 몰아넣지 말고 테스트할 수 있는 스크립트(`scripts/ci/` 아래)로 뺀다.
- [ ] T3 [CLOUD] 회귀 테스트(`scripts/ci/__tests__/`)
  - 5개 이하 → 아무것도 지우지 않음
  - 7개 중 30일 초과가 1개(가장 오래된 것) → 1개 삭제
  - 최근 5개 안에 30일 초과가 있어도 지우지 않음
  - `pre-migration-` 이 아닌 설명 · 자동 백업은 지우지 않음
  - 대상이 10개를 넘으면 10개만 지움
  - 테스트 파일을 `ci-pipeline.yml` 의 스크립트 테스트 목록에 추가
- [ ] T4 [CLOUD] commit · push · 인계 기록(CI · 배포 workflow 변경이라 별도 PR — AGENTS.md §4-1(e) 묶음 단위)

## 6. 검증 계획

- 로컬: 위 회귀 테스트 통과.
- 병합 후 첫 migration 배포에서 확인(통합 세션):
  - 정리 단계 결과가 step summary 에 남는다.
  - `gcloud sql backups list --instance=o4o-platform-db --filter="type=ON_DEMAND"` 로 남은 `pre-migration-` 백업이 5개 이상이고, 6번째 이후에는 30일을 넘은 것이 없다.

## 문서 정합

해당 없음.
