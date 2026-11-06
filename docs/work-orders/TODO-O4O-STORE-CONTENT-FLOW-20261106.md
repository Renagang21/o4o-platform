# 매장 콘텐츠 제작·자료·목록·게시 흐름 정비

> 작성일: 2026-11-06 (Asia/Seoul)
> **상태**: COMPLETED
> **실행 위치**: CLOUD
> **인계**: `wo/store-content-flow-20261106` · `d91e0b70d62d33365b7d8142c5c32a24aa29d718` · 다음 실행자 CLOUD

개발 단계는 로컬 검증·commit·push·PR까지 완료했다. 2026-11-06 후속 사용자 지시로 같은 공간이 main 병합·배포를 담당한다. 운영 데이터 변경은 이번 UI 변경에 필요하지 않다. 통합·배포 결과는 PR #953과 최종 인계에서 별도로 확인한다.
> 시작 SHA: `051b7ede63135d8ae163e8121c370eff3da5b1ed`

## 기준과 범위

- [제작 흐름](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md), [운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md), [자료함 소유 모델](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md), [표준 목록](../architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md)을 유지한다.
- 이전 화면 의견만으로 완료 판단하지 않는다. 선행 조사에서 운영 읽기 동작·선택·필터와 PC/모바일 배치를 확인했다. 현재 개발은 최신 main의 전용 worktree에서 수행한다.
- 매장 사본·참고 자료·산출물과 협업체 회원 자격·원본 접근 권한을 합치지 않는다. 사본은 원본 변경의 영향을 받지 않는다.
- DB/API/권한 계약·manifest·lockfile·공통 Core 변경, 운영 업무 데이터 쓰기·migration·seed·배포는 범위 밖이다. Node 22.23.4/npm 10.9.9/pnpm 10.25.0 유지.

## 통합 TODO

- [x] AGENTS·SETUP·정본·소비처와 현재 branch/HEAD/작업 상태 확인. 기존 worktree 보존.
- [x] 최신 main 준비, frozen lockfile·무결성 설정을 유지한 설치.
- [x] 코드·문서 보완: 목록 우선 화면, 중복 메뉴 정리, 제작·자료 탐색·편집·활용 연결, AI/가이드 보조 배치.
- [x] 선택/필터/빈 목록/오류/숨김 의미 안내와 모달 접근성 보완. 기존 기능·권한·사본 독립성 보존.
- [x] 현행 메뉴 정본·사용자 안내 정합. 과거 기록 재작성·무관 문서 삭제 없음.
- [x] 관련 회귀 테스트·런타임 검사·Store 타입/빌드 및 PC/모바일 브라우저 검증. 쓰기는 로컬 가상 응답으로 격리.
- [x] 자체 검토·실패 보완·범위별 stage/commit·명시적 branch push·기존 PR 확인 후 PR 작성: [PR #953](https://github.com/Renagang21/o4o-platform/pull/953).

## 조사로 확정된 문제

- ‘내 콘텐츠/콘텐츠·제작 시작’, ‘자료 가져오기/제공 자료’가 같은 목적지로 중복된다.
- AI·안내·메뉴 누적으로 검색창이 첫 화면에서 밀린다. 선행 운영 관찰: PC 1440×900 약 852px, 모바일 390×844 약 1412px.
- 선택 전 ActionBar가 없는 이유와 사본 종류별 지원 차이를 안내해야 한다.
- 목록의 ‘선택 삭제’는 snapshot의 publishStatus=hidden이며 직접 작성 콘텐츠 삭제와 다르다.
- ‘게시·활용 상태’는 가져온 사본 게시 설정이며 기기 적용/재생 성공이 아니다.
- 공통 제작 모달의 시각적 overlay는 dialog 의미·키보드 모달 처리가 없다. Store wrapper에서 보완해 다른 서비스 영향 제한.

## 검증 기록

- Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0에서 frozen 설치 성공. manifest·lockfile 변경 없음.
- `pnpm run check:runtime`: PASS (런타임 정합·API 의존성 parity).
- Store 의존 workspace 빌드 및 `pnpm --filter store-web build`: PASS (타입 검사 포함). 기존 Browserslist 갱신·큰 chunk 경고는 유지하며 임의 의존성/검사 기준 변경 없음.
- `pnpm --filter store-web test`: 95 files / 958 tests PASS. 최종 게시 조회 페이지 크기 정합 후 관련 9 files / 149 tests 재검증 PASS.
- 변경한 TS/TSX ESLint: PASS. 변경 문서 3개 민감정보 검사·`git diff --check`: PASS.
- 로컬 Chromium 실제 앱 + 합성 API: 6건 PASS. PC 1440×900 / 모바일 390×844, `/store`와 `/work/kpa-society/store`의 제작·저장·복귀·편집·선택·모달 Escape/초점 복귀·빈 결과·조회 실패/재시도·게시 실패/재시도·숨김을 검증했다. 기존 상품 기반 제작의 미리보기/검수·충돌/저장 응답 유실·재편집도 검증했다.
- 기존 상품 제작 E2E의 ~요 문구·접힌 요청문·미리보기 검수 생략을 현행 동선에 맞췄다. 인증 fixture를 최상위 문서에만 주입해 sandbox 미리보기 iframe 접근 오류를 해소했다. 앱의 검수·iframe 격리 기준을 완화하지 않았다.
- 게시 조회 서버의 실제 max limit=50을 확인해 선택 사본 탐색을 같은 크기로 맞췄다. 20페이지 한도에서 대상 미확인은 오류로 표시하며 다른 사본을 대체 노출하지 않는다.
- 자료함 메뉴 소비처: StoreWorkspacePage, StoreLibraryContentsPage, StoreLibraryResourcesPage, StoreAssetsPage, PharmacyContentSourcesPage, UnifiedStoreLibraryLayout. StoreTaskPageShell은 기존 소비처에서 기본 배치를 유지하고 콘텐츠 목록만 listFirst를 사용한다. 공통 packages와 다른 서비스 코드는 수정하지 않았다.
- 문서 정합: 메뉴 정본·사용자 안내를 함께 정비했다. 사용자 안내에 남아 있던 시간표 표기는 이미 main에 반영된 디스플레이 재생 정책에 맞췄다. 과거 실행 기록·정본 색인 상태는 수정하지 않았다.

[PC 합성 화면](../design/assets/store-content-flow/desktop.png) · [모바일 합성 화면](../design/assets/store-content-flow/mobile.png)

### 검증 한계와 보존

- 운영 데이터 쓰기·DB migration/seed·외부 AI 호출·기기 재생·환경 게시·main 병합·배포를 하지 않았다. 운영 최종 배포 SHA와 로컬 SHA가 같다고 가정하지 않는다.
- 서버 권한 계약을 바꾸지 않았다. 실제 계정별 운영 쓰기·현장 기기 검증은 미실행이다. UI 테스트의 합성 응답은 실제 DB/API 운영 검증을 대신하지 않는다.
- 기존 10개 worktree와 변경을 보존했다. 개발은 `/workspace/o4o-wt/store-content-flow-20261106`, branch `wo/store-content-flow-20261106`에서만 수행했다.
- WORKTREE_DISPOSITION: KEEP — PR 검토와 후속 수정용. 병합·배포는 별도 작업이다.
- 구현 commit: `d91e0b70d62d33365b7d8142c5c32a24aa29d718`. [PR #953](https://github.com/Renagang21/o4o-platform/pull/953)에 push했다. 이 문서 완료 기록은 같은 branch의 후속 commit으로 보존한다. GitHub CI는 PR에서 확인하며 로컬 검증 통과와 CI 완료를 구분한다.
