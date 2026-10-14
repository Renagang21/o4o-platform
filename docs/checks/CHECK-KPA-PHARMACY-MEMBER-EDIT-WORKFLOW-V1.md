# 약국 사업자 회원 수정 흐름 검증

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **근거:** [WO](../work-orders/WO-KPA-PHARMACY-MEMBER-EDIT-WORKFLOW-V1.md)

## 결과

KPA 전용 editor의 초안/변경값/검증을 `kpaMemberEditModel`,
info→status 요청 수명과 저장 기준값을 `useKpaMemberEdit`로 분리했다.
info 성공/status 실패 시 성공한 payload만 기준값에 반영해 재시도에서 info를 재전송하지 않는다.
실패 후 추가로 수정한 필드는 새 기준값과 비교해 저장한다. 원래 값으로 되돌리는 수정도 누락하지 않는다.
입력·오류·서버 warnings를 보존하고 부분 성공을 표시한다.
닫을 때 저장된 변경이 있으면 기존 목록 갱신 callback을 호출한다.
callback 예외는 API 저장 실패와 구분하며 성공한 요청을 다시 전송하지 않는다.
현재 목록 callback은 fetchUsers를 await하지 않으므로 그 내부 네트워크 실패까지 이 editor가 감지한다고 주장하지 않는다.

저장 중 동기 중복 guard와 모든 닫기 경로 잠금, 대상별 keyed editor 및 unmount 후
후속 요청/callback 차단을 적용했다. 기존 빈 입력 정책·canonical 쓰기·legacy 읽기·권한/탈퇴 보호를 유지한다.
미지정 회원 유형을 화면 초기값만으로 자동 변경하던 비교 불일치를 해소했다.
기존 API 길이/활동 enum 검증만 전송 전에 적용하고 권한·이메일 등 최종 검증은 서버가 담당한다.

## 소비처·경계

| 소비처/계약 | 영향·검증 |
|---|---|
| KPA Society `/operator/members` → MemberManagementPage → KpaEditModalSlot | 변경 모달의 실제 runtime 소비처 1곳. 공개 props/export와 상대 API 경로 유지, 타입·production build·브라우저 검증 |
| CommonEditUserModal / ServiceMembersWorkspace | 변경 없음. 동일 패키지의 공통 회원 편집 회귀 및 Neture 설정 브라우저 smoke |
| 다른 frontend 소비처 | 전체 frontend 타입 검사 PASS. KPA 전용 모달 추가 소비처 없음 |
| 약사회 분회 | 수정·배포 0. 전체 frontend script의 읽기용 타입 검사 목록에만 포함 |
| literal/raw-source 계약 | 수정 전/후 파일 경로 검사: 역사 문서 5건, 활성 raw-source 소비처 0. 새 테스트는 실제 import/동작 검증 |

서비스 간 공통화·API/DB·공통 역할 정책 변경은 없다.
독립 clone `o4o-pharmacy-member-refinement`에서 최신 main을 기준으로 작업했다.
기존 작업공간과 환경 게시 설정은 수정하지 않았다.

## 검증 증적

- Node 22.18.0 / pnpm 10.25.0, frozen install 및 `pnpm run build:packages` PASS. package/lockfile 무변경.
- `pnpm exec vitest run --config packages/operator-core-ui/vitest.config.mjs --maxWorkers=2 --minWorkers=1`: **10파일 76건 PASS**.
- 새 workflow **15건 PASS**: 부분 성공/status만 재시도, 실패 후 추가 수정/원래 값 복귀, info 실패 시 status 차단,
  중복 저장/배경·X·취소 닫기 차단, 대상 전환/unmount, 부분 성공 후 닫기 갱신,
  callback 실패 후 재전송 방지, 완료된 탈퇴 후 추가 쓰기 차단, 무변경·권한·검증.
  마지막 길이 검증은 서버와 같이 Unicode code point를 세도록 보완했고 해당 집중 15건 재검증 PASS.
- `pnpm run type-check:frontend` PASS (전체 frontend). API type-check는 이 script 범위 밖.
- `pnpm exec tsc --noEmit -p packages/operator-core-ui/tsconfig.json` PASS.
- `pnpm --filter @o4o/web-kpa-society build` PASS. 기존 큰 chunk 경고는 유지.
- 변경 소스 3파일·회귀 테스트 1파일 ESLint 오류/경고 0. 최초 테스트의 multiline 호출 lint는 정정 후 PASS.
- 실제 컴포넌트/스타일 Chromium fixture, **1440/390px 각각 PASS**:
  info/status 실패→초안·legacy 대표자/이메일 표시 유지→status만 재시도→목록 갱신/닫기 각 1회,
  저장 중 닫기 잠금, 권한 없는 유형 select 잠금, 모바일 입력 가로 범위, pageerror 0.
  동일 패키지 CommonEditUserModal의 Neture 설정도 두 viewport에서 읽기/서비스 범위/닫기 PASS.
  fixture는 저장소 밖에서 가상 회원·모의 API만 사용했다.
  초기 fixture 설정의 외부 plugin 해석 실패를 해결했고, 공통 모달이 표시하지 않는 이메일을 단언하던
  보조 smoke를 실제 닉네임/권한 안내 단언으로 정정했다. 최종 smoke 4개 모두 PASS.
- `git diff --check`, 수정 문서 민감정보 검사 PASS.

실계정·운영 DB write·실제 회원 승인/제재는 실행하지 않았다. 실계정 검증은 사용자 담당이다.
응답 유실 시 서버 실제 성공 여부/멱등성은 이번 프런트 정비의 보장 범위 밖이다.

## 남은 권한 정합

현재 KPA 전용 status API는 operator에게 active/rejected만 허용해 정지를 거절한다.
또한 회원 유형 select의 canChangeMembershipType에는 operator가 포함되지만 info API는 admin을 요구한다.
이는 이번 변경 이전부터 있던 별도 UI/API 정합 항목이며 ACTIVE 전체 TODO에 이관했다.
이번 작업을 operator 정지 권한 해소 또는 전체 계정 완전 제거 완료로 판정하지 않는다.

## 문서 정합·전달

새 WO/CHECK와 ACTIVE 전체 운영자 TODO 2종을 갱신했다. 기존 COMPLETED 이력·정본 정책은 변경하지 않았다.
이번 사용자 승인 범위는 `wo/pharmacy-member-edit-workflow` **commit/push까지**다.
main 병합·운영 배포·PR CI는 이번 로컬 검증으로 대체해 완료됐다고 표시하지 않는다.

WORKTREE_DISPOSITION: 독립 clone/branch KEEP, base `0d55cb43483860caf9596718cb38f16482ac7174`.
후속 main 통합을 위한 branch 보존. 이 세션의 임시 fixture 서버는 검증 후 종료한다.
