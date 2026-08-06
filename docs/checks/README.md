# docs/checks

단일 주제에 대한 **검증·조사 회차 기록** 보관 위치입니다. (2026-08-06 기준 **1,232**개)

> 이 폴더의 문서는 **작업 기록**이며 현재 정책 문서가 아닙니다.
> 현재 기준은 `docs/baseline/`, `docs/architecture/`, `docs/rbac/` 를 참조하세요.
> 상태·보관 규칙: [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)

## 이 폴더에 두는 것

- 특정 화면·API·데이터에 대한 **1회성 검증 결과** (`CHECK-`)
- 생산·배치 작업의 **회차별 실행 기록**
- 위 기록에 직접 딸린 산출물 (`artifacts/` — 대용량 CSV 는 gitignore)

## 이 폴더에 두지 않는 것

| 성격 | 위치 |
|------|------|
| 실행 전·진행 중 작업요청서 | `docs/work-orders/` |
| 구조·경계 판정을 남기는 조사 | `docs/investigations/` |
| 확정된 정책·기준선 | `docs/baseline/` · `docs/architecture/` |
| 종료 후 참조가 끊긴 기록 | `docs/archive/checks/` |

## 파일명 prefix 주의

**prefix 는 폴더를 결정하지 않는다.** 실측(2026-08-06):

| prefix | 건수 |
|--------|-----:|
| `CHECK-` | 1,173 |
| `WO-` | 52 |
| `HFF-` | 4 |
| `VERIFY-` / `SMOKE-` / `IR-` | 각 1 |

`WO-` prefix 문서가 이 폴더에 있다고 해서 실행 대기 WO 가 아니며, 반대로 `CHECK-` 문서가 `docs/work-orders/` 에 있는 경우도 있다. **판정은 문서 내용으로 한다.**

## archive 이동

개별 판단으로 옮기지 않는다. 후보 산출은
[`../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md) 의 절차를 따르고, 이동 대상은 `docs/archive/checks/` 이다.
