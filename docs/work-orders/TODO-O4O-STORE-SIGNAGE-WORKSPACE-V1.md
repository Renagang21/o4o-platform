# TODO — Store 콘텐츠·사이니지와 자동 매장 연결

사용자 지시: 2026-11-05. 개발 종료는 로컬 검증·commit·push. main 병합·배포·운영 DB 수정 없음.

## 기준과 조사

- 시작 main: 695fb9814aee3c632aa14551759aaab5846fb8c3. 이전 PR #943은 별도 변경이며 재적용하지 않는다.
- 회원 등록 승인 서비스는 pharmacy_owner 승인 시 약국·owner·기본 회원을 연결한다. Store의 별도 약국 신청 화면은 중복이다.
- 메뉴 설정과 역할별 workspace·가입 정본에 과거 별도 신청 안내가 남아 있다. 현행 지시를 정본에 반영한다.
- 사이니지 보관함·재생목록 CRUD·항목 추가/제거/순서·스케줄은 존재한다. 저장 모델은 KEEP-LEGACY 경계를 유지한다.
- 단일 매장은 이미 자동 연결한다. 매장 선택을 일상 설정 메뉴에서 제거하되 다중 실제 매장의 안전한 명시적 선택과 협업체 handoff는 보존한다.
- Demo 표시는 활성 STORE_OWNER registry + 해당 약국 owner 관계에 한정한다. 임의 사용자·약국 연결, 실제 면허 승인, 운영 seed 금지.

## 작업

- [x] 코드·문서·Git 조사 및 전용 worktree 준비
- [x] 일반 콘텐츠와 사이니지 업무·메뉴 분리, 기존 URL/권한 유지
- [x] 동영상 보관함과 재생목록 용어·작업 흐름 정비, 외부 URL 중심 등록과 출처 표시
- [x] 재생목록 생성/이름 수정/추가/제거/순서/삭제 실제 동작 점검
- [x] 중복 매장 선택·My Home·이용사업 메뉴 제거, /services 명칭 통일
- [x] 별도 약국 신청 UI/클라이언트 삭제 및 구 URL 안전 안내, 신규 직접 신청 API 차단
- [x] 약국 경영자 승인 자동 연결과 기존 승인/중지/직원 경계 보존
- [x] /pharmacy를 매장 정보로 연결, Demo 가상 정보·샘플 증빙의 코드 기반 제공
- [x] 현행 정책·설계·Demo 문서 정합 (과거 실행 기록은 보존)
- [x] frozen 설치, Node22, 관련 frontend/API 테스트·타입·빌드 및 브라우저 검증
- [x] 변경 검토·검증 결과/제한 기록·commit·push

## 검증 기준

- 일반 콘텐츠 화면에 사이니지 편집 메뉴가 섞이지 않는다. 보관함→선택→재생목록 편집→미리보기/편성에 도달한다.
- 영상 제거는 보관함 원본 삭제와 구분된다. 사용 중 목록/영상 삭제는 기존 서버 보호를 유지한다.
- 외부 채널 URL과 커뮤니티/가입 협업체 자료는 소유/이용 권한을 지킨다. O4O YouTube 업로드는 선택 기능이다.
- 단일 매장 자동 연결, 미연결·API 오류·다중 매장·다른 조직 요청은 fail closed. 직원 초대와 비약국 기능 보존.
- Demo 가상 정보는 체험용 표시, 실제 자격 증빙으로 취급하지 않는다. 다른 사용자는 동일 자료를 얻지 않는다.

## 결과

개발 구현 완료. 실제 운영 계정·사용자 PC·운영 데이터 변경 없음.

### 구현과 문서 정합

- Store 전용 config에 사이니지 5번째 업무를 추가했다. 콘텐츠·매장 운영의 중복 사이니지 항목을 분리하며 기존 URL과 legacy workspace query는 유지한다. 과거 `/workspace/use?topic=signage`는 같은 Store 범위의 재생목록으로 연결한다.
- 보관함/재생목록에 페이지 체크·상단 ActionBar를 연결했다. 선택 영상으로 생성, 단일 상세/수정 및 재생목록 삭제를 제공하며 새 영상으로 만든 목록으로 이동한다. 이름 수정은 실제 PATCH와 목록 재조회로 확인하고 실패는 기존 이름과 오류를 유지한다.
- 가져온 경로와 영상 호스트를 구분한다. 외부 URL 등록과 커뮤니티·가입 협업체 자료 진입을 제공하고 O4O YouTube 업로드는 선택 기능으로 표시한다. 보관함 원본 삭제와 목록 항목 제거를 구분한다.
- 신규 직접 약국 신청 화면·클라이언트·runtime service.apply/검증 코드를 제거했다. 과거 URL은 안내, POST는 인증 후 410이며 원장 생성 쿼리는 실행하지 않는다. 옛 대기 자료를 검증하는 API production type/build에서 제외되는 루트 `src/__tests__/fixtures`에만 이전 생성기를 분리했다(운영 진입점 없음). 기존 원장 조회/심사/정지/종료는 보존한다.
- 설정의 매장 선택·My Home·이용사업 중복을 제거하고 `/services` 및 상단 명칭을 ‘이용 사업/가입 관리’로 통일했다. 실제 다중 매장 Selector·직원 초대와 조직 검증은 보존한다.
- `/pharmacy`는 매장 정보로 연결하며 API 오류/미연결을 재시도 가능한 상태로 표시한다. shared account-ui의 오류 표시 prop은 선택형이며 기존 소비처의 기본 동작은 유지한다.
- Demo 가상 정보와 사업자등록증 SVG는 실제 매장 편집/저장 값과 분리한다. 기존 접근 guard가 허용한 활성 Demo owner의 승인 약국에서만 예시가 반환된다. 운영 DB를 수정하지 않았다. Demo 면허 접근 보완은 앞선 별도 PR #943과 통합 담당이 함께 확인해야 한다.
- 역할별 workspace V1/V2·통합 회원 등록·가입 기준·commerce 설계에 이번 결정의 우선 적용을 기록하고 Demo 정본과 콘텐츠/사이니지 가이드를 보완했다. 과거 실행 기록은 변경하지 않았다.

### 검증

- Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0. frozen lockfile+verify-store-integrity 설치, runtime 기준 및 API 실행 의존성 73개 정합 PASS. manifest/lockfile 변경 없음.
- Store 전체: **94 files / 941 tests PASS**. 첫 실행의 기존 5개 문구·상단 메뉴 개수 기대값과 신규 이름 수정 오류 테스트의 선택 조건을 수정했다. 검사 완화/skip 추가 없음.
- API 관련: **35 suites / 306 tests PASS**, 기존 opt-in DB 의존 **15 suites / 218 tests SKIP**. Demo 표시 helper 추가 7 tests PASS. 약국 정보/폐기 endpoint/원장 격리·기존 기록 처리 포함. 운영 DB로 skipped 검사를 대신하지 않았다.
- 공통 account-ui: **2 suites / 28 tests PASS**. dependency closure build·Store production build/typecheck·API typecheck PASS. 기존 Vite chunk 크기·Browserslist 자료 경고는 숨기지 않았고 임의 패키지 갱신을 하지 않았다.
- 실제 Chromium 390/1440px의 응답 가로채기 fixture: 별도 탭·체크→목록 생성→영상 추가→이름 수정 PASS. 외부 API·사용자 계정으로 쓰기 없음. 확장 검증에서 기존 목록에 영상 추가→순서 변경→항목 제거→목록 삭제까지 두 화면 폭 모두 PASS. 가상 응답에만 총 7번의 쓰기를 허용했으며 실제 서비스 쓰기는 0건이다. 보관함 원본 삭제와 항목 제거를 구분하는 접근 가능한 버튼 이름도 확인했다.
- 이 과정에서 기존 개발 StrictMode 재실행 시 부모 작업 범위가 늦게 활성화되어 영상 조회가 영구 대기하는 문제를 발견했다. 활성화를 layout effect로 옮겨 자식 조회 전에 완료한다. StrictMode 양쪽 실행 활성·실제 unmount 후 거절 회귀 및 관련 scope 테스트 **44 PASS**. 앞선 브라우저 실패는 수정 후 재검증했다.
- 문서 민감정보 검사 **0건**. 변경 전 root 및 다른 worktree/작업은 수정하지 않았다.

### 제한과 인계

운영 가입 계정·실제 Demo 원장·사용자의 영상 임베드/현장 TV 재생은 검증하지 않았다. 외부 영상 제공자의 비공개/임베드 정책은 실제 소스에서 별도 확인한다. 이 브랜치는 로컬 개발과 push 범위이며 main 통합·배포·migration/seed는 수행하지 않는다.


### 최종 확인과 개발 인계

- Store 최신 production build PASS, API `tsconfig.build.json` production build PASS. Store 산출물에 가상 증빙 SVG가 포함되며 API 산출물에는 루트 테스트 fixture가 포함되지 않는다.
- 마지막 사이니지·workspace·scope 검사 **9 files / 90 tests PASS**, 옛 fixture를 production 제외 경로로 옮긴 뒤 관련 **2 suites / 29 tests PASS**. 전체 Store **941 PASS** 결과와 함께 인계한다.
- 마지막 Chromium 390/1440px에서 생성·추가·이름 수정·순서 변경·항목 제거·목록 삭제 모두 PASS. 초기 확장 검사에서 발견한 빈 목록 문구의 조사 오류도 수정했다.
- 브랜치 `wo/store-signage-workspace`, 기준 `695fb9814aee3c632aa14551759aaab5846fb8c3`. 전용 worktree는 후속 검토를 위해 유지한다. 새 PR·main 병합·배포는 수행하지 않는다.
- 이전 PR #943과 수정 파일 18개가 겹친다. 통합 담당은 문구 변경과 이 작업의 신청 폐기/사이니지 동작을 함께 보존해 통합한다. 이전 PR을 이 브랜치에 자동 병합하거나 재적용하지 않았다.
