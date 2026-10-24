# 내 매장 상담·태블릿 독립 실행 검증

> **상태**: COMPLETED
> **완료 범위**: 개발·로컬 검증 범위
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (한국시간)
> **사용자 지시**: TODO → 코드·문서 대조/보완 → 연결된 업무 전체 개발 → 검증·commit·push. PR·main 병합·배포 제외.
> **기준**: main `0d0d878a19794628fdba5bbc1086e9052c3d634a` · branch `wo/store-consultation-tablet-workspace`
> **종료 상태**: 운영 미반영. Git commit·push 결과는 개발 인계의 원격 HEAD로 확인한다. PR CI 미실행.

## 조사와 설계 보완

[TODO](../work-orders/TODO-O4O-STORE-CONSULTATION-TABLET-WORKSPACE-V1.md), [약국 설계 §15-7·15-8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md), [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [공유 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [migration 표준](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)을 대조했다.

기존 상담은 내 매장 레이아웃 안의 한 페이지·고객 dialog였고 두 기기를 연결할 전달 상태가 없었다. 진열 본체는 이미 `@o4o/tablet-kiosk-core`에 있었지만 Store의 실행 입구가 서비스 사이트 URL을 사용했다. 음성 hook·방향별 초안·번역 Extension·상품 위치·진열 pairing API를 재사용한다. 서비스별 화면을 복제하거나 음성 SDK·새 권한 원장을 만들지 않았다.

Redis/Memorystore가 폐기된 상태이므로 프로세스 메모리를 기기 간 연결의 원장으로 쓰지 않는다. 사용자 승인 기능에 필요한 **상담 도메인 테이블 1개**와 capability API를 추가했다. 공통 AI Core·영구 AI 이력·의도 자동화·의존성·lockfile·배포 설정은 변경하지 않았다. 관리자 배치 설정은 기존 조직 metadata에 enum만 저장하며 권한을 부여하지 않는다.

역방향 조사는 route·메뉴 label·컴포넌트·URL helper와 `check-literal-consumers.mjs`로 수행했다. raw-source 소비처 3개 spec과 실제 route ranking 검사를 함께 실행했다. 서비스 공개 태블릿 route·기존 인쇄 링크는 유지했다.

## 변경과 화면 계약

| 대상 | 현재 동작 |
|---|---|
| 매장 운영 | 일반형은 매대 약사·소비자, 대형은 매장 약사·일반 직원·매대 직원·소비자 실행 입구. 매대 번호 선택과 새 탭 링크 제공 |
| 관리자 | `/admin/pharmacy-service-settings`의 접힌 ‘매장별 상담 화면 배치’에서 활성 약국 검색·페이지 이동·일반/대형 저장. 전체 관리자 guard 유지 |
| 직원 상담 | `/consultation/staff?store=…&mode=…&station=…`. 기존 StoreGate·선택 매장 재검증을 사용하며 관리 헤더 없이 실행. 고정 매장과 선택 매장이 달라지면 진행을 중단 |
| 한 태블릿 | 고객/직원 말하기, 네 빠른 안내, 상품 이름 음성 검색·위치·게시 설명, 직접 입력 대체 수단. `floor-staff`의 outgoing 고정 문구 제한 유지 |
| 매대 두 기기 | 직원이 상담 시작·코드 발급 → 고객 태블릿에서 `/consultation/customer`를 직접 열고 코드 입력 → 확인한 안내만 공유 → 고객 답변 수신·사용 → 명시 종료 |
| 고객 화면 | Auth/Store/약관 Provider 밖. 직원 쿠키·Bearer·조직 header 없이 별도 capability로 현재 공유 안내 조회·답변. 내부 초안·권한·조직 정보는 반환하지 않음 |
| 진열 태블릿 | `/tablet/setup` → 기존 6자리 진열 코드 연결 → `/tablet/:slug`. 기존 kiosk-core·위치 heartbeat·화면 version 재사용. 관리 화면의 새 실행 URL은 Store origin 사용 |

상담 언어에 한국어를 추가했고 한국어 안내는 외부 번역/과금 없이 처리한다. 매대 직원 `counter-staff`는 기존 직원 응대 기능 아래 문자·음성 번역을 사용하며 약사 자격을 만들지 않는다. 말하기 버튼은 발화 차례만 구분한다. 다른 언어로 받은 고객 답변은 그 답변의 언어로 직원용 번역을 준비한다. 자동 의료 답변은 추가하지 않았다.

직원 화면의 언어·연결 설정은 접어 두고 상담 시작/종료·말하기·입력을 우선 배치했다. 공유 모드의 입력은 보조로 둔다. 별도 기기 주소를 새 탭에서 연다고 다른 태블릿에 자동으로 창이 생기는 것은 아니라는 점을 연결 설명에 표시했다. 구조는 현장 전용 화면/동작 단위 컴포넌트와 기존 음성 hook으로 나누었으며, 공통 Core에 Store 분기를 추가하지 않았다.

## 현재 전달 상태와 보안

- `store_consultation_stations`: 매장/자리당 1행. 담당자·상담 세대·방향별 마지막 검증 번역·공유 안내·미확인 답변·기기 연결 상태만 보관한다. 상담 transcript 목록이나 사용자 기준 AI 이력이 아니다.
- 연결 코드는 무작위 10자리 hex, 10분·1회 사용이며 서버에는 해시만 저장한다. 새 코드·새 상담·종료는 이전 미사용 코드를 폐기한다. 기기 토큰은 별도 256bit이며 서버에는 해시, 고객 브라우저에는 연결 credential만 저장한다. 문장은 localStorage에 저장하지 않는다.
- 새 기기 연결은 이전 기기 토큰을 폐기한다. 진열 기기·로그인 credential은 상담 credential로 사용할 수 없다. 모든 고객 조회/답변에서 원래 직원의 현재 매장 관계·기능·약사 확인을 재검사한다.
- 상담 세대와 DB 원자 비교로 지연 번역·이전 고객 답변·중복 코드 claim을 거절한다. 미확인 답변은 덮어쓰지 않고 답변 ID로 확인 처리한다. 고객 화면 공유는 서버가 검증한 outgoing 번역 ID 또는 현재 매장의 활성 상품/고정 안내만 허용한다.
- 종료는 공유·번역·답변·pending code를 비우고 세대를 바꾼다. 등록된 고객 기기는 다음 상담에서도 사용할 수 있다. 연결 폐기는 별도 버튼이다.
- 고객 화면은 조회 실패·권한 거절·백그라운드 전환 시 이전 내용을 가린다. 일시적인 조회 실패에서는 미전송 답변을 화면에 드러내지 않고 메모리에 유지하며, 같은 상담 세대를 다시 확인한 경우만 복원한다. 다른 상담 세대·권한 해제·페이지 종료에는 비운다. 담당 화면의 서버 응답이 90초 이상 없으면 대기로 표시한다. 이는 상담 시간 제한이나 영구 보존/삭제 정책이 아니다. 명시 종료 없이 닫은 DB의 현재 상태는 다음 새 상담에서 덮어쓰며 시간 기반 자동 삭제 작업은 없다. **매장별 영구 AI 이력·직원 해제 계약은 후속 과제**다.

## 실행한 검증

| 검증 | 결과 |
|---|---|
| frozen 설치 | `pnpm install --frozen-lockfile --verify-store-integrity=true --offline` PASS. lockfile 변경 0 |
| Store 전체 | `pnpm --filter store-web test`: 67 files / 799 tests PASS |
| 최종 상담 조작·분리 후 집중 회귀 | 4 files / 34 tests PASS — 음성 final-only·언어/계정/매장/pagehide 취소, 양방향 초안, 실패/중복/이전 화면 응답, 고객 화면 헤더·저장 범위 |
| API 약국 모듈 | 22 suites / 142 tests PASS, 기존 환경 의존 14 suites / 187 tests SKIP. 새로운 SQL 검증은 아래 별도 fixture에서 실행 |
| route 역방향 소비처 | 3 specs / 46 tests PASS, Store 실제 route ranking·공개/직원 Provider 분리 포함 |
| 관리자 | 신규 panel 2 tests PASS, 실패한 선택 보존·중복 저장 방지·검색/정상 0건 구분 |
| 타입·build | API build, Store type/build, 관리자 `tsc --noEmit`·`vite build` PASS. 기존 chunk 크기/Browserslist 안내만 발생 |
| 집중 lint | 변경 TS/TSX 0 errors. 기존 `neture-pharmacy.routes.ts`의 `_next` 미사용 warning 1건. 신규 소스 warning 0 |
| migration 정적 계약 | `node scripts/db/check-migration-contract.mjs`: 21 PASS / 0 FAIL |
| 실제 PostgreSQL 15 | `node scripts/dev/run-store-consultation-fixture.mjs`: 기존 canonical baseline+38개 전체 prefix 검증, empty down/up, 신규 SQL 상태/격리 13개 검사 PASS, 데이터 있는 down 거절 |
| schema 결과 | `CreateStoreConsultationStations1792815861315`: fingerprint `d9efd020a690bca6564c919b57bb52c54e01043da657e2b2cd179a76294209fb`, 6869 lines. 기존 fingerprint 불변 |
| 브라우저 연결 | 실제 화면 + 합성 직원 인증 + 실제 SQL/router, 서로 다른 브라우저 context. 연결→안내 선택 전달→답변→상품 위치→종료→새 상담→기기 해제·매장 전환·한 화면 안내·관리자 preset 반영 9묶음 PASS |
| 진열 브라우저 | 실제 Store setup/kiosk 컴포넌트 + 합성 공개 API. 연결→독립 진열·데스크톱/모바일·직원 header/commerce UI 없음 PASS |
| 실제 App 라우팅 | 공개 고객/진열 setup 직접 URL에서 Auth/Store/약관 API 호출 0, 관리 chrome·page error 0 |
| 화면 크기 | desktop 1440×1000, tablet 1280×800, mobile 390×844. 가로 overflow·page error 0. 합성 화면 screenshot 직접 점검 |
| 문서·범위 | docs 민감정보 검사·diff whitespace 검사 PASS. 설계 §15-8의 같은 화면/저장 안 함 계약을 이번 사용자 확정과 정렬 |

SQL fixture는 고정 loopback의 전용 PostgreSQL 15 컨테이너와 신규 DB만 사용한다. 기존 DB가 있으면 거절하고 일회성 marker가 일치하는 자신이 만든 DB만 종료 시 완전 삭제한다. 운영 환경 변수·계정·DB·AI provider를 사용하지 않는다. 브라우저 harness·로그·합성 screenshot은 저장소 밖의 세션 디렉터리에 두었다.

## 미실행과 통합 인계

실계정 로그인, 실제 태블릿/마이크/매장 소음·음성 정확도, 외부 번역 비용·실제 고객 상담, 물리 QR·사이니지 재생은 실행하지 않았다. 합성 브라우저 검사를 실사용 완료로 해석하지 않는다. 음성 미지원/거절 시 입력 대체는 검증했으나 현장 기기에서의 지원 여부는 별도 확인해야 한다.

`DEPLOYMENT = MANUAL/GATED`: 신규 migration이 있으므로 **운영 DB 적용에 대한 명시 승인과 정상 migration job**이 선행되어야 한다. 이후 통합 담당자가 API·admin·store를 병합·배포하고 운영 smoke를 수행한다. 이번 요청은 named branch push까지이며 PR 생성·자동 병합·main 변경·배포 dispatch·운영 DB 적용을 실행하지 않는다.

push 준비 중 재확인한 main `2234598f36`은 기준 이후 협력사업 홈 검증 문서 2개만 변경했으며 이번 코드/문서와 경로 중첩은 없다. 기존 다른 작업 트리는 수정·정리하지 않았다.

문서 정합: 설계 §15-8의 화면·모드·현재 전달 상태 계약 정렬 1건 / TODO·CHECK 생성 / 과거 CHECK 재작성·canonical index 변경·SUPERSEDED 추가 없음.
