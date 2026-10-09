# WO-O4O-PHARMACY-HUB-CANONICAL-INDEX-ALIGNMENT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-09
> **근거**: 사용자 확정 PH 완전 퇴역 · PR #373의 정본 정합 리뷰 · `AGENTS.md` §8 및 `CANONICAL-INDEX.md` §0
> **착수 main**: `8fa26f9293` · **검토 main**: `03f9729856`
> **검토 base**: PR #373 branch `wo/pharmacy-hub-full-retirement-v1`의 `8d72542589` · **branch**: `wo/pharmacy-hub-canonical-index-alignment-v1`

**선행조건 상태:** PR #373은 아직 OPEN이며 main에 반영되지 않았다. 검토 base와의 branch 결합은 main 통합이 아니다. 선행 PR merge 후에만 이 PR의 base를 main으로 변경하고 그 실제 main SHA·최신 문서 검증 결과를 기록한다.

## 1. 목적과 범위

옛 PH 서비스 모델을 ACTIVE 정본으로 읽어 퇴역 기능을 복구하는 문서 모순을 제거한다. canonical index 상태 변경은 별도 WO로 해야 하므로 PH 코드 제거와 구분한 문서 작업이다.

`docs/CANONICAL-INDEX.md`의 PH 모델 행을 SUPERSEDED로 바꾸고 대체 문서인 `DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` §16을 표시한다. 다른 정본의 상태나 정책은 바꾸지 않는다. 원문을 삭제·archive 이동하지 않으며 코드·DB·배포·인프라 변경은 없다.

## 2. ToDo와 통합 순서

1. 사용자 결정과 PR #373의 현행 DESIGN §16·PH baseline 상태 줄을 대조한다.
2. 색인의 PH 행과 최종 갱신 이력을 정정하고 링크·민감정보·diff를 검사한다.
3. 별도 문서 PR로 준비한다. **PR #373을 먼저 main에 반영한 뒤 이 문서 PR을 통합한다.** #373의 DESIGN §16과 표준 SUPERSEDED 표기를 이 문서 PR의 선행조건으로 둔다. 검토 중에는 #373 branch를 base로 두고 그 변경을 결합해 새 정본과 상태 줄을 함께 검토한다. #373 main 반영 후 base를 main으로 변경하고 최신 main의 문서 diff·required CI를 확인한 뒤 통합한다. 이 PR을 #373 branch에 먼저 merge하지 않는다.

이 WO의 PR 준비는 main 반영·실제 PH 인프라 삭제 완료를 뜻하지 않는다. main 통합은 `AGENTS.md` §4-1(e)의 사용자 승인 후 PR merge로 수행한다. 배포 판정은 문서-only `NOT_APPLICABLE`이다.

## 3. 검증

PH 행은 1개이며 ACTIVE 상태가 아니다. 대체 DESIGN 링크와 WO 링크가 존재한다. `git diff --check`와 문서 민감정보 검사를 수행한다. 코드 동작이 바뀌지 않으므로 새 회귀 테스트를 만들지 않는다.
