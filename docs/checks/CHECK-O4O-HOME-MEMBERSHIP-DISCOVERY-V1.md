# CHECK-O4O-HOME-MEMBERSHIP-DISCOVERY-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> 상태: **COMPLETED** · 확인: 2026-10-20 (KST) · 범위: [WO](../work-orders/WO-O4O-HOME-MEMBERSHIP-DISCOVERY-V1.md)의 승인된 보정

## 로컬 및 CI

- 홈 회귀 40개: ServiceDiscovery 13 + home-entry.communities 15 + O4OHomePage.entry-pills 12. 재실행을 중복 합산하지 않는다.
- PostgreSQL 15 독립 fixture 11개: read-only plan, 네 참여 행과 복구 기록의 원자적 적용, 기존/타 계정 행 보존, 멱등성, 비활성 상태 보호, stale digest 거부, 계정 단일성·정상 상태 확인, 복구 저장 실패 시 전체 rollback. 관련 SQL·FK·unique 제약 fixture이며 운영 schema 전체 clone 검증이 아니다.
- 최종 실제 shell gate 회귀 5개: owner/main, freeze, digest, standalone 조합, 기존 일반 Demo/운영자 census 동작 및 25개 dispatch 입력 제한.
- 공통 packages 빌드, API 타입 검사, Neture 타입 포함 production build, 변경 파일 lint 통과. 새 worktree에서 auth-utils 빌드 및 DB bindings를 제거한 CLI import 경계도 확인했다.
- PR #736 CI 39426499362 / main CI 39428275674 성공.
- PR #741 CI 39429145857 / main CI 39430845847 성공. Sonar 및 미해결 리뷰 문제 없음.

## 운영 실행

| 단계 | run | 결과 |
| --- | --- | --- |
| 초기 별도 경로 plan | 39428287852 | WIF 조건 거부. DB proxy·SQL 전 실패, 데이터 변경 없음 |
| 기존 경로 read-only census | 39429261764 | 성공, 현행 인증/연결 확인 |
| 승인 범위 plan | 39430935546 | community/funding + CarePharm/drugstore 네 행 INSERT 예정, 공급자/분회 후보 0 |
| 정확한 digest apply | 39432654235 | 성공, verified=true, 참여 4행 + 비공개 복구 기록 1행, 총 writes=5 |
| 사후 plan | 39433015053 | 성공, 네 항목 preserve, 추가 참여 변경 0 |

원본 사용자/조직 식별자, credential, cookie/token, snapshot 원문은 문서·로그·산출물에 복사하지 않았다. 원본 복구 자료는 기존 DB의 비공개 snapshot에 있으며 run의 sanitized recoveryFingerprint로 연결한다. 일반 사용자·다른 두 Demo·관리자/운영자 role·credential·동의·소유권 수정은 없다. 신규 조합·사업·분회·공급자 조직도 생성하지 않았다.

## 실제 계정 사후 조회

매장 경영자 테스트 로그인 버튼의 코드 정본으로 일반 인증 API에 새 로그인했다.

- service memberships: neture, kpa-society, lecture, community, funding 모두 active.
- pharmacy, carepharm, drugstore 사업 참여 모두 active 및 canParticipate=true.
- CarePharm/drugstore의 실제 선택 약국 접근 API 모두 allowed=true. UI badge만 조작한 결과가 아니다.
- 공급자 상태 none, 내 분회 0, 내 조합 0 유지. 이 세 항목은 실제 미가입/자격 미준비이므로 다른 서비스 소개에 남는다. 모든 서비스 가입 완료로 보고하지 않는다.

## 운영 브라우저

정상 API가 발급한 세션을 현행 localStorage 방식으로 복원해 `neture.co.kr` 실제 화면을 읽었다. 인증 우회·권한 주입은 없다. TLS 검증은 유지했다. 임시 인증서 항목은 검증 실행의 정리 대상이며 현재 저장소에 남아 있지 않음을 확인한다.

| viewport | 보정한 네 항목 가입 목록 표시 | 미가입 목록에서 제거 | 가로 넘침 | 페이지 오류 |
| --- | --- | --- | --- | --- |
| 1440px | PASS | PASS | 없음 | 0 |
| 390px | PASS | PASS | 없음 | 0 |
| 320px | PASS | PASS | 없음 | 0 |

처음 320px 측정은 연속 viewport 변경 직후 이전 Hero 폭 390px를 읽은 중간 상태였다. Hero의 실제 폭이 새 viewport에 맞게 갱신된 후 측정하는 조건으로 재검증했고 세 폭 모두 통과했다. 제품 CSS를 바꾸거나 넘침을 숨기지 않았다. 공개 도구·준비 중 서비스도 별도 영역으로 유지된다.

브라우저 로그인 버튼의 전체 클릭 흐름, 모든 서브도메인의 보호 업무, 운영자 변경, AI 호출·상품/주문 쓰기는 이 검증의 PASS 대상이 아니다.

## 배포와 산출물

- Neture 기능 배포: main e8061c8096, Delivery 39429814238 성공, production DEPLOYED.
- 운영 경로 교정: main 1adb485fd2, Delivery 39432434701 성공, NO_DEPLOY(앱 변경 없음).
- 로컬 독립 PostgreSQL 컨테이너와 전용 볼륨 정리 완료.
- 비공개 값 없는 로컬 보존 산출물: `/workspace/artifacts/home-membership-discovery/live-api.json`, `live-browser.json`, `README.md`.
- 서비스 탐색·Demo 정본과 실행 WO/CHECK 정합을 반영했다. 이 완료 기록의 문서-only 통합은 앱 재배포를 요구하지 않는다.
