# My Home 구현 검증

> **상태**: IN_PROGRESS · LOCAL_VERIFIED / PR·배포 접근 차단
> **검증일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **WO**: [WO-O4O-MY-HOME-IMPLEMENTATION-V1](../work-orders/WO-O4O-MY-HOME-IMPLEMENTATION-V1.md)
> **검증 환경**: 전용 Linux worktree, Node 22.18.0, pnpm 10.25.0, Chromium. 기존 frozen lockfile·공유 패키지 빌드 사용. 운영 DB·실제 계정 접근 없음.

## 공유 소비처 매트릭스

| 공통 변경 | 소비처 | 실제 변경·검증 |
|---|---|---|
| `@o4o/auth-react` MyHomeButton / useMyHomeReturn | Neture 및 Supplier·Funding·Community 호스트 | 공통 헤더·모바일 하단·서비스 호스트 호환 경로. Neture 타입 포함 빌드·전체 테스트·브라우저 |
| 같은 모듈 | Store / Study / 분회 | 각 헤더 직접 진입. 각 타입 포함 빌드·각 전체 테스트. 기존 공개 진입·업무 메뉴 유지 |
| 같은 모듈 | Pharmacy/KPA | 공통 헤더·공통 404 복귀 안내·모바일 하단. 타입 포함 빌드·전체 테스트 |
| 같은 모듈 | Admin | 헤더 직접 진입. production bundle·전체 타입 검사 |
| `@o4o/ui` GlobalHeader | Neture·KPA의 사용자/운영자/관리자/Supplier 레이아웃 | 두 행 모바일 진입을 담도록 고정 높이 대신 최소 높이 사용. 두 앱 빌드·테스트·Neture 320/375px 실제 브라우저 |
| handoff controller | 모든 서비스의 인증 이동·대표 진입·Store workspace | 기존 교환·세션 폐기·회원 자격·소유권 회귀 + My Home 목적지 허용/거부 테스트 |
| Neture home-entry hook | 대표 메인·My Home·기존 서비스 진입 소비 코드 | 선택적 accountId 인자 추가(기존 호출 호환). 계정 변경 시 stale 데이터·실패 후 영구 로딩 방지 테스트 |

폐기한 PharmacyHub/K-Cosmetics 및 legacy web-account에 새 업무나 개인 통합 공간을 복구하지 않았다. raw-source 소비 테스트를 파일명·라우트·심볼로 검색했으며 기존 public brand, forum owner, identity display, store owner, community navigation 검사도 실행했다.

## 결과

- 공유 패키지 빌드, Neture·Pharmacy/KPA·Store·Study·분회 production build(타입 검사 포함), Admin bundle 및 별도 전체 타입 검사: PASS.
- API `tsconfig.build.json` 전체 타입 검사: PASS.
- auth-react 전체 196개, Neture 전체 492개: PASS.
- Pharmacy/KPA 131개, Store 40개, Study 4개, 분회 35개, UI 19개, shared-space community navigation 19개: PASS.
- 대표 진입 handoff 45개 + 서비스 logout·Store handoff·약국 사업 자격·forum owner·identity display·store owner 135개: PASS.
- 새 데이터 화면 테스트: 다른 계정 알림 즉시 제거, 선택 매장 header 전송, 늦은 응답 무시, 실패와 0 구분·재시도, 접근 가능한 커뮤니티의 `author=me` 조회·원본 글 링크를 확인.
- My Home 이동 테스트: 인증 초기화, 올바른 목적지, 임의 origin/경로 거부, 재시도, logout·계정 변경 이후 늦은 응답 무시, bfcache 복구, 헤더·모바일 중복 클릭 발급 1회 확인.
- 실제 Chromium fixture smoke: 1440/375/320px × 5개 화면의 직접 진입·본문·가로 넘침 0, 모바일 고정 항목, 대표 메인 요약→My Home, 선택 매장 통계 및 503 후 재시도 PASS. 오류 없는 fixture 응답으로 기존 계정 설정도 확인. 운영 API는 모두 가로채며 외부 접근은 차단했다.

재실행 가능한 브라우저 검증은 `e2e/my-home`에 있다. 먼저 Neture build 후 `pnpm exec playwright test --config e2e/my-home/playwright.config.ts`를 실행한다. 이 클라우드에서는 설치된 Chromium을 사용하도록 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`을 지정했다. 결과·스크린샷은 무시되는 `test-results/my-home` 아래에 생성된다. 실제 인증 handoff와 운영 데이터 검증을 대체하지 않는다.

## 배포 상태

- `DEPLOYMENT = MANUAL/GATED` 예상: 인증 handoff 코드가 포함되어 LEVEL 3. 실제 서버의 Delivery 판정·운영 서빙 SHA는 아직 조회하지 못했다.
- 클라우드 정책의 `api.github.com` CONNECT 403으로 GitHub API 접근 불가. 운영 도메인도 허용 목록에 없고, 환경 설정 초안은 게시 대기다.
- PR·required CI·Codex review·ruleset·main merge·promote·운영 PC/모바일 smoke: **미완료**. main 직접 push나 gate 우회는 하지 않았다.
- 작업 branch와 worktree는 후속 통합을 위해 **KEEP**. 최종 배포·closure 이전에는 제거하지 않는다.
