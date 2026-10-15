# 서브도메인 운영자 실패 복구 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [WO-O4O-SUBDOMAIN-OPERATOR-RECOVERY-V1](../work-orders/WO-O4O-SUBDOMAIN-OPERATOR-RECOVERY-V1.md)

## 판정과 범위

기준 main `c7f2c29eb`, branch `wo/subdomain-operator-recovery`. 확인된 서브도메인 운영자 오류 5건의
구현·로컬 검증을 한 묶음으로 완료했다. 이 기록의 PASS는 fixture/로컬 검증이다.
실계정·운영 데이터·DB·서버 권한·상태 전이 변경은 없다. main 병합·배포 판정은 포함하지 않는다.
정책은 [역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)을 유지한다.

| 확인된 문제 | 변경 및 회귀 검증 |
|---|---|
| 약국 상품 승인/거절 실패 후 재시도 단절 | 공통 hook이 성공 여부를 반환. 실패 대상·사유·서버 오류를 유지하고 같은 대상 재시도. 기존 void callback 호환 유지 |
| 상품 목록의 필터 응답 역전 | 목록/통계 조회별 최신 요청·수명 판정. 쓰기/저장 후 조회 동안 중복 실행과 필터 전환 차단 |
| 포럼 조회 실패의 빈 목록 위장 | 약국·Neture 어댑터의 성공 빈값 변환 제거. 공통 화면 오류/재조회 및 이전 목록 보존. 오래된 목록의 작업 차단 |
| 커뮤니티 개설 반려 실패의 입력 유실 | 개설 심사 패널 분리, 화면 안의 대상/사유 입력. 실패 시 사유 보존, 공백 검증·취소·중복 실행 차단 |
| 개설 목록 실패와 빈 목록 동시 표시 | 조회 오류·저장 오류 분리. 잘못된 성공 응답도 오류로 처리. 저장 성공 후 조회 실패는 읽기만 재시도 |

## 자동 검증

아래 집계는 중복 실행을 중복 산입하지 않은 **1,352개 PASS**다.

- `pnpm exec vitest run --config packages/ui/vitest.config.mjs`: 33개.
- `pnpm exec vitest run --config packages/operator-core-ui/vitest.config.mjs`: 107개.
- Neture 전체 Vitest 967개 + 이후 추가된 실제 포럼 어댑터 회귀 2개: 969개.
- 약국 전체 Vitest 139개 + 이후 추가된 실제 포럼 어댑터 회귀 2개: 141개.
- API Jest: community-lifecycle / community-service-operator-access / community-operator-designation /
  forum-owner-public-read-preservation 4개 파일, 102개. 기존 권한·마지막 admin 보호·포럼 경계 회귀.
- 추가된 실패 복구 회귀는 총 31개이며 위 집계에 포함한다. 지연 응답·unmount·중복 확인/일괄 쓰기,
  저장 후 조회 실패·반려 사유·잘못된 성공 응답·기존 void 확인 callback·Neture 포럼 옵션을 확인했다.
- 변경 파일 ESLint `--max-warnings=0`, 공통 UI 빌드, operator-core-ui `tsc --noEmit`, Neture·약국
  `tsc && vite build` 통과. 의존성/lockfile 변경 없음.
- 기존 Browserslist 데이터·큰 chunk 안내는 빌드 실패가 아니다. 관련 없는 설정 변경은 하지 않았다.

## 실제 소비처와 브라우저

공통 모듈의 활성 심볼/파일명·API 경로 및 raw-source 검사 소비처를 검색했다.
`check-literal-consumers.mjs --source`로 상품 콘솔·포럼 콘솔·확인 모달·기존 커뮤니티 페이지를
대조했으며 파일 경로 문자열에 의존하는 활성 원문 검사 계약은 없었다. 경로·exports·props는 유지한다.

Chromium으로 **실제 production build**를 1440×1000, 390×844에서 확인했다.
모든 요청은 가로채서 로컬 preview 또는 가상 응답으로 처리했다. 실제 계정·운영 API 호출은 없다.

- community 호스트의 `/operator/communities`: 조회 장애→재조회, 반려 장애→사유 유지→같은 대상 재시도.
- pharmacy 호스트의 `/operator/product-applications`: 반려 장애→사유 유지→재시도, 실제 약국 어댑터 경유.
- pharmacy `/operator/forum-categories`: 실제 어댑터 조회 장애 표시·빈 목록 문구 미표시→재조회.
- community 호스트의 Neture `/operator/forum-delete`: 직접 삭제 탭 조회 장애→재조회,
  `disableHardDelete`로 영구삭제 미노출, 게시글 있는 포럼의 이름 확인 유지. 기존 Neture 역할·서비스 범위를 변경하지 않는다.
- 6개 서비스/viewport 시나리오에서 pageerror 0, 문서 가로 넘침 0. 모바일 표는 컨테이너 내부 스크롤.
- Neture 등록 신청 전체 회귀가 기존 공통 확인 모달 소비처도 검증한다.

스크린샷 8장 및 브라우저 결과 JSON은 작업공간의 검증 산출물에 보관했다(공개 저장소에 대용량 산출물 미포함).

## 문서 정합·인계

통합 WO와 전체 운영자 TODO에 결과/경계를 연결했다. 정본·정책·canonical index 변경은 없다.
전체 관리자·약사회 분회·신고/소유자 승계 정책·강의 수료증 폐기 사유 서버 보관은 별도 후속으로 유지한다.
개발 종료는 commit/push·PR. PR URL·CI의 최신 상태는 PR 및 완료 보고에 기록하고 main 병합·배포는 통합 담당에게 인계한다.
