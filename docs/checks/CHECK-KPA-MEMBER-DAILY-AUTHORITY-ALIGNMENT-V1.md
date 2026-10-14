# KPA 전용 회원 일상 권한 정합 검증

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **근거:** [WO](../work-orders/WO-KPA-MEMBER-DAILY-AUTHORITY-ALIGNMENT-V1.md)

## 변경 결과

전용 status API의 입구·ID resolver·잠금 후 canonical 상태 확인에 있던 가입 심사 전용 제한을
operator 일상 업무 전이로 맞췄다. active→suspended와 suspended→active, 기존 가입 승인·반려가 가능하다.
withdrawn 전환·withdrawn 출발 복구·pending 되돌림은 admin 제한을 유지한다.
반려는 pending/rejected에 한정해 조회 이후 다른 요청으로 활성화된 회원을 뒤늦게 반려하지 않는다.
잠금 후 최신 service_memberships 상태가 withdrawn이면 이전 화면이 suspended여도 operator 복구를 거절한다.

users.id/km.id/sm.id 해석과 KPA 전용 scope를 유지했다. KPA row가 누락된 suspended 회원의
기본 row 생성이 상태를 pending으로 바꾸지 않도록 canonical 상태/identity_status를 보존해
가입 승인 대신 정지 복구 delegate를 호출한다. 기존 resolver의 기본 row 생성 위치와
transaction manager 주입/commit·rollback 경계는 변경하지 않았다.

info의 일반 회원 유형 admin 제한을 제거하고 pharmacist/student 및 기존 alias 4종의
서버 enum 검증을 추가했다. admin/operator 또는 다른 서비스 역할 값은 저장 전 400으로 거부한다.
유형 변경은 KPA 회원 유형을 수정하며 서비스 운영 tier를 지정·해제하지 않는다.
기존 공통 프로필·약국 정보·activity 처리 계약은 유지한다.

모달에는 optional `canAdministerMemberStatus`(기본 false)를 추가했다.
실제 KPA wrapper는 서비스 admin 여부를 전달하고 회원 유형 편집은 admin/operator에 허용한다.
상태 옵션과 저장 전 판정은 같은 KPA 전용 규칙을 사용한다. 성공한 상태 기준으로 옵션을 다시 계산해
목록 callback 실패 후에도 과거 상태의 심사 옵션을 노출하지 않는다.
선행 info→status 부분 성공·재시도/중복·닫기/대상 전환 방어는 보존했다.

## 검증

- Node 22.18.0 / pnpm 10.25.0 frozen install 및 `pnpm run build:packages` PASS. dependency/lockfile 변경 없음.
- API 집중 writeAtomicity/권한/실제 route 검증 **47건 PASS**.
- API 회원 controller 전체 5파일 + Demo 계약: API 디렉터리에서
  `pnpm exec jest --config jest.config.cjs --runInBand src/routes/kpa/controllers/__tests__ src/services/auth/__tests__/demoAccountGuard.contract.test.ts`
  → **6파일 87건 PASS**.
  최초 루트 실행은 Demo raw-source 테스트 5건이 cwd/src 부재로 실패했고, 지정 작업 디렉터리로 정정해 전부 통과했다. 제품 코드/단언 완화 없음.
- 실제 MembershipApprovalService의 txManagerInjection/reactivationBoundary/suspensionLifecycleContract 회귀
  → **3파일 56건 PASS**. 위 87건과 별도, 총 API 회귀 143건.
- 실제 Express route·validation·KPA scope chain과 가상 인증 actor/DB 더블로
  일반 4유형 허용, 운영 tier/타 서비스 유형 400, 비KPA 운영 역할 및 KPA 일반 회원/단독 플랫폼 역할 403,
  정지 200·탈퇴 403을 확인했다. 실제 JWT 로그인·운영 DB 접속은 실행하지 않았다.
- users/km/sm ID별 정지 복구/탈퇴 복구 거부, km 없는 정지 회원 기본 row 보존,
  동시 탈퇴 시 잠금 후 차단, Demo의 쓰기 전 차단, 공통 users 상태 update 0 검증.
- operator-core-ui 전체 **10파일 82건 PASS**, 최종 상태 옵션 표현 정리 후 KPA 집중 **21건 PASS**.
- `pnpm run type-check:frontend` PASS. 전체 script에 약사회 분회 읽기 타입 검사가 포함되나 해당 서비스 수정은 없다.
- `pnpm --filter @o4o/api-server build` PASS (tsc production build).
- `pnpm --filter @o4o/web-kpa-society build` PASS. 기존 큰 chunk/Browserslist 경고 유지.
- 변경 7개 소스/테스트 ESLint error 0. 기존 controller의 미사용 prevBiz/prevActivityType 경고 2건은 원본에도 동일하여 범위 밖 정리하지 않았다.
- Chromium 실제 컴포넌트/서비스 스타일 fixture **1440/390px PASS**:
  operator 유형 select 활성·student 저장 payload, active/suspended만 상태 선택,
  info 성공/status 실패 후 입력 유지·status만 재시도, admin 전체 상태 옵션,
  모바일 입력 가로 범위, pageerror 0. 같은 패키지 CommonEditUserModal의 Neture 설정 읽기/서비스 범위/닫기도 두 viewport PASS.
  fixture와 가상 API는 저장소 밖에 두었다. 실제 회원 데이터·승인·제재는 사용하지 않았다.
- 파일 경로 literal 검사: API의 활성 raw-source 소비처는 Demo 계약 1개(경로 표현별 중복 3건)이며 위 회귀에서 PASS.
  모달 runtime 소비처는 KPA wrapper 1곳, 활성 raw-source 소비처 0. 공통 패키지의 다른 editor는 수정하지 않았다.
- `git diff --check`, 문서 민감정보 검사 PASS.

## 문서 정합·전달

기존 COMPLETED 회원 수정 WO/CHECK는 이력으로 보존했다.
새 WO/CHECK, ACTIVE 전체 TODO 2종, 회원관리 표준의 KPA 전용 후속 및 오래된 admin 전용 정지 문구를 정합했다.
이번 정책은 이미 사용자가 확정한 일상 업무 분리의 구현이며 새 운영자 지정 정책이 아니다.
전체 운영자 TODO는 ACTIVE로 유지한다. 약사회 분회·Core·DB schema·공통 권한 guard 수정 0.

`wo/kpa-member-daily-authority`는 최신 main `0d55cb43483860caf9596718cb38f16482ac7174`에서 시작해
미병합 선행 `d62b87bca2`를 fast-forward 포함한 독립 clone의 후속 branch다.
기존 `wo/pharmacy-member-edit-workflow` branch/작업공간은 보존한다.
종료 범위는 commit/push. main 병합·배포·PR CI·실계정 검증 완료로 표시하지 않는다.
운영 반영 시 API와 KPA Society 웹 변경을 함께 전달해야 한다.
WORKTREE_DISPOSITION: `/workspace/o4o-kpa-member-authority`, branch KEEP (미통합 소스 보존).
이 세션의 fixture 서버는 검증 후 종료한다.
