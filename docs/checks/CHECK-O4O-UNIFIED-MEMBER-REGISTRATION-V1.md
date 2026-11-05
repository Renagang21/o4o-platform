# 통합 회원 가입·관리 검증

- 일자: 2026-11-04
- 정책: [통합 가입·관리 기준](../baseline/O4O-UNIFIED-MEMBER-REGISTRATION-V1.md)
- 실행 계획/재점검: [TODO](../work-orders/TODO-O4O-UNIFIED-MEMBER-REGISTRATION-V1.md)
- 기준 main: `ac42c35b33b1ea2b3829fda2ebc1b8b1b3a15ada` (#940). 작업: `wo/member-registration-unified-20261104`.
- 로컬 검증 범위: 현재 Codex 전용 worktree의 개발·push·[PR941](https://github.com/Renagang21/o4o-platform/pull/941). 이후 사용자 지시로 이 공간이 main 통합·배포도 담당한다. 아래 결과는 운영 회원 변경을 포함하지 않는 개발 검증이며 실제 통합·배포 결과는 PR/완료 보고로 구분한다. 다른 12개 worktree와 기존 PR936은 변경하지 않았다.

## 구현 결과

1. 신규 Google·카카오·이메일 계정 생성에만 서버 전용 미입력 표식을 둔다. 공통 인증 후 가입 유형·닉네임·역할별 정보/선택 서류를 제출하고 단일 승인으로 기존 자격/사업체/역할 원장에 연결한다. 일반 로그인/연결은 표식을 새로 만들지 않는다.
2. 목록은 이름·닉네임·이메일·로그인 방식·가입 유형·회원 상태의 한 줄 열로 통일했다. 기존 체크·상단 작업·단일 대상 명령·검색/탭 변경 시 선택 초기화는 유지했다.
3. 조회/수정은 같은 필드 폼이다. 이메일 정정은 운영자 확인으로 완료하고 이전 인증 링크·세션은 폐기한다. 면허 오기는 승인 자격을 불필요하게 대기로 돌리지 않으며 중복·철회 상태 보호를 유지한다. 임시 비밀번호 기존 보안 계약도 유지한다.
4. 승인 후 사업자 정보는 실제 조직/공급자 원장을 읽는다. 공급자 소유자는 organization_members이며 과거 user_id가 NULL이어도 조회한다. 상세주소/우편번호는 organizations.address_detail, 비공개 담당자 이메일은 businessProfile.managerEmail, 공개 문의 이메일은 neture_suppliers.contact_email로 구분한다. 동시 변경/소유자 변경을 409로 막는다.
5. 회원 해지·복구는 해당 Neture membership만 쓴다. 직원 소속·역할·매장 권한·타 서비스 원장은 그대로이며 Admin 삭제/매도/폐업 경로는 유지한다.
6. 신청 ID에 본인의 게시 약관 동의 증적을 연결한다. 다른 제출의 증적을 재사용하거나 운영자가 동의를 대신 만드는 경로는 없다. 일반 businessInfo writer는 가입 예약 키를 수정할 수 없다.

## 검증 근거

| 구분 | 결과/실행 |
|---|---|
| 환경·설치 | Node22.23.4 / npm10.9.9 / pnpm10.25.0. frozen lockfile·무결성 검증 유지. manifest/lockfile 변경 없음 |
| 런타임 정합 | `pnpm run check:runtime` PASS. 20 workflow pins·17 Docker stages, Windows PC22.18.0 예외 유지. API73개 공유 의존성 버전 정합 |
| 의존 패키지 | API dependency closure, types/account-ui, appearance-system/lms-client/auth-context 빌드 PASS. 새 worktree의 누락 dist는 기존 빌드로 준비했으며 앱/manifest 변경으로 우회하지 않음 |
| 타입·운영 빌드 | API/Admin/Neture tsc 및 production build PASS. 프런트의 기존 큰 청크 안내는 유지 |
| 정식 DB | 라벨이 있는 별도 PostgreSQL15 tmpfs 컨테이너, loopback55432·전용 fixture DB. baseline+58 incremental schema prefix fingerprints PASS. schema migration/backfill 추가 없음 |
| DB·HTTP·카카오 신규 가입 | 전용 가입25, 기존 회원/임시 비밀번호26, HTTP경계13, 카카오 신규가입1: 합계65개 검증. 각 유형 승인·재요청·동시 승인·중복 면허 rollback·소유 문서·정책 증적·사업자 충돌·직원/타서비스 불변 포함 |
| 추가 회귀 | 인증/Google전용/이메일/사업자 JSON writer/메인 판정/직원 Store 접근/기존 HTTP 경계10개 suite227개 PASS. 수정한 Google·이메일 신규 가입에는 실제 생성된 표식을 추가 확인. 추가 Supplier boundary 및 직원 업무 source/behavior 회귀 PASS |
| Admin 화면 | 회원 목록/수정14 + 이용 관리5 =19개 PASS. 단일 행·선택·가입 필드·실패 draft·403 정리·임시 비밀번호 회원 전환 시 제거·Admin 매도/폐업 보존 |
| Neture 화면 | 인증·가입·운영 진입·메인 안내12개 suite127개 PASS. 신규 가입8개는 역할별 필드/409 draft/조회 재시도/신규 계정 전용 이동을 검증 |
| 실제 Chromium | PC1440×1000 / mobile390×844 모두 PASS. 체크→수정→선택 서류 업로드/열람→409 draft 보존→저장→단일 승인→해지/복구→목록 갱신·권한 거부 직접 진입. pageerror0. 합성 API 응답을 사용하며 실제 회원/스토리지 업로드는 없음 |
| 코드 품질 | 변경 TS/TSX ESLint error0. 기존 Google 테스트의 `_signupPolicyKey` unused 경고1은 기존 내용이며 기준 완화 없음. git diff whitespace 검사 PASS |

DB native 테스트를 기존 PostgreSQL CI 단계에 포함해 일반 Jest 실행의 opt-in skip만으로 완료 처리하지 않는다. 일부 기존 fixture는 실제 스키마의 소유 관계/type/address_detail을 읽을 수 있도록 확장하고 위치 기반 INSERT를 명시 열 INSERT로 바꿨다. 이전 재확인메일·면허 재대기 기대는 새 사용자 정책에 맞춰 정정했으며 이메일 충돌·인증 폐기·권한·동시 수정·rollback 검사는 유지한다.

검증 로그와 브라우저 합성 fixture/스크린샷은 `/workspace/.o4o-cloud/artifacts/member-registration-unified-20261104/browser` 및 `/tmp/o4o-unified-*`에 보관한다. 실제 자격증명은 문서/PR에 넣지 않는다.

## 문서 정합과 한계

새 정책 정본을 색인에 등록하고 인증/서비스 가입 V1·역할 책임 V2·약국 commerce 설계·운영자 회원 표준에 대체 범위를 연결했다. 과거 CHECK 결과를 새 구현 완료 증거로 덮어쓰지 않았다. 신규 표식이 없는 기존 회원은 기존 이메일 확인 기반 이용을 유지한다. 부가 정보/선택 서류를 승인 필수로 승격하지 않는다.

실제 Google/Kakao 계정 생성·SMTP·비공개 GCS 업로드·운영 회원 수정/삭제는 실행하지 않았다. 외부 공급자와 실제 운영 데이터 검수는 PR 통합 이후의 별도 운영 검증이다. 기존 Admin 전체 계정 삭제 활성화 PR936은 이 변경에 포함하지 않는다. 여러 사업체로 대상이 불명확하면 해당 사업체 관리에서 수정하며 임의 선택하지 않는다.

PR 상태·SHA와 CI 관찰 결과는 PR 및 완료 보고에서 별도로 명시한다. 이 문서는 main 병합/배포 완료를 주장하지 않는다.

통합 승인 추가(2026-11-04): 사용자가 PR 생성 뒤 main 병합·배포까지 명시적으로 요청했다. 현재 변경에는 신규 migration이 없다. CI/리뷰/현재 main gate를 만족한 뒤 현행 Delivery·필요 시 Promote를 사용하며 우회 배포는 하지 않는다.

추가 검토 보완: 운영자가 가입 유형을 먼저 작성/변경해 본인 제출 ID가 없는 대기는 회원의 약관 확인·제출이 가능하게 제공한다. 본인이 이미 제출한 대기는 조회 상태를 유지한다. DB 검증에서 운영자 사전 작성→동의 없이 승인409→본인 약관 제출→정상 승인과 제출 ID 바꿔치기 거절을 확인한다.

Codex 리뷰 보완: 기존 활성 회원의 대기/반려 자격·공급자 신청을 새 회원 대기로 승격해 메인을 막지 않도록 서버 전용 legacyMainAccess 읽기 호환을 유지한다. 이 표식은 자격/사업체 승인을 대신하지 않고 공통 정지·명시 해지보다 우선하지 않는다. 공급자 증빙은 neture_suppliers의 문서 연결과 현재 owner를 함께 검사해 이전 제출자 접근을 차단한다. 같은 주소를 운영자가 확인해 저장한 경우도 추가 확인메일 없이 완료한다. 관련 DB 회귀5개와 메인 판정3개를 추가했다.

전체 PR CI에서 기존 AI 요청 HTTP 검증의 대기 안내 문구 기대 1건이 새 문구와 달랐다. 해당 문구만 현재 정책에 맞춰 정정한 뒤 suite61개가 통과했다. 권한 guard·에러 상태·테스트 범위는 유지한다. 최신 보완은 기존 회원/HTTP/카카오57개·메인 판정19개·가입 화면8개·변경 API/Neture build/lint로 확인했다.

2026-11-05 추가 진단: 사용자 승인을 받은 별도 읽기 전용 workflow(41938573981)에서 SonarCloud 보안 등급 C의 원인이 신규 업로드 제한의 typescript:S5693 한 건임을 확인했다. 신규 통합 가입/정정 업로드를 8,000,000바이트 이하·파일1개·추가 필드0개로 제한하고 multipart parts/header도 제한했다. 두 업로드 경로에서 상한 직전/상한 허용, 초과 및 추가 필드/두 번째 파일 거절을 검증한다. 분석 기준 억제/완화는 하지 않는다. 임시 진단 workflow는 main에 병합하지 않는다.

증빙 조회 경계 재점검: 신규 회원 API와 기존 약국 서류 조회가 같은 소유관계 helper를 사용하도록 연결했다. 공급자 원장에 연결된 서류를 이전 제출자가 구형 다운로드 URL로 우회해 읽지 못하도록 하며, 기존 약국 서류 권한 테스트와 정식 DB의 이전/현재 소유자 판정으로 함께 검증한다.

보완 검증 결과: 정식 스키마·기존 회원·업로드 HTTP·카카오 65개, 기존 증빙/신규 업로드 23개, Admin19개·가입 화면8개 및 API build/lint PASS. 공개 Sonar 진단 메타데이터와 읽기 전용 workflow 사본은 `/workspace/.o4o-cloud/artifacts/member-registration-unified-20261104/sonar`에 보관했다.
