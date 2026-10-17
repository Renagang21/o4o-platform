# CarePharm 운영자 공간·공급 심사 정보·Study 연결

> 작성일: 2026-10-17
> 사용자 지시: 조사 후 다음 작업을 묶어 구현하고 commit·push까지 진행
> 기준 main: `aee4957413fd02b443a85e5a68a786fdb76d63d1`
> 작업 branch: `wo/carepharm-operator-workspace`

## 문제와 결과

CarePharm의 담당 사업 화면은 이미 존재하지만 `/operator`는 대표 Neture로 이탈하고, 사업 심사 화면도 Neture 전체 메뉴·서비스 전환 표시를 사용했다. 공급 제안 심사에는 상품명·가격·메모만 있어 제품 상세와 현재 배송정책을 함께 검토하기 어려웠다. 교육은 Study에서 제공한다는 사용자 결정에 비해 이동 경로가 없었다.

- CarePharm의 정확한 `/operator` 진입만 해당 호스트에 유지한다. 기존 운영자 role·Neture 계정 membership guard를 거친 뒤 CarePharm 담당 사업의 가입 심사 탭으로 이동한다.
- CarePharm 운영 셸은 운영 홈·담당 사업 업무·회원 커뮤니티 메뉴와 기존 공통 사업 화면을 사용한다. 대표 Neture 대시보드·전체 업무 메뉴·Neture 서비스 전환 표시를 렌더하지 않는다. 다른 Neture 관리 경로의 기존 호스트 소유 규칙은 유지한다.
- 담당 사업 목록과 콘텐츠 편집의 기존 `businessKey=carepharm` 제한, 서버의 실제 담당 운영자 검사, 선택 약국의 가입 검사를 재사용한다. 새 역할·가입 원장·권한 우회는 추가하지 않는다.
- 공통 공급 제안 조회에 기존 상품의 규격·제조사·바코드·B2B 설명과 공급사 공통 배송비·무료배송 기준을 추가한다. 심사 목록에서 펼쳐 확인하며 기존 콘텐츠 renderer를 사용한다. 미설정 배송비를 무료로 표시하지 않는다.
- 현재 공통 배송정책이라는 설명을 표시한다. 이를 승인 당시 조건의 고정 snapshot으로 표시하지 않는다. 조건 고정·재심사·결제 상태 정책을 변경한 작업이 아니다.
- 회원 홈과 운영자 공간에서 기존 `lecture` identity와 고정 Study origin을 사용하는 handoff 진입을 제공한다. Study의 강의 개설·가입·수강 판정을 대신하거나 CarePharm 가입을 Study 수강권으로 바꾸지 않는다. 개별 강의 목록과 회원제 교육 연동은 포함하지 않는다.

## 범위와 공통 소비처

공급 제안 서버 projection과 공통 `pharmacy-management` 화면은 Neture/CarePharm, Pharmacy(web-kpa-society), 협동조합(web-pharmacy-coop)에 영향을 준다. Store는 같은 공급 제안 서버 경로를 이용하므로 회귀와 build를 확인했다. CarePharm 운영 셸의 분기는 web-neture의 현재 host profile로 한정하며 기존 대표 Neture 셸을 유지한다.

대상 미지정 기본 공급의 승인 생략·기준가격과 협업체 지정 제안의 별도 가격·승인 흐름은 변경하지 않는다. 자체 상담·개인 건강관리·재방문·성과 보고 기능을 추가하지 않는다. CGM·무료혈당기는 기존 준비 안내를 유지한다. 회원 커뮤니티 포럼 구성·게시글 가져오기 정책도 이번에 임의 확정하지 않는다.

## 검증

- 최신 main의 전용 worktree에서 저장소 지정 Node 22.18.0 / pnpm 10.25.0, frozen lockfile·offline store로 의존성을 준비하고 공통 packages를 실제 빌드했다. package manifest·lockfile·CI·배포 설정은 변경하지 않았다.
- 실제 로컬 PostgreSQL 15, 루프백 전용 `carepharm_revision` DB와 테스트별 무작위 schema에서 3 suites / 32 tests PASS, 조건부 skip 없이 실행했다. 신규 공급 제안 정보 조회 2개와 기존 선택 약국 gate 9개, issuer→실제 handoff helper→exchange 21개를 포함한다. Study 이동의 기존 lecture 발급·교환 및 가입 원장 생성 0도 확인했다. 운영 DB·운영 migration은 사용하지 않는다.
- 기존 API 회귀 5 suites / 93 tests PASS: 대표 복귀·Store workspace·약국 협력사업 handoff·business access·pharmacy Store 접근.
- Neture 전체 123 files / 1103 tests PASS. Store 전체 57 files / 649 tests PASS. Pharmacy 24 files / 167 tests PASS. 협동조합 4 files / 38 tests PASS.
- 공통 pharmacy-management 최종 집중 6 files / 29 tests PASS. Neture 초기 집중 5 files / 43 tests PASS는 전체와 중복이므로 합산하지 않는다.
- API TypeScript 검사, Neture·Store·Pharmacy·협동조합의 TypeScript 포함 production build PASS. 마지막 변경은 심사 표의 열 너비와 상세 영역 폭 조정이며 공통 UI 집중 테스트·Neture build·브라우저를 다시 확인했다.
- 변경 파일 ESLint error 0. build의 기존 bundle 크기·Browserslist 경고는 남는다. 문서 민감정보·diff whitespace 검사는 별도 실행 결과로 확인한다.
- 실제 production bundle을 가상 CarePharm host로 연결한 Chromium desktop 1440×1000 / mobile 390×844: `/operator` → CarePharm 가입 심사 진입, 공급 제안의 제품·배송조건 펼치기, 확인 대화상자 후 합성 승인, Study handoff 이동 PASS. 다른 사업 조회 0, 대표 대시보드 조회 0, page error 0, 가로 넘침 0. 두 화면을 캡처·확인했다. 합성 API·합성 계정이며 실제 운영 승인·운영 로그인 검증이 아니다. 서버 SQL·origin 계약 검증은 앞선 실제 DB 테스트로 구분한다.

## 인계·미해결 범위

- 공급조건의 승인 snapshot·재심사, 공급 제안 감사 이력·자기 승인·대상 약국 가입 검사, 미결제 주문의 철회 후 결제 정책 등 이전에 식별한 공통 B2B 보완은 이번 작업에서 해결했다고 판정하지 않는다.
- 운영 사업 조건 확정·등록·담당 운영자 지정·실제 약국 가입 승인·Study 회원제 강의 설정과 실계정 검증은 별도다.
- 운영 DB write·migration·메일·PR 생성·머지·배포는 실행하지 않는다. 개발 담당의 종료점은 이 branch의 로컬 검증·commit·push 및 정확한 HEAD 인계다. 새 HEAD의 CI·리뷰는 통합 담당이 수행한다.
- 문서 정합: 기존 WO와 canonical을 다시 쓰지 않고 이 WO에 실제 변경과 미해결 범위를 기록했다. 현재 배송조건 표시를 승인 조건 보존 완료로 해석하지 않는다.

## WORKTREE_DISPOSITION

- worktree: `/workspace/o4o-wt/carepharm-operator-workspace`
- branch: `wo/carepharm-operator-workspace`
- base: `aee4957413fd02b443a85e5a68a786fdb76d63d1`
- main integration / CI / deployment: 미수행
- smoke: 로컬 production bundle + 합성 API desktop/mobile
- verdict: KEEP — push 후 통합 담당의 CI·리뷰·통합과 후속 수정에 필요

## main 통합·배포 준비 — 2026-10-17

사용자가 이 작업의 main 머지·배포를 명시적으로 지시했다. 통합 담당으로 기존 branch를 유지하고 main `f2b18165f3998e48dfb186ecf668be41e1e090f7`을 충돌 없이 merge했다. 홈·헤더 변경 반영 후 Neture 전체 123 files / 1107 tests와 TypeScript 포함 production build를 재검증했다. 앞선 DB 검증 대상 서버와 공통 심사 코드에는 이 main merge로 인한 변경이 없다.

이 단계의 기록은 아직 PR CI·Codex 판정·main 머지·운영 배포 완료를 뜻하지 않는다. 정확한 PR HEAD의 기술 gate를 확인한 뒤 저장소 Delivery/Promote 절차로 진행한다. CarePharm 직접 HTTPS 조회는 현재 cloud egress 허용 목록에 없어 proxy CONNECT 403으로 차단되었으며, 도메인 장애로 판정하지 않는다.
