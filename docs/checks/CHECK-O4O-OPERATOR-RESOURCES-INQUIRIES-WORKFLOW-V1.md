# 서브도메인 자료·문의 운영 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [통합 WO](../work-orders/WO-O4O-OPERATOR-RESOURCES-INQUIRIES-WORKFLOW-V1.md)

## 판정·범위

약국 자료실·약국 협업 문의·강의 문의·Neture 문의 메시지를 하나의 업무 묶음으로 정비했다.
기준 main `c7f2c29eb`, branch `wo/operator-resources-inquiries`. 작업 중 main의 `c9b72ee2a` 이동을 확인했다.
변경은 개별 커뮤니티 회원 운영이며 이번 런타임 파일과 겹치지 않는다. 전체 TODO의 기존 기록을 덮어쓰지 않는다.
main 자동 병합·운영 API/DB·실계정 변경·정책/역할·새 상태 전이·의존성/CI 변경은 없다.
[역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)을 유지하며 중앙 관리자·약사회 분회는 제외한다.

| 문제 | 보완·보존 조건 |
|---|---|
| 자료 목록의 필터 응답 역전·숨은 선택·이전 확인창 | 조회 세대/수명 판정, 필터/페이지별 선택 초기화, 이전 조회의 확인 콜백 차단. 명시적 조회 조건 변경만 이전 처리 안내를 정리 |
| 자료 오류 envelope가 정상 빈 목록으로 표시 | 지원 응답 envelope를 유지하면서 `success:false`·잘못된 목록 shape는 오류로 처리. 조회 실패 중 0개 단정 제거 |
| 단건/일괄 처리와 갱신 분리 부족 | 동기 쓰기 잠금·성공 안내/갱신 실패 보존·조회 전용 재시도. 부분 성공은 실패 ID만 재시도, 삭제 후 마지막 페이지 보정 |
| 기존 자료 편집 옵션의 늦은 초기값·저장 중 닫기/중복 제출 | 편집 세대 판정, 실패 입력·오류 유지, 제출 잠금. 공개 lifecycle/form/AI slot 계약 유지 |
| 강의 문의의 저장 결과가 재조회 오류로 덮이거나 상세 밖에 가려짐 | 문의 내부 hook으로 조회·상세·순차 저장 수명 분리. 상세 안에서 성공/실패/조회 재시도. 상태 성공·메모 실패 후 미완료 메모만 저장 |
| 약국 협업 문의 조회/처리 응답 수명·실패 복구 부족 | 최신 조회만 적용, 실패/재시도·상세 내 결과 표시·중복 쓰기/대상 변경/닫기 보호. pending/reviewing/done 유지 |
| Neture 일괄 확인 성공 후 갱신 실패가 처리 실패처럼 표시 | 처리/조회 결과 분리·동기 중복 잠금·쓰기/갱신 중 필터/페이지 보호·조회만 재시도. 개별 상태/메모 권한을 추가하지 않음 |

## 소비처·원문 계약

- 자료 콘솔의 활성 runtime 소비처는 약국 `OperatorResourcesPage` 1곳, 문의 공통 화면은 강의
  `OperatorContactPage` 1곳이다. Neture 문의와 약국 협업 문의는 독립 서비스 화면을 유지한다.
- 전체 저장소 심볼·파일 경로·API 리터럴 검색과 `check-literal-consumers.mjs --source`를 수행했다.
  자료 콘솔에는 `resources-lifecycle-contract.test.ts`의 활성 raw-source 계약이 있다. 삭제/완화 없이 실행했다.
  문의 공통 화면·자료 폼 파일 경로에는 활성 원문 계약이 없다.
- default 자료 lifecycle의 published/draft/private·노출/숨김/soft delete와 CMS 옵션의 전이/삭제 미지원 계약 유지.
  현재 약국 wrapper에는 콘솔 내 생성/편집·AI slot 주입이 없다. 이 옵션은 회귀로 검증했으며 실서비스 기능을 새로 열지 않았다.
- 강의는 내부 메모/상태만 저장한다. 외부 답변 발송을 만들지 않는다.
  Neture 일괄 확인은 supplier/과거 partner 신규 문의 범위로 유지한다. service/other·개별 상태/메모 처리는 확대하지 않는다.

## 자동 검증

중복 실행을 중복 산입하지 않은 **383개 PASS**. 신규·확장 업무 회귀 26개를 포함한다.

| 실행 | 결과 |
|---|---:|
| operator-core-ui 전체 Vitest | 12파일 110개 |
| 약국 전체 Vitest | 19파일 145개 |
| 강의 전체 Vitest | 10파일 40개 |
| Neture 문의 메시지 + SubdomainOperatorRoute 권한 회귀 | 2파일 33개 |
| API Jest: study-legacy-education-inquiry-http / kpa-content-resource-core-adoption / content-resource-core-table-isolation | 3파일 55개 |

- 자료 회귀 12개, 문의 공통 기존 3개+추가 5개, 약국 협업 6개, Neture 기존 2개+추가 3개.
- 자료 필터 역전·오류 빈 목록 위장·처리/갱신 혼동은 수정 전 회귀로 확인했다.
  편집/일괄/닫기·scope·unmount·부분 성공·페이지 보정은 확장 회귀로 검증했다.
- Node 22.18.0 / pnpm 10.25.0 frozen install·`build:packages` 통과. manifest/lockfile 변경 없음.
- 변경 파일 ESLint `--max-warnings=0`, operator-core-ui `tsc --noEmit`, 약국·Neture·강의 타입/production build 통과.
- 기존 Browserslist 데이터와 큰 chunk 안내는 빌드 실패가 아니며 관련 없는 설정은 수정하지 않았다.

## PC·모바일 브라우저

Chromium, 실제 production build, PC 1440×1000 / 모바일 390×844.
모든 요청을 가로채 자산은 로컬 preview, API는 가상 응답으로 처리했다. 실계정·운영 API 검증이 아니다.

- 약국 `/operator/resources`: 읽기 장애→재조회, 노출 실패→같은 대상 재시도,
  성공/갱신 실패 동시 보존→조회만 재시도. 쓰기는 실패 1회+성공 1회.
- 약국 `/operator/collaboration-requests`: 목록 장애→재조회, 상세 상태 변경 실패→재시도,
  상세 안에서 성공/갱신 실패 표시→조회 복구. 쓰기는 실패 1회+성공 1회.
- Neture `/operator/contact-messages`: 일괄 확인 성공→목록 장애→조회만 복구. POST 1회,
  개별 메모 필드 없음 확인.
- 강의 `/operator/contact`: 상태 저장 성공→메모 실패 시 입력 보존→메모만 재시도,
  저장 성공/목록 장애→조회만 복구. 상태 PATCH 1회·메모 PATCH 2회.
- 8개 업무/viewport 시나리오 pageerror 0, 문서 가로 넘침 0. 모바일 표는 내부 스크롤.
  스크린샷 10장·결과 JSON은 작업공간 검증 산출물에 보관한다.

## 문서 정합·통합 인계

전체 운영자 TODO와 이 WO/CHECK를 연결했다. 정본·canonical index 변경은 없다.
공통 모듈 비교/새 공통화, 강의 수료증 폐기 사유 서버 보관, 실계정 및 운영 반영은 별도 후속이다.
PR URL·CI 최신 상태는 PR과 완료 보고에서 제공한다. 개발 종료는 commit/push·PR이며 main 병합·배포는 통합 담당 소관이다.
전용 worktree는 PR 미병합 후속 수정용 KEEP, 타 세션 파일·branch는 변경하지 않는다.
