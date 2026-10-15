# TODO-O4O-PHARMACY-BUSINESS-NEWS-SHOWCASE-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (KST)
> **근거**: 이전 가입 사업 진입 개선 후 다음 작업도 TODO·대조·구현·검증·push·배포 순서로 진행 요청

## 기준

최신 main `352df65dd1`에서 새 전용 worktree와 `wo/pharmacy-business-news-showcase`를 만들었다.
이전 인증 조사 공간과 기준 checkout을 보존한다. 같은 세션이 개발·통합·배포를 순차 담당한다.
한 약국은 여러 협력사업에 가입하며 운영자는 지정 사업만 관리한다. 콘텐츠는 복사 모델이다.
이번 단계는 My Home에 가입 사업의 실제 게시글을 요약하고, 사업 홈에 해당 약국이 이용 가능한
해당 사업의 공급 상품을 미리 보여준다. 실제 업무는 기존 가입자 공간과 내 매장에서 이어간다.

정본: [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md),
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md).

## 코드·문서 대조

| 대상 | 기존 근거 | 이번 보완 |
|---|---|---|
| My Home 참여 사업 | 선택 약국 헤더로 가입 원장 조회, 활성 사업별 handoff | 화면에 표시한 활성 사업 중 community가 있고 owner/admin/manager인 경우 기존 포럼 API로 최근 글 요약 |
| 포럼 최신 목록 | 기존 API는 고정 글 우선 정렬 | 고정 공지와 고정되지 않은 최근 글을 구분해 표시, 제한된 요약임을 명시 |
| 사업 홈 | 접근 가능 약국과 현재 사업 active 가입 후보를 검증 | 동일 약국 헤더로 기존 supply-options의 `source=sf:<key>` 조회, 최대 3항목 표시 |
| 공급 상품 진입 | 기존 Store handoff·명시적 매장 선택 | 현재 사업 필터를 보존해 내 매장 공급 화면으로 이동, 주문 동작 추가 없음 |

## TODO

- [x] 최신 main·전용 작업공간·지침·정본·API 계약 대조.
- [x] My Home 사업별 고정 공지·최근 글 요약, 사업/계정/매장 전환 격리·오류/재시도.
- [x] 사업 홈 공급 상품 미리보기, 현재 사업·약국 검증과 내 매장 이동.
- [x] 집중 회귀·영향 앱 테스트·타입/빌드·lint·PC/모바일 browser 검증.
- [x] 문서 정합·민감정보·scope 검증 후 commit·push·PR.
- [x] 실제 ruleset·CI·리뷰 확인 후 main 통합.
- [x] Delivery 배포·운영 코드·readiness 확인·완료 기록.

## 범위

API·가입/운영 원장·권한·DB·dependency·CI 계약을 변경하지 않는다.
기존 API의 조회 권한과 428 약관 경계를 유지한다. 일부 사업 실패가 다른 사업 표시를 막지 않는다.
실제 운영 계정 OAuth 확인은 사용자 범위다. 운영 업무 데이터는 만들지 않는다.
사업별 특별 서비스·별도 전시 편집/순위 설정·새 알림 원장·저작권/동기화 체계는 이번 범위가 아니다.

DEPLOYMENT: AUTOMATIC — 영향 웹 대상은 최종 diff와 실제 Delivery에서 확인한다.
WORKTREE_DISPOSITION: KEEP — 동일 WO 배포 기록 PR 통합과 종료 정리 전까지 보존.

## 검증 진행

저장소 pin인 Node 22.18.0·pnpm 10.25.0을 `/tmp`에 설치했다. 기본 pnpm 11의 설치는
중단하고 pinned 도구로 frozen install·integrity 검증·공통 패키지 빌드를 완료했다.
manifest·lockfile·CI 설정 변경은 없다. 최초 Neture 집중 검증은 공통 패키지 빌드가 끝나기 전
실행해 package entry 해석 실패(0 tests)였고, 사전 빌드 뒤 집중 4건은 PASS했다.

약국 협력사업 집중 22건, 전체 최종 19 files / 150 tests PASS다. 첫 전체 실행에서는
기존 내 매장 이동 실패 안내 검사 1건이 실패했고 단독 17건과 전체 재실행 150건은 PASS했다.
실패의 원인은 확정하지 않았으며 검사 조건을 완화하거나 생략하지 않았다.
Neture 첫 전체의 늦은 handoff 실패 검사에서는 새 소식 API에 기존 가입 mock을 반환해
별도 조회 오류가 나타났다. 가입/이동 테스트 fixture에 새 포럼 조회의 정상 빈 응답을 추가했다.
해당 집중 13건은 PASS이며 전체 재실행 중이다.

두 앱의 TypeScript 포함 production build PASS, 변경 lint 오류/경고 0,
문서 민감정보 검사·diff check PASS다. 운영 계정·업무 데이터를 사용하지 않았다.

Chromium은 PC 1440px·모바일 390px 각각 7흐름(총 14 PASS)을 검증했다.
My Home 고정/최근 글·선택 약국 변경·게시글 handoff, 사업 공급 미리보기·내 매장 handoff,
공급 오류→재시도·미가입 약국 거절을 포함한다. pageerror 0·가로 넘침 없음이다.
첫 harness는 합성 이동 도착 heading을 기다리다 timeout했으며, 발급 payload의 목적지와
실제 이동 URL로 관측을 바로잡았다. 앱 guard·handoff 검증은 변경하지 않았다.
인증·API·handoff 응답은 합성 fixture이고 실제 OAuth·운영 주문을 실행하지 않았다.

환경 초안에 pinned 도구·frozen install·공통 빌드의 install_script와 start_skill을 저장했다.
현재 인스턴스 검증과 초안 저장은 완료했으나 게시·새 환경 복원 검증은 별개다.

최종 Neture 전체 재실행 104 files / 987 tests PASS이며 약국 협력사업 150건과 합해
1,137건이다. 변경 lint 최종 오류/경고 0, 두 앱 production build와 Chromium 14흐름 PASS다.
실제 ruleset은 PR 필수·CI Gate 필수·human approval 0이며 admin bypass를 사용하지 않는다.

## 통합·운영 배포 결과

PR #626의 source HEAD `277a238e1990454fc363d7eb80e1f10753036475`에서
Codex 리뷰 완료와 미해결 스레드 0을 확인했다. PR CI는
[38725795342](https://github.com/Renagang21/o4o-platform/actions/runs/38725795342)다.
main 통합·post-merge CI·실제 Delivery 결과는 아래에 확정 사실만 기록한다.

배포 전 공식 Neture·약국 협력사업 HTML/entry JS는 HTTP 200이었지만 신규 기능 문구는 없었고,
API readiness는 200/ready였다. 배포 전 asset은 각각 `index-JtBA43Hp.js`와
`index-hBQUkljV.js`였다. 이 기준과 최종 serving SHA·제공 코드 확인을 함께 사용한다.

PR CI는 SUCCESS이며 CI Gate·Code Quality·API 3 shard·웹 build·CodeQL·SonarCloud를 통과했다.
실제 ruleset과 미해결 리뷰 0·main 위치를 재확인한 뒤 우회 없이 main
`7c53af8ca38bcccc6aad362ccc23ebda59e61f20`에 병합했다. 병합 결과의 앱 소스는 검증한 branch와 같다.
post-merge CI는 [38727028028](https://github.com/Renagang21/o4o-platform/actions/runs/38727028028)이다.
동일 WO의 통합·배포 closure 기록을 기존 전용 branch에서 연속 작성한다.

post-merge CI 38727028028은 재실행 없이 최종 SUCCESS다. 자동 Delivery는
[38728117800](https://github.com/Renagang21/o4o-platform/actions/runs/38728117800)이다.

Delivery 실제 판정은 neture·kpa-society 두 웹 서비스 자동 배포이며 API·Store는 대상이 아니다.
두 deploy job의 `Smoke new revision and switch traffic (verified rollout)`과
`Verify deployment`가 모두 PASS했다. 이후 공식 도메인의 HTML·entry JS를 읽어
Neture `index-DKygMaPr.js`, 약국 협력사업 `index-CDnYbJLB.js` 모두 HTTP 200 및
신규 소식/공급 상품 기능 코드를 확인했다. 배포 전에는 두 신규 문구가 없었다.
API `/health/ready`도 HTTP 200 / ready다. API 신규 revision 배포를 의미하지 않는다.
운영 업무 데이터 생성·수정·삭제는 없었고 실제 OAuth·운영 계정 업무 접근 검증과 구분한다.

최종 Delivery는 SUCCESS이며 main `7c53af8ca38bcccc6aad362ccc23ebda59e61f20`의
`production` commit status는 `success / DEPLOYED · deploy: neture,kpa-society`다.
이번 소식·공급 미리보기 단계는 완료했다. 실제 사업별 특별 서비스·전시 편집/순위 설정은 후속 범위다.
이 완료 기록만 갱신하는 문서 PR은 DEPLOYMENT: NOT_APPLICABLE이며 별도 운영 재배포 대상이 아니다.
