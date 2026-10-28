# CHECK — 커뮤니티 참여·운영 흐름 보완 V1

- 상태: ACTIVE
- 작성일: 2026-10-28
- 기준 main: `2f4da2e188` (PR #868)
- 작업: [TODO](../work-orders/TODO-O4O-COMMUNITY-PARTICIPATION-OPERATIONS-V1.md)
- 종료 범위: main 병합 전. 운영 데이터 변경·배포 미실행.

## 조사와 판정

일반 참여는 공통 계정 자격과 명시적 서비스 정지/탈퇴 판정, 사업 공간은 해당 사업 참여, 펀딩은 프로젝트별 참여·쓰기 가능 상태를 유지한다. 현재 서버의 작성자 수정·담당자 삭제 중재·폐쇄 게시판·공개 본문/비공개 댓글 분리와 중앙 Google·직영 위임 검사를 변경하지 않는다. 코드를 근거로 권한을 새로 부여하지 않는다.

| 확인 대상 | 확인한 결함·조치 |
|---|---|
| 상세·댓글 | 댓글 조회 실패가 정상 글 본문까지 오류 화면으로 바꿈. 본문은 유지하고 댓글 오류/조회 재시도를 분리하며 실패를 댓글 0건으로 표시하지 않음 |
| 글·계정 전환 | 이전 댓글 입력·좋아요 상태가 남고 늦은 댓글 응답이 새 글에 추가되거나 완료된 삭제가 새 글 화면을 목록으로 이동시킬 수 있음. 글/서비스/계정/접근 상태별 화면 상태를 분리하고 지연 응답의 적용·이동을 차단 |
| 댓글 수정·삭제 | 실패한 수정 callback이 정상 종료돼 공통 입력창이 닫힘. adapter가 실패를 전달하고 공통 부품이 오류와 초안을 유지. 삭제 실패도 해당 행에 표시하고 처리 중 중복 요청 차단 |
| 댓글 작성 제한 | 서버가 이미 차단하는 잠금/댓글 비허용 글에 작성 폼이 표시됨. 같은 상태에서 폼을 숨기고 안내. 서버 판정 유지 |
| 글 편집 | 조회 실패·다른 대상의 늦은 응답·다른 회원 글에도 편집 폼이 남는 경로. 조회 성공 전 제출 차단·재조회, 대상/계정별 격리, community/funding 작성자 판정에 맞는 표시 |
| 지정 게시판 | `?forum=` 대상이 없으면 무관한 첫 게시판으로 자동 제출 가능. 명시된 대상이 없으면 제출 시 안내하고 다른 게시판을 대신 선택하지 않음 |
| 공개 설정 | 저장 후 글 선택을 바꿔도 과거 저장 완료 안내가 남음. 저장하지 않은 선택 변경 시 안내 제거. API·공개 범위 계약 유지 |

신규 재현 테스트 9개 중 수정 전 8개 실패·1개 통과를 확인했고 수정 후 전부 통과했다. 이어 댓글 제한·좋아요 지연·중복 삭제·공개 설정 회귀를 추가했다. 기존 서버 가드를 우회하는 수정이나 서버 API 변경은 없다.

## Shared Module Change Verification

### Changed shared module

- Module: `ForumCommentList` · Package: `@o4o/shared-space-ui`.
- 기존 callback/props 계약을 유지하고 rejected callback의 오류 표시·초안 보존·처리 중 중복 방지만 보완.
- 현재 전체 소스 역참조에서 직접 실행 소비처는 Neture `ForumPostPage` 한 곳이다. 테스트와 barrel export 외 다른 사용처 없음.
- 간접 소비처: 일반/공급자 별칭 포럼, CommunityWorkspace(독립/사업), FundingForumSpace. 기존 HostBoundary와 각 workspace 접근 판정을 유지.

### Consumer impact matrix

| 소비처 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|
| Neture·독립 커뮤니티 | 실패·전환 중 응답·작성자 표시 | 전체 Neture 회귀·상세/작성기·브라우저 | PASS |
| 사업/CarePharm | 자체 접근 유지·게시판 지정 회귀 | 기존 native workspace·작성기 테스트 | PASS (Neture 전체에 포함) |
| Funding | 프로젝트 접근·읽기 전용·명시적 중재 유지 | 기존 pin/읽기 전용 화면·서버 프로젝트 계약 | PASS |
| KPA 등 다른 서비스 | ForumCommentList 실행 소비처 없음 | 전수 import/JSX/콜백 검색·공통 패키지 전체 테스트 | 코드 영향 없음 |
| 퇴역 K-Cosmetics | 실행 소비처 없음 | 전수 검색 | 복원 없음 |

### Route / role / capability check

기존 route·API·역할·capability·Core·DB·의존성 변경 없음. 일반 독자에게 수정/중재를 추가하지 않으며 담당자의 타인 글/댓글 수정은 열지 않는다. 중앙 운영 진입과 실제 업무 API 권한은 별도다. 정지/탈퇴·사업·폐쇄 게시판·펀딩 경계를 기존 서버 테스트로 확인했다.

### Smoke result

수정된 실제 상세·작성기·공통 댓글·공개 설정 컴포넌트와 production CSS에 로컬 합성 API를 주입했다. PC 1440px·모바일 390px 각각 12시나리오, 총 24개 PASS. 마지막 조회 실패 후 작성 성공 댓글 표시를 PC/모바일 2개 추가 검증해 총 26개 PASS. 댓글 재조회·늦은 작성/삭제/좋아요·실패한 수정 재시도·댓글 제한·편집 재조회·없는 게시판·타인 편집·편집 대상 전환·미저장 공개 선택 안내를 확인했다. page error 0·overflow 0. 외부 요청을 차단했으며 쓰기는 fixture 메모리에서만 발생했다.

## 검증

- `pnpm install --frozen-lockfile`, `pnpm run build:packages`: PASS. lockfile 변경 없음.
- Neture 전체: 최초 171 files / 1,455 tests PASS. 리뷰 보완 후 171 files / 1,457 tests 재검증 PASS. 마지막 표시 조건 보완 후 focused 1 file / 11 tests와 타입·빌드 재검증 PASS.
- shared-space-ui 전체: 23 files / 212 tests PASS.
- API 기존 계약: 6 suites / 133 tests PASS. 일반 참여·제재·댓글/작성자/중재·공개 열람·중앙 진입·펀딩 격리, 실제 DB 미사용.
- Neture TypeScript·production build: PASS. Vite 기존 큰 chunk/Browserslist 안내는 유지.
- 변경 코드 ESLint: 오류·경고 0. 브라우저 24+2시나리오 PASS.
- 별도 추가한 `tsc -p packages/shared-space-ui/tsconfig.json --noEmit`: FAIL. 변경하지 않은 `cooperation/CooperationMemberSpace.test.tsx:79`의 Testing Library `exact` 옵션과 `legal/__tests__/ServiceEnrollmentPolicyAgreement.test.tsx:11`의 mock callback 타입 오류. 두 파일은 기준 main 대비 diff 0이며 범위 밖이므로 수정하지 않았다. 이 검사를 통과로 계산하지 않는다.
- docs 민감정보·diff·staged 범위 검사 PASS. PR CI/Codex는 최신 HEAD의 PR 체크를 따른다.

## 미실행·인계

실제 계정 OAuth·운영 글/댓글 작성·수정·삭제·심사·서비스 제재·공개 설정 변경은 미실행. 운영에서 빈 게시판에 초기 콘텐츠를 생성하지 않았다. 로컬 합성 fixture가 실제 업무 데이터 검수를 대신하지 않는다. AI와 유료 외부 호출은 제외한다.
main 병합·auto-merge·배포는 하지 않으며 후속 통합을 위해 전용 branch/worktree를 보존한다. 이전 #868의 병합 전 TODO/CHECK는 당시 기록으로 보존하고 배포 후속 기록은 해당 PR을 따른다.

## 리뷰 보완 — 댓글 재조회·작성 경합

Codex가 댓글 재조회 중 새 댓글 작성이 먼저 끝나면 늦은 GET 응답이 새 댓글을 지울 수 있음을 지적했다. 재조회 중에는 댓글 제출을 막고, 작성 처리 중에는 재조회 버튼과 실제 조회 시작을 막도록 기존 화면에서 직렬화했다. 진행 문구는 조회/작성/다른 처리로 구분한다. 조회 실패 후 작성에 성공한 댓글은 오류 안내와 함께 표시하며 기존 댓글 전체를 조회했다고 주장하지 않는다. 양방향 경합 테스트 2개와 PC/모바일 경합 브라우저 검증을 추가했다. 최종 원격 CI·리뷰 결과는 같은 PR의 최신 HEAD에서 확인한다.
