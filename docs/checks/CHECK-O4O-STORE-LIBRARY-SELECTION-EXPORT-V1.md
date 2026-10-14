# CHECK-O4O-STORE-LIBRARY-SELECTION-EXPORT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15 (한국시간)
> **근거 요청**: 자료함 목록·선택·내보내기를 한 묶음으로 정비하고 개발 담당은 commit · push · PR까지 진행.

## 범위와 조사 결과

최신 `origin/main`의 `b696c5de0d017d885ea33343c62d1f349547d6ca`에서 전용 branch `wo/store-library-selection-export`로 시작했다. PR #589는 착수 시 OPEN이므로 가져오지 않았다. 이 작업은 해당 PR의 authoring 모듈에 의존하지 않는다.

fresh census와 역방향 소비처 조사:

| 대상 | 현행 소비처·역할 | 확인한 문제·변경 |
|---|---|---|
| `StoreLibraryContentsPage` → `StoreContentsSelector` | App의 `library/contents`, 콘텐츠 page 및 selector의 modal 계약 | 매장·서비스 범위로 목록·선택·제작 대상 세션 분리. 편집에서 돌아올 때 검색·출처·태그·페이지 복원 |
| selector 사용처 요약·선택 작업 | 현재 콘텐츠의 사용처 표시, 제작·QR·POP·PDF·snapshot 숨김 | pending 표식이 자기 effect를 취소하던 결함 수정. 조회 전환 중 이전 선택 차단. 숨김·재가져오기 중복 쓰기와 이전 매장 완료 처리 방지 |
| `StoreLibraryResourcesPage` | App의 `library/resources`, 직접 자료와 resource snapshot의 통합 목록 | 첫 50개 이후 탐색 추가, 출처별 실패 표시·재시도, 최신 요청만 적용. 부분 삭제는 확인된 항목만 반영 |
| `ContentPdfExportModal` | selector의 page 모드 opt-in, 한 콘텐츠 인쇄 | origin에 맞는 본문 추출, 옵션과 팝업 재시도, 매장 정보 실패·재시도, Escape·초점 복원 |

selector의 활성 page 소비처는 `StoreLibraryContentsPage`다. modal 모드는 host URL을 바꾸지 않고 destructive action을 계속 숨긴다. 강의·폐기 서비스·새 route를 복구하지 않았다.

## 구현과 유지한 경계

- `library/useLibraryScope`: 현재 매장·서비스와 mount 수명을 확인한다. 화면은 해당 범위가 바뀌면 별도 세션으로 remount하며 이전 선택·상세·제작/PDF 대상이 이어지지 않는다. API 호출 직전과 완료 후 실제 활성 매장도 확인한다.
- 콘텐츠 검색은 기존 300ms debounce를 유지한다. page 모드의 `librarySearch`, `librarySource`, `libraryTag`, `libraryPage`는 현재 URL entry에 replace로 반영하여 편집 후 복귀를 지원하며 제품 연결 등 다른 query를 보존한다. 검색어·필터·page 외 본문·계정·인증 상태를 URL에 넣지 않는다.
- `useContentUsage`: 안정된 대상 ID 집합에 대해 읽고 현재 대상 결과만 반영한다. 사용처 요약의 실패는 목록 실패로 승격하지 않는다.
- `useLibraryResources`: 직접 등록·가져온 자료의 cursor와 오류를 각각 관리한다. 더 불러오기는 각 출처의 기존 페이지 API를 사용하고 ID 중복을 제거한다. 실패한 출처 재시도는 성공한 출처를 재조회하지 않는다. 전체 서버 목록을 한 번에 읽는 방식이 아니다.
- 자료 삭제는 기존 API를 유지한다. 요청별 성공을 확인해 성공한 행만 제거하고 실패한 행·선택은 재시도할 수 있게 남긴다. 조회·추가 조회와 삭제는 경합하지 않는다. 미조회 페이지가 있는 출처에서 삭제하면 offset 이동으로 자료를 건너뛰지 않도록 다음 추가 조회를 앞 페이지부터 재개한다.
- snapshot 콘텐츠의 선택 삭제는 기존 `publishStatus='hidden'` 정책이다. 자료 snapshot 제거와 직접 자료 제거도 각각 기존 API·정책을 유지하며 원본 커뮤니티 자료를 삭제하지 않는다.
- PDF의 snapshot은 저장된 `body`(빈 값 포함)를 우선하고 direct/execution은 `html` 계약을 유지한다. 레거시 text/image/link/list를 해석하며 A4·세 밀도·인쇄 배경색·선택 metadata를 유지한다. 기존 `sanitizeRichHtml`을 사용해 출력 본문을 정리하고 새 창의 opener를 끊는다.
- 매장 정보가 없거나 조회에 실패해도 본문 인쇄는 가능하다. 실패는 안내하고 해당 옵션을 비활성화한다. 팝업 차단·문서 작성 실패 시 옵션을 보존하며 재시도한다. 결과를 DB에 저장하거나 원본 콘텐츠를 수정하지 않는다.
- native dialog로 PDF·자료 상세의 Escape와 초점 복원을 지원한다. 모바일 콘텐츠 작업막대는 store-web 소비처에서 줄바꿈한다. 공용 ActionBar·Core는 수정하지 않았다.

API·권한·schema·의존성·lockfile·AI 연결 변경 없음. 기존 등록·제작 모달의 내부 동작과 실제 QR/POP 생성은 이번 정비 범위가 아니다.

정책 근거:

- [역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- [자료함·자산 원본 경계](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md)
- [매장 Web 업무공간](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)
- [콘텐츠 metadata](../platform/content/CONTENT-META-PRODUCTION-READY-V1.md)

## 검증

Node `22.18.0` · pnpm `10.25.0` 사용. `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.o4o-tools/pnpm-store` 후 `pnpm --filter 'store-web^...' --workspace-concurrency=2 run build`로 의존 패키지를 준비했다. 초기 기본 store 경로 생성 실패는 저장소 파일 변경 없이 writable store 경로로 해결했다.

| 검증 | 결과 |
|---|---|
| `pnpm --filter store-web test` | 20 files / 190 tests PASS. 신규 요청·자료 상태 15개, 선택 8개, PDF 10개 포함 |
| `pnpm --filter store-web build` | TypeScript + production build PASS |
| 변경 파일 ESLint | 0 errors / 0 warnings |
| `node scripts/lint-ratchet.mjs` | PASS. 전체 46 errors / 995 warnings, error baseline 46 유지 |
| 실제 두 페이지·표·dialog·인쇄 창 | Chromium 합성 API, 1280 / 375 / 320px에서 87 assertions PASS |
| `git diff --check`, docs 민감정보 검사 | PASS |

브라우저는 실제 `StoreLibraryContentsPage`, `StoreLibraryResourcesPage`, selector, 표·작업막대, PDF·상세 dialog와 인쇄 창을 실행했다. API·매장 컨텍스트만 합성하고 범위 밖 등록/신규 작성/QR 생성 모달은 fixture로 분리했다. 외부 요청을 차단한 저장소 밖 임시 harness를 사용했다.

확인 항목: 실패와 빈 목록 구분, 사용처 요약 완료, PDF 매장 정보 재시도와 밀도 보존, 팝업 차단 후 재시도, 최신 snapshot body·선택 metadata·A4 조판, opener 차단, 재열기 옵션 초기화, Escape·초점 복원, 편집 후 검색·페이지 복원, 매장 전환 시 선택 제거, 출처별 재조회, 추가 묶음 보존, 자료 상세 본문, 부분 삭제·실패 선택 재시도, 모바일 전체 페이지 overflow·dialog 실제 위치, 브라우저 예외 없음.

이미지 점검에서 초기 모바일 작업막대가 page 폭을 늘려 PDF 창 위치에도 영향을 주는 것을 확인했다. 소비처 내 줄바꿈과 dialog 고정 위치를 보완하고 페이지 overflow·창 좌우 경계 assertion을 추가해 재검증했다. 초기 테스트 fixture의 callback 안정성·타입 누락과 URL 반영 대기 오류도 수정한 뒤 테스트·빌드를 재실행했다.

전체 lint 기존 오류를 해소한 작업은 아니다. 빌드의 기존 Browserslist·큰 bundle 안내는 남아 있다.

## 인계·제한

실계정 로그인, 운영 API·DB 데이터 변경, 브라우저 실제 인쇄 대화상자에서 파일 저장, 프린터·QR·태블릿·사이니지 실기기 검증은 수행하지 않았다. 합성 브라우저 검증은 실제 운영 권한·데이터 결과를 보장하지 않는다. 실제 테스트 계정 검증은 사용자의 기존 결정대로 후속 지시에서 진행하며 Google OAuth 운영자·관리자 검증은 로컬 담당 대상이다.

개발 담당 종료점은 commit · push · PR이다. required CI · review blocker 확인과 main 병합·배포·post-merge 검증은 통합 담당에게 인계한다. PR 미병합 동안 이번 worktree/branch는 KEEP한다. 다른 작업의 worktree/branch는 변경·정리하지 않는다.

문서 정합: 현재 자료 소유·출처·인쇄 계약을 유지한 구현 정비다. 정본·색인 판정 변경 없음.
