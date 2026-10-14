# 내 매장 SonarCloud 신뢰성·로컬 중복 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13

PR #547의 최종 분석(중복률 10.2%, 신뢰성 D)을 근거로 코드·문서를 조사하며 TODO를 갱신한다. 새 전용 branch는 `wo/store-quality-reliability`다. AI·공통 Core·서비스 간 공통화·서버·DB·권한·분석 제외·품질 기준은 수정하지 않는다.

## TODO

- [x] 실제 SonarCloud GitHub annotations와 최신 main 조사
- [x] 태블릿 공통 영상 선택창을 native modal dialog로 정비, 키보드·닫기·포커스 검증
- [x] QR CTA·연결 대상, 사이니지 편집기, 스케줄의 label/control 및 요일 그룹 정합
- [x] 업무 이동 URL·모드 판단 및 화면별 중첩 분기 정리
- [x] 같은 업무 안의 반복 필터·중복 계산 정리, 공통화 대상과 구분
- [x] 순차 QR 출력·부분 실패 재시도 정책 유지, 정적 분석 지적의 근거 기록
- [x] 테스트·type/build·lint·PC/모바일 브라우저 검증
- [x] PR 재분석: 신뢰성·새 중복 확인 후 TODO 갱신, 실제 결과로 완료 판단

## 범위 판정

라벨·대화상자 관련 지적은 실제 화면 접근성을 개선한다. nested ternary·복잡성·readonly 등은 같은 화면 내부에서 정리한다. `await` 순차 실행은 QR 성공분 출력 후 첫 실패에서 중단 및 플레이리스트 실패분만 재시도하는 기존 계약을 위해 유지한다. 서비스 간 동일 구현은 전체 O4O 정비 대상으로 남기며 3% 달성을 위해 새 공통 패키지를 만들거나 분석에서 제외하지 않는다.

진행 근거: [CHECK](../checks/CHECK-O4O-STORE-QUALITY-RELIABILITY-V1.md). 실제 SonarCloud 등급은 PR 분석 결과로 확인한다.

## 개발·정비 결과

코드·TODO·로컬 검증과 최초 PR 분석을 완료했다. [PR #548](https://github.com/Renagang21/o4o-platform/pull/548)의 `e72578c85`에서 필수 CI·CodeQL·SonarCloud Quality Gate가 통과했고 신규 코드 중복률은 1.6%였다. 이 수치는 이번 수정분의 분석이며 PR #547 전체 모집단과 직접 같은 분모로 비교하지 않는다. 이후 남은 접근성 지적 3건(fieldset, input 뒤 명시적 공백, dialog의 mouse/key handler)을 같은 작업에서 추가 정비했다. 문서 상태 오기(IN_PROGRESS)는 정본의 6종 상태에 맞췄다.

후속 commit의 외부 CI·Sonar 분석 및 main 통합·배포 결과는 최종 실행에서 확인한다. 현재 문서의 완료는 개발·로컬 검증 범위이며 배포 완료를 뜻하지 않는다. 서비스 간 복제·기존 원 분석의 전체 복잡성/스타일 모집단은 O4O 전체 정비 TODO로 유지한다.

추가 보완과 최종 로컬 재검증도 완료: 테스트 132개, build·lint, 기존 업무 606 + native/비동기 336개 합성 브라우저 통과. 페이지 간격 CSS에 영향을 받던 modal의 inset·margin을 고정했다. 최종 외부 분석은 같은 PR 최신 HEAD에서 확인한다.
