# 관리자 서비스·대상 정책·역할 관리 제거와 과거 역할 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: 사용자 세 메뉴 제거 및 미사용 역할 정비 지시, 공급사·약국 모두 의약품 취급 가능 정정
> **관련 정본**: [역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [KPA 역할](../baseline/KPA-ROLE-MATRIX-V1.md) · [분회 역할](../baseline/KPA-BRANCH-ROLE-MATRIX-V1.md) · [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

## 범위와 조사

기준 main `5b2f6bd9eea66709004dd4640419f6867842fcf9`, 전용 branch `wo/admin-platform-menu-role-cleanup`. onboarding skill에 따라 기존 격리 cloud checkout을 사용한다.

서비스 관리·서비스 대상 정책·역할 관리 메뉴와 페이지·직접 진입·전용 client/API를 제거한다. 서비스 운영자 지정과 서비스별 권한 경계는 유지한다. 현재 O4O는 약사·약국 경영자 대상이며 공급사·약국 모두 의약품을 취급할 수 있다는 사용자 결정에 따라 약국 대상 여부를 별도로 설정하는 DB 정책과 그 차등 gate를 런타임에서 제거한다. 상품 등록/승인·공급자 소유권·조직 소속·공급 범위의 기존 검사는 유지하며 소비자 판매·결제 기능은 추가하지 않는다.

조사에서 정책 소비처는 관리자 API 외에 공급 상품 게시, 판매자 모집, 매장 상품 등록·활성화, PUBLIC/SERVICE 자동 배포 SQL에 있음을 확인했다. UI만 지우지 않고 관련 저장 정책 의존을 함께 정리한다. 현재 관리자가 지정하는 서비스별 admin/operator와 `platform:super_admin`은 현행 역할이다. 과거 `kpa:branch_*`·`kpa:district_admin`·자격 역할, 미사용 platform 세부 역할·legacy LMS 역할은 현행 역할 카탈로그/발급/인가에서 제외한다. DB 활성 보유자 수를 실측한 것으로 보고하지 않는다.

## TODO

- [x] 최신 main·작업 격리 및 관리자 메뉴·역할·의약품 정책 전체 소비처 조사
- [x] 관리자 3개 탭·홈 카드·페이지·전용 client 제거, 이전 URL은 남은 플랫폼 홈으로 이동
- [x] 관리자 서비스 카탈로그/디렉터리 API 및 대상 정책 조회/저장 API 제거 (공개 서비스 카탈로그는 유지)
- [x] 저장된 약국 대상 정책 의존 제거, 공급사·약국 의약품 처리와 기존 소유권/승인/조직 경계 회귀 검증
- [x] 폐기된 역할의 타입·metadata·권한 허용 잔재 정비 및 중앙 발급/인가/조회 차단
- [x] 현행 기준 문서에 사용자 결정 반영, 과거 WO/CHECK는 이력 보존
- [x] API·UI 집중 테스트, 타입·빌드·lint, desktop/mobile 실제 앱 브라우저 검증
- [x] 범위 검사·commit·push 후 실제 결과와 미확인 범위 보고

## 데이터와 실행 경계

운영 DB 직접 조회/변경·삭제·DDL·migration은 이번 개발에서 실행하지 않는다. 과거 정책 테이블·역할 할당 이력은 보존하고, 현재 동작과 신규 발급에서 퇴역시키는 방식으로 정비한다. 사용자 계정·현행 운영자 할당·분회 소속 원장은 삭제하지 않는다. 검증용 인증/DB는 fixture이며 실제 Google 관리자 로그인이나 운영 계정 검증과 구분한다. 이번 작업은 개발·검증·commit·push까지 진행하며 main 병합·운영 배포는 별도 지시 시 진행한다.

## 개발 검증과 인계

- 관리자 메뉴는 ‘계정 · 운영 권한’으로 정리하고 플랫폼 내부 탭은 홈·계정 관리·사용자 조회만 남겼다. 운영자 지정은 기존 `/operators`로 연결한다. 제거된 플랫폼 3주소와 이전 대상 정책 주소는 플랫폼 홈으로 이동한다.
- 제거한 화면·전용 client·서비스 주소 투영 및 관리자 catalog GET/PATCH·대상 정책 GET/PUT 등록을 삭제했다. 공개 카탈로그·서비스 운영자 지정·공유 역할 카탈로그 API의 다른 서비스 소비처는 유지한다.
- 저장된 대상 정책 조회·차등 gate와 자동 배포 SQL 조건을 제거했다. 공급 상품의 의약품 PUBLIC/SERVICE/PRIVATE 처리는 기존 일반 공급 흐름을 따른다. 실제 guard를 사용한 공급 게시 테스트에서 정책 행 없이 의약품 PUBLIC 공급 성공을 확인했다. 등록·게시 분리, 공급사 소유권, 승인·가격·서비스 승인, 조직 소속 검사 및 규제 상품의 허가번호 검증은 유지한다.
- 폐기 역할 12개를 중앙 퇴역 판정에 추가했다. `platform:admin/operator/manager/vendor/member/contributor`, `kpa:district_admin/branch_admin/branch_operator/pharmacist/student`, `lms:instructor`다. 과거 자격/미사용 타입·metadata와 asset snapshot의 약사 자격 role 허용 잔재를 제거했다. 기존 cosmetics/PharmacyHub 퇴역 판정은 유지한다. 전체 사용자 목록에서도 폐기 역할을 현재 권한으로 표시하지 않는다.
- [개발 CHECK](../checks/CHECK-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)에 검증·미확인 범위를 기록한다. 운영 DB의 역할/정책 행과 할당 이력을 삭제·수정하지 않았다. 최종 commit·원격 SHA는 인계 응답으로 확인한다.
- 배포 영향은 API·관리자이며 인증·역할 판정 변경을 포함한다. main 병합·PR CI·운영 배포는 이번 개발에서 실행하지 않았다. 적용 시 기존 Delivery의 위험 판정과 승인 절차를 따른다.

문서 정합: 사용자의 대상 정책 제거·의약품 취급 결정과 현행 역할 경계를 B2B 계약·KPA 역할·공통 역할 정책 정본 3곳에 반영했다. 이전 디렉터리·대상 정책 WO/CHECK는 당시 이력으로 보존하고 CANONICAL-INDEX 상태는 변경하지 않았다. 정책 entity는 기존 스키마 대응을 위한 이력 매핑만 남기고 설명을 정정했다.

## 후속 통합 진행

사용자가 개발 인계 후 main 병합·운영 배포를 명시적으로 승인했다. 일시 중지 요청 시 PR·병합·배포를 시작하지 않았으며 이후 재개 지시에 따라 진행한다. 최신 main `e8061c80966cc9f0e922ecd29e1b5ec6653fa8ff`의 기존 배포 완료와 활성 운영 배포 0건을 확인하고 파일 충돌 없이 통합했다. 새 migration 파일은 없다. 이번 diff는 API·관리자 대상 LEVEL 3이며 required CI·Codex 리뷰를 확인한 뒤 main 병합, 기존 promote/verified 절차의 배포 결과를 검증한다. 위 미실행 문장은 최초 개발 인계 시점의 기록이며 실제 통합·운영 결과는 병합 PR과 CHECK의 후속 절에 기록한다.

통합 리뷰 보완: PR #742의 P2 두 건에 따라 Neture·약국 운영 화면에 남은 역할 편집 wrapper·메뉴를 제거하고 이전 URL을 각 운영 홈으로 이동시켰다. Neture의 대상 정책 메뉴와 미사용 client도 제거했다. 역할 지정 화면이 쓰는 공통 조회 API는 유지한다. 이에 따라 배포 영향에 Neture·약국 웹이 추가된다. 최신 main 통합 후 API 266·관리자 424 tests는 재통과했고, Chromium은 초기 개발 서버 변환 지연으로 desktop 1건이 전체 30초 제한을 넘겼으나 로그 확인 후 assertion/시간 제한 변경 없이 4건 전체 재통과했다.


### 동결 기준 문서 보존 보완

리뷰에 따라 공통 역할 Frozen baseline의 본문 정책 추가를 되돌리고 허용된 부분 대체 표기만 남겼다. 현재 전체 관리자·폐기 역할 정책은 [현재 관리자 역할 정책](../baseline/O4O-CURRENT-ADMIN-ROLE-POLICY-V1.md)으로 분리한다. 기존 baseline의 나머지 유효 원칙과 KPA·분회 문서의 독립 경계를 유지한다. CANONICAL-INDEX의 상태·행은 이번 범위에서 변경하지 않는다.
