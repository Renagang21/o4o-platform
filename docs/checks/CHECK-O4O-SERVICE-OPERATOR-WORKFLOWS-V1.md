# 서비스별 운영자 업무 흐름 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **WO**: [서비스별 운영자 전체 TODO](../work-orders/WO-O4O-SERVICE-SPECIFIC-OPERATOR-ROADMAP-V1.md)

## 실행 범위

현재 서비스별 업무와 권한 정책을 보존하며 조사 후 확정한 결함을 수정한다. 실제 계정 인증·운영 데이터 변경 검증은 사용자가 후속 직접 테스트한다. 테스트용 DB 쓰기나 운영 권한 부여를 수행하지 않는다. 전체 상위 TODO의 완료와 이번 구현/검증 완료를 구분한다.

## 조사·수정 TODO

기준 main: `cb85731ca940b5957068cfb46ab239ecbcd680d8`. 메뉴 설정만으로 복구/삭제를 결정하지 않고 아래 현행 route와 API의 업무 소유권을 대조했다. 이 표는 정적 코드 조사이며 실계정·운영 DB의 권한 전수 검증을 대신하지 않는다.

| TODO / 업무 | 현재 화면 → API → 업무 원장 | 권한·담당 / 조사 판정 |
|---|---|---|
| T01 펀딩 | Neture의 funding 전용 운영 wrapper → `market-trial-operator.routes.ts` → MarketTrial, 참여 기록, 전용 forum, 포럼 실패 원장 | 현재 funding 역할 DB 재판정. 개설자는 활성 공급자+본인 소유권. 승인/포럼 복구와 단계 진행은 기존 구현 유지. 실패 탭 검색·페이지·늦은 응답·해결 후 목록/건수는 결함. |
| T02 약국 협력사업 | Neture/KPA의 담당 사업 페이지 → `neture-pharmacy.routes.ts` → semi_franchises/담당 관계/사업 가입·제안·이벤트·모집·콘텐츠 | neture 서비스 역할+지정된 사업 범위. 약국 호스트는 `businessKey=pharmacy`와 `/community` 주소를 사용한다. 탭/사업 전환 후 옛 목록과 처리 결과가 나타나는 것은 결함. |
| T03 공급자 | `/operator/suppliers`, `/admin/supplier-governance` → supplier operator/admin controller → supplier 조직·입점·상태 이력 | supplier operator는 승인/반려, admin은 비활성화/재활성화. 진행 주문/미정산 409 유지. governance 조회 실패를 빈 목록으로 반환하는 것은 결함. 본인 상품·주문·정산은 공급자 업무다. |
| T04 커뮤니티 | 서비스 개설/지정, 개별 workspace/게시판 심사/공개 관리 → communities/public-read API → community memberships/boards/posts/공개 지정 | 서비스 admin 지정·회수와 개별 admin/operator의 회원 심사·제재는 이미 분리. 게시판 심사 최신 요청/중복 방어는 기존 구현·회귀를 재사용. 새 신고·숨김·승계·삭제 자동화는 정책 미정. |
| T05 강의 | 강사 신청/강좌 목록·검토/문의/수료증 → `/lms/operator` → lecture 강좌·강사 신청·수료증 원장 | lecture current role+가입, course.serviceKey. 강사 편집/학습 등록과 운영 심사는 분리. 강좌·강사 목록의 필터 응답 역전/조회 오류 후 옛 처리 버튼은 결함. 자동 발급·새 역할은 미정. |
| T06 분회 | `/:slug/operator/*` → kpa-branch API → branch site/posts/domain, 연도별 신고/회비/교육, 행사/RSVP/임원 | 서비스 역할+분회 소속 이중 판정. 행사 화면의 slug/상태/명단 전환 시 응답 역전·이전 분회 편집 폼 잔존은 결함. 새 회비/교육 정책은 추가하지 않는다. |
| T07 Neture/약국 고유 운영 | service wrapper·operatorMenuGroups·hostProfile → Neture/KPA API → 상품 승인/모집 노출/홈·콘텐츠 등 현행 원장 | KPA의 이름이 PLATFORM_ROLES인 배열도 실제로 kpa:admin/operator를 포함한다. 이름만 보고 중앙 전용 guard로 오판하지 않는다. 호스트별 사업/매장 리다이렉트와 활성 route를 유지한다. 재배치/offer 조회는 기존 ACTIVE 트랙으로 연결하며 임의 메뉴 삭제하지 않는다. |

역할 행렬: 중앙 관리자는 서비스 운영자 지정·회수/플랫폼 계정, 서비스 운영자는 각 서비스 원장의 업무, 사업/분회/개별 커뮤니티 담당자는 별도 관계 범위, 공급자·개설자·강사는 본인 사업 작성/진행을 담당한다. 공통 회원 상태·역할을 사업 원장 상태와 합치지 않는다. 약국 협력사업은 서비스 identity 신설 대상이 아니다. PharmacyHub/KCosmetics는 퇴역, Cafe24는 workspace 미정, 병원약국은 무로그인 로컬 업무 앱을 유지한다.

개발 전 확정한 수정 TODO:

- [x] F01: 펀딩 실패 목록은 제출한 검색 조건+현재 페이지만 조회하고 최신 응답만 적용한다. 해결 완료 후 현재 필터의 목록·건수·마지막 페이지를 다시 맞춘다. 오류/재시도와 처리 중 중복 방어를 추가한다.
- [x] F02: 포럼 실패 API의 잘못된 UUID/정수/해결 조건·메모를 400으로 구분하고 동시 해결 요청이 이미 저장된 메모를 덮어쓰지 않도록 기존 원장에 조건부 update한다. schema·권한·금융 정책은 불변이다.
- [x] P01: 담당 사업 목록/탭/필터의 최신 요청·처리 중 중복 방어와 조회 실패 재시도를 정비한다. 양쪽 소비처의 주소/사업 props를 유지한다.
- [x] S01: 공급자 governance 조회 오류를 전달하고 실패/빈 목록을 구분한다. 처리 실패·재시도·중복 방어를 유지한 채 복구한다.
- [x] L01: 강좌·강사 심사 목록에서 최신 필터만 반영하고 오류 중 옛 목록 작업을 막는다. 처리 중 필터 변경/중복 요청과 실패 재시도를 정비한다.
- [x] B01: 분회 행사 페이지의 분회 변경은 작업 상태를 초기화하고 목록/참가 명단 최신 응답만 적용한다. 저장/상태 변경 중 중복 작업을 막는다.
- [ ] 현재 정책으로 정상인 커뮤니티·호스트/메뉴 경계는 회귀 검증한다. 신규 정책/다른 ACTIVE 트랙/실계정 검증은 상위 TODO에 남긴다.

## Shared Module Change Verification

변경 대상은 `@o4o/operator-core-ui/modules/pharmacy-management`의 담당 사업 화면 구현이며 exports/props/API/권한/capability 계약은 변경하지 않는다. symbol·endpoint·route·raw-source 파일 경로 소비처를 검색한다.

| 소비처 | 사용/영향 | route·권한·노출 | 검증 계획 |
|---|---|---|---|
| Neture operator | 직접 wrapper, 전체 담당 사업 | 기존 neture 역할·담당 관계, 기존 사업 forum 주소 | 타입/빌드·회귀·desktop/mobile fixture |
| KPA-Society operator | 직접 import, pharmacy 사업 제한 | 기존 neture 역할 guard, `businessKey=pharmacy`, `/community` | 타입/빌드·회귀·desktop/mobile fixture |
| admin/store/forum/My Home | 직접 import 없음, 연결 대상만 유지 | 메뉴·역할·route 삭제 없음 | 소비처 검색/기존 회귀 |
| KCosmetics/PharmacyHub | 현행 소비처 없음, 퇴역 | 복구/가입/role 신설 없음 | source census |

## 실행 증거

로컬 검증:

| 대상 | 실행 결과 |
|---|---|
| API funding 전체 + 포럼 실패 컨트롤러 | Jest 7 suites / 92 tests PASS. PostgreSQL 연결 없이 기존 transaction/role/소유권 회귀와 TypeORM의 실제 UUID 컬럼·IS NULL SQL 생성 확인. 운영 DB 동시 write는 미실행. |
| Neture 전체 | Vitest 68 files / 566 tests PASS. 최종 수정 뒤 펀딩·공유 사업·공급자 집중 회귀 4 files / 19 tests도 PASS. 기존 커뮤니티/공통 회원/호스트 경계 포함. |
| 약국 서비스 | Vitest 16 files / 132 tests PASS. |
| 강의 서비스 | Vitest 4 files / 12 tests PASS. 강좌·강사 목록 동일 기술 기반의 필터 역전·실패 재시도·중복/언마운트를 각각 검증. |
| 분회 서비스 | Vitest 5 files / 39 tests PASS. 분회 변경 편집 초기화·필터/명단 역전·조회 재시도·중복 저장 포함. |
| 빌드 | API, Neture, KPA-Society, Lecture, KPA-Branch와 공유 소비 패키지 빌드 PASS. 강의 테스트의 Testing Library 타입 오류를 수정 후 강의/분회를 재빌드했다. 공유 사업 표의 모바일 최소 폭 변경 뒤 공유 패키지·Neture/KPA-Society 최종 빌드도 PASS. 패키지/lock/migration 변경 없음. |
| 실제 번들 fixture browser | 1440px/390px × 펀딩·공급자·약국 담당 사업·Neture 구주소 이동·강좌·강사·분회 행사 = 14 시나리오 PASS. 페이지 오류/문서 가로 넘침 0. API 전체 intercept; 운영 DB write 0. 모바일 표 내부 가로 스크롤은 허용한다. |

fixture 검증은 가짜 계정/데이터와 API 응답으로 실제 앱 번들·호스트 경로·오류/처리 UI를 검증했다. 권한 서버나 운영 데이터가 실계정에서도 같다는 증거로 해석하지 않는다. Neture의 담당 사업 구주소는 현재 약국 호스트로 handoff하는 활성 이동 경로다. Neture wrapper와 약국의 사업 제한 props는 기존/추가 파라미터 회귀로 확인했다. 공유 `exports/props/API/role/capability` 변경 0, 실제 소비 앱 2개 유지, raw-source 검사에서 기존 계약을 제거하지 않았다.

클라우드 도구: 기존 `/workspace/.onboarding/activate.sh`와 frozen/offline pnpm 설치를 재사용했다. 환경 network readiness는 unknown 관측이며 모든 운영 연결이 준비됐다고 선언하지 않는다. fixture harness/log/screenshot은 `/tmp/operator-workflows-browser.cjs`, `/tmp/operator-browser.log`, `/tmp/operator-*-390.png`에 보관한다.

원격 HEAD CI·Sonar·Codex review·main 통합·배포는 push 뒤 실제 결과로 추가 기록한다. 사전 확인한 최신 main의 Delivery #38142342005는 Google Cloud WIF `unauthorized_client` / attribute condition 거절로 classify에서 실패했다. 저장소 변수 read도 현재 연결에서 403이므로 freeze 값을 추정하지 않으며 정상 Delivery/Promote의 gate로 재판정한다. 배포 인프라·WIF 설정을 임의 변경하지 않는다.

## 사용자 직접 테스트

공통 아이디라도 실제 서비스별 역할·담당 관계를 기준으로 검사한다. 계정 확보 안내는 현재 [SETUP.md](../../SETUP.md)의 테스트 계정 찾기를 따른다. 계정 정보를 커밋하거나 이 CHECK에 복사하지 않는다.

1. 펀딩: 실패 목록의 ID 검색/페이지/해결 필터를 전환한다. 마지막 미해결 건 해결 뒤 건수와 페이지가 맞는지, 두 세션의 동시 해결에서 첫 메모가 보존되는지 확인한다. 승인 후 전용 포럼 실패→재시도와 개설자 단계 진행은 기존 흐름 그대로인지 확인한다. settlement 409·입금과 포럼 가입 독립은 유지돼야 한다.
2. 약국 협력사업: 한 사업 담당/두 사업 담당/미담당 계정으로 사업·탭을 전환한다. 이전 사업 자료/회원과 처리 결과가 새 사업에 나타나지 않아야 한다. 게시·보관 결과는 해당 사업 활성 회원에게만 적용되고 매장 사본은 기존 계약대로 유지돼야 한다.
3. 공급자: operator는 입점 승인/반려, admin은 상태 관리로 진입한다. 진행 주문/미정산 409는 우회할 수 없어야 한다. 조회·저장 실패 후 재시도하고 사유 보존/이중 처리 방지를 확인한다.
4. 강의: 강사 신청 승인·반려와 강좌 심사/게시 중단/보관을 각각 검사한다. 다른 서비스 역할로 접근할 수 없어야 하고, 운영자 검토가 강사 편집이나 학습 등록을 대신하지 않아야 한다. 수료증/문의의 기존 업무도 별도 실제 데이터로 확인한다.
5. 분회: A 행사 편집 중 B 주소로 이동하면 A 초안/편집 ID/명단이 남지 않아야 한다. A만 지정된 계정의 B API 접근은 서버에서 거절돼야 한다. 행사 저장 실패는 입력을 유지하고 중복 요청을 차단해야 한다. 연도별 신고·회비·교육 원장은 이번 변경 대상이 아니므로 후속 실제 검증으로 남긴다.
6. 공통·커뮤니티: 중앙 지정/회수 후 기존 로그인에서도 현재 역할로 재판정되는지, 개별 operator의 회원 조회·승인·반려와 admin의 제재 경계, 사업 게시판과 일반 커뮤니티의 공개 범위를 직접 검사한다.

미실행/후속: 실계정 로그인, 운영 DB 동시 변경, 실제 권한 회수/다른 담당 계정, 회원 화면의 운영 데이터 반영. 신규 신고·숨김/복구·소유자 승계·보존/삭제 및 금융/수료증 자동화 정책은 상위 TODO에 계속 남긴다. 기존 재배치/offer 조회 ACTIVE 트랙은 중복 구현하지 않는다.

## 문서 정합

상위 ACTIVE TODO와 이 CHECK를 함께 갱신하며 이전 COMPLETED 기록은 수정하지 않는다.

배포 사전 제약 추가 확인: 최신 main의 [PH 퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md)는 다른 운영 writer와 동시에 자원을 삭제하지 않도록 외부 WIF 인증 차단 창을 명시한다. 현재 인증 거절을 단순 고장으로 간주해 WIF 조건을 우회/해제하지 않는다. 코드 통합 뒤 이 창의 종료·배포 gate를 다시 확인한다.
