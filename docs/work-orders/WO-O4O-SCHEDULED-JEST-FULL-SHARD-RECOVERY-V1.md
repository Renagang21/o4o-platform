# 정기 전체 API Jest 3분할 복구

작성일: 2026-11-05. 상태: 구현·로컬 검증 완료, Actions 검증 대기.

## 조사 근거와 범위

정기 검사 [#44](https://github.com/Renagang21/o4o-platform/actions/runs/41930117403)는
`ac42c35b33b1ea2b3829fda2ebc1b8b1b3a15ada`에서 단일 Jest 프로세스를 실행하다
약 4GB 힙 한도 부근에서 `Allocation failed - JavaScript heap out of memory`로
종료했다(exit 134). 이 실행의 실패 원인은 테스트 assertion이 아닌 메모리 고갈이다.
어떤 패키지가 메모리 증가를 유발했는지, Node 패치나 캐시가 원인인지는 아직 확정하지 않았다.

사용자 지시에 따라 전체 범위를 유지하고 3개 runner로 분할한다. Node 22.23.4,
npm 10.9.9, pnpm 10.25.0, frozen lockfile을 유지한다. 힙 한도 증설,
테스트 제외, 실패 무시, 패키지 변경, 운영 배포·DB 변경은 포함하지 않는다.

## TODO와 재점검

- [x] 실제 실패 로그와 종료 코드를 확인한다.
- [x] 현재 main 한 SHA를 고정하고 실제 Jest 전체 목록과 3개 분할의 합집합을 비교한다.
- [x] 각 runner 내부는 `--maxWorkers=1`을 유지하고 전체 할당분을 실행한다.
- [x] 실행 전 전체/분할 목록을 다시 확인하고 실행 후 JSON 보고서와 정확히 대조한다.
- [x] 누락·중복·다른 SHA·취소·OOM·보고서 부재를 집계 실패로 처리한다.
- [x] Node/npm/pnpm, 힙 한도, 최대 RSS, 실행시간, 캐시 정책을 artifact에 기록한다.
- [x] 수동 실행에서 build/Jest 캐시를 함께 끄는 비교 모드를 제공한다.
- [x] 누락 방지·집계 회귀 검사와 정상/실패 경로의 로컬 검증을 실행한다.
- [ ] PR CI 및 리뷰를 확인한다.
- [ ] main 반영 후 실제 전체 3분할 실행과 집계·메모리 기록을 확인한다.

재점검 결과: 선별 실행으로 대체하지 않으며 기존 skipped suite도 전체 목록에 포함한다.
`fail-fast: false`로 다른 shard의 증거를 보존하지만 실패한 shard는 최종 성공으로
바뀌지 않는다. 동일 실행의 실패 잡 재실행에는 고정된 plan과 성공 shard artifact를
재사용하고 해당 shard artifact만 덮어쓴다. 서로 다른 실행의 artifact를 섞지 않는다.

## 구현과 운영

`.github/workflows/scheduled-api-full-jest.yml`은 plan → 3 shards → aggregate 구조다.
`scripts/ci/scheduled-jest.mjs`가 실제 Jest discovery, SHA/정책 digest,
보고서 대조와 집계를 수행한다. Python 표준 라이브러리 `resource`가 자식 Jest의
최대 RSS를 기록한다. 별도 OS 패키지나 외부 계측 서비스는 설치하지 않는다.

수동 실행의 `cache_mode=default`는 기존 캐시 정책을 따른다.
`disabled`는 build cache와 Jest cache를 모두 끈다. 동일 SHA에서 두 모드의
artifact를 비교해야 캐시 영향에 대한 근거가 된다. Node 버전은 비교용으로
임의 변경하지 않으며 저장소 기준과 다르면 실패한다.

각 실행의 `scheduled-jest-plan-<run>` 및 `scheduled-jest-shard-<i>-<run>`
artifact와 최종 `Scheduled full Jest result` summary를 확인한다.
실패 때도 보고서를 업로드한다. OOM으로 JSON 보고서가 없으면 성공 처리하지 않는다.

## 검증 기록

- 분할·집계 단위 검사 및 기존 영향도 계약 검사: **92 PASS**.
- 새 script/test ESLint: PASS. JavaScript 구문 검사: PASS.
- 실제 API discovery: **730 suites**, 3개 분할에 중복·누락 없이 정확히 한 번 포함.
- 캐시 기본/비활성 discovery 모두 같은 730 suites 확인.
- 별도 임시 Jest fixture(3 pass + 3 skip suite)에서 두 캐시 모드의
  plan → 실제 3개 Jest 실행 → aggregate PASS, 실제 RSS 기록 확인.
- 실제 전체 API 실행의 성공 여부와 메모리 상한은 Actions 검증 후 기록한다.
  작은 fixture 결과를 전체 실행의 성능·메모리 결과로 해석하지 않는다.

## 문서 정합

2026-09-24의 `CHECK-O4O-CI-API-JEST-SHARD-PARALLELIZATION-V1`은 일반 CI 분할의
당시 기록이며 당시 정기 검사는 변경하지 않았다고 명시한다. 이 작업은 그 이후의
정기 검사 경로를 변경한다. 과거 실측 기록을 소급 수정하지 않는다.
Node 22 유지 기준과 앱·배포 흐름은 변경하지 않는다.
