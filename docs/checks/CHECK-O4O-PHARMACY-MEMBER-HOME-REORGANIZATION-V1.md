# CHECK-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-18 · **최종 갱신**: 2026-10-18 (KST)
> **근거 WO/IR**: [단일 TODO](../work-orders/TODO-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1.md)

## 범위와 기준

[서비스 탐색·회원 초기화면 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)의 2026-10-18 사용자 지시를 적용한다.
현재 사업의 소식·본부 전시·운영 자료·제품 정보·회원 활동 중심으로 재구성한다.
거래는 내 매장, 복수 사업 모아보기는 My Home, 현재 특별 서비스는 없음으로 유지한다.
기준은 main `d9576802c1a44d6c957c702835cb2d09394d08d5`, branch는 `wo/pharmacy-member-home`이다.
이번 요청은 개발·검증·commit/push까지다. PR 생성·통합·배포는 수행하지 않는다.

## 코드·소비처 대조

| 대상 | 적용과 검증 경계 |
|---|---|
| PharmacyMemberHomePage | pharmacy/drugstore 루트 및 `/businesses/:businessKey` 공통 표시. 사업 key와 기존 참여 guard 유지 |
| BusinessHomeFeature | 기존 사업별 전시 GET, parser·공통 Hero/광고 view 재사용. 기본 홍보 fallback 없음, 운영 편집·게시 원장 유지 |
| KPA_BASE_NAV | GlobalHeader desktop/mobile 및 footer 소비. 기존 route와 홈 anchor만 사용, 본부 문의 footer 유지 |
| BusinessStoreShortcut | 상단 compact 표시만 추가. 기존 handoff·명시적 매장 선택·오류/중복 실행 방어 유지 |
| 자료·제품 | 기존 약국 선택·활성 사업 가입·공급/게시 조회 그대로. 카탈로그·가격·주문·복사 계약 추가 없음 |
| 다른 서비스 | 공통 packages·API·DB·manifest·lockfile·CI 변경 없음. 별도 CarePharm/협동조합 앱을 수정하지 않음 |

공지 유형/상단 고정 여부만으로 작성자가 본부인지 확인할 수 없어 최근 항목은 '최근 공지'와 작성자를 표시한다.
운영자가 게시한 본부 소식은 기존 사업 전시 원장으로 구분한다. 일반 회원 글을 본부 작성물로 표시하지 않는다.
게시판 미개설·미승인·운영자/일반 회원·계정/사업 전환의 기존 경계를 유지한다.

## 로컬 검증

- Node 22.18.0 / pnpm 10.25.0, frozen lockfile·store integrity 확인 install PASS.
- 저장소의 `build:packages` PASS. 새 worktree에 공통 dist를 만든 뒤 앱을 검증했다.
- 약국 웹 전체 Vitest: 26 files / 177 tests PASS. 공통 앱 소비처와 다른 사업 키 회귀 포함.
- 새 전시 회귀 9건: 게시 전 기본 소개 없음·실제 게시 링크·오류/재시도·계정/사업 전환의 늦은 응답 차단·비활성/예약/종료·광고주 표기.
- 기존 회원 홈 회귀는 콘텐츠 순서·자료/사업 범위·오류/독립 재시도·미승인/미로그인·운영자 전용 조회 경계·legacy URL을 유지한다.
- TypeScript 포함 production build PASS. 기존 bundle 크기와 Browserslist 오래됨 경고는 설정·의존성 변경 없이 기록한다.
- 변경 TS/TSX 파일 lint PASS, diff check PASS. 문서 민감정보 guard는 새 파일을 포함해 최종 stage 후 확인한다.

## 브라우저 검증 방법과 보완 과정

Chromium에서 실제 production 빌드 파일과 합성 계정/API를 사용한다. 실제 도메인 요청은 harness에서
로컬 파일·합성 응답으로 처리하고 외부 요청은 차단한다. 운영 서버·실제 로그인·운영 업무 데이터를 사용하지 않는다.
약국/해당 협업체(당시 구명칭) × PC 1440/mobile 390 각각 아래 흐름을 확인한다.

1. 사업 소식·운영 자료·제품·회원 활동과 상단 내 매장 표시.
2. 메뉴의 소식/제품 anchor 이동·같은 메뉴 재진입과 고정 헤더 아래 제목 비가림.
3. 자료 상세로 선택 약국/자료 문맥 전달.
4. 상단 내 매장의 기존 session handoff 목적지 연결.
5. 정상 빈 전시·공지·회원 글을 큰 빈 카드로 나열하지 않음.
6. 미승인 사용자에게 회원 게시글·자료·전시 요청 없음.
7. 자료 조회 실패 표시와 성공 재시도, 다른 콘텐츠 유지.

최초 harness는 부드러운 스크롤 종료 전 위치를 판정했고, 합성 도착 HTML에 charset이 없어 한글 표기를
기다리지 못했다. 검증 조건/합성 HTML을 정정했다. 약국 선택 후 조회가 갱신되는 빈 상태도 최종 응답 후 판정한다.
이와 별개로 모바일 drawer 닫힘 전 높이로 anchor를 계산하는 실제 이동 결함을 발견해 메뉴 닫힘 반영 후
이동하도록 보완했다. 해당 협업체(당시 구명칭)의 긴 브랜드명은 헤더 높이도 달라 고정 여백 대신 실제 헤더 높이를 반영한다.
이동 성공을 위해 guard·권한·도메인 정책이나 assertions를 완화하지 않았다.

최종 결과: 약국/해당 협업체(당시 구명칭) × PC/mobile × 7흐름 = 28 PASS. 모든 조합에서 pageerror 0·가로 넘침 없음,
미정의 API 요청 0이었다. 해당 협업체(당시 구명칭) 모바일도 실제 헤더 하단보다 소식 제목이 아래에 표시되는 것을 확인했다.
최종 소스의 전체 177 tests·변경 lint·TypeScript 포함 production build를 다시 통과했다.
그 뒤에는 검증 기록 문서만 수정했다.

## 미확인과 인계

- 현재 worktree·기준 checkout에 `docs/local/TEST-ACCOUNTS.local.md`가 없다. 환경 변수 준비 상태를 실제 계정 확인으로 바꾸지 않는다.
- 실제 Google·카카오 로그인·실제 가입 약국의 운영 데이터·실제 handoff 세션 교환은 미검증이다.
- 운영 쓰기·테스트 데이터 생성 없음. 합성 데이터는 브라우저 응답/임시 파일에만 있으며 운영에 정리할 업무 데이터가 없다.
- PR CI·Codex 리뷰·main 병합·운영 배포는 이번 요청에서 미실행이다. push를 운영 적용으로 보고하지 않는다.
- 후속 통합 담당은 branch HEAD와 main 이동·실제 ruleset·CI·리뷰·Delivery 판정을 다시 확인한다.

WORKTREE_DISPOSITION: KEEP — 후속 통합·수정에 필요한 이번 branch/worktree를 보존한다. 이전 공간은 변경하지 않는다.

문서 정합: 기존 정본의 회원 메인 절을 현재 사용자 지시에 맞게 갱신하고, 단일 TODO와 이 CHECK에서 실행 상태를 구분한다.

## 통합 리뷰 보완 — 2026-10-18

사용자의 추가 main 병합·배포 지시로 PR #704에서 동일 WO 통합 단계를 진행한다.
main #703의 후속 변경을 merge한 후 약국 웹 177건·공통 운영 UI 188건과 빌드를 재검증했다.
리뷰는 상단 매장 버튼의 자격과 다른 사업에서 호스트 관리 화면으로 오인 이동할 가능성을 지적했다.
상단 버튼은 기존 `useKpaUserRoles(...).isStoreOwner`와 동일하게 제한하고, 호스트와 다른 사업에서는
자료/회원 관리 링크와 헤더의 호스트 운영 메뉴를 제공하지 않는다. 그 사업의 기존 전시/게시판 운영 경로는 유지한다.
서버 권한을 새로 부여하거나 query key로 호스트 운영 화면의 범위를 바꾸지 않는다.

역할별 헤더/호스트 범위 7건과 다른 사업 운영자 1건을 추가해 약국 웹 전체 27 files / 185 tests PASS다.
새 테스트의 지원되지 않는 `ByRoleOptions.exact` 옵션으로 TypeScript가 한 번 실패했다. 문자열 name의
기본 정확 일치 조건으로 정정한 후 전체 185건·변경 lint·TypeScript 포함 production build PASS다.

리뷰 보완 후 실제 최종 빌드로 약국/해당 협업체(당시 구명칭) PC/mobile 28흐름도 다시 PASS, pageerror·가로 넘침 0이다.

### 추가 복귀·표현 보완

재리뷰의 두 항목도 보완했다. 비로그인 시 `pathname + search + hash`를 로그인 returnTo와
state.from에 함께 보존한다. 최근 혼합 20건에 공지만 있을 때 전체 게시판이 비었다고 추정하거나
'첫 이야기'라고 안내하지 않고 기존 회원 게시판 글쓰기로 연결한다. 별도 새 API/집계는 만들지 않는다.
두 anchor 복귀·혼합 페이지 회귀 3건을 추가해 최종 약국 웹 27 files / 188 tests PASS,
TypeScript 포함 production build PASS다. BusinessWorkspace의 기존 user hook dependency 경고
1개는 그대로이며 변경 lint 0 errors다. 실제 OAuth 로그인 완료를 대신하는 검증은 아니다.

추가 보완 후 최종 빌드에서도 PC/mobile 28흐름 PASS, pageerror·가로 넘침 0을 확인했다.
