# WO-O4O-ADMIN-COOPERATIVE-VISIBILITY-V1

- 상태: ACTIVE
- 작성·최종 갱신: 2026-10-19 (KST)
- 기준: main `491be1bb82c5b9788ff97020d0e0430939be11b6`
- 사용자 지시: `admin.neture.co.kr/admin/semi-franchises`에 빠진 약사·약국 협동조합 정비.

## TODO

- [x] 현재 main·메뉴·공용 화면·서비스 선택·운영자 역할·사업/조합 원장 연결 조사
- [x] 운영 공개 조합 목록 읽기 전용 확인 — HTTP 200, 활성 조합 0건. 중지 조합·원장 전체의 부재로 단정하지 않음
- [x] 일반 사업 등록과 개별 협동조합 등록의 차이 확인
- [x] 연합회 운영 권한 + 개별 조합 전체 현황으로 범위 정리. 가입/승인 업무와 개별 조합 신규 등록 UI는 이번 범위 밖
- [x] 협동조합 누락 수정, 조회 실패/빈 목록/실제 상태 구분
- [x] 기존 사업·역할·개별 조합 접근 경계 회귀, PC/모바일 확인
- [ ] commit·push·PR·리뷰·main·배포 및 결과 기록

## 조사 결과

- `AdminSemiFranchisePage`의 등록 선택은 pharmacy/carepharm/megapharm 3개이며 pharmcoop을 의도적으로 제외한다.
- 운영자 지정에는 `neture:pharmcoop_admin`과 `neture:pharmcoop_operator`가 이미 있다. 역할만으로 사업이나 조합 행이 생성되지는 않는다.
- 일반 사업은 `semi_franchises`, 개별 조합은 `cooperatives.semi_franchise_id`로 그 사업에 연결한다. 개인 조합원은 별도 `cooperative_memberships`이며 약국 조직 가입과 구분한다.
- 기존 `GET /neture/cooperatives`는 조합과 연결 사업이 모두 활성인 공개 디렉토리다. 전체 관리자용 원장이나 중지/미등록 상태 판정을 이 응답으로 대신하지 않는다.
- 관리자 사업 목록은 실제 사업 행을 읽지만, pharmcoop 역할과 조합 연결 표시는 별도다. `pharmcoop` 일반 사업 한 행을 만들었다고 실제 개별 조합 등록이 되는 것으로 표시하면 안 된다.
- 개별 조합 등록용 현재 구현은 테스트 CLI/workflow다. 관리자 화면의 일반 사업 생성 API는 `cooperatives`를 생성하지 않는다.
- 협동조합 연합회 담당 지정과 개별 조합 회원/콘텐츠 일상 운영을 구분한다. 전체 관리자의 이번 정비에 회원 가입·신청 승인 기능을 추가하지 않는다.

## 경계

운영 데이터의 자동 생성·역할 부여·변경·삭제 및 migration은 이 조사에서 수행하지 않는다. 실제 Google 인증은 사용자 브라우저에서 하며 자격증명 전달을 요구하지 않는다. 현재 공개 목록의 0건을 등록 성공·실패나 모든 조합의 존재 여부로 해석하지 않는다.

공용 모듈 변경이 필요하면 admin 외 Neture·KPA·Store·협동조합 소비처와 raw-source 계약을 대조한다. 이전 협동조합 제외 기록은 당시 범위로 보존하고 최신 요청을 별도 작업으로 반영한다.

## 구현 범위

관리자 기존 주소에 ‘약국 협력사업 / 약국·약사 협동조합’ 선택을 추가한다. 기존 일반 사업 등록 폼은 유지하며 협동조합 화면은 연합회 Admin·Operator 지정으로 연결하고 실제 개별 조합 현황을 표시한다. `?register=pharmcoop`도 일반 사업을 생성하지 않고 협동조합 화면으로 연결한다.

`GET /api/v1/neture/admin/cooperatives`는 플랫폼 관리자 전용 읽기 API다. 활성 조합만 보여주는 공개 디렉토리와 달리 중지 조합과 연결 사업 마감도 포함한다. 개인 조합원은 숫자 집계만 제공하고 회원 목록·승인 UI는 추가하지 않는다. 연합회 유효 역할과 Neture 메인 이용 자격도 구분한다.

새 조합 생성·개별 운영 업무를 일반 사업 생성으로 대체하지 않는다. 기존 조합 등록 CLI/workflow와 조합 운영 서비스는 유지한다. 공용 `operator-core-ui` 구현은 수정하지 않아 기존 Neture·KPA·Store·협동조합의 사업 등록/운영 동작을 바꾸지 않는다.

## 검증

- 관리자 Vitest: 직렬 실행 24 files / 414 tests PASS. 초기 병렬 실행의 두 5초 timeout은 직렬 재실행으로 해소했고 assertion이나 제한을 완화하지 않았다.
- API HTTP 권한/현황 테스트: 6 tests PASS. 비로그인 401, 서비스 운영자·협동조합 운영자·Neture admin 403, 플랫폼 관리자 200, private/no-store, 중지 상태·메인 이용 자격 전달과 원시 계정 필드 제외 확인.
- 관리자 type-check·production build, API TypeScript build PASS. admin lint는 기존 warning 300 / error 0, 변경 API 파일 lint는 기존 warning 1 / error 0.
- 실제 새 SQL을 별도 메모리 PostgreSQL(PGlite)에서 실행: 활성/중지 조합·마감 사업·개인 조합원 수, 만료/미래/해제/다른 사업 역할 제외, 계정 정지 표시, 기존 공개 디렉토리의 활성 조건 유지 PASS. 운영 DB와 분리되며 데이터는 메모리 DB 종료로 제거. 운영 PostgreSQL major와의 차이는 검증 한계다. 검증용 dependency는 저장소 밖 임시 경로에만 설치했다.
- 실제 production admin App + 합성 API를 Chromium 1440px/390px에서 실행: 탭 진입·직접 URL·새로고침, 실제 상태 구분, 연합회 운영자 연결, 조회 실패→재시도→빈 목록, 기존 3사업 화면 복귀 PASS. 쓰기 요청 0, pageerror 0. 운영 Google 세션 검증을 대신하지 않는다.
- 운영 조회/등록·권한 부여·DB 변경은 수행하지 않았다. 공개 디렉토리의 활성 조합 0건 외 운영 전체 조합 상태는 미확인이다.
