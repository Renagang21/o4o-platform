# CarePharm 홈·공지 운영과 회원 커뮤니티 구성

> **상태**: COMPLETED · 개발·로컬 검증 완료, main 통합·배포는 통합 담당 후속
> **작성일**: 2026-10-19 · **최종 갱신**: 2026-10-20
> **근거 WO/IR**: 사용자 잔여 작업 진행 지시 · WO-O4O-CAREPHARM-HOME-REFINEMENT-V1 후속

## 범위와 TODO

- [x] 최신 main `491be1bb82`에서 전용 branch/worktree 생성, 문서·소비처 조사.
- [x] CarePharm의 홈·공지 관리 진입을 전용 운영 메뉴에 제공.
- [x] 공개 홈 편집 GET/PUT 모두 현재 CarePharm 운영 권한 및 활성 사업을 서버에서 확인.
- [x] 공개 공지 목록·상세·빈 상태·실패/재시도·예약/철회 반영 구현.
- [x] 회원 커뮤니티의 게시판 구성 예시·운영 안내와 명시적 개설 흐름 제공.
- [x] 실제 격리 PostgreSQL 권한·저장·공개 계약, 클라이언트 회귀, desktop/mobile 확인.
- [x] 문서에 실제 검증과 한계 기록. commit/push의 정확한 HEAD와 clean 상태는 최종 인계 보고로 확인.

실제 사업 등록·활성화·역할 부여·회원 승인, 운영 DB 변경, migration, 외부 메일, PR 생성·병합·배포는 실행하지 않는다. 무료혈당기는 별도 기획 후 진행하며 CGM은 협의 후 제작한다. 교육은 Study에 운영자가 실제 개설했을 때 안내 콘텐츠로 연결한다. 개인 건강 기록·환자 상담·추적 관리·성과 통계는 추가하지 않는다.

## 조사와 구현 계약

- 사업 참여·운영 권한은 [역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)과 [홈·서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. CarePharm과 pharmacy 가입을 합치지 않는다.
- 기존 `/home-presentation/carepharm/manage`는 Neture 공통 역할만 검사한다. 기존 저장 원장(`surface=carepharm`, organizationId=null)은 유지하고, 사업 한정 역할 또는 현재 담당 지정에 의한 운영 권한을 추가 확인한다. 공통 운영자 역할만으로는 허용하지 않는다.
- 공개 공지는 기존 공개 전시 원장의 `promotions` 최대 3개를 재사용한다. 각 항목의 제목·설명(400자)·노출 기간·연결 버튼을 목록/상세로 제공한다. 장문 자료는 연결 버튼으로 안내하며 별도 공지 테이블·자동 생성·migration은 추가하지 않는다. 기본 예시를 실제 게시된 공지로 표시하지 않는다.
- 회원 게시판은 공개로 전환하지 않는다. 기존 `business:carepharm` → `sf:<UUID>` 범위와 실제 사업 가입·조직 권한을 유지한다. 운영자가 이름/설명을 확인해 한 게시판씩 명시적으로 개설한다. 추천 이름은 필수 분류나 자동 개설 정책이 아니다.
- 구성 예시: 운영 소식·안내 / 약국 운영 사례 / 자료 활용 / 제품·사업 문의. 공개 공지는 전용 홈 편집, 회원 소식과 질의는 회원 커뮤니티, 매장용 배포 자료는 기존 콘텐츠 제작·심사 기능을 사용한다. 게시판 이름만으로 운영자 전용 쓰기 권한을 부여하지 않는다.
- 브라우저 추가 발견: `forumApi.communityPathKey()`가 영문·숫자·하이픈만 인식하여 `business:carepharm` 및 `%3A` 주소에서 demo 글을 반환하거나 환경 플래그에 따라 일반 Neture API로 향했다. 사업 회원 공간을 실제 이용하는 데 필요한 수정으로 포함한다. 경로의 한 segment를 한 번 decode하고 식별자 문자(영문·숫자·하이픈·콜론)를 확인한 뒤 scoped API 구성에서 encode하여 읽기·쓰기를 현재 사업 서버 gate로 보낸다. 잘못된 인코딩·경로 문자는 요청 전에 거부하며 서버 거절을 demo 성공으로 대체하지 않는다. 다른 사업·독립 커뮤니티·펀딩의 범위도 회귀 확인한다.

## Shared Module Change Verification

공통 홈 편집기의 CarePharm 문구·전체 공지 미리보기만 surface로 분기하며 기존 API·필드·저장 형식을 변경하지 않는다. `forumApi`는 web-neture 내부 공통 adapter이며 목록·허브·상세·글쓰기·내 글·운영/관리 화면이 소비한다. `rg` import 조사와 literal/source-path census를 함께 수행했다. 독립 커뮤니티의 단일 가입 모델과 펀딩 프로젝트 API는 유지한다.

| 소비처 | 영향 | 검증 결과 |
|---|---|---|
| Neture 대표 / supplier / funding / community | 대표 편집기 CarePharm 선택을 전용 운영 링크로 교체, 다른 surface 유지 | Neture 전체 테스트·build PASS, 포럼 독립/펀딩 경로 회귀 PASS |
| CarePharm | 전용 편집·공개 공지·커뮤니티 구성 | 실제 PG GET/PUT gate·desktop/mobile 14 시나리오 PASS |
| Pharmacy 및 각 business | 기존 공통 편집기·business 전시 계약 유지 | Pharmacy 188 테스트·build PASS, 다른 사업 포럼 범위 테스트 PASS |
| Study | 기존 lecture 편집기 유지 | build PASS |
| 분회 | 기존 branch 편집기 유지 | build PASS |
| Store | 변경 없음, 기존 회원 자료/공급 경로 유지 | 협업체 진입 4 테스트 PASS |

## 검증·인계

### 실제 실행 결과 (2026-10-19)

- Node 22.18.0 / pnpm 10.25.0. frozen lockfile·오프라인 설치·store 무결성 확인 및 `pnpm run build:packages` PASS. 의존성/lockfile 변경 없음.
- 서버: `CAREPHARM_REVIEW_DATABASE_URL`로 **격리 localhost PostgreSQL 15**를 지정하고 Jest `home-presentation.routes.spec.ts`와 `carepharm-operations.postgres.spec.ts`를 실행, **2 suite / 29 PASS**. 실제 management route → membership middleware → DB 담당/역할 predicate → CMS 저장·공개 서비스를 사용했다. 인증 세션 주입만 fixture다. 다른 사업 담당·무담당·회수·만료·정지·사업 폐쇄/부재 거부, 사업 한정 역할, 초안·공개 분리·범위 위조·409 충돌·게시 만료를 확인했다.
- 커뮤니티의 DB 검증은 실제 `resolveCommunityWorkspace`와 `createCommunityBoard` 서비스 호출이다(HTTP forum 전체 E2E로 표현하지 않는다). 조회만으로 게시판이 생성되지 않음, 다른 사업 담당 거부, `sf:<CarePharm UUID>` 저장과 공개 전시 원장 분리를 확인했다. 전용 테스트 schema 잔존 **0** 확인 후 이번 작업의 컨테이너를 제거했다. 운영 DB·migration은 실행하지 않았다.
- Neture 전체 Vitest **131 파일 / 1,166 PASS**. 이후 추가한 운영 경로/계정 전환 테스트 **6 PASS**, 최종 포럼 adapter와 회원 커뮤니티 묶음 **18 PASS**. 포럼은 raw/encoded 사업 key, 다른 모델, 독립 공간·펀딩 경로, 서버 403 유지, 잘못된 인코딩·경로 문자 거절을 확인했다.
- shared-space-ui 전체 **120 PASS**, 이후 CarePharm 공지 편집·미리보기를 포함한 home-presentation focused suite **28 PASS**.
- Pharmacy 전체 **188 PASS**, Store 협업체 진입 **4 PASS**.
- API `tsc --noEmit -p tsconfig.build.json`, Neture·Pharmacy·Study·분회 production build PASS. 변경 TS/TSX ESLint error/warning **0**, 문서 민감정보 검사 및 `git diff --check` PASS. 기존 번들 크기/Browserslist 안내는 남아 있다.
- 최종 production 번들을 Chromium에서 **1440px / 390px**로 실행했다. 공개 공지 목록→상세→목록, 운영 메뉴→편집→공개 요청, 게시판 예시 선택→설명 수정→명시적 생성, 일반 회원의 개설 도구 미노출, 편집 403 시 저장 차단, 공지 조회 실패→재시도, 미게시 상세 차단 **7종 × 2 = 14 PASS**. 가로 넘침·pageerror 없음. 사업 게시글은 실제 scoped API를 호출하고 데모 글을 표시하지 않음도 재확인했다.
- 브라우저 API·인증은 합성 데이터다. UI의 요청·응답/버튼 동작 확인이며 실제 회원 승인·운영 콘텐츠 게시·실계정 권한 검증을 대신하지 않는다. 일회성 화면/요청 결과는 `/tmp/carepharm-member/`에 두고 저장소에 산출물을 추가하지 않았다.

### 운영자가 사용할 순서

1. CarePharm 사업 운영 메뉴의 **홈 · 공개 공지**에서 Hero와 공개 안내를 편집한다. 초안 저장은 공개 화면을 바꾸지 않으며 **공개 반영** 때만 게시된다. 숨김/게시 종료와 광고주 표시는 기존 계약을 따른다.
2. 공개 홈 공지 목록의 제목을 선택하면 `/news/:noticeId` 상세를 연다. 원장 최대 3개·설명 400자 한도이며 장문·자료·강의는 연결 버튼으로 안내한다. 독립된 무제한 공지 게시판을 구현한 것은 아니다.
3. 회원 커뮤니티에서 필요한 게시판 예시를 선택한 뒤 이름·설명을 확인하고 **게시판 만들기**를 누른다. 예시 선택 자체는 저장/개설하지 않는다. 기존 개설 신청·심사·글/댓글·중재 흐름도 유지한다.
4. 회원 자료의 제작·공급사 심사·매장 사본 생성은 기존 기능을 이용한다. 커뮤니티 글이나 공개 공지를 매장 배포 자료로 자동 전환하지 않는다.

### 인계와 한계

- branch: `wo/carepharm-member-operations`, base: `491be1bb82c5b9788ff97020d0e0430939be11b6`. 이번 변경은 main 미병합·미배포이며 PR을 생성하지 않는다.
- 실제 사업 개통(사업 등록·조건·담당 운영 권한·실계정 승인)은 별도다. 이번에는 실계정 로그인·운영 사업 상태 조회/변경을 하지 않았다. 로컬 계정 SSOT 파일은 현재/기준 checkout에 없으며 과거 Demo 계정으로 대체하지 않았다.
- 운영 HTTPS의 새 기능 확인과 실제 가입 약국의 자료 활용 검증은 통합·배포·사업 개통 후 수행해야 한다. 무료혈당기·CGM·상담·개인 건강 관리 기능은 추가하지 않았다.
- `WORKTREE_DISPOSITION`: 전용 worktree `/workspace/o4o-wt/carepharm-member-operations`, 통합/배포 미수행, 합성 browser+실 PG 검증 완료, **KEEP**(통합 담당 인계 대상). 정확한 HEAD·미커밋/미추적 0·원격 일치는 push 후 최종 보고한다.

문서 정합: 현행 정본과 충돌 없음. 사업 회원 게시판 공개 금지·기존 저장 원장 유지. 과거 WO 재작성·SUPERSEDED 표기·정본 색인 변경 없음.

## 2026-10-20 main 통합·배포 단계

- 사용자 지시 **“main으로 병합 → 배포”**에 따라 같은 branch에서 통합 단계를 진행한다. 위의 PR 미생성·미병합·미배포 표기는 2026-10-19 개발 인계 시점의 기록이다.
- 최신 main `8075aa77caf8869c2815d7242cb65a5c07464c6a`를 merge commit `ff5bab50dcb436fb514eb6b47685b9e6ebdafee1`로 반영했다. App·host profile·CarePharm 테스트는 자동 병합됐으며 기존 main 기능을 유지한다.
- main에 추가된 협동조합 권한 판정 SQL에 맞춰 **격리 테스트 DB에만** cooperative 역할 테이블/열을 추가했다. 운영 스키마·권한 정책·migration 변경은 없다.
- 통합 재검증: CarePharm·호스트·포럼 클라이언트 **118 PASS**, 공통 전시/사업 showcase **34 PASS**, 실제 PostgreSQL management route·권한·저장 **29 PASS**, 수정 테스트 ESLint·diff 검사 PASS.
- 저장소 ruleset의 required `CI Gate`, 최신 HEAD의 보안 검사·리뷰 및 미해결 사항을 확인한 후 PR로 병합한다. 배포는 현재 Delivery/Promote 경로를 사용하며 freeze·권한·SHA gate를 유지한다. 운영 business 등록·회원 승인·무료혈당기 기획은 실행 범위에 추가하지 않는다.
- 정확한 PR/병합 SHA·post-merge CI·배포 run·운영 확인 결과는 해당 PR의 최종 인계 기록과 최종 사용자 보고에 남긴다. 실제 성공을 확인하기 전에 배포 완료로 판정하지 않는다.
- PR #717 Codex P2 `PRRT_kwDOOXrFm86uKs1t`: 편집 경로의 trailing slash를 React Router는 허용하지만 가드/레이아웃의 정확 비교가 거부했다. 두 곳에서 동일하게 후행 slash를 제거해 판정하고 레이아웃은 쿼리·해시를 보존한 정규 주소로 이동하도록 보완했다. 사업 역할·다른 사업 거부·편집 화면 진입을 포함한 **60 테스트와 수정 파일 ESLint PASS**. 기존 PR에서 수정 HEAD의 CI·리뷰를 재확인한다.
