# 펀딩 운영 심사·참여 처리 흐름 정비 검증

> 작성일: 2026-10-14 · 최종 갱신: 2026-10-14
> 상태: 개발 검증 PASS · [PR #583](https://github.com/Renagang21/o4o-platform/pull/583) 인계
> 작업: [WO](../work-orders/WO-FUNDING-OPERATOR-WORKFLOW-REFINEMENT-V1.md)

## 결과

- 기존 승인·반려·수동 단계 전이·포럼 복구·입금·이행·CSV API와 상태 전이를 유지했다.
- 요청/읽기 모델을 `useFundingOperatorWorkflow`와 `fundingOperatorModel`로 분리했다. 심사 입력·표시는 상세 화면, 입금 입력은 기존 참여 섹션이 소유한다.
- 쓰기는 작업 종류와 관계없이 동기 ref 잠금 하나로 직렬화한다. 조회 복구 중/최신 현황 확인 실패 시 추가 쓰기를 차단한다.
- 저장 실패에는 입력을 유지하고, 저장 성공/재조회 실패에는 완료 사실을 안내하며 상세·참여·KPI 조회만 재시도한다. 상세·참여 조회 실패를 저장 실패로 반환하지 않는다.
- KPI는 본문/쓰기 완료를 막지 않는 보조 조회다. 실패한 KPI는 제거하고 재조회 안내를 표시한다. 늦은 KPI가 최신 결과를 덮지 않는 기존 방어를 유지한다.
- ID별 workspace로 필터·오류·심사/입금 입력과 잠금 수명을 구분한다. 이전 workspace의 응답/보관된 콜백은 새 workspace를 수정하거나 요청을 시작하지 않는다.

## 실행 근거

| 검증 | 결과 |
|---|---|
| Node 22.18.0 / pnpm 10.25.0, frozen install·store integrity | 설치 완료, manifest/lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| Neture 전체 Vitest (`--config services/web-neture/vitest.config.mjs --maxWorkers=2 --minWorkers=1`) | 99 files / 893 tests PASS |
| 운영 상세·참여 섹션·workflow·개설자 회귀 부분집합 | 4 files / 36 tests PASS (전체 집계에 포함) |
| `pnpm --dir services/web-neture run build` (`tsc && vite build`) | PASS, 기존 큰 chunk 경고 유지 |
| Chromium 실제 컴포넌트 + 합성 API, PC 1440×1000 / 모바일 390×844 | 두 viewport PASS |
| 활성 원문 소비처 검사 (상세 화면·참여 섹션) | 각각 0건 |
| `git diff --check` | PASS |

브라우저에서는 단계 저장 후 상세 조회 실패→읽기 복구(상태 저장 1회), 입금 저장 실패→메모 유지→저장 성공/참여 조회 실패→읽기 복구(성공 저장 재호출 없음), 현재 필터 CSV, 저장 중 대상 전환·늦은 응답, 필터 초기화와 화면 전체 가로 넘침 없음을 확인했다. 실제 화면 코드를 사용하고 API만 합성했다. 운영 계정·DB에 쓰지 않았다.

로컬 실행 로그/합성 fixture/스크린샷은 `/tmp/funding-*`에 보관하며 저장소에는 추가하지 않는다. 자동화 회귀 테스트는 위 소스 경로에 포함한다. 로컬 검증은 실계정 권한/실제 송금/배포 검증을 대체하지 않는다.

## 최신 main 반영

PR #579가 포함된 `origin/main d9dce2e5a4` 위로 미공개 작업 commit을 rebase했다. 펀딩 소스 충돌 없음. 상류의 KPA/공통 모듈 변경을 보존했으며, 소스를 직접 export하는 operator-core-ui에는 별도 build script가 없어 Neture 소비처의 `tsc && vite build`로 검증했다. 반영 후 Neture 빌드와 관련 4 files/36 tests 재검증 PASS.

## 범위·인계

- 개설자는 supplier API로 개설 진행·포럼 회원 관리, 운영자는 operator API로 심사·입금 확인을 담당한다. 개설자 화면을 같은 hook으로 합치지 않았다.
- API·DB·권한·commerce·공유 패키지 계약·약사회 분회 변경 없음. 입금/환불은 오프라인 처리 기록이며 송금 실행이나 포럼 자동 가입을 추가하지 않았다.
- 기존 심사 체크리스트의 매장 랜딩 추적 문구는 content-only 정본과 별도 정합 점검 후보로 남긴다. 이번 구조 정비에서 새 운영 정책을 만들지 않는다.
- main 병합·배포는 별도 통합 담당. PR의 실제 HEAD·CI·리뷰 상태를 확인한 뒤 인계받아 진행한다. 실계정 검증은 사용자 담당.
