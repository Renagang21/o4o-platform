# Neture 서비스 재배치 리팩터링 — 코드·문서 대조 후 작업안

> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **상태**: ACTIVE — 구현·격리 환경 검증 진행
> **작성일**: 2026-10-08 · **최종 갱신**: 2026-10-08
> **근거**: 현재 사용자 지시 — 전체 서비스 재배치. 초안 ToDo → 코드·문서 점검 → ToDo 수정 → 필요한 결정 논의 → 수정 ToDo 재점검 → 최종 작업안 순서로 기획
> **관련 정본**: [역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md), [인증·가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [약국 commerce 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

## 1. 목표와 확정 기준

기존 pharmacyhub.co.kr·k-cosmetics.site·kpa-society.co.kr·neture.co.kr의 기능을 Neture 메인과 서브도메인으로 재배치한다. 가입·commerce는 전체 작업의 일부다. 이미 구현·통합된 기능은 유지하고, 미완성 배치·접근 판정·중복 경로를 완성한다.

| 공간 | 최종 역할 |
|---|---|
| neture.co.kr | 공통 계정·메인 서비스 진입 |
| study.neture.co.kr | 독립 강좌 서비스. 커뮤니티의 강좌 기능은 완전히 분리하며 내 매장과 무관 |
| funding.neture.co.kr | 독립 유통 기반 펀딩. 내 매장과 무관하며 메인에서 접근 |
| supplier.neture.co.kr | 공급자 업무 |
| store.neture.co.kr | 약국 경영자의 내 매장. 같은 약국이 가입한 여러 사업의 서비스 이용 |
| community.neture.co.kr | 독립 가입 커뮤니티와 약국 협력사업 참여 회원용 커뮤니티의 공통 이용 공간 |
| pharmacy.neture.co.kr | 전체 약국을 지원하는 독립 약국 협력사업 사업 |
| kpa.neture.co.kr | 약사회 분회 업무. pharmacy 사업과 구분 |
| admin.neture.co.kr | 전체관리자 전용. 각 서비스 관리자(운영자)와 구분 |
| 추가 사업의 서브도메인 | 혈당관리·창고형약국·협동조합 등 각 독립 사업자의 특성에 맞춰 개발 |

- 경영자 한 명·약국 하나·내 매장 하나가 기준이다. 여러 약국을 하나의 내 매장으로 합치거나 신규 가입을 여러 약국 경영으로 확장하지 않는다. 별개 매장의 권한·자료·장바구니·주문은 독립적이다.
- 통합 대상은 **한 약국이 가입한 여러 서비스**다. 같은 내 매장에서 이용하되 서비스별 조건·출처·고유 기능은 탭 등으로 구획한다.
- 약국 협력사업은 사업이 서로 다른 독립 사업자다. 공통 가입 식별·권한 격리는 업무 표준화의 근거가 아니다. 범용 사업 엔진·공통 개설 템플릿과 미래 사업의 고유 기능은 이번에 만들지 않는다.
- 현재 메인 자격은 정상 계정·이메일 확인이다. 내 매장·공급자·사업 가입은 독립적으로 신청·승인한다. 로그인·handoff·다른 서비스 승인이 원장이나 역할을 자동 생성하지 않는다.
- 각 서브도메인의 서비스 관리자와 운영자는 같은 사업 관리 주체다. 자기 서브도메인에서 담당 업무를 처리한다. 전체관리자는 admin.neture.co.kr에만 두며 서비스 운영 권한과 구분한다. 현재 기술 role 문자열·업무별 제한을 일괄 합치거나 개명하지 않는다.
- 매장 HUB의 중간 단계를 제거한다. 공급 상품·이벤트·모집은 내 매장 공급 화면, 제공 자료는 내 매장 자료함, 가입자 교류는 커뮤니티로 옮긴다.
- 소비자 안내는 제품 검색·자체 제품·약국 결정 가격을 사용한다. B2B 공급 목록·가격을 소비자 판매 시스템으로 바꾸지 않는다.
- 사업 가입 정지·종료는 해당 사업의 신규 공급·원본 콘텐츠 이용·회원 커뮤니티 참여를 차단한다. 이미 가져온 사본은 남기고 기존 주문의 조회·후속 처리 경로를 보존한다.
- 병원약국은 개인 작업으로 제외한다. 실제 PG는 수취 법인·계약 확정 뒤의 별도 연결 작업이다.

## 2. 기획을 수정한 과정과 사용자 결정

| 회차 | 수행·결과 |
|---|---|
| R0 초안 | 전체 ToDo 작성. 재구현·검증·퇴역을 충분히 구분하지 않은 실행 순서여서 사용자가 수정 지시 |
| R1 대조 | 인계문 두 건, 정본·WO·CHECK, 실제 route·membership·공급·콘텐츠·Forum·LMS·호스트 코드, 기존 테스트, GitHub 통합·배포 기록을 대조. 완료 기능을 재구현 대상에서 제외하고 실제 공백을 추출 |
| 논의 D1 | 기존 약사 포럼은 **독립 가입 약사 커뮤니티로 유지**, pharmacy 사업 회원 포럼은 **별도**로 제공 |
| 논의 D2 | 강좌는 커뮤니티에서 **완전히 제거**하고 독립 서비스 **study.neture.co.kr**로 이전 |
| 논의 D3 | 각 서브도메인에 **관리자(=운영자)**를 배치. supplier·funding·community 운영도 해당 호스트에서 수행. **전체관리자는 admin.neture.co.kr에만** 배치 |
| R2 재대조 | D1의 community_key 충돌·Forum 저장 범위, D2의 제거된 LMS mount와 남은 capability·강좌 문의, D3의 서비스별 관리 경로·Store 소유 게이트를 재확인. 현재 가입 제한·복수 사업 주문 테스트·KPA 생성 호출 제거·인증 별도 트랙을 다시 확인 |
| 최종안 | 아래 ToDo와 완료 조건을 기준으로 구현. 기획 완료와 구현·통합·배포·업무 검증 완료는 각각 기록 |

**D1 적용**: 기존 약사 커뮤니티의 게시글·가입 원장을 보존한다. pharmacy 사업 회원 포럼과 같은 key·slug로 합치지 않는다. 기존 KPA/PH 서비스 가입을 독립 커뮤니티 승인에 덧붙이는 현재 조건을 정렬하되, 커뮤니티의 개별 승인 절차는 유지한다.

**D2 적용**: 학습·강사·운영 업무와 강좌 개설 문의는 study 소유로 정리한다. 약사회 분회의 연수 이력·학점 관리와 일반 협업 문의는 별도 업무로 유지한다. 현재 study의 `joinEnabled=false`·독립 lecture membership·문의 안내는 현행 구현이며, 이번 답변을 직접 가입 신청 개방이나 타 서비스 회원의 자동 가입 승인으로 해석하지 않는다. 이전 강좌 데이터 삭제로 취소된 import/re-key 절차를 다시 만들지 않는다.

**D3 적용**: 과거 주소 문서의 “공급자·펀딩·커뮤니티 운영은 공통 admin 공간” 설명을 대체한다. 서비스 관리 화면의 이름이 /admin이라고 해서 전체관리자 화면으로 옮기지 않는다. 개별 커뮤니티 운영자·사업 담당 운영자·전체관리자는 각 범위로 제한한다. 사업자는 자기 사업 관리에 다른 서비스 가입이나 약국 소유를 요구받지 않는다.

## 3. 조사 기준과 현재 상태

- 실행 기준: 최신 `origin/main`의 `0795464cc5`(#361)에서 전용 branch `wo/neture-service-realignment-v1`로 착수. 기존 SETUP.md 수정은 이 작업에서 제외한다.
- #349는 2026-10-07 통합(`a66ef4697a`), #359는 2026-10-08 통합이다. 인계의 “#349 미통합”·메인 수동 승인·사용자당 여러 약국 경영 설명은 현행 기준이 아니다.
- #361의 CI·Delivery·Promote 성공 기록을 확인했다. 이는 파이프라인 결과이며 가입·주문·QR의 운영 업무 검증을 뜻하지 않는다.
- 기획 회차의 조사 결과와 구현 후 로컬 검증은 구분한다. 아래 실행 기록의 격리 DB 검증은 운영 환경의 업무 검증을 대신하지 않는다.
- 코드 작업 착수와 통합 직전에는 최신 main·관련 PR·공유 모듈 소비처를 다시 대조한다. 다른 세션의 인증·설정 변경을 임의로 합치거나 수정하지 않는다.

### 3-1. 실제 대조 결과와 처리 구분

| 영역·근거 | 확인 결과 | 최종 처리 |
|---|---|---|
| `apps/api-server/src/config/service-catalog.ts`, `services/web-neture/src/pages/O4OHomePage.tsx` | 목표 주소와 study·funding 메인 진입은 존재 | 유지·직접 URL/로그인 회귀 |
| `services/web-neture/src/lib/hostProfile.ts`, `services/web-neture/src/App.tsx`, `services/web-store/src/App.tsx` | 공급자·펀딩 이용 경로는 분리. 서비스별 운영 권한은 분리됐지만 운영 경로는 main으로 이동. 내 매장 신청 검토·사업 운영도 main에 있음. Store의 기존 업무 화면은 매장 소유 게이트 뒤 | 서비스 관리자 경로를 소유자 화면과 구분해 해당 호스트에 배치(T03), community 공통 진입 완성(T07/T08) |
| `services/web-store/src/pages/MyServicesPage.tsx`, `services/web-store/src/pages/neture-pharmacy/SemiFranchisesPage.tsx` | 기존 service enrollment와 사업 가입 화면이 별개. 사업 커뮤니티는 문자 안내이며 실제 링크 없음 | 가입·이용 진입 구획 연결(T04/T08) |
| `services/web-store/src/pages/neture-pharmacy/SupplyOptionsPage.tsx`, `apps/api-server/src/modules/neture-pharmacy/services/supply-access.ts` | 동일 약국의 모든 활성 사업을 조회. 전체/default/proposal/event/recruitment 및 sf 필터, 담기·확정 재검사 존재 | 재구현 없이 유지·부족한 정지 격리 회귀 보완 |
| `apps/api-server/src/modules/neture-pharmacy/__tests__/neture-pharmacy-commerce.integration.spec.ts` | 같은 약국의 pharmacy+다른 사업 동시 가입·주문·가격·수취 묶음, 매장별 장바구니 격리 테스트 존재 | “복수 서비스 미지원” 삭제. 기존 검증 재사용(T13) |
| `apps/api-server/src/modules/neture-pharmacy/services/pharmacy-membership.service.ts` | 사용자당 한 약국 신청 제한 | 사용자 확정 기준에 맞는 구현으로 유지 |
| `apps/api-server/src/modules/neture/services/seller-recruitment.service.ts`, `apps/api-server/src/modules/neture-pharmacy/services/semi-franchise-recruitment.service.ts`, `supply-access.ts` | 옛 경로는 NULL 모집을 보존, 새 목록·신청·공급은 사업 INNER JOIN으로 NULL 제외 | 약국 문맥의 미지정=pharmacy를 생성부터 공급까지 정렬(T05) |
| `apps/api-server/src/modules/neture-pharmacy/services/semi-franchise-content.service.ts` | 활성 사업 콘텐츠 통합 조회·독립 사본 구현 | 원본/사본 권한 계약 유지 |
| `services/web-store/src/pages/neture-pharmacy/PharmacyContentSourcesPage.tsx`, `services/web-store/src/pages/pharmacy/HubSupplierLibraryPage.tsx`, `services/web-store/src/App.tsx` | 일반 콘텐츠·공급자 자료는 HUB로 이동. 공급자 공개 자료는 읽기 전용. 옛 /hub와 /store-hub 경로 잔존 | 자료 화면 이전 후 HUB 중간 단계 제거(T06), 사본 권한 확대 없음 |
| `apps/api-server/src/services/community/community-lifecycle.service.ts` | 독립 커뮤니티 개설·가입 신청·승인·개별 운영자 지정은 구현 | 가입 시스템 재구현 없이 재사용 |
| `apps/api-server/src/routes/communities.routes.ts`, `apps/api-server/src/middleware/community-access.middleware.ts`, `services/web-neture/src/pages/community/CommunityHostHomePage.tsx` | 정적 목록/접근 안내와 실제 승인 검사가 어긋남. 사업 접근 판정은 있지만 DB 커뮤니티 게시판·공통 이용 화면 미완성 | 일반/사업 목록·접근·게시판 연결(T07/T08) |
| `apps/api-server/src/modules/neture-pharmacy/services/semi-franchise.service.ts` | community_key 등록 시 독립 커뮤니티 식별과의 충돌 방지 없음 | D1에 따라 독립/사업 식별 충돌 차단(T08) |
| `apps/api-server/src/routes/forum/service-forum.routes.ts`, `apps/api-server/src/controllers/forum/ForumControllerBase.ts` | Forum mount·저장 범위가 정적 카탈로그에 연결, 미등록 key는 빈 범위. 저장 service_code 길이와 사업 key가 다름 | 검증된 DB 커뮤니티의 범위 adapter 연결·게시판/중재 격리(T08), 공통 Core 전체 재작성 없음 |
| `services/web-lecture/src/App.tsx`, `apps/api-server/src/modules/lms/routes/lms.routes.ts`, [강좌 분리 CHECK](../checks/CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md) | study 앱·독립 LMS API·강사/운영자 존재. KPA LMS mount 제거·옛 URL 이전 구현. 과거 import는 취소됨 | LMS 본체 유지, 잔여 연결만 이전·검증(T09) |
| `services/web-lecture/src/config/service.ts` | study의 이용 문의가 neture.co.kr/contact로 연결 | 강좌 문의 접수·관리의 실제 목적지를 study 업무로 정렬(T09) |
| `apps/api-server/src/config/community-catalog.ts`, `services/web-kpa-society/src/pages/CommunityHomePage.tsx`, `services/web-kpa-society/src/pages/contact/ContactPage.tsx`, `services/web-kpa-society/src/pages/operator/CollaborationRequestsPage.tsx` | education capability·강좌 표시·개설 문의와 처리 화면 잔존 | 커뮤니티에서 강좌 소유 기능 완전 제거, study 문의 연결(T09) |
| [펀딩 경계](../architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md), `services/web-kpa-branch/src/App.tsx` | 펀딩은 콘텐츠·참여형, 분회는 독립 업무·새 주소 적용 | 현재 기능 유지·호스트/교차 링크/운영 흐름 검증(T10) |
| `apps/api-server/src/services/approval/MembershipApprovalService.ts` | 정지 시 서비스 prefix:store_owner를 회수하지만 neture/KPA 재활성화는 매장 역할 복구를 건너뜀 | 메인/서비스 원장과 매장 승인 표식의 분리, 회수·복구 소비처 정합(T02) |
| `apps/api-server/src/routes/kpa/services/kpa-store-organization.provisioning.ts` | 자동 매장 생성 runtime 호출은 이미 제거; 정의와 단위 테스트 잔존 | 자동 생성 제거를 다시 구현하지 않고 미사용 코드 정리(T12) |
| [K-Cosmetics 잔여 계약](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md), 약국 설계 §16·§17 | K-Cosmetics web/API 이미 퇴역. PH QR 이전·302/301·데이터/서버 정리, 이벤트 2단계 인덱스는 잔여 | 퇴역 계약을 따르는 정리(T12), 1단계 운영 검증 후 인덱스 전환(T11) |

### 3-2. 다른 작업·외부 선행조건

| 구분 | 처리 |
|---|---|
| AUTH 별도 트랙 | #361로 공개 전체 로그아웃 제거 통합. 최신 main의 WO-O4O-AUTH-REFACTOR-V1 후속 세션·비밀번호·카카오·Demo/테스트 데이터 작업과 소비처 조율. 이번에 중복 개발·삭제하지 않음 |
| SETUP.md | 이 작업 전부터 있던 수정 및 별도 PR #362 범위. 이번 서비스 계획 변경에서 제외 |
| 미래 사업 | 신규 혈당관리·협동조합 등의 실제 업무는 각 사업 기획이 선행. 검증용 두 번째 사업을 실제 사업 완성으로 보고하지 않음 |
| 실제 PG | 수취 법인·PG 계약·외부 설정 뒤 진행. 이번 완료 기준에 미연결 상태와 test 모드를 명시 |
| 운영 적용 | 신규 계정·검토 운영자·테스트 공급자·실제 브라우저와 대상 환경 필요. 운영 DB·DNS/LB·인증서 변경은 구체 대상·복구안과 기존 승인 범위를 확인 |
| 서버 퇴역 | 인쇄 QR용 기존 도메인·인증서 유지 여부와 서버 종료는 별개. 외부 선행조건이 남으면 해당 항목은 미완료로 기록 |

## 4. 수정 ToDo — 하나의 연속 작업

T01~T13은 전체 작업 내부의 순서·의존성이다. 임의로 일부만 끝내고 전체 완료를 선언하지 않는다. 체크한 항목은 **branch 구현·소스 대조·로컬 회귀**이며 운영 완료를 뜻하지 않는다. 체크하지 않은 항목은 **운영 확인 또는 적용 대기**이며, 코드가 이미 존재하는 유지 항목도 이번 변경의 회귀와 운영 확인은 별도로 남는다.

### T01. 실행 기준·문서·소비처 표 확정

- [x] 초안 → 1차 대조 → 필요한 결정 논의 → 수정 ToDo → 2차 대조의 기획 기록 작성
- [x] 착수 시 최신 main·관련 PR·배포·진행 트랙을 갱신하고 route/메뉴/API/원장별 유지·이전·제거 표를 확정
- [x] 역할·서브도메인·가입·commerce·Forum·LMS·HUB 메뉴 정본 및 canonical index의 현행 설명을 수정안에 맞춰 정렬. 과거 CHECK의 당시 PASS를 현행 PASS로 다시 쓰지 않음
- 완료 기준: 모든 실행 항목에 현재 소비처·목적지·담당 범위·검증 조건이 있고, 기존 완료 작업과 다른 트랙의 중복이 없음

### T02. 가입 정지·재활성화와 독립 원장 정합

- [x] MembershipApprovalService의 메인/KPA 정지·복구와 약국·공급자 승인 표식 소비처를 대조하여, 서비스 조치가 별도 매장 소유 표식을 잘못 회수하거나 자동 발급하지 않도록 정렬
- [x] 정상 계정·이메일 확인, 명시적 메인 정지, 내 매장 승인, 사업 승인 각각의 차단·해제 결과를 검증
- 완료 기준: 상태 차단은 현재 원장에서 판정하고, 재활성화로 다른 서비스의 원장·신규 역할이 생기지 않음. 기존 매장·공급자 자격이 역할 비대칭 때문에 잘못 막히지 않음

### T03. 메인·사업자·운영자 호스트 배치

- [x] 메인 진입은 기존 카드 재사용. 서비스별 업무 경로·공통 로그인/handoff·직접 URL·쿼리/복귀 경로의 목적지를 정렬
- [x] 기존 서비스 앱의 store 경로와 현재 꺼진 VITE_UNIFIED_STORE_HANDOFF의 소비처를 확인해, 새 위치 검증 후 전환 플래그·옛 링크의 적용 순서와 롤백을 정렬
- [x] supplier·funding·community 관리 경로는 각각 해당 호스트, 내 매장 신청 검토는 store, pharmacy 사업 운영은 pharmacy에 배치. study·kpa의 기존 관리 경로는 유지. 매장 소유 게이트와 서비스 관리자 게이트를 구분
- [x] 기존 supplier/funding/community 역할·담당 사업 검사를 보존하고, 현재 neture 역할에 묶인 약국 신청 검토·제품 승인·사업 관리 API는 기능 소유자에 맞는 관리 범위를 대조·정렬. store라는 새 serviceKey·가입 원장을 화면 이동 때문에 만들지 않음
- [x] 서비스 관리자(운영자)와 전체관리자의 화면·메뉴·API 분리. neture /admin·/operator도 기능별로 소유 공간을 판정해 이전하고 전체 관리 기능은 admin 호스트에만 배치. /admin prefix만으로 일괄 이동하거나 /operator 전체 허용·platform:super_admin 부여를 하지 않음
- 완료 기준: 메뉴·직접 URL 양쪽에서 자기 업무를 이용하고 타 사업 운영에는 접근할 수 없음. desktop/mobile·로그인 복귀 확인

### T04. 내 매장 가입 서비스 구획·진입 정리

- [x] MyServicesPage의 enrollment와 SemiFranchisesPage의 사업 가입을 구분하여 상태·신청·이용 진입을 정렬
- [x] 기존 통합 공급·자료함을 유지하고 가입 사업별 탭/필터·전용 진입과 실제 커뮤니티 링크를 연결. 아직 개발되지 않은 사업 기능을 메뉴로 노출하지 않음
- 완료 기준: 한 약국의 복수 사업 이용이 한 내 매장에 적용되며 조건·출처가 구별됨. 다른 매장 자료·권한·장바구니·주문은 섞이지 않음

### T05. 모집 생성·목록·신청·승인 후 공급 판정 통일

- [x] 약국 모집의 사업 지정 → 지정 사업 가입, 미지정 → pharmacy 가입을 단일 판정으로 정렬
- [x] 새 모집 생성·조회·신청·참여 승인·공급 옵션·담기·확정에 동일한 대상 해석 적용. 현재 INNER JOIN으로 미지정 모집을 버리는 경로도 수정
- [x] 옛 store-seller-recruitment-browse/controller 및 신청 API 소비처를 새 약국 경로로 정리. 다른 서비스의 NULL 행을 자동 변환하거나 KPA 테스트 데이터 우회를 만들지 않음
- [x] 신청의 중복 조회와 DB 제약을 약국 조직에 일치시킴. 조직 없는 기존 신청은 사용자 중복 제한 유지, 위험한 제약 원복은 데이터 삭제 없이 차단
- 완료 기준: 지정/미지정·미가입/정지·다른 사업·승인 전후 사례에서 목록과 직접 API 결과 일치, 승인 후 별도 취급 등록 없이 주문 가능

### T06. 콘텐츠 직접 이용·HUB 단계 제거

- [x] PharmacyContentSourcesPage의 일반 자료·공급자 자료 화면을 내 매장 자료함으로 이전. 기존 공개 자료의 읽기 전용 계약과 사본 가능한 출처의 Copy 계약 유지
- [x] /hub·/store-hub 하위 기능의 새 위치를 하나씩 연결하고 메뉴·직접 URL·외부 링크를 정렬한 뒤 중복 화면·등록 단계 제거
- [x] 출처 유지·사본 편집·사업 정지 후 원본 차단/사본 유지·자체 콘텐츠/QR/사이니지 이용 확인
- 완료 기준: 공급·자료·교류의 정상 이용에 HUB 경유가 필요 없음. 공유 hub/asset-copy 모듈은 남은 소비처를 확인해 필요한 부분 유지

### T07. 독립 커뮤니티 목록·가입·기존 약사 포럼 이전

- [x] 기존 communities/community_memberships·개별 승인·운영자 지정 기능을 재사용하여 community 호스트의 목록·가입 상태·진입을 완성
- [x] 일반 커뮤니티 목록·access 안내·실제 읽기/쓰기 API의 자격 판정 통일. 독립 약사 커뮤니티에 남은 KPA/PH 가입 결합을 제거
- [x] 기존 약사 게시글·가입·중재 범위를 보존하여 community로 이전. pharmacy 사업 가입으로 독립 커뮤니티 승인을 대체하지 않음
- 완료 기준: 일반 회원이 독립 가입·승인 후 기존 약사 포럼을 이용하고, 미승인·정지 회원은 서버에서도 차단됨

### T08. 사업 회원 커뮤니티 게시판·운영 완성

- [x] 독립 약사 커뮤니티와 별개인 pharmacy 사업 커뮤니티 식별을 사용. 사업 community_key 생성·변경 시 독립 커뮤니티/다른 사업과의 충돌 차단
- [x] 개설 승인 DB 커뮤니티와 사업 커뮤니티를 기존 Forum에 연결. 저장 범위 adapter·길이 제한·mount·글/댓글/중재 경계를 대조해 필요한 최소 변경과 migration 필요 여부를 구체화
- [x] community 공통 목록·내 매장 링크에 해당 공간을 배치. 사업 회원의 읽기/쓰기·직접 API와 담당 운영자의 관리 범위를 각각 해당 사업에 제한. 담당 운영자의 관리 진입이 약국 소유·일반 회원 가입 검사 때문에 막히지 않도록 관리 게이트 구분
- 완료 기준: 활성 사업 가입자만 자기 사업 공간을 이용, 정지·종료 시 차단. 다른 사업과 독립 커뮤니티의 게시글·가입·중재 권한이 섞이지 않음. 접근 판정만으로 게시판 완료를 선언하지 않음
- 의존: T04/T07. [기존 사업 게시판 WO](WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1.md)를 이 전체 작업에 연결하고 별도 미정 트랙으로 남기지 않음

### T09. 강좌의 커뮤니티 잔여 완전 분리

- [x] community catalog의 education capability, 커뮤니티 소개·강좌 개설 안내·SEO·문의·운영 처리와 실제 소비처를 점검해 강좌 기능을 study로 이전
- [x] study에서 기존 공개 강좌·학습·강사 신청/심사·운영·독립 lecture 자격을 확인하고, 현재 Neture 공통 문의로 보내는 강좌 이용 문의와 커뮤니티의 개설 문의를 study 담당 관리 경로로 이전. 커뮤니티 자격으로 학습/강사 권한을 부여하지 않음
- [x] 이미 접수된 강좌 개설 문의도 Study 운영 화면에서 조회·처리. 기존 education 원장은 이동·백필하지 않으며 커뮤니티의 일반 협업 문의와 다른 서비스 자료는 제외
- [x] 옛 LMS URL은 study의 실제 목적지로 연결. 삭제된 옛 강좌의 재수입이나 커뮤니티 내부 강좌 UI를 만들지 않음
- 완료 기준: 커뮤니티가 강좌를 소유·접수·운영하지 않으며 강좌 업무는 study에서 수행. 분회 연수 이력·자격 심사·일반 협업은 각 실제 업무에 남음. 일반 이용 가입 개방 여부는 현행 정책과 구분해 기록

### T10. 공급자·펀딩·분회 업무 회귀와 교차 링크 정합

- [ ] 공급자 승인·제품 승인·제안·자료 제공·주문 처리, 펀딩 콘텐츠/참여/관리, 분회 회원·공지·회비·연수 이력의 기존 업무를 새 호스트에서 확인
- [x] 펀딩 게시글 연결 등 옛 main/forum 링크의 실제 소유 공간과 복귀 목적지를 정렬
- 완료 기준: 각 독립 서비스의 원장·권한과 기존 기능 유지. 펀딩을 주문/PG 시스템으로 확대하거나 분회를 pharmacy 사업으로 합치지 않음
- 의존: T03/T07/T09. 미래 사업 고유 업무는 별도 기획

### T11. 이벤트 2단계 인덱스·재신청 제한 마무리

- [x] 기본 읽기 전용 수동 전환 도구·운영 검증/rollback-floor 적용 게이트·실제 인덱스 상태별 API 구현
- [x] 격리 DB에서 전환·재신청·복수 이벤트 수량·취소/복원·중복 원복 차단과 1단계 복구 검증

- [ ] 1단계 API의 운영 안정과 인덱스 소비처·롤백 호환을 확인한 뒤 별도 2단계 migration/배포안을 실행
- [ ] 해당 인덱스 전환과 함께 이벤트 재신청·동시 복수 신청의 임시 409 제한을 해제하고 수량·한도·복원 회귀 확인
- 완료 기준: 구버전 API/롤백의 충돌 가능성을 확인한 적용 순서와 실제 migration/업무 검증 기록이 있음
- 의존: T05 및 T13의 선행 운영 검증. 검증하지 않은 1단계 안정성을 기정사실로 두지 않음

### T12. 옛 코드·데이터·호스트 퇴역

- [x] 읽기 전용 옛 테이블/공유 원장/FK census 도구와 URL map 302 초안 생성 도구 준비. 로컬 실행과 타 호스트 보존 검증

- [x] 이미 runtime 호출이 제거된 KPA 매장 생성 모듈/테스트는 모든 참조 확인 후 정리. 역할/활동 유형 경로는 별도 소비처를 확인
- [ ] K-Cosmetics 잔여를 기존 계약의 항목별로 정리. 카탈로그·역할·스키마·공통 콘텐츠 잔여를 서비스 복구나 일괄 삭제의 근거로 쓰지 않음
- [ ] PH의 QR/태블릿 등 네 경로를 새 호스트에서 실사용 확인 → 302 적용/검증 → 기존 주문·공급 설정 disposition → 조건 충족 후 301·서버 종료
- [ ] AUTH 테스트 데이터 트랙과 대상/소유권/FK/재사용·삭제·복구·dry-run을 공유하고 승인된 정리만 한 번 실행. 테스트 데이터 보존용 우회·backfill은 만들지 않음
- 완료 기준: 새 기능을 잃는 옛 경로 제거가 없고, PH 퇴역과 인쇄 QR용 도메인/인증서 보존이 각각 판정됨. 외부 설정 미실행은 미완료 표시
- 의존: 해당 새 위치의 T13 업무 검증. 다른 세션/PC의 branch·worktree는 정리하지 않음

### T13. 자동 검증·실제 업무·통합·배포·문서 종료

- [x] 기존 focused 테스트를 재사용하고 새 모집 판정·일반/사업 커뮤니티 경계·한 사업만 정지되는 복수 가입 사례의 부족한 검증만 보완
- [x] 영향받는 공통 모듈의 모든 서비스 소비처를 확인한 타입 검사·빌드·테스트. 로그인/handoff·직접 API·desktop/mobile 메뉴/직접 URL/복귀 검증
- [ ] 신규 계정 가입·이메일 확인 → 약국 증빙/검토/내 매장 승인 → pharmacy 및 검증용 두 번째 사업 가입/승인 → 공급자·제품 승인 → 공급/모집/주문/테스트 결제/처리 확인
- [ ] 일반 약사 커뮤니티 별도 승인과 사업 포럼, 자료 원본/사본·편집 후 출처, 계약·QR·태블릿·사이니지, 한 사업 정지 시 다른 사업/내 매장 유지 및 타 조직 차단 확인
- [ ] study·funding·supplier·kpa의 독립 업무와 커뮤니티/내 매장 자격 비전파 확인. 실제 OAuth·메일·서류 저장소가 불가하면 미확인 범위 기록
- [ ] 최신 HEAD의 required CI·SonarCloud 결과/적용 여부·Codex·미해결 스레드 확인 → integration-ready 보고 → 저장소 규칙에 따른 사용자 main 통합 승인 → PR merge → 현재 Delivery 정책으로 배포/운영 smoke
- [ ] T11/T12의 선행 업무 검증을 먼저 수행하고, 각 적용 후 회귀를 확인. 결함은 해당 부분 수정·재배포하여 전체 완료까지 진행
- [ ] 최종 정본·index·WO·CHECK·handoff에 구현/자동 검증/통합/배포/실제 업무/퇴역을 구분해 기록하고 자기 작업공간만 안전하게 종료
- 완료 기준: T01~T12의 실제 결과가 모두 기록됨. 파이프라인 성공·공개 화면 로드만으로 가입/업무 완료를 판정하지 않음

## 5. 기획 단계의 재대조 결과와 완료 판정

아래는 착수 전 기획 회차의 기록이다. 현재 구현·검증 상태는 각 ToDo와 §7 실행 기록, 연결된 CHECK를 따른다.

수정 ToDo를 기준으로 다음을 다시 확인했다. 아래 결과는 소스·문서 대조이며 runtime PASS가 아니다.

| 재대조 항목 | 확인·수정 결과 |
|---|---|
| 동일 약국의 복수 사업 | 공급 SQL·필터·통합 테스트에서 이미 존재. T04는 화면 구획, T13은 정지 영향과 실제 이용의 부족한 검증으로 한정 |
| 미지정 모집 | legacy 목록/신청뿐 아니라 새 생성/조회/신청/공급 INNER JOIN까지 대상. T05 범위를 확대해 누락 방지 |
| 독립 약사 커뮤니티 | 기존 가입 원장 보존. 사업 community_key와 충돌 시 사업 판정이 우선하는 현재 경로 확인 → T07/T08 분리·충돌 방지 |
| Forum 공통 경계 | 정적 카탈로그 미등록 key fail-closed와 service_code 길이 확인. 이름만 DB 커뮤니티로 바꾸는 구현은 충분하지 않음 |
| 강좌 완전 분리 | LMS 본체·옛 mount 제거는 완료 기능. education 표시·강좌 개설 문의는 실제 잔여. 분회 학점/연수와 일반 문의는 유지 |
| 서비스 관리자 배치 | supplier/funding/community 운영은 main에, 매장 검토·사업 운영도 neture에 잔존. Store의 기존 소유 게이트와 서비스 관리 게이트를 분리하고 각 호스트에 이전. 전체관리는 admin에만 배치 |
| KPA 매장 생성 | 호출 제거 완료. T12는 dead 모듈/테스트 정리이며 신규 승인 구조를 다시 개발하지 않음 |
| 펀딩·분회·K-Cosmetics | 현행 content-only·독립 분회·퇴역 계약 적용. 옛 commerce/강좌 기록만 보고 기능을 복구하지 않음 |
| 인증·운영 데이터 | 최신 main 인증 WO와 중복 개발/삭제 방지. 신규 계정 가입부터 검증한다는 사용자 선택 유지 |
| 배포·업무·퇴역 | 각각 별도 상태. 현재 파이프라인 성공을 운영 주문/QR 성공이나 PH 301 적용으로 간주하지 않음 |

이 회차의 산출물은 **코드·문서에 대조한 실행 계획**이다. 구현 체크는 아직 완료되지 않았다. 문서의 링크/경로 존재·diff·민감정보 검사를 별도로 기록하며 이를 기능 검증으로 해석하지 않는다.

**2026-10-08 기획·문서 검증**: 새 작업안과 3개 정본의 추가·수정 내용에 있는 로컬 링크 11개·저장소 경로 33개의 존재를 확인했다. 4개 문서의 민감정보 검사에서 패턴 0건, git diff --check 통과. 기획 회차의 문서 변경은 배포 대상이 아니다(DEPLOYMENT = NOT_APPLICABLE). 코드 실행·PR·main 통합·운영 적용은 이 회차에서 수행하지 않았다.

전체 완료는 기존 기능 유지, 새 업무 위치와 가입/권한, 내 매장의 복수 사업 이용, 독립/사업 커뮤니티, 강좌 분리, HUB 기능 재배치, 회귀·배포·업무 검증, 승인된 퇴역 범위가 실제 확인된 상태다. 외부 선행조건 때문에 실행하지 못한 항목은 미완료로 남긴다.

운영 DB 변경·삭제·공유 runtime 적용·main 통합은 구체 작업안과 저장소 실행 경계를 따른다. 현재 계획 작성은 그러한 적용이나 외부 메시지 발송을 수행하지 않는다.

## 7. 실행 기록 (2026-10-08)

- T01: `origin/main=0795464cc5`와 관련 작업을 대조하여 전용 branch에서 실행. 외부 기존 `SETUP.md` 변경은 보존·제외한다.
- T02/T05: 독립 매장·공급자 승인 표식을 보존하고 약국 모집의 미지정=pharmacy 판정을 생성·목록·신청·공급에서 통일했다. KPA 테스트 데이터 우회는 추가하지 않았다.
- T03: 서비스 운영을 소유 호스트에 배치. 매장 신청 검토는 store, pharmacy 담당 운영은 pharmacy, 사업 등록·담당 지정과 플랫폼 계정 관리는 admin이다. 기존 페이지를 공통 모듈로 추출하여 재사용했다. 로그인 전달은 조직·가입·역할을 생성하지 않는다.
- T04/T06: 내 매장의 사업 가입 구획·필터와 커뮤니티 진입을 연결했다. 자료를 `/store/library/*`에 배치하고 옛 HUB는 기능별 주소 adapter로 바꾸었다. 중복 HUB 화면은 제거했다.
- T07/T08: 독립/사업 가입 판정·공통 목록·게시판/글/댓글·개설 심사·소유 게시판 회원 관리·중재를 기존 Forum에 연결했다. 독립 원장과 사업 원장을 합치지 않으며 UUID 저장 범위와 주소 충돌 방지를 적용했다.
- T09/T10: 커뮤니티의 강좌 capability·문의·안내를 제거하고 study의 문의 접수·운영 처리에 연결했다. 기존 강좌 직접 가입 제한, 분회 학점·연수·자격과 펀딩 content-only 계약을 보존했다. 이전 Forum 링크는 community로 연결한다.
- T11: 운영 안정 확인 뒤 적용할 수동 인덱스 도구·schema별 API를 구현했다. 격리 DB 전환/원복과 재신청·복수 이벤트를 검증했으며 운영 DB에는 적용하지 않았다.
- T12: 미사용 KPA 매장 생성 정의·테스트와 retail CORS를 정리했다. 옛 데이터/FK census 및 QR 302 검토 초안 도구를 준비했다. 외부 데이터·DNS/LB·이미지·서버는 변경하지 않았다.
- T13: 실제 로컬 API 34건, 한 약국 두 사업의 승인·해당 사업 정지 격리, 브라우저 10개 흐름을 확인했다. 검토 지적에 따라 공용/구형 Forum·홈/운영 요약의 승인 경계를 보완하고 강좌·내 매장 검토 이미지를 검증했다. 상세 회귀·빌드와 운영 한계는 [CHECK](../checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)를 따른다.
- 문서 정합: 역할·주소·commerce 설계와 canonical index의 HUB/복수 약국/커뮤니티 후속 미구현 설명을 현재 branch에 맞추어 수정했다. 과거 CHECK의 당시 결과를 현재 PASS로 다시 쓰지 않았다.
- 남은 연속 단계: 최신 HEAD CI·리뷰 → main 통합 승인 → 배포 → 실제 신규 계정 가입·증빙·사업/공급자 승인·테스트 주문·QR 업무 → 운영 조건이 충족된 인덱스/퇴역 적용. 외부 선행조건은 전체 완료까지 열린 항목으로 유지한다.
