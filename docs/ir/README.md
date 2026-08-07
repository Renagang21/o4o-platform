# docs/ir

**IR(조사 보고) 기록** 보관 위치입니다. (2026-08-06 기준 **23**개)

> 이 폴더의 문서는 **조사 시점의 기록**이며 현재 정책 문서가 아닙니다.
> 현재 기준은 `docs/baseline/`, `docs/architecture/`, `docs/rbac/` 를 참조하세요.
> 상태·보관 규칙: [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)

## `docs/investigations/` 와의 관계 (미해소 중복)

이 폴더는 `docs/investigations/` (714개) 와 **역할이 사실상 같다**. 두 폴더 모두 현재 사용 중이다.

| | `docs/ir/` | `docs/investigations/` |
|---|---|---|
| 문서 수 | 23 | 714 |
| 최초 기록 | 2026-05-04 (`02dcd8878`) | 2026-02-05 |
| 최근 기록 | 2026-08-01 (`384e3d78b`) | 2026-08-06 (`0015f8d2b`) |

**중복 해소(통합·이름 변경·일괄 이동)는 본 색인 작업의 범위 밖이며 수행하지 않는다.** 여기서는 사실만 기록한다.

## 현재 취급 방침

- **기존 문서는 이동하지 않는다.** 외부에서 이 경로를 참조하는 문서가 있을 수 있다.
- **신규 IR 은 `docs/investigations/` 에 작성한다.** (더 큰 쪽으로 수렴)
- 이 폴더의 통합 여부는 별도 판정이 필요하며, 판정 전까지 두 폴더는 **동일 규칙**을 따른다.

## 이 폴더에 두지 않는 것

| 성격 | 위치 |
|------|------|
| 실행 전·진행 중 작업요청서 | `docs/work-orders/` |
| 단일 주제 1회성 검증 회차 | `docs/checks/` |
| 확정된 정책·기준선 | `docs/baseline/` · `docs/architecture/` |
| 종료 후 참조가 끊긴 기록 | `docs/archive/investigations/` |

## archive 이동

개별 판단으로 옮기지 않는다. 후보 산출은
[`../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md) 의 절차를 따른다.
