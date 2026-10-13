# 내 매장 정적 분석 신뢰성·중복 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 UTC
> **근거 WO**: [정비 TODO](../work-orders/WO-O4O-STORE-QUALITY-RELIABILITY-V1.md)

## 조사와 변경

원 분석은 PR #547의 check-run 115366072121(중복률 10.2%, 신뢰성 D)이다. GitHub에서 제공한 최신 주석 50개를 직접 확인했다. 라벨·modal 관련 지적을 우선 수정하고, nested ternary·같은 업무의 반복 계산도 정리했다. 모든 원 분석 지적의 결함 유형·심각도는 GitHub 주석만으로 확정하지 않는다.

- 태블릿 공통 영상 선택을 native dialog/showModal로 변경했다. modal 이외의 배경 조작을 브라우저가 차단하고 cancel·배경 클릭·콘텐츠 클릭을 구분한다. 닫기 때 포커스를 원래 버튼으로 복원한다.
- 알림은 native output으로 변경했다. 로딩/오류/빈 목록/후보 목록을 중첩 삼항 대신 분기하고 만료 후보 필터는 한 번만 계산한다.
- QR CTA의 명시적 label/checkbox 연결과 설명 분리, 연결 유형·상품·URL 이름 연결을 보완했다. 사이니지 편집 필드와 스케줄 우선순위/요일 그룹의 연결도 보완했다.
- 같은 사이니지 편집기 내부에서 반복 입력 필드를 순회하도록 정리하고 URL 입력·메타·저장 계약을 보존했다. 썸네일 URL이 변경되면 이전 이미지 실패 상태가 남지 않도록 URL별 이미지 key를 둔다.
- 업무 이동 URL의 중첩 조합, 메뉴 유형별 분기, 주소 변경 오류 분기, 스케줄 조회 응답 분기를 정리했다.
- QR/플레이리스트의 순차 await는 성공분 출력·첫 실패 중단·실패분 재시도 계약을 위해 유지한다. 새 공통 Core·서비스 간 공통화·분석 제외·품질 기준 변경은 없다.

## 검증

- store-web 테스트 14개 파일 132개 통과
- TypeScript 포함 production build 통과, 기존 큰 번들 경고는 남음
- 변경 런타임 TS 파일 ESLint 오류/경고 0
- 기존 업무 합성 브라우저 600개 통과
- 비동기·native dialog 합성 브라우저 336개 통과: 1280·375·320px × 경영자·직원
- 마지막 입력 반복 정리 이후 테스트 132개·build 및 영향 브라우저 336개 재통과
- 저장소 lint ratchet 통과: 기존 오류 46/기준 46, 경고 992

모든 브라우저 API는 합성 데이터이며 운영 DB 변경·실계정·실기기 검증은 하지 않았다. 초기 Tab 검사는 native modal에서 브라우저 UI로 이동할 수 있는 동작을 고려해 배경 application 요소가 포커스를 받지 않는 검사로 정정했다. Escape 후 trigger 복원 실패는 실제 구현을 수정하고 재통과했다. 테스트 fixture source 값을 실제 asset source 타입에 맞췄으며 초기 타입 실패는 PASS로 기록하지 않았다.

## 재분석과 남은 항목

[PR #548](https://github.com/Renagang21/o4o-platform/pull/548) commit `e72578c8500f3e39bd08a30d0a6cb01c8395eb01`의 [CI](https://github.com/Renagang21/o4o-platform/actions/runs/38468886853)와 SonarCloud check-run 115546260181은 모두 통과했다. 신규 코드 중복률은 1.6%, 신규 지적 3개, accepted issue 0개였다. 원 분석에서 실패했던 신뢰성 조건도 품질 gate를 통과했으며 GitHub summary가 등급 값 자체를 출력하지 않으므로 별도 수치를 추정해 적지 않는다. 이번 수정분과 PR #547 전체의 분모는 다르다. 서비스 간 복제·원 분석의 나머지 복잡성/스타일 항목은 전체 O4O 정비에서 검토한다. 재분석의 실제 결과와 수정 가능한 추가 지적에 따라 WO TODO를 갱신한다.

## 최초 분석 후 같은 작업의 보완

남은 3개 접근성 지적은 fieldset/legend, input 뒤 명시적 JSX 공백, dialog의 배경 실제 button으로 정비했다. native showModal·cancel·배경 차단·focus 복원 계약은 유지한다. 예전 IN_PROGRESS 헤더는 문서 lifecycle enum에 맞춰 바로잡았다. 최종 변경 후 테스트 132개, build·수정 파일 lint를 재통과했고 PC/모바일 브라우저도 재실행한다. 최종 SHA의 CI·SonarCloud 재분석과 main/배포는 이 기록 작성 시 대기 중이며 완료를 선행 주장하지 않는다. GitHub PR 및 commit status가 해당 실행 결과의 근거다.
