# WO-O4O-PARTNER-SUPPORT-WORKSPACE-V1

> 상태: ACTIVE · 최초 작성: 2026-10-25
> 범위: 신규 Partner 지원 서비스 · 로컬 도구와 서버 공동공간
> 근거: 사용자의 신규 인플루언서 지원 사업 정의 및 개발 착수 지시

## 사업 경계

- 홍보 주체는 공급자·제품 보유 사업자와 홍보자다.
- O4O는 콘텐츠·자료공간·홍보 도구·활동 기록·정산 처리 도구를 제공한다.
- 협의는 오프라인·각자 이메일·게시판·포럼 등에서 자율적으로 진행한다.
- 협상·계약·협의 기록 수집·보상 판정·분쟁 중재를 제품 기능으로 만들지 않는다.
- 모집부터 정산까지 단일 절차를 강제하지 않는다. 외부에서 시작한 활동도 기록 가능하다.

## 현재 코드 판단

- 현재 체크아웃의 과거 Partner runtime은 이미 은퇴했고 전용 웹 앱은 없다.
- `services/web-partner`를 신규 작성한다. 과거 Partner 스키마·역할을 복구하지 않는다.
- 다른 서비스의 Seller Recruitment·공통 인증·API·과거 migration은 삭제하지 않는다.
- 기존 Neture의 준비 중 안내는 전용 앱 배포 전까지 유지한다.
- 준비된 격리 cloud checkout과 `work` branch를 사용한다. onboarding 지침대로 별도 worktree를 생성하지 않는다.
- 시작 HEAD: `f196b3cf225acf909eb3eb70222a1b7802a64bba`. 원격 main이 이후 이동했음을 확인했으며 자동 merge/reset 하지 않았다.

## TODO — 1차 로컬 작업공간

- [x] 사업 경계·데이터 모델·기존 코드 처분 결정 기록
- [x] 독립 React/Vite 서비스와 반응형 탐색·시작 화면
- [x] 사업자의 홍보 제안 등록·검색·채널 필터·외부 문의 링크
- [x] 홍보자 프로필·활동 채널·대표 콘텐츠 등록
- [x] 콘텐츠 자료실·사용 범위·원본 링크·문구 다운로드
- [x] 입력 사실 기반 채널별 구성안 생성·편집·자료실 저장
- [x] 제안·홍보자별 UTM 링크 생성 (클릭 집계 아님)
- [x] 게시 결과·직접 입력 조회수 기록과 출처 표시
- [x] 수동 지급 내역·외부 지급 기록·CSV 명세
- [x] 브라우저 저장·손상 데이터 덮어쓰기 방지·JSON 백업
- [x] 타입 검사·프로덕션 빌드·의미 있는 자동 테스트
- [x] 데스크톱·모바일 브라우저 기능·레이아웃 검증
- [x] 변경 범위 점검·검증 결과 기록 (commit/push 결과는 완료 보고로 인계)

## TODO — 서버 공동공간 (구현·격리 검증 완료)

- [x] 기존 O4O 쿠키 인증 연결. 전역 Partner role/membership을 복원하지 않고 공간 ACL(소유자·편집자·열람자)로 지원 도구 접근 관리
- [x] 서버 API·공간/참여자/초대/변경 이력 모델, PostgreSQL migration과 fingerprint 등록
- [x] 공간별 자료 분리·공유 자료실·단일 사용/7일 만료 초대·초대 취소·참여자 접근 해제
- [x] snapshot revision·행 잠금으로 동시 저장 충돌 방지, 실패 시 입력 보존
- [x] 정산은 소유자만 수정, 참여자는 공간 내 내역 열람. 개별 비공개 자료는 다른 공간에 보관
- [x] 정산 변경 전후·변경자·서버 시각 이력. 자료·활동·정산 수정/삭제와 참조 무결성 유지
- [x] JSON 백업을 소유자가 명시적으로 서버 공간에 가져오기
- [x] 이메일 로그인·쿠키 세션 확인·refresh·로그아웃 연결. 비밀번호/토큰의 브라우저 저장 없음
- [x] 서버/로컬 모드 전환과 새로고침 유지, StrictMode 초대 fragment 처리, 모바일 권한별 화면
- [x] 로컬 PostgreSQL 및 세 브라우저 테스트용 세션의 전체 공유 흐름 검증

## 통합 전 개발 묶음 — 사용자 승인 범위

사용자 지시: TODO와 검증 기준을 먼저 확인하고 가능한 기능을 한 묶음으로 구현·검증·push한다. main merge/rebase·PR·운영 DB·배포는 수행하지 않는다.
기존 `wo/partner-support-workspace-v1` 연속 작업이며 시작 HEAD는 `5de6c0489f`다.

- [x] 사전 확인: 깨끗한 checkout·기존 프런트 테스트/빌드·API 타입 검사, 추가 패키지 없이 구현 가능 여부
- [x] 인증된 이미지·영상 업로드/다운로드/미리보기, 공간별 권한·용량 제한·파일 버전 (로컬 디스크 adapter, 운영 영속 스토리지는 별도 연결)
- [x] 콘텐츠 분류·태그·템플릿·텍스트 버전 이력/복원, 자료에서 제작 도구로 이어지는 흐름
- [x] 홍보자 복수 채널·언어·지역 프로필
- [x] 게시 활동 CSV 일괄 등록·중복 방지·직접 입력 지표와 콘텐츠별 비교 리포트
- [x] 지급 예정일·기간/상태별 명세·외부 지급 결과 CSV 가져오기 (실송금·세금 계산 제외)
- [x] 공동공간 변경 알림·계정별 읽음 상태, 협의/계약 관리 추가 금지
- [x] API/웹 검사·실제 일회성 PostgreSQL·권한/부정 입력/충돌/파일 무결성 테스트·desktop/mobile 브라우저 검증
- [x] TODO 결과 갱신·검증 범위 점검 (정리·commit·push 결과는 완료 보고로 인계)

검증 기준: 다른 공간의 파일/이력을 읽을 수 없어야 한다. 열람자는 쓰기 불가, 편집자는 정산 변경 불가다. 파일명/경로·MIME 위장·초과 용량을 거부한다. 가져오기는 전체 검증 후 저장하며 중복/오류 시 부분 반영하지 않는다. CSV 지표는 직접 등록한 정보임을 표시한다. 이전 데이터/백업은 계속 읽을 수 있어야 하며 실제 외부 AI/SNS/지급을 호출하지 않는다. DB 검증은 task 전용 컨테이너와 schema에서만 실행한다.

### 사전 설계 확인

기존 snapshot JSON에 선택 필드를 추가해 호환성을 유지한다. 파일은 JSON에 base64로 넣지 않고 별도 권한 검사된 API로 취급한다. 파일 metadata와 알림 읽음 cursor는 별도 테이블, 콘텐츠 텍스트 버전은 기존 변경 이벤트에 기록한다. 스토리지 미설정 시 업로드는 명확히 거부한다. 기존 전역 인증/role/commerce 계약은 변경하지 않는다.

## TODO — 외부 연결과 운영 인계

- [ ] 최신 main 통합 시 migration 순서·fingerprint 재검증: 마지막 fetch의 `c63e370594`에서 동일 manifest/expected-state 파일이 변경되었다. 이번 fingerprint는 준비된 checkout의 prefix를 검증한 값이며, 통합 담당은 병합 후 격리 PostgreSQL에서 새 순서로 재산출·검증해야 한다. 자동 merge/reset은 수행하지 않았다.
- [ ] 실제 O4O 개발용 계정의 기존 인증 미들웨어·약관·세션 정책 end-to-end 검증
- [ ] 운영 영속 스토리지·공유 볼륨/객체 저장소 연결 및 개인정보 파기·백업 정책 검증 (로컬 파일 저장·파일/텍스트 버전은 구현·격리 검증 완료)
- [ ] 외부 전환 수집·검증 출처·기간·중복 처리
- [ ] 실제 송금·원천징수·세금 처리 제공자 연결 (현재 수동 지급 기록·명세·감사 이력)
- [ ] AI 생성 서비스 연결 (현재는 규칙 기반 템플릿)
- [ ] 제품 체험·샘플 배송 지원
- [ ] 공식 SNS API 권한 검증 후 지원 채널 연동
- [ ] `partner.neture.co.kr` 배포·라우팅·운영 검증은 통합 담당 인계

## 실행·검증

도구 활성화: `source /workspace/.o4o-tools/activate.sh`.
저장소 루트에서 `pnpm --filter @o4o/web-partner run build`.
테스트: `pnpm --dir services/web-partner test`.
개발: `pnpm --filter @o4o/web-partner dev` (포트 3011).

기본 진입은 서버 공동공간이며 로컬 도구는 별도로 선택한다. 로컬 자료는 자동 전송하지 않고 소유자가 JSON 가져오기를 명시적으로 실행해야 한다.
서버 API는 실제 requireAuth를 사용하지만 브라우저 통합 검증은 일회성 PostgreSQL + 테스트용 인증 어댑터에서 실행했다. 실제 계정 로그인이 검증되었다고 주장하지 않는다.
테스트 데이터는 로컬 브라우저·메모리 fixture·일회성 PostgreSQL의 별도 schema에서만 생성한다. 운영 DB·실계정·유료 AI·실제 지급을 호출하지 않는다.
공개 문서에는 실제 이름·이메일·계정·계좌·비밀값을 기록하지 않는다.

## 검증 결과

- `pnpm install --frozen-lockfile --offline --ignore-scripts --verify-store-integrity=true --store-dir /workspace/.o4o-tools/pnpm-store`: 성공. 기존에 검증된 의존성으로 새 importer를 확인했고 기존 native 모듈 재설치는 하지 않았다.
- `pnpm --filter @o4o/web-partner build`: 타입 검사와 production build 성공.
- `pnpm --dir services/web-partner test`: 2개 파일, 34 tests 통과.
- 신규 서비스의 TypeScript/React ESLint: 오류·경고 없음.
- production preview에서 `PARTNER_TEST_ORIGIN=http://127.0.0.1:3011 pnpm --dir services/web-partner test:browser`: 성공.
- Chromium: 제안 등록·새로고침·검색, 콘텐츠 생성/편집/자료실 저장/다운로드, UTM 생성, 조회수 0 기록, 수동 정산·외부 지급 기록, CSV/JSON 다운로드 확인.
- 360/390/768/1440px에서 7개 화면씩 총 28회 가로 넘침 검사, 모바일 탐색·검색 성공. desktop/mobile 스크린샷 육안 확인.
- 첫 브라우저 검사에서 편집 textarea의 label에 내용이 합쳐지는 접근성 문제를 발견했고, 명시적 label/control ID 연결로 수정 후 전체 흐름 재검증 성공.
- 브라우저 오류·예기치 않은 외부 API 호출 0건. 테스트는 격리된 일회성 context에서만 실행했고 종료 후 context를 닫았다.
- 위 항목은 최초 로컬 버전 검증이다. 현재 서버 확장 결과는 아래에 별도 기록한다.
- 전체 monorepo CI는 실행하지 않았다. 운영 배포는 명시적으로 지정된 통합 담당의 범위다.

문서 정합: 기존 역할 Architecture의 FUTURE PARTNER = GREENFIELD 방향을 따른다. 기존 정본의 상태·본문·색인은 변경하지 않는다.

## 서버 확장 검증 결과

- API 의존 패키지를 기존 topology로 빌드한 뒤 API 전체 type-check와 production build 성공.
- 웹 production build 성공. 브라우저 통합 빌드에는 loopback API origin만 주입했다.
- 프런트 Vitest 4개 파일 48개 통과: 저장·충돌·권한·수정·참조 보호, 쿠키 클라이언트, 동시 refresh, 비밀번호 미저장, StrictMode 초대 처리 등.
- 실제 PostgreSQL 통합 Jest 10개 통과: 외부 사용자 404, 열람/편집 권한, 정산 소유권, hash 초대·만료·취소·재사용 거부, 접근 해제, 동시 저장, 감사 실패 시 전체 rollback, populated down 거부.
- PostgreSQL 15의 canonical baseline과 37개 선행 migration을 검증하고 신규 38번째 migration 적용. 6,893줄 fingerprint `78d2aee502dffdd04b9b8b075341a23bf51d44e95672e70351f46bfb6f4ef2e5` 일치. 빈 신규 테이블의 down/up에서 이전/이후 fingerprint 모두 일치.
- migration contract 21 PASS / 0 FAIL. unsafe route guard 위반 0건.
- Chromium: 세 격리 세션 간 공유, 일회용 초대, 열람자 수정 UI 제한, 편집자 정산 제한, 소유자 정산 수정·지급 기록, 변경 이력, 접근 해제 확인. 서버/모바일 화면 육안 확인.
- 로컬 Chromium 기능 회귀와 28개 화면 폭 검사 통과. 테스트 context는 종료 후 닫았고 실제 외부 게시·송금은 수행하지 않았다.
- migration 운영 적용·실계정 인증·외부 서비스·운영 도메인 배포와 전체 monorepo CI는 미실행. migration 포함 배포는 통합 담당의 별도 운영 승인 경계다.

## 통합 전 개발 묶음 검증 결과

- 개발 전에 기존 프런트 48 tests, 웹 build, API type-check를 실행해 정상 기준을 확인했다. 추가 외부 패키지는 없다.
- 프런트 5개 파일 62 tests, 실제 일회성 PostgreSQL API 16 tests 통과. 이전 snapshot/백업, 복수 채널/분류/템플릿, CSV 전량 검증·중복/재실행, 0/미입력 지표를 확인했다.
- 파일은 사용자/공간 ACL·25MB·100개/500MB 제한·실제 MIME signature·SHA-256 검사를 거친다. 잘못된 MIME/HTML/SVG·초과 업로드·다른 공간 접근·변조된 파일을 거부했다. 실패한 metadata transaction과 quota 초과 시 생성 파일을 정리했다.
- Chromium: 실제 PNG 업로드·미리보기·버전 추가/이전 버전 다운로드, 생성한 무음 32x32 WebM 업로드·재생 확인. 파일은 테스트용 local adapter로만 처리했다.
- 같은 브라우저 흐름에서 텍스트 버전 복원·활동 CSV 등록/중복 제외·비교 리포트·지급 예정일·외부 지급 결과 CSV·계정별 알림 읽음을 확인했다. 실제 AI/SNS/지급 호출은 없다.
- 8개 화면 × 4개 폭(360/390/768/1440) = 32회 layout 검사와 모바일 역할별 공유 화면을 확인했다.
- PostgreSQL 15 canonical prefix 38까지 준비 후 39번째 media/read-state migration 적용 성공. fingerprint `75835f71568a80334d64a06279a72931b8fbd414273535643bb45bc6da3d65d0`(6,928줄) 일치. 빈 상태 down/up에서 양쪽 fingerprint 일치. 운영 DB는 사용하지 않았다.
- main 통합·rebase·PR·배포는 수행하지 않았다. 최신 main과 함께 반영할 때 migration 순서와 fingerprint를 다시 검증해야 한다.
- JSON 백업은 자료/기록용이며 첨부 파일 bytes는 별도로 보관해야 한다. 운영 파일 저장소 및 개인정보 파기 연결은 위 인계 TODO다.

- 최종 웹/API production build와 API type-check, ESLint 통과. migration contract 21 PASS / 0 FAIL, unsafe route guard 위반 0건, 문서 민감정보 검사·diff 검사 통과.
- 브라우저 harness 종료 후 테스트 schema 잔존 0건 확인. 이번 작업 전용 PostgreSQL 컨테이너·볼륨과 생성한 임시 자격정보·검증 helper를 삭제했다.


## main 통합·배포 — 2026-10-25 후속 승인

사용자가 이 공간에 `main통합 배포`를 지시했다. 이전 개발 단계의 통합 금지는 이 후속 작업에 적용하지 않는다. main은 PR과 required CI를 통해서만 반영한다. 운영 migration은 검증 결과와 대상을 제시한 뒤 명시적 실행 승인을 받아 정상 Promote로 실행하며, freeze·CI·WIF·ref 경계를 우회하지 않는다.

- [x] 최신 main `7a75dcf666`과 작업 브랜치 비교, 기존 PR 없음·main ruleset 확인
- [x] main의 기존 migration 41개 순서를 보존하고 미배포 Partner 2개를 `1792886600000`, `1792886700000`으로 뒤에 등록. 이전 timestamp와 중간 fingerprint는 개발 단계 기록이며 운영 적용값이 아니다.
- [x] 격리 PostgreSQL 15 canonical bootstrap과 기존 41개 prefix 일치, 신규 42/43번째 적용·빈 상태 down/up 확인
- [x] 신규 공간 fingerprint `3d408172c0b5a9b2d548ed5584248d08e61e6bf2e9eb40ee4961a0e57414c8f5` (7,076줄), media/read fingerprint `418afd534087a5c269051506237b6b3bf69c9ad9ef160fddfd138dbda6b7ec4f` (7,111줄) 재산출
- [x] Partner 웹의 신규 Docker/nginx, affected/CD registry·동일 freeze/CI/verified 배포 job 등록. 기존 6개 웹 소비처의 배포 gate 유지
- [ ] 통합 빌드·회귀 검사 완료 후 작업 브랜치 push, PR required CI·review 확인과 main 병합
- [ ] 운영 migration 2개 실행 승인·정상 배포, 공개 URL·serving SHA 확인

첫 Partner 웹 서비스가 운영에 없다면 기존 배포 계정은 IAM을 변경할 수 없으므로 서비스 공개 접근 부여·도메인 연결은 소유자 최초 설정이 필요하다. 첫 서비스/serving SHA를 알 수 없는 경우 Promote는 fail-closed이며 기존 검증 gate를 완화하지 않는다. 파일 업로드는 운영 영속 저장소 설정 전 비활성 상태를 유지한다. 운영 임시 디스크에 저장하도록 설정하지 않는다.

### 통합 로컬 검증

- API 의존성을 현재 main 버전으로 재빌드한 뒤 API type-check와 production build 통과. 프런트 62개·PostgreSQL API 16개·배포 관련 전체 단위 테스트 363개 통과. migration contract 21 PASS / 0 FAIL.
- 실제 Partner Docker image build·8080 컨테이너 HTTP 200과 Chromium 기능/32개 responsive 검사 통과. nginx 설정은 COPY 시 명시적으로 0644를 부여하여 unprivileged 사용자도 읽도록 검증했다.
- PR #820 생성. PR CI·review·main 병합과 운영 배포는 아직 진행 단계이며 완료 판정은 실제 GitHub 결과로 확인한다.
- 이 환경의 운영 도메인 probe는 outbound CONNECT 403으로 차단되었다. 이것만으로 운영 사이트 장애라고 판정하지 않는다. 운영 API의 신규 경로는 배포 전 404다. 운영 데이터·계정 변경은 수행하지 않았다.

### PR 리뷰 보완 — 계정 파기 writer fence

- Codex P1 지적을 반영해 신규 6개 테이블에 기존 `account_erasure_write_fence` INSERT/UPDATE trigger를 등록했다. Core 함수나 기존 계정 파기 정책은 변경하지 않는다.
- 실제 PostgreSQL 회귀 17개 통과. schema별 API/browser harness의 fence adapter와 실제 canonical public 함수 검증을 구분했다. canonical 43 prefix와 신규 down/up 재확인 후 실제 public 함수가 6개 테이블의 파기 대상 UUID 쓰기를 모두 `ACCOUNT_ERASURE_PENDING`으로 차단함을 확인했다.
- 최종 fingerprint: 공간 `71c8439bec809c03e55cc68068877cb8f39d567afbf203e78254281a191fdc07` (7,080줄), media/read `4accc1af6999af30ee278a666edeafb6d978b2846ef9876fd2b43e58cc4144a3` (7,117줄). 위 최초 통합 산출값을 대체한다.
- 별도 발견: 기존 main canonical prefix 41에는 이미 fence 누락 테이블 10개가 있다(`ai_usage_reservations`, `cooperatives`, `external_ai_*` 6개, `member_paid_service_entitlements`, `store_consultation_stations`). Partner 적용 전후 누락 수가 동일함을 확인했다. 이 기존 Core/다른 도메인 문제는 임의 수정하지 않았으며 운영 계정 파기 전체 정상으로 보고하지 않는다. 해당 도메인 통합 담당의 별도 검토가 필요하다.

### PR 재검토 보완 — 세션·날짜·검증 스크립트

- 서버 모드 재진입 시 기존 개인/공간/알림 상태를 먼저 초기화하고 401을 공통 오류 처리로 전달한다. 세션 만료 후 로컬→서버 복귀·재로그인 회귀를 추가했다. 재연결 중 모드 전환을 잠그고 안정된 callback 의존성을 사용한다.
- snapshot 역직렬화의 활동일은 유효한 달력 날짜만 검사한다. 미래 날짜 제한은 등록/수정 입력에 유지하여 참여자의 시간대 차이로 저장 자료 전체를 거부하지 않는다. 프런트 64 tests·웹 build·32 화면 브라우저 검사·변경 파일 ESLint 통과.
- GitHub CI console 검사에서 잡힌 테스트 harness의 준비 로그를 console.info로 변경했다. 규칙·제외 범위·baseline은 변경하지 않았다. Sonar가 지적한 고정 /tmp 스크린샷 파일 경로는 mkdtemp로 만든 0700 전용 폴더 안으로 옮겼다. 전체 ESLint 실측 1 error는 기존 baseline 46 이하로 ratchet 통과했다(기존 오류는 임의 수정하지 않았다).
