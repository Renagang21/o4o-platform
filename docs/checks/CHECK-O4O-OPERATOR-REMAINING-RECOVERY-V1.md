# 운영자 가입·콘텐츠 승인·포럼 변경 검증

> 상태: COMPLETED (개발 검증·push/PR 인계) · 작성일: 2026-10-15
> WO: [작업 범위](../work-orders/WO-O4O-OPERATOR-REMAINING-RECOVERY-V1.md)

## 대상·경계

기준 main `20a04ee2a`, branch `wo/operator-remaining-recovery`.
선행 PR #612를 로컬 merge `176b3c79f`로 포함했다. 충돌은 ACTIVE TODO 문서 한 곳이며 양쪽 실행 기록을 보존했다.
현재 #612는 원격 main과 충돌하고 #616/#628은 미병합이므로 코드 완료·통합·운영 배포를 구분한다.
setup 스킬의 기존 checkout 재사용 지침에 따라 clean checkout을 전용 branch로 사용했다.
다른 작업트리는 변경하지 않았다. 원격 병합·배포·운영 DB 쓰기는 실행하지 않는다.

## 실제 소비처

| 대상 | 실제 화면 | 유지하는 차이 |
|---|---|---|
| Neture 가입 신청 | `/operator/applications` | 승인/반려·내부 메모·기존 일괄 거부 사유와 API |
| KPA 제공 콘텐츠 | `/operator/approvals` | 자료 제출/사이니지 캠페인 유형, 선택적 검토 메모 |
| Neture 포럼 | community 호스트 `/operator/forum-delete` 직접 삭제 탭 | neture 저장 범위, 완전 삭제 비노출·게시글 있는 포럼명 재확인 |
| KPA 포럼 | `/operator/forum-categories` | kpa-society 범위, 삭제 사전검사·서버 거부 보존 |

공통 props/exports·역할·API·DB 변경 없음. 퇴역 서비스 화면 복원·전체 관리자·약사회 분회 제외.
리터럴 소비처 검사: 수정 대상 세 화면의 활성 원문/테스트 계약 0건, 과거 문서는 변경하지 않음.

## 확인한 동작

- 가입 반려는 실패를 false로 반환하여 #612 확인 모달이 입력을 보존한다. 오류를 모달에도 표시한다.
- 가입 단건/메모/일괄 쓰기는 공통 동기 잠금을 사용하고 후속 조회까지 잠근다. 메모 success:false는 성공으로 표시하지 않는다.
- 가입 일괄 API의 succeeded/failed를 구분한다. 실패 ID만 남겨 재시도하며 모두 실패한 경우 성공 후 조회를 실행하지 않는다.
- KPA 콘텐츠 조회는 필터/페이지와 요청 순서를 검사한다. 동일 필터 재클릭은 완료된 조회를 무효화하지 않는다.
- 콘텐츠 검토 실패는 대상·입력·오류를 Drawer에 보존한다. 처리 중 필터·행 전환을 차단한다.
- 포럼 단건/일괄·실패 재시도는 같은 쓰기 잠금·대상 scope를 사용한다. 성공 즉시 재조회하며 결과 모달 닫기를 기다리지 않는다.
- 포럼 삭제 검사는 닫기/재개방/서비스 전환 전 응답을 무시한다. 서버가 최종 삭제를 거부하면 사유와 대상을 보존한다.
- 서비스 전환 뒤 이전 요청이 완료되어도 새 목록·모달·결과를 덮어쓰지 않는다. 순차 일괄 삭제는 scope 변경 후 추가 삭제를 시작하지 않는다.
- 저장 성공/목록 갱신 실패는 별도 안내한다. 조회 재시도가 쓰기를 반복하지 않으며 오래된 목록의 추가 쓰기를 막는다.

## 검증 기록

최종 실행 수치·빌드·화면 검증은 아래 완료 기록에 기입한다. 미실행을 PASS로 표시하지 않는다.
실계정 기준 `docs/local/TEST-ACCOUNT.txt`가 없으므로 운영 API 쓰기는 수행하지 않는다.
브라우저는 모든 API/외부 요청을 가로채고 정적 자산만 로컬 production preview로 읽는다.
합성 계정·대상과 실패 응답을 사용하며 실제 로그인·DB·배포 검증과 구분한다.

## 후속

수료증 폐기 사유 서버 보관, 신고·소유자 승계·이력 자동 파기, 운영자 처리→참여자/내 매장 실계정 확인은 미완료다.
#616/#628과 이번 PR의 병합·CI·필요한 배포는 통합 담당 공간에서 진행한다. #612 중복 통합을 피한다.

## 완료 검증 — 2026-10-15

| 실행 | 결과 |
|---|---|
| Neture 전체 Vitest | 107 files / 1,034 tests PASS |
| KPA 전체 Vitest | 21 files / 156 tests PASS |
| operator-core-ui 전체 Vitest | 14 files / 112 tests PASS |
| ui 전체 Vitest (#612 모달 소비) | 3 files / 33 tests PASS |
| 관련 API Jest (registration.roleContract, legacy-community-closed-forum-operator) | 2 suites / 28 tests PASS |
| 최종 후속 집중 검증 | 가입 21 · 콘텐츠 승인 5 · 포럼 11 tests PASS |
| 타입·빌드 | operator-core-ui tsc, Neture/KPA `tsc && vite build` PASS |

이번 변경에서 신규 회귀 16개를 추가했다(가입 5·콘텐츠 5·포럼 6). 전체 실행 후 추가한
동일 필터 재클릭·일괄 전부 실패·최종 삭제 거부 3개는 최종 집중 실행에 포함해 PASS를 확인했다.
기존 전체 검사와 후속 집중 검사를 합산해 중복 test 수를 부풀리지 않는다.

Chromium 실제 production build에서 4개 소비처 × desktop 1440/mobile 390 = 8개 시나리오 PASS.
각 시나리오에서 쓰기 실패→입력 보존→재시도 성공→목록 갱신 실패→조회 전용 재시도를 확인했다.
변경 요청은 시나리오별 실패 1회·성공 1회만 실행됐으며 조회 재시도 중 추가 쓰기는 0건이다.
pageerror 0·페이지 가로 넘침 0. Neture 포럼 완전 삭제 비노출 유지.
16개 스크린샷과 결과는 로컬 `/workspace/.onboarding/operator-remaining-recovery/`에 보관한다.
모바일 콘텐츠 Drawer와 포럼 실패 모달은 스크린샷을 직접 확인했다.
공개 저장소에는 합성 fixture 테스트만 커밋하며 브라우저 산출물·인증 값은 넣지 않는다.

변경 파일 ESLint·문서 민감정보 검사(4,003 files, 패턴 0건)·diff 검사 PASS.
프로덕션 chunk 크기·Browserslist 경고는 빌드를 막지 않았으며 이번 업무 변경과 별도다.

## Git·통합 인계

PR [#636](https://github.com/Renagang21/o4o-platform/pull/636), 소스 `e067220da`를
`wo/operator-remaining-recovery`에 push했다. 생성 시 OPEN/MERGEABLE·CI QUEUED다.
선행 #612 포함과 TODO 충돌 해소를 PR 본문에 명시했다. #616/#628은 독립 미병합 상태다.
CI 완료·원격 병합·운영 배포·실계정 smoke는 이번 로컬 검증의 PASS에 포함하지 않는다.
checkout/branch는 미병합 PR 후속 수정용 KEEP, 다른 작업트리는 변경하지 않았다.


## 2026-10-16 통합 후속 — 운영 흐름·접근성

통합 담당 전용 branch `wo/operator-pr-integration-20261016`에서 #636(`5b6139c016`, #612 포함), #616(`620e6b453a`), #628(`21c3ce7475`), #613(`c33e90728e`)을 합쳤다. 코드 충돌은 없었다. 소스 PR의 원개발 검증과 아래 통합 재검증은 구분한다. PH 운영 창이 끝나기 전에는 main 병합·운영 배포하지 않는다.

### 리뷰·품질 보완

- 포럼 비활성화·태그·영구 삭제 모달 배경을 접근 가능한 이름의 native button으로 바꿨다. 처리 중 비활성화와 기존 쓰기 잠금을 유지한다. mouse 전용 div 때문에 발생한 Reliability 실패를 해소하는 변경이다.
- 모호한 한 줄 조건문을 명시적 block으로 정리했다. 상품 삭제의 endWrite는 기존처럼 mount 여부와 무관하게 실행한다.
- 개설 목록 응답 오류는 원래 response.data.error 계약을 가진 Error 객체로 전달한다.
- #612·#628 기존 CHECK에 소비처별 사용 여부·변경 영향·route/role/capability·검증/미검증 범위를 추가했다. 새로운 회차 CHECK는 만들지 않았다.

### 이번 통합본에서 실행한 검증

- frozen install 및 build:packages PASS. 처음에는 공통 dist 미생성으로 테스트 import가 실패했고, 정본 빌드 후 재실행했다.
- Vitest **1432 PASS**: operator-core-ui151, ui33, Neture1045, 약국163, 강의40. 각 suite를 현재 통합본에서 실행했다.
- operator-core-ui tsc, Neture·약국·강의 production build PASS.
- 변경 TS/TSX 전체 ESLint 오류0. MarketTrialApprovalsPage의 기존 Hook dependency 경고2개는 원개발과 같으며 수정하지 않았다.
- 실제 포럼 공통 컴포넌트와 빌드 CSS + 합성 client로 Chromium PC1440/mobile390 **8개 시나리오 PASS**. 세 모달 Enter 닫기, 저장 중 닫기 차단, 실패 후 Space 닫기, 중복 쓰기 없음, pageerror0·문서 가로 넘침0. screenshot6장·결과 JSON은 작업공간 /tmp에 보관했다. 이 추가 smoke는 전체 서비스 로그인·권한 smoke가 아니다.
- 임시 fixture 서버는 종료했고 임시 node_modules symlink를 해제했다. 실제 계정·운영 API·DB write·상태 전이·migration·배포는 실행하지 않았다.

CI·Sonar·Codex 및 최종 main 통합·배포는 후속 확인이다. 원본 PR별 미해결 스레드는 해당 변경을 포함한 최종 통합 결과로 대조하며 근거 없이 완료 처리하지 않는다.


### 같은 통합 PR의 CI 후속 — 회원 홈 handoff 초기화 경쟁

#639 첫 CI의 약국 회원 홈 테스트가 이동 실패 alert를 찾지 못했다. 파일 변경 유무만으로 flaky로 처리하지 않았다. 자식 화면이 commit 직후 사용자 입력을 받았지만 passive effect가 뒤늦게 요청 세대를 초기화하여 실패 처리를 폐기하는 상황을, 부모 layout effect의 즉시 클릭 회귀로 재현했다. 수정 전 신규 회귀1개 실패/기존17개 미선택, 수정 후 해당 파일18개 전부 통과했다.

BusinessStoreShortcut의 scope 초기화를 layout effect로 옮겨 클릭 전 완료하고, 기존 returnPath 변경·unmount·bfcache 무효화와 중복 방지를 유지했다. 약국 전체를 다시 실행해 **164 PASS**, production build와 변경 파일 lint를 확인했다. 나머지 소비처 코드는 이전 통합 검증과 같아 현재 합계는 **1433 PASS**다. timeout이나 실패 assertion을 완화하지 않았다. 새 head의 CI·리뷰는 다시 확인한다.
