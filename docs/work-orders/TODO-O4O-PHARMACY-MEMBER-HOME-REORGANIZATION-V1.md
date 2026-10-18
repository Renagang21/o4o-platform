# TODO-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-18 · **최종 갱신**: 2026-10-18 (KST)
> **근거**: 가입 약국 메인을 사업 소식·본부 콘텐츠·제품 정보·회원 활동 중심으로 재구성하고 검증 후 push까지 진행하라는 사용자 요청

## 범위

현재 사업의 가입 약국 화면을 대상으로 한다. 거래·매장 업무는 내 매장에, 복수 사업 모아보기는 My Home에 유지한다.
현재 사업별 특별 서비스는 없다. 교육/행사는 안내 콘텐츠이며 별도 수강·예약 시스템을 만들지 않는다.
기존 게시·가입·권한·전시·독립 사본 계약을 재사용한다. 범용 core/extension 플랫폼을 새로 만들지 않는다.
운영 데이터·권한·DB·API 계약·의존성·CI 인프라는 변경하지 않는다.
사용자 종료 범위는 commit/push이며 PR 생성·main 병합·배포는 이번 작업에 포함하지 않는다.

## TODO

- [x] 최신 origin/main에서 전용 worktree·branch 생성 (`d9576802c1`, `wo/pharmacy-member-home`).
- [x] 코드·정본·기존 홈 전시/자료/제품/게시판·모든 영향 소비처 조사.
- [x] 합의 메뉴 트리를 실제 route와 데이터 계약에 대조하고 구현 범위 확정.
- [x] 큰 일반 소개/매장 안내 위주 화면을 실제 사업 콘텐츠 중심으로 재구성.
- [x] 기존 route 기반 메뉴·내 매장/My Home 연결·빈 상태·오류·비회원 경계 보완.
- [x] 기준 문서와 구현 범위 정합.
- [x] 의미 있는 회귀 테스트·타입/빌드/lint·PC/모바일 브라우저 확인.
- [x] CHECK에 검증 결과·미확인 범위 기록.
- [x] 민감정보·diff·staged scope 점검 후 commit/push·원격 HEAD 확인.

## 화면 기준

중요 공지 → 본부의 실제 소식/전시 → 운영 자료 → 제품 정보 → 회원 이야기 → 이용 지원.
메뉴는 실제 기능과 콘텐츠가 있는 경로만 사용한다. 없는 분류를 빈 게시판이나 미구현 메뉴로 늘리지 않는다.
내 매장은 상단 연결로 제공하고 큰 중복 안내 상자는 없앤다. 사업이 다른 정보를 섞지 않는다.

## 조사 근거

- [메디팜 공개 메뉴](https://www.medipharm.co.kr/): 제품 자료·POP·토론·공지, 내부 회원 화면은 미확인.
- [HumHub](https://github.com/humhub/humhub): 회원·공간·콘텐츠 및 공간별 권한.
- [Discourse 설정](https://github.com/discourse/discourse/blob/main/config/site_settings.yml): 분류와 최신/새 글 탐색.
- [Outline](https://github.com/outline/outline): 협업 지식·문서 탐색.

공개 예제는 화면 구성 참고이며 O4O 기능 구현 또는 프랜차이즈 업계 공통 표준의 증거로 간주하지 않는다.

WORKTREE_DISPOSITION: KEEP — 구현·검증·push 및 후속 통합 인계 전.

## 코드·문서 대조 결과

- 기존 메인은 `PharmacyMemberHomePage`이며 `/`와 `/businesses/:businessKey`에서 소비한다.
  같은 앱의 pharmacy/megapharm 기본 호스트와 다른 사업 키를 영향 대상으로 본다.
- `KPA_BASE_NAV`는 `KpaGlobalHeader`와 footer가 소비하며 모바일 drawer도 같은 설정이다.
  브랜드 루트 진입은 유지하고 소식/제품은 실제 홈 anchor, 자료/게시판/안내는 기존 route로 연결한다.
- 큰 일반 Hero는 기존 공통 컴포넌트의 기본 슬라이드에서 나온다. 공통 package를 바꾸지 않고
  서비스 내부에서 현재 사업의 기존 게시 원장을 읽어 `HomeHeroView`/`HomePromotionView`로 표시한다.
  게시 전에는 기본 홍보 슬라이드를 만들지 않으며 실패는 재시도 가능한 오류로 구분한다.
- 제품은 독립 공개 카탈로그가 아니라 승인 약국의 기존 supply-options 미리보기다.
  자료도 기존 선택 약국과 게시 원장 그대로 이용하고 읽기/사본 이용 경계를 바꾸지 않는다.
  게시판 공지는 기존 announcement·고정 게시글과 작성자 표시를 사용한다. 이 유형만으로
  운영자 작성 여부를 확인할 수 없어 최근 본부 소식으로 표시하지 않는다. 본부 소식은 전시 게시 원장으로 구분한다.
- 별도 검색 API·새 제품 상세·뉴스 게시판·교육 예약은 이번에 추가하지 않는다.
  질문/경험/행사는 기존 게시판과 콘텐츠의 이용 방식이며 미구현 세부 메뉴로 노출하지 않는다.
- 기준 문서의 이전 메뉴·매장 안내 위치가 새 사용자 지시와 달라 해당 회원 초기화면 절을 갱신한다.
  대표 홈의 전체 폭 Hero→AI 정책은 별개로 유지한다.
- 공통 패키지·백엔드·가입/권한·DB·manifest/lockfile 변경 없음.
- 현재 worktree와 기준 checkout 모두 테스트 계정 SSOT가 없다. 주입 변수의 준비 상태로 실제
  계정 검증을 대신하지 않고 합성 계정/API로 UI와 경계를 검증한다. 실제 OAuth는 미검증이다.

## 개발 완료·인계

본부의 실제 게시 전시·공지 → 운영 자료 → 제품 정보 → 회원 활동 순서로 보완했다.
내 매장은 상단의 기존 handoff로 연결하고 큰 업무 안내 상자를 제거했다.
정상 빈 상태를 큰 공지/게시판 카드로 반복하지 않으며 오류·재시도는 유지한다.
모바일 drawer 닫힘 후 실제 헤더 높이에 맞춘 anchor 이동도 보완했다.

검증 결과는 [이 트랙 CHECK](../checks/CHECK-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1.md)에 기록한다.
전체 26 files / 177 tests·TypeScript 포함 production build·변경 lint·약국/메가팜 PC/mobile 28흐름 PASS.
실제 OAuth·실제 업무 데이터 검증은 하지 않았으며 PR CI·통합·배포는 이번 요청 밖으로 미실행이다.

DEPLOYMENT: REQUIRED — 후속 통합 담당이 actual Delivery 판정 후 진행한다. 이번 완료는 개발·검증·push 범위다.
WORKTREE_DISPOSITION: KEEP — `wo/pharmacy-member-home`과 이번 전용 공간을 인계·후속 수정용으로 보존한다.

문서 정합: 서비스 탐색 정본의 회원 메인 절을 갱신했고 과거 배포 기록은 당시 근거로 보존한다.

## 후속 통합·배포 단계 — 2026-10-18 추가 승인

사용자가 개발 push 완료 후 이 공간에서 main 병합·배포 진행을 명시적으로 요청했다.
앞 절의 push 범위 완료는 당시 기록이며 이 절부터 동일 WO의 통합 담당으로 진행한다.
최신 main `1ba05e353d`의 관리자 사업 원장/등록 화면 후속 변경을 자기 branch에 merge했다.
이번 메인·메뉴 수정 경로와 충돌은 없고 공통 운영 UI 소비 빌드·회귀와 실제 CI를 재확인한다.

- [ ] 최신 HEAD CI·Codex 리뷰·미해결 스레드·실제 ruleset 확인 후 정상 PR 통합.
- [ ] main CI·Delivery 판정·신규 revision 검증·트래픽 전환·serving 결과 확인.
- [ ] 운영 파일·readiness 확인과 CHECK 결과 기록·종료 정리.

DEPLOYMENT: AUTOMATIC — 최종 누적 serving 비교와 actual Delivery 판정으로 확정한다.
WORKTREE_DISPOSITION: KEEP — 후속 통합·배포·기록 진행 중.
