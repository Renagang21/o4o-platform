# 약국 협력사업 설정·내 매장 기능 적용

> 상태: 구현·검증 완료 · push 인계
> 작성일: 2026-10-16
> 범위: 사용자 승인 — TODO 작성 → 코드·문서로 TODO 검증·보완 → 전체 구현·검증 → commit·push
> 작업공간: 기존 `wo/pharmacy-service-entitlements`의 연속 단계. 앞선 공통 판정 변경을 이어가므로 같은 전용 worktree/branch를 유지한다.

## 최초 TODO

- [x] 관리자 별도 메뉴 `약국 협력사업`과 기존 사업 관리 화면의 연결을 점검·보완한다.
- [x] 경영자 회원 유료 자격의 저장·관리 경로를 조사하고 내 매장 판정에 연결한다.
- [x] 태블릿·다국어 상품 콘텐츠의 실제 메뉴·API·공개 소비 경로와 모든 공통 소비처를 조사한다.
- [x] 경영자 회원 유료 자격 또는 활성 협력사업 제공을 합산한다. 직원 개인 유료 자격은 사용하지 않는다.
- [x] 무료 초대 직원은 승인된 소속 내 매장에서 기능을 사용한다. 전문인 업무 권한은 별도 유지한다.
- [x] 미연결·조회 실패를 무료·미가입으로 해석하지 않고 재시도 가능 상태로 처리한다.
- [x] 메뉴와 실행 API에 공통 판정을 적용한다. 중복 가입·정지·종료·다른 유효 출처 유지·다른 매장 접근 차단을 검증한다.
- [x] 코드·문서 점검 결과로 TODO를 보완한 뒤 구현한다.
- [x] 적절한 단위·DB·화면 검증과 build를 실행하고 문서를 정리한다.
- [x] 이번 변경만 commit·push한다. PR·병합·배포·운영 DB 변경은 수행하지 않는다.

## TODO 검증·보완

조사 결과를 기록한 후 구현을 시작한다.

### 점검 결과와 보완된 실행 TODO

- 관리자 `/admin/semi-franchises`는 실제 route가 있으나 메뉴명이 세미프랜차이즈이다. 별도 메뉴를 `약국 협력사업`으로 바로잡고 기존 화면을 재사용한다(중복 route/페이지 금지).
- users·service_memberships에는 회원 유료 원장이 없다. Core identity나 가입 role을 변경하지 않고, 최소 도메인 확장 테이블 `member_paid_service_entitlements`(회원 1행, 활성 여부·선택 만료·수정 관리자)를 추가한다. 관리자 정확한 이메일 조회 후 활성/해제한다. 실제 결제·기존 매장 구독 결제 변경은 범위 밖이다.
- 이 원장은 서버 검증된 현재 경영자 회원을 기준으로 조회한다. 활성 유료는 현재 고정 카탈로그의 두 기능을 제공한다. 직원 개인 유료 자격은 내 매장에 전파하지 않는다.
- 기존 tablet factory는 공통 `/api/v1/store`와 KPA `/api/v1/kpa/store` 양쪽에서 소비한다. 동일 공통 guard로 약국 조직에만 적용하고 비약국 소비처는 유지한다. 기기 관리·태블릿 요청도 실행 경로를 확인한다.
- 다국어 공통 controller는 KPA mount에서 소비한다. 신규 제작·가져오기·편집은 자격을 확인하되 보유 사본 읽기와 발행된 공개 QR 자료 열람은 유지한다. 탈퇴 후 사본 유지 정책에 따른다.
- 내 매장 공통 layout은 서비스 지정 경로에서도 소비한다. URL 직접 접근 guard와 메뉴 상태를 함께 적용하고 조직 변경 시 이전 판정을 재사용하지 않는다. 오류는 별도 안내·재시도로 처리한다.
- 신규 테이블은 incremental migration 및 schema 예상 상태/fixture를 기존 프로토콜에 맞춰 추가한다. 적용 검증은 전용 loopback DB에 한정하며 운영 DB를 변경하지 않는다.
- 앞선 구현의 미연결 adapter는 실제 회원 원장으로 연결한다. 읽기 실패는 503이며 없는 행만 무료로 본다.

이 보완 TODO를 기준으로 구현한다. 기존 공통 판정 구현에 이어지는 연속 Phase이며 TODO 검증 시점 origin/main `3613c235e`의 추가 변경은 purge worker 및 그 검증 기록이다. 기존 branch의 이력은 유지한다.

## 구현과 소비처

관리자 메뉴명은 `약국 협력사업`이며 route는 기존 `/admin/semi-franchises`를 재사용한다. 제공 기능 설정 아래 회원 유료 자격 관리(정확한 이메일 조회·활성/해제·한국시간 선택 만료일)를 추가했다. 공통 패키지는 전체 관리자와 Neture 호환 페이지가 소비하며 두 앱을 검증한다. 기존 매장 단위 외국인 여행객 판매지원 구독은 이번 두 기능의 회원 자격으로 재해석하거나 이동하지 않았다.

실행 연결은 `service-feature-access.ts`에 모으고 공통 태블릿 factory(공통 mount/KPA mount), 공개 태블릿 handler, 기기 runtime/pairing/heartbeat, 다국어 제작·가져오기·수정/HUB에 적용했다. 직원의 무료 매장 접근과 전문인 권한 범위를 변경하지 않았다. 복사 자료 읽기·공개 QR는 유지한다. 다른 매장 도메인은 기존 접근 규칙을 따른다.

회원 원장은 새 도메인 확장 테이블이며 Core identity/role/schema를 수정하지 않는다. 신규 incremental migration은 manifest와 격리 DB에서 산출한 schema 예상 상태를 함께 등록했다. 운영 DB에는 실행하지 않았다. 회원 삭제 시 원장도 CASCADE 삭제되며 관리자 삭제 시 수정자 참조만 NULL이 된다.

## 검증 기록

- API 단위·설정 HTTP·기능 guard·기존 SQL 묶음: 4 files / 25 tests PASS. 이후 실제 회원 원장 SQL 검증 1건을 추가해 SQL 파일 5건 PASS.
- 회원 SQL: 활성·만료·해제·경영자 변경·다른 매장 격리·협력사업 대체 제공을 확인했다. 기존 복수 사업의 정지/종료 및 설정 즉시 반영도 유지한다.
- 태블릿 runtime/다른 서비스 mount/SQL 회귀: 3 files / 25 tests PASS(중복 SQL 5건 포함). 이후 직원 기기 runtime과 pairing의 경영자 유료 해제 회귀를 추가했다.
- 실제 태블릿 관리·공개 API 실행 차단과 다국어 신규/HUB 차단·사본 읽기 유지: 2 tests PASS. 최초 공개 factory fixture를 `{dataSource}` 대신 직접 주입한 오류는 바로잡고 재실행 PASS.
- 기존 무료 직원/매장 소속 접근 회귀 2 files PASS. 화면의 기능 제공이 다른 매장 접근을 새로 부여하지 않는다.
- 공통 관리 UI 전체: 20 files / 158 tests PASS. 새 회원 조회·실패 재시도·해제 및 한국시간 변환 포함.
- 내 매장 hook/경로/기존 workspace·자료함: 3 files / 32 tests PASS. 이전 매장 응답 무시·다른 매장 응답 거부·오류 재시도를 확인했다.
- 관리자 메뉴/route 정합: 2 files / 44 tests PASS.
- 격리 PostgreSQL 15: baseline + 28 incremental 신규 적용에서 fingerprint `6b658257840c86306004e905a9af922b9a4058f981c044b3cc879297ef630d77`(6662줄)을 산출했다. 최초 상태 등록 전 실행은 예상대로 post assertion이 거부했다. 해당 신규 schema의 10줄 차이를 확인하고 등록한 후 재검증 PASS. down/up은 직전 `e432641d...`(6652줄) 및 새 상태를 정확히 재현한다. migration contract 21 pass / 0 fail.
- 실제 공통 관리 화면 Chromium 1440/390: 사업 설정 생성·수정 실패/재시도·재조회·전체 해제 및 회원 조회/유료 자격 저장 PASS. 가로 넘침·pageerror 없음. 합성 API로 실행했으며 운영 로그인/쓰기 검증은 아니다.

## 운영 인계

통합 담당은 회원 원장 incremental migration을 정상 job으로 적용한 뒤 API 및 관리자·내 매장 웹을 반영한다. 운영 회원에 대한 임의 활성/데이터 backfill은 없다. 이전 기능을 쓰던 약국에 자격 행이 없다면 제공 협력사업 설정 또는 회원 유료 자격을 관리자가 확인해야 한다. 모든 약국을 임의 유료 처리하는 seed는 만들지 않았다. 본 작업은 push까지이며 PR 생성·main 병합·배포·운영 DB 쓰기를 하지 않는다.

문서 정합: 설계 §15-5에 초기 미연결 단계를 대체하는 현재 회원 원장과 실행 적용 범위를 기록했다. 기존 초기 CHECK는 당시 기록으로 유지한다.

### 최종 확인

- 신규 직원 기기 runtime/pairing 해제 회귀를 포함한 태블릿 runtime 파일은 12 tests PASS.
- 자격 응답/약국 태블릿 실행 응답에 `private, no-store`를 적용했다. 최종 HTTP/기능 guard 7 tests PASS.
- 새 빈 격리 DB에서 baseline + 28 incrementals 전체를 다시 적용해 POST_MIGRATION_SCHEMA_ASSERTION PASS 및 MIGRATION_JOB SUCCESS를 확인했다. 기존 prefix 재실행도 PASS.
- 관리자 신규 패널 API 경로는 기존 공유 클라이언트 규약(`/neture/...`, base가 `/api/v1`)에 맞췄다. 최종 패널 2 tests와 브라우저 재실행 PASS. 저장 시각은 한국시간 입력을 UTC로 변환한다.
- 공통 관리 화면 390px screenshot을 직접 확인했으며 회원 패널과 기존 사업 설정이 화면 안에서 정상 줄바꿈된다.
- 권한 조회 응답이 잘못되거나 다른 매장을 가리키면 UI는 허용하지 않는다. `allowed=null`은 미가입 안내가 아니라 확인 실패로 표시한다.
- 회원 유료 원장의 실제 결제 연동/기존 매장 구독 전환은 이번 범위 밖이다. 이번에는 관리자의 회원 자격 관리로 원장을 완성했다.

- 최종 API·내 매장·전체 관리자·Neture build 모두 PASS. 변경 신규 소스 ESLint PASS, 문서 민감정보 0건 및 diff check PASS. 기존 번들 크기/Browserslist 경고는 유지한다.
- SQL fixture 조직 잔존 0 확인 후 두 전용 DB를 삭제하고 이번 PostgreSQL을 정지했다. 공유/운영 DB는 사용하지 않았다.
- push 전 origin/main은 `71bc126ca`로 이동했다. 새 main의 태블릿 편집/안내 화면 정비는 이번 직접 수정 경로와 겹치지 않는다. 자동 병합/rebase는 하지 않았다. 전용 branch의 전체 변경과 migration을 통합 담당이 함께 검토한다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/pharmacy-service-entitlements` / `wo/pharmacy-service-entitlements` / base `033f167d7430fe90b109a0cea3f05346841ee2c0` / main integration 미실행 / CI 미실행 / deployment 미실행 / local smoke PASS / other session usage 없음 / verdict KEEP(미병합 변경 보존).
