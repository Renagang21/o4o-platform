# CHECK-O4O-STORE-WORKSPACE-ASYNC-V3

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (한국시간)
> **근거 WO**: [3차 저장·입력 정비](../work-orders/WO-O4O-STORE-WORKSPACE-ASYNC-V3.md)

## 결과

- 태블릿 대기 화면 저장은 제출 배열과 조회 revision을 캡처한다. 저장 중 추가 편집과 다른 위치 draft를 보존한다.
- 매장 화면 설정 조회 실패를 노출하고 재조회 전 저장을 막는다. 저장 응답은 이후 입력을 덮어쓰지 않는다.
- 공통 대기 영상 선택·해제는 중복 실행을 막고 다른 위치로 변경된 뒤의 오래된 결과를 배제한다.
- 사이니지 편집 대상을 direct/snapshot 단일 판별 상태로, 입력을 draft로 관리한다. 편집기 props 17→8, 부모 편집 상태 9→4.
- 동영상 저장·삭제·등록은 제출 대상과 입력을 보존하고 다른 편집기를 임의로 닫지 않는다. 기존 name/title API 차이는 유지한다.
- QR 출력은 대상·인증·매장 헤더를 시작 시 캡처하고 헤더 복사본으로 연속 요청한다. 기존 sheet/flyer 계약과 부분 출력 동작을 유지한다.
- 320px 동영상 목록 필터·정렬 줄의 15px 가로 넘침을 로컬 flex 줄바꿈으로 수정했다. 공통 UI는 변경하지 않았다.

신규 모듈은 QR 출력 한 페이지와 사이니지 한 업무의 내부 코드다. 공통화·Core·AI·서버·schema·권한·메뉴 변경은 없다.

## 검증

| 항목 | 결과 |
|---|---|
| 타입·최종 앱 build | PASS (`tsc -b && vite build`), 기존 큰 chunk 경고 유지 |
| store-web test | 14개 파일 129개 PASS, 이번 정비 회귀 12개 |
| 집중 lint | 오류 0개·경고 0개 |
| 전체 lint ratchet | PASS, 오류 46개 / 기준 46개, 경고 1006개 |
| 기존 업무 build 브라우저 | 600개 합성 항목 PASS |
| 진열 저장 build 브라우저 | 144개 합성 항목 PASS |
| 이번 저장·편집 build 브라우저 | 252개 합성 항목 PASS |
| 문서 민감정보·링크·diff·소비처 검사 | PASS |

브라우저 각 묶음은 1280·375·320px × 경영자·직원이다. 모든 API는 합성 응답이다.
기존 제작·출력·역할·경로·실패 재시도, 진열 저장 중 편집, 화면 설정 조회 실패·저장 실패·재시도·이후 입력 보존,
대기 화면 저장 중 새 항목과 다른 위치 draft 보존, 공통 영상 선택/해제 중 위치 변경,
동영상 편집 실패·이후 입력·다른 대상 보존, 등록 중 후속 입력 보존을 확인했다.
페이지 오류와 최종 전체 가로 넘침은 없었다. 1280·320px 편집 화면을 시각적으로 확인했다.

초기 테스트에서 flyer가 헤더 복사본 대신 원본을 사용하는 누락을 검출해 수정했다.
테스트 fixture 타입과 브라우저 media HTTP 메서드를 실제 계약으로 수정했으며 실패 실행은 PASS에 포함하지 않았다.
환경 전환 뒤 Chromium 시작의 setsockopt 차단은 로컬 합성 검증 실행 범위 조정으로 해결했다.
재build 중 초기 탐색 실패는 완료 뒤 재검증했으며 320px 실제 넘침은 코드 수정 후 전체 대상에서 확인했다.
대기 화면 편집기의 기존 disabled 속성은 저장 중 새 초안을 허용하도록 제거하고 저장 중복 차단은 유지했다.
로컬 로그·스크린샷·브라우저 스크립트는 `/tmp/store-async-*`에 있으며 Git 산출물이 아니다.

## 종료와 한계

실계정·운영 DB·실기기 재생/연결·실제 PDF/인쇄 품질·외부 AI 호출은 미검증이며 변경하지 않았다.
기기 연결·이동·등록의 전체 재설계와 QR 생성 폼 전체 재설계는 이번 결과로 완료 표시하지 않는다.
공통화는 전체 O4O 정비에서 별도 판단한다. 같은 전용 `wo/store-workspace-panels` 브랜치의 연속 Phase를 push한다.
main merge·배포와 PR CI는 미실행이다. DEPLOYMENT = REQUIRED: 추후 main 통합 승인 뒤 해당 Delivery가 필요하다.
작업 공간·브랜치는 KEEP으로 보존한다.

문서 정합: WO TODO·종료 결과와 [웹 기획](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md) §16을 반영했다.

## main 통합 검증 추가 (2026-10-13)

사용자가 기존 push-only 범위를 main merge와 배포까지 확장했다. 전체 기획·메뉴·패널·상태·복잡성·비동기 정비를 [PR #547](https://github.com/Renagang21/o4o-platform/pull/547) 하나로 제출했다. 최신 main `e388b1534`는 정상 merge로 반영했다. 위 push-only 종료 결과는 당시의 기록이다.

- 통합 빌드: 14개 테스트 파일 130개 통과, TypeScript 포함 store-web production build 통과, 수정 TS 파일 ESLint 통과.
- main 반영 직후 합성 브라우저 검증: 1280·375·320px × 경영자·직원, 600 + 144 + 252 = 996개 통과. 아래 리뷰 수정 전 빌드의 결과이며 수정 후에는 영향 범위를 재검증한다.
- Codex P1: My Home 직접 링크를 기존 `@o4o/auth-react` MyHomeButton으로 교체했다. 기존 authClient와 계정·세션 상태를 전달하며 공통 인증 코드는 수정하지 않았다. handoff 발급 및 실패 표시 회귀 테스트를 추가했다.
- SonarCloud 초기 결과: 신규 중복률 10.9%와 신뢰성 D로 quality gate 실패. 실제 main ruleset의 필수 체크는 CI Gate이다. QR·스케줄 입력 label 연결, QR 안내 배경 닫기 버튼, 초안 CSS 중복 선택자·대비와 escapeHtml 명칭을 수정했다. 나머지 서비스 간 중복·복잡성 등의 정적 분석 항목은 O4O 전체 정비의 후보이며 새 공통 모듈이나 분석 제외 설정을 만들지 않는다.
- PR 최신 HEAD CI·리뷰 결과, main merge와 실제 Delivery는 이 시점에 진행 중이다. 운영 제공 SHA 확인 전에는 배포 완료로 판정하지 않는다.

추가 CI 정합: 서버 계약 `store-service-scoped-owner-entry.spec.ts`가 종전 Navigate 문자열만 요구하여 실패했다. 기존 기능에서 추가한 location.state 보존 속성을 정적 계약에 반영했다. 실제 query·hash·state 보존은 store-web Vitest에서 별도로 통과한 조건이며 런타임 변경이나 서버 권한 완화는 없다. 리뷰 수정 후 동일 production 빌드의 기존 업무 합성 브라우저 600개도 재통과했다.
