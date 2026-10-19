# WO-O4O-ADMIN-COOPERATIVE-VISIBILITY-V1

- 상태: ACTIVE
- 작성·최종 갱신: 2026-10-19 (KST)
- 기준: main `491be1bb82c5b9788ff97020d0e0430939be11b6`
- 사용자 지시: `admin.neture.co.kr/admin/semi-franchises`에 빠진 약사·약국 협동조합 정비. 후속 답변으로 **연합회만** 확정.

## TODO

- [x] 현재 main·메뉴·공용 화면·서비스 선택·운영자 역할·사업/조합 원장 연결 조사
- [x] 일반 사업·연합회·개별 조합의 차이 확인
- [x] 사용자 답변 반영: 개별 조합 목록·상태·조합원 집계 제외
- [x] 연합회 진입과 기존 Admin·Operator 지정 화면 연결, 지정 현황 표시
- [ ] UI·API 권한·SQL·PC/모바일 검증
- [ ] commit·push·기존 PR #710 리뷰·main·배포 및 결과 기록

## 조사 결과

- `AdminSemiFranchisePage`의 등록 선택은 pharmacy/carepharm/megapharm 3개이며 pharmcoop을 의도적으로 제외한다.
- 운영자 지정에는 `neture:pharmcoop_admin`과 `neture:pharmcoop_operator`가 이미 있다. 역할만으로 사업이나 조합 행이 생성되지는 않는다.
- 일반 사업은 `semi_franchises`, 개별 조합은 `cooperatives.semi_franchise_id`로 그 사업에 연결한다. 개인 조합원은 별도 `cooperative_memberships`이며 약국 조직 가입과 구분한다.
- 기존 `GET /neture/cooperatives`는 조합과 연결 사업이 모두 활성인 공개 디렉토리다. 관리자 연합회 현황의 근거로 사용하지 않는다. 조사 시 공개 조회는 HTTP 200/활성 조합 0건이었으며 전체 조합 부재를 뜻하지 않는다.
- 일반 사업 생성 API는 `cooperatives`를 생성하지 않는다. 연합회 누락을 `pharmcoop` 일반 사업 한 행 생성으로 대체하지 않는다.

## 구현 범위

기존 관리자 주소에 ‘약국 협력사업 / 약국·약사 협동조합 연합회’ 선택을 추가한다. 기본 화면은 기존 약국 협력사업 설정이다. 연합회 화면은 서비스 열기, 기존 `/operators`의 Admin·Operator 지정 화면 연결, 현재 유효한 연합회 역할 지정 현황만 제공한다. `?register=pharmcoop`도 일반 사업 생성 폼 대신 연합회 화면으로 연다.

`GET /api/v1/neture/admin/cooperative-federation`은 `requireAuth`와 `platform:super_admin` guard를 사용하는 읽기 전용 API다. 연합회 두 역할만 계정·서비스 가입 상태와 함께 조회하며 응답은 `private, no-store`다. 만료·미래·해제된 역할은 제외하고 유효 역할 지정과 메인 이용 자격은 구분해 표시한다. 이름 누락 시 이메일, 둘 다 누락 시 ‘이름 미등록’을 표시한다. 조회 실패는 지정자 없음으로 표시하지 않고 재시도를 제공한다.

사용자 확정 범위에 따라 이 API는 개별 조합·사업·조합원 테이블을 조회하지 않는다. 개별 조합 목록·상태·수·가입·승인·신규 등록 UI는 추가하지 않는다. 공용 `operator-core-ui`는 변경하지 않는다.

## 데이터·서비스 경계

운영 데이터 생성·변경·삭제, 역할 자동 부여, migration은 없다. 공개 디렉토리·개별 조합 운영·실제 접근 판정과 기존 역할 지정 계약을 변경하지 않는다. 실제 Google 인증은 사용자 브라우저에서 하며 자격증명 전달을 요구하지 않는다.

## 검증

- 연합회 화면 Vitest 5 tests PASS: 기존 사업 유지·탭 전환·직접 URL·지정 현황과 이름 대체·실패/재시도. 개별 조합 관리와 쓰기 요청 없음.
- API HTTP 회귀 6 tests PASS: 실제 role guard, 비로그인 401/서비스 운영자 403/플랫폼 관리자 200, private/no-store, 원시 계정 필드 제외, 단일 SELECT와 개별 조합·사업·조합원 미조회 확인.
- 관리자 전체 회귀·type-check·lint, API build, 격리 PostgreSQL SQL 실행, 실제 App PC/모바일 최종 검증 진행 중. 이전의 개별 조합 포함 검증 결과를 최종 검증으로 인용하지 않는다.
