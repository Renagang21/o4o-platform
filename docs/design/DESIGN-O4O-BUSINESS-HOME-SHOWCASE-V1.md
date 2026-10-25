# DESIGN-O4O-BUSINESS-HOME-SHOWCASE-V1

상태: 구현 · 2026-10-19 · WO-O4O-BUSINESS-HOME-SHOWCASE-V1

## 승인과 진열
공급자 제품은 기존 supply_proposals의 approved와 유효한 Offer/제품/공급자 상태를, 콘텐츠는 semi_franchise_contents의 published 검토 사본을 사용한다. 승인 후 기본 진열되며 operator가 항목별 숨김·순서를 관리한다. 승인·게시 API와 기존 공급조건/주문 원장을 복제하지 않는다. pharmacy의 default_supply_enabled는 기존 공급 목록에 유지되지만 메인 진열에 대한 협업체 승인을 대신하지 않는다. 기존 승인·게시 항목도 별도 데이터 변경 없이 이 기준으로 진열된다.

진열은 운영 조직 organizations.metadata.businessHomeShowcase[사업 ID]의 {version,items}로 저장한다. items의 키는 product:<제안 ID> / content:<자료 ID>이고 값은 {hidden,position}이다. 작은 position 우선, 같은 순서는 원장 시각·ID로 안정 정렬한다. 회원 응답은 최대 60개다. 숨김은 공급 종료·게시 보관과 별개이며 약국 사본·주문에 전파하지 않는다. 제목·조건을 설정에 복제하지 않으며 source의 현재 유효 상태를 매 조회 확인한다. 콘텐츠는 협업체 검토 사본이므로 공급자 원본 수정에 의해 바뀌지 않는다.

## 권한과 DTO
operator 경로는 기존 businessOperator 미들웨어와 requireOperatorOf를 재사용한다. 담당 판정·역할은 business-operator-access.ts의 기존 정책이 최종 권위다. 전역 화면이나 프런트의 메뉴/URL은 권한이 아니다. 기존 연합회·개별 조합 운영 역할 정책을 새로 변경하지 않는다. Pharmcoop은 서버 directory가 제공한 개별 조합→businessKey 연결과 cooperative session의 해당 조합 canManage를 사용한다.

회원 조회는 requireAuth 이후 선택 약국의 사용자/조직 권한·약국 승인·해당 사업 가입 active를 resolveBusinessStoreAccess로 확인한다. 개인 조합원은 그 business에 연결된 활성 개별 조합의 활성 개인 가입과 계정 상태를 확인한다. 최신 협동조합 정책에 따라 개인 조합 접근은 Neture 메인 가입 상태와 독립이며, 선택 약국의 이용 자격과도 섞지 않는다. 개인 가입만으로 약국 대상 한정 제안이나 구매 자격을 부여하지 않는다. 이 경로는 전체 대상 제품 소개·승인 콘텐츠만 반환하며 가격·대상 약국·첨부 DTO를 제외한다. 콘텐츠 본문은 기존 ContentRenderer를 사용한다. 콘텐츠/사본 거래 자격은 기존 별도 API가 판정한다. 비회원 공개 없음.

## 원자성과 이력
진열 쓰기는 운영 조직 행 잠금으로 같은 조직에 속한 다른 사업 설정을 보존하고 클라이언트 version과 비교한다. 충돌은 SHOWCASE_CHANGED 409로 반환한다. 해당 사업의 현재 승인 항목인지 확인하며 사업 마감 시 변경을 거부한다. 같은 트랜잭션에서 action_logs에 business.showcase.update를 기록한다. 감사 로그 실패 시 설정도 rollback한다.

콘텐츠 상태 변경은 콘텐츠 행 잠금·전이 검증·감사 로그를 한 트랜잭션으로 처리한다. 공급자 요청자와 canonical Supplier resolver가 같은 공급자의 업무 담당자로 판정한 계정의 publish는 금지한다. 게시·보관·반려는 business.content.status로 전/후 상태·처리자·시각·제목·사유를 기록한다. 과거 로그를 추정 생성하지 않는다. 기존 product 결정/종료 이력은 기존 화면에 유지한다. 공급자 archived 자료의 재게시는 서버에서 금지되고 기존 화면도 버튼을 숨긴다. 새 요청으로 재심사한다.

## 소비처
- 공통 OperatorSemiFranchisePage: 메인 진열 관리·최근 이력. 진열 UI를 열 때만 조회한다.
- PharmacyMemberHomePage: Pharmacy/MegaPharm BUSINESS_SITE 공용 홈. 기존 최근 자료/상품 미리보기를 메인 진열 조회로 연결한다. 전체 자료함은 기존 별도 메뉴로 유지.
- CooperationMemberSpace: CarePharm 홈. 계정·선택 약국 가입 확인 후 진열. 운영자는 담당 API로 미리보기.
- Pharmcoop App: 개별 조합 홈과 자료 메뉴. 연합회 소개 페이지를 개별 조합 진열로 대신하지 않는다. 조합 자료 메뉴는 content만 표시한다. 게시판/회원 가입 등 다른 placeholder 업무는 이번 변경 범위 밖이다.
- 공유 UI 신규 export는 additive. 다른 홈·자료·포럼 계약 변경 없음. 협동조합 앱은 기존 내부 패키지 shared-space-ui의 workspace 의존만 추가한다. 외부 패키지/version 추가 없음. 기존 Dockerfile은 packages 전체 복사·의존성 순 빌드를 사용한다. 협동조합 Tailwind 스캔에는 신규 공통 진열 파일만 포함한다.

## API
- GET /api/v1/neture/pharmacy/businesses/:key/showcase (로그인, 약국은 X-Store-Organization-Id)
- GET /api/v1/neture/operator/semi-franchises/:key/showcase (담당)
- PUT 동일 경로: {id,hidden,position:0..9999,version} (담당)
- GET /api/v1/neture/operator/semi-franchises/:key/showcase-history (담당, 최근 50개)
읽기 응답은 private,no-store. 오류를 빈 목록으로 치환하지 않는다. 저장 실패 시 입력 보존·재시도 제공, 계정/사업/약국 전환은 과거 응답 폐기, 같은 화면의 저장 중 중복 실행 방지. 진열/원장 상태 변경은 다음 조회에서 반영된다.

## 운영 변경 경계
새 migration 없음. 이번 개발 검증은 로컬 전용 PostgreSQL/합성 API만 사용한다. 실제 사업 등록·담당 지정·가입/승인·운영 데이터 변경·PR·배포는 수행하지 않는다. 기본 자격은 운영 담당이 실제 사업과 계정의 상태로 확인해야 한다.
