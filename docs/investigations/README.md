# docs/investigations

**IR(조사 보고) 기록**과 판단 보류 문서 보관 위치입니다. (2026-08-06 기준 **714**개)

> 이 폴더의 문서는 **조사 시점의 기록**이며 현재 정책 문서가 아닙니다.
> 현재 기준은 `docs/baseline/`, `docs/architecture/`, `docs/rbac/` 를 참조하세요.
> 상태·보관 규칙: [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)

## 이 폴더에 두는 것

- 구조·경계·역할에 대한 **조사 결과와 판정** (`IR-`)
- 판정은 났으나 실행 WO 로 전환되지 않은 **보류 문서**
- 조사 방법 자체를 규정하는 문서 (예: archive 후보 산출 방법)

## 이 폴더에 두지 않는 것

| 성격 | 위치 |
|------|------|
| 실행 전·진행 중 작업요청서 | `docs/work-orders/` |
| 단일 주제 1회성 검증 회차 | `docs/checks/` |
| 확정된 정책·기준선 | `docs/baseline/` · `docs/architecture/` |
| 종료 후 참조가 끊긴 기록 | `docs/archive/investigations/` |

## 파일명 prefix 주의

**prefix 는 폴더를 결정하지 않는다.** 실측(2026-08-06):

| prefix | 건수 |
|--------|-----:|
| `CHECK-` | 352 |
| `IR-` | 346 |
| `SMOKE-` | 9 |
| `WO-` / `PROPOSAL-` / `DRAFT-` / `DECISION-` / `BACKLOG-` | 각 1 |

`CHECK-` 문서가 이 폴더의 절반을 차지한다. **판정은 문서 내용으로 한다.**

## `docs/ir/` 와의 관계 (미해소 중복)

`docs/ir/` (23개) 도 IR 조사 기록을 담고 있으며 **두 폴더 모두 현재 사용 중**이다.

| | `docs/investigations/` | `docs/ir/` |
|---|---|---|
| 문서 수 | 714 | 23 |
| 최초 기록 | 2026-02-05 | 2026-05-04 (`02dcd8878`) |
| 최근 기록 | 2026-08-06 (`0015f8d2b`) | 2026-08-01 (`384e3d78b`) |

**이 중복은 본 색인 작업의 범위 밖이며 통합·이름 변경을 하지 않는다.** 사실만 기록한다.
신규 IR 은 관행상 문서 수가 많은 이 폴더(`docs/investigations/`)에 둔다.

## archive 이동

개별 판단으로 옮기지 않는다. 후보 산출은
[`IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md) 의 절차를 따르고, 이동 대상은 `docs/archive/investigations/` 이다.
