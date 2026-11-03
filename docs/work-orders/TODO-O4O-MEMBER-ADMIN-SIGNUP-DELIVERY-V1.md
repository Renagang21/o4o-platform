# TODO — 회원가입·회원관리·자료 삭제 통합 정비

- 상태: 구현·로컬 검증 완료, PR·통합 진행 중
- 기준일: 2026-11-03
- 사용자 승인: 이 공간에서 TODO·구현·검증·PR·main 병합·배포까지 수행
- 기준 main: `53bab48e880cec6760908ff9614d875d6bbc9b39`
- branch: `wo/member-account-lifecycle-20261103`
- 범위: 가입/메일 확인, Admin 직접 관리, Operator 정지·해지, 단일 직원 소속, 약국 이전·완전폐업, 개인/사업/공유 자료 분류와 최종 삭제·재시도
- 제외: 운영 회원/업무 자료의 삭제 테스트, 승인 전 운영 migration·삭제 활성화, Node/패키지 업그레이드, 무관한 작업공간 정리

## 준비·전수 대조

- [x] 최신 main·전용 worktree·진행 중 Git 작업·기존 변경 확인
- [x] GitHub 저장소 읽기·소유자 권한·push dry-run·현재 PR ruleset 확인
- [x] 배포 0을 명시한 Actions dry-run으로 실행 권한·현재 CI/freeze 판정 확인
- [x] 선행 원격 `1a1e5f9a49` 확인 — main 미포함, 관련 PR 없음
- [x] 중단된 `member-admin-signup-delivery` 로컬 worktree는 현재 환경에 없음 확인
- [x] 선행 22개 파일과 테스트를 검토해 필요한 코드만 재사용
- [x] 최신 AGENTS·개인정보 보존·Identity·역할·공통 모듈·테이블·Store/B2B·배포 정본 대조
- [x] 현재 migration/schema·writer fence·개인/사업/공유/법정 최소 기록·파일 producer·Store 파기 inventory를 재산출
- [x] TODO를 코드·정책·검증 모집단과 한 번 더 대조

## 계정·직원·사업체 처리

- [x] Operator 이용 정지 / 서비스 회원 해지 / Admin 계정·개인자료 완전삭제 분리
- [x] Operator 해지는 계정 삭제 API·완전삭제 UI에 도달하지 않게 하고 정상/정지/해지 결과 표시
- [x] 직원은 한 약국/사업체에만 소속되도록 writer 전체·경합·이용 해지·권한 회수를 검증
- [x] 직원 해지/계정 제거 후 사업체 업무 자료 유지와 개인 자료 제거를 실제 격리 DB로 검증
- [x] 약국 매도는 같은 조직·자료를 유지하고 새 경영자에게 권한 이전, 이전 경영자 접근 제거
- [x] 이전 경영자 개인 삭제가 이전된 조직 자료를 삭제하지 않도록 분리
- [x] 완전폐업은 별도 절차로 최신 Store 자료 inventory·파일·실패 재시도까지 연결
- [x] 공급자 제품·거래 처리는 담당 도메인에 두고 계정 삭제 함수의 복잡한 공급자 분기 방지
- [x] 포럼·강의 운영 정지와 Admin 최종 삭제/관련 자료 제거 경로 확인·보완

## 완전삭제 엔진·보안

- [x] Admin 삭제에 Operator 사전 정지를 강제하지 않고 삭제 시작의 접근 차단을 원자 처리
- [x] 현재 실제 schema와 versioned migration으로 writer fence 누락 해결 — 임시 시험 등록으로 통과시키지 않음
- [x] 미분류 개인 자료·일반 첨부·사업 증빙·공유 객체를 소유/참조 기준으로 처리
- [x] 법정 최소 기록은 기간/원래 생성시각/권한을 유지하며 개인 원본과 분리
- [x] 완료는 실제 잔여·파일·참조 제거 후에만 표시; soft delete/접수/비활성화와 구분
- [x] 삭제 내역에 상태·안전한 실패 원인·남은 항목·재시도 제공
- [x] 현재 권한 재검사·중복/늦은 응답·동시 writer·권한 회수·파일 실패/재시도 검증
- [x] 운영 migration·삭제 활성화가 필요하면 정확한 항목·영향·격리 검증 근거·현재 승인 범위를 정리

## Admin·Operator 화면

- [x] ‘계정·운영 권한’ 아래 ‘회원·사업체 관리’: 전체 회원/공급자/내 매장/삭제 처리 내역 직접 배치
- [x] Admin 홈 직접 진입과 기존 업무 운영 동선 유지
- [x] 포럼·강의 최종 삭제의 Admin 직접 진입을 기존 콘텐츠 메뉴와 중복 없이 정리
- [x] 모든 관리 목록을 기존 O4O 표준 테이블·행 체크·상단 ActionBar로 구성
- [x] 삭제·이전·폐업 단일 선택 → 범위/유지/삭제 확인 → 실행 → 성공/실패/부분 완료 → 목록/선택 갱신
- [x] 검색·탭·페이지·계정·권한 변경 및 실행 중 선택/중복 명령 차단
- [x] 공통 계정·서비스 이용·약사 자격·약국 승인 상태를 구분해 표시

## 가입·메일 확인

- [x] 가입 버튼 ‘Google로 가입 / 카카오로 가입 / 이메일로 가입’ 폭·높이·정렬 통일
- [x] Google 공식 SDK 동작·규칙과 로그인 화면의 로그인 문구 유지
- [x] 미확인 이메일 중복 가입은 공통 확인 안내로 연결하고 신청 이메일 표시
- [x] 확인 메일 재발송/로그인 동선, 성공·실패·대기시간, 실제 발송 여부 정합
- [x] 비밀번호 전달·로그 저장 차단과 기존 공통 재발송 기능 재사용

## 검증·인계·통합·배포

- [x] 합성 전용 DB·파일 fixture로 개인/직원/약국 이전/완전폐업/공급자/포럼/강의의 실제 보존·제거 검증
- [x] 임시 안전장치 없이 정식 migration·스키마로 실행하고 생성 fixture·연결 데이터 정리 확인
- [x] Operator 차단 / Admin 직접 URL / 재권한 검사 / 비동기 실패·중복·재시도 검증
- [x] PC·모바일 체크 → 상단 작업 → 확인 → 실행 → 갱신 브라우저 검증(운영 자료 삭제 금지)
- [x] 필요한 타입·lint·단위/통합 테스트·production build·공통 소비처·문서 민감정보·diff 검사
- [ ] 정확한 최종 HEAD의 PR CI·Codex 리뷰·미해결 사항·최신 main 확인 후 정상 PR merge
- [ ] post-merge CI·Delivery·필요한 통제 배포·실제 serving SHA·공개 상태 확인
- [ ] 최종 보고에 구현/검증/PR·commit/실제 배포/미확인·차단/문서 정합을 구분

## 현재 사실·승인 경계

- 과거 ‘writer fence 13개 누락’과 ‘삭제 기본 OFF’는 이번 조사 전 현재 사실로 채택하지 않는다.
- 기존 source의 삭제 capability는 활성화·파일 inventory 검토·보존 분류·정식 schema/fence 준비를 함께 검사한다. 이 검사를 제거하거나 테스트에서만 만족시키지 않는다.
- repository variable API 조회는 현재 GitHub 인증에서 403이다. Actions 실행을 통한 명시적 dry-run 판정 경로를 확인한다. 이 사실만으로 배포 불가나 freeze 상태를 추정하지 않는다.
- 운영 계정/자료 삭제·운영 DB write/DDL·삭제 활성화의 실행 승인은 구현 승인과 구분한다. 필요한 결과물을 먼저 검증 가능하게 완성한다.

## 최종 TODO 재대조 (2026-11-03)

요청의 개인/직원/매도/폐업/공급자/포럼·강의, Admin native·Operator 경계, 표준 목록/선택/실패, 가입 버튼/중복 메일을 코드·정책·실제 DB·PC/mobile 모집단과 다시 대조했다. 13개 누락은 공식 migration으로 해결했고 신규·다른 함수/이벤트 fence가 readiness를 만족시키지 못하는 회귀를 유지했다. 순수 비활성화·파일 실패·미분류 잔여를 완료로 표시하지 않는다.

검증: 실제 DB/HTTP/JWT/임시 파일83, domain/CI경계175, schema/native ESM23, 실제 운영자 초대54, Admin전체657, auth290 tests PASS. PC/mobile36 flows PASS, API/Admin type-check 및 API/Admin/Neture production build PASS. 로그 최소화의 원래 clock·타인 자료, 파일 세대 pin·공유 참조 경합, 단일 직원 경합, 타 약국 owner 권한 보존까지 포함한다. 운영 삭제시험·데이터 이전·유료 AI 호출 0. [CHECK](../checks/CHECK-O4O-MEMBER-ADMIN-SIGNUP-DELIVERY-V1.md)와 [운영 적용 계획](ROLLOUT-O4O-MEMBER-ADMIN-SIGNUP-DELIVERY-V1.md)을 함께 확인한다.

## PR 검증 보완

[#933](https://github.com/Renagang21/o4o-platform/pull/933)의 최초 전체 CI와 Codex P1을 반영했다. 현재 `pharmacy` 조직·`neture:store_owner`·정지된 enrollment에서 완전폐업이 가능하고 기존 KPA 계약 자격을 요구하지 않는다. 매도는 같은 승인 표식을 이전하며 기본 Pharmacy 소속을 보존/해제한다. Supplier는 canonical 조직 owner 관계로만 개인 프로필/증빙을 처리하고 공동 소유·legacy 충돌은 검토로 남긴다. 실제 DB83·운영자 초대54가 임시 fence 없이 통과했다. 과거 단일 화면 수·선택 없는 row 승인·Operator 사전 정지·추가 의존성 없는 mock 가정을 현 코드와 맞췄으며 기술 gate를 완화하지 않았다. 최종 원격 CI/리뷰·병합 상태는 PR 최신 HEAD의 기록으로 확인한다.

합성 검증 종료 정리: 전용 DB 2개 각각351 table·잔여0, owned tmpfs 컨테이너 제거, loopback forward와 Vite 종료. 다른 세션의 작업공간·파일·DB는 정리하지 않았다.

재리뷰 P2 보완: 완전폐업은 조직의 모든 서비스 키 자료를 처리하며 다른 매장 참조는 검토로 보호한다. 일반 KPA 계약의 서비스 범위·7일 대기는 유지한다. 4개 실제 PostgreSQL 회귀와 metadata scalar 검증 회귀를 추가했다. 원격 Code Quality에서 드러난 카카오 약관 테스트의 준비 순서도 보완했다. 재리뷰용 합성 DB의 351 table 잔여0 및 전용 컨테이너 제거도 확인했다.

후속 재리뷰: 최종 삭제 submit 버튼과 실제 클릭 회귀, 정정 로그 previous/next의 검사·실제 최소화, 완료된 폐업 파일 경로·parent/child 정리까지 보완했다. 완료/이미 없음은 후속 계정 삭제를 허용하고 pending 파일은 manifest를 보존하며 차단한다. 실제 producer를 통한 DB 회귀 4개·버튼 클릭 2개와 지연 응답 act 대기를 추가했다. 최종 native 83·Admin 657·PC/mobile 36 검증 및 재검증용 fixture 종료 정리 근거는 CHECK·artifact에 대조한다.
