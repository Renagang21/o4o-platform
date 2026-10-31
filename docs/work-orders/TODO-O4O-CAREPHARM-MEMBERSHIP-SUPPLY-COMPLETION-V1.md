# CarePharm 가입·공급 승인·회원 약국 이용 흐름 완성

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: DEVELOPMENT_COMPLETE — 로컬 검증 완료, commit·push 인계 대상 (원격 SHA는 최종 인계 메시지)
> **작성일**: 2026-10-22
> **근거**: 사용자 승인 — 통합 TODO → 문서·코드 조사로 보완 → 개발·검증·commit·push. PR·main 병합·배포 제외.
> **기준 main**: `3917a9522d50936e405db28d59a4ae9febff628f`
> **작업 공간**: `wo/carepharm-membership-supply-completion` / `/workspace/o4o-wt/carepharm-membership-supply-completion`

## 최초 통합 TODO

- [x] 현재 정본·가입/약관·공급 제안·결제·공통 화면 소비처를 조사하고 하나의 연결 설계로 보완한다.
- [x] 공통 계정·로그인을 유지하고 CarePharm 사업 조건·게시 약관 버전·신청 동의 증빙을 연결한다.
- [x] 특정 약국 대상 공급 제안은 요청과 승인 시 해당 사업의 활성 가입을 확인한다.
- [x] 결제 준비·확정에서 현재 actor·선택 약국·사업 가입·공급 제안 자격을 재확인하고 기존 결제 완료 이력은 보존한다.
- [x] 가입·공급 심사·매장 결제 화면에 실패 이유와 다음 행동을 안내한다.
- [x] 격리 PostgreSQL의 실제 서버 경로와 PC·모바일 화면, 공통 소비처 회귀를 검증한다.
- [x] 운영 개통 준비·미검증·문서 정합·Git 상태와 commit·push 인계 범위를 기록한다.

## 경계

공통 계정과 약국 조직·사업별 가입 원장은 유지한다. 대상 미지정 기본 공급의 기준 가격·기존 노출 정책을 변경하지 않는다. 이미 만든 매장 사본·이미 결제된 주문의 소유권/배송 이력을 보존한다. 실제 약관 문안과 운영 조건은 운영자가 확정하며, 이 작업에서 게시하지 않는다. 무료혈당기·CGM·실 PG 연결·환자 건강 관리·교육 서비스 신설은 포함하지 않는다.

운영 DB write·DDL·migration 적용·회원 승인·역할 부여·실제 문의/주문/자료 게시·외부 메일·배포는 실행하지 않는다. 로컬 테스트는 이번 작업 전용 loopback PostgreSQL과 합성 데이터만 사용하고 생성 자원·데이터를 종료 후 정리한다. 새 schema나 공통 Core 변경 필요성은 조사에서 먼저 판단하고 임의로 범위를 넓히지 않는다.

## 조사 후 연결 설계

- 정본: 역할·업무공간, 공통 계정/서비스 가입, 약국 협력사업 독립 원칙, 소비자 commerce 경계와 B2B Axis D, 약국 commerce R6/§8, shared-module 변경 절차를 대조했다. 공통 계정/세션 유지와 각 사업의 독립 가입·승인을 구분한다.
- 약관은 기존 `service_policy_documents`, `user_policy_acceptances`, `action_logs`를 재사용한다. `carepharm`은 정책 저장 공간의 식별자이며 신규 인증 serviceKey·계정·membership을 만들지 않는다. 사업 한정 관리자 또는 해당 사업에 배정된 기존 Neture 관리자가 관리하고, 운영자 읽기/관리자 쓰기와 현재 역할·담당·계정 자격을 서버에서 확인한다.
- CarePharm 신청은 게시된 `carepharm-service-terms`/`carepharm-service-privacy`, 같은 버전(기존 신청 정책의 2 이상 규칙)과 시행일을 갖춘 두 문서가 필요하다. 준비 전 신규/재신청은 차단하고 누락 동의를 기존 checkbox나 pharmacy 동의로 추정하지 않는다. 약관 개정 중의 구버전 신청은 거부한다. 기존 active 회원을 자동 탈퇴/정지시키거나 새 재동의 의무를 임의로 만들지 않는다.
- 추가 조사: 사업 신청/탈퇴도 직원용 Store middleware를 공유했다. 기존 가입 관리 owner 계약에 맞춰 서비스 transaction에서 실제 owner/admin/manager 관계와 약국 원장을 확인하고 탈퇴에도 actor를 필수 전달한다. 직원의 기존 발주·결제 범위는 유지한다.
- 특정 약국 제안은 기존 사업·약국·모델 가입 행을 실제 SQL로 확인하고 요청/승인 transaction에서 잠근다. 요청 뒤 정지/탈퇴되면 승인이 거절되며 대상 미지정 공급의 기존 가격/노출은 유지한다.
- 결제 서비스에 검증된 선택 조직을 필수로 전달한다. 주문의 구매 actor와 약국 일치를 먼저 확인하고, 현재 조직 관계·약국 자격 및 주문 항목의 저장된 공급 경로를 기존 `getSupplyOption`으로 재판정한다. transaction에서 공급/가입 행을 잠그고 결제 완료 전에 철회가 끼어드는 것을 방지한다. 스냅샷 금액은 재가격 산정하지 않고 재고/수량을 다시 예약하지 않는다. 이미 결제된 주문 재확인은 공급 종료로 기존 결과를 바꾸지 않는다.
- 영향 소비처: API 공급 제안/결제(Pharmacy·CarePharm·드럭스토어형 약국·조합 공통), shared-space-ui 참여 화면, web-neture CarePharm 공개 약관·운영 경로, web-store 결제 공통 조각, 공통 법정정보 관리 UI. 기존 KPA/공급자/커뮤니티/펀딩/강의 정책 guard와 신청을 회귀 검증한다. 공통 모듈의 import 및 source assertion 소비처도 확인한다.
- 이번 변경은 schema/migration·dependency·workflow·공통 Core public API 변경 없이 기존 서버/공통 UI 모듈 안에서 수행한다. 실제 게시 약관·법정정보·사업 조건은 운영자가 확정하고 배포 후 별도 개통 단계에서 등록한다.

## 검증·인계

실행한 명령·결과와 미실행을 구분해 기록한다. 운영 개통·원격 CI·병합·배포 완료로 표현하지 않는다.

### 구현 결과

- 가입: CarePharm 전용 공개 문서·명시적 동의·서버 원장 증빙·신청 감사 연결을 추가했다. 버전 변경 시 메모를 보존하고 최신 약관을 다시 확인한다. 운영 심사 화면에서 신청 당시 문서 ID·버전·hash를 확인한다.
- 운영: `/operator/legal/carepharm`에서 담당 관리자가 기존 법정정보·정책 UI로 관리한다. 새 초안 기본 버전은 2, 가입용 문서 표식은 서버가 지정한다. 공개 `/terms`, `/privacy`와 footer도 해당 사업을 읽는다. 게시·승낙된 역사 문서의 무결성을 보존한다.
- 공급: 특정 약국의 동일 사업 active 가입을 요청·승인 transaction에서 확인한다. 미가입·pending·rejected·suspended·terminated 및 요청 후 탈퇴를 거부한다.
- 결제: 현재 actor·선택 조직·약국/직원 권한과 저장된 공급 출처를 준비·확정에서 재검증한다. 변경 행 잠금 경합, source 종료, 계정/사업/상품/공급자/가입 정지, 다른 약국·actor를 검증했다. 스냅샷 금액·기존 재고 예약·paid 멱등/배송은 유지한다. 거절 화면에는 현재 공급제품·가입 상태 확인 링크와 미결제 주문 취소 안내가 있다.

### 실제 실행 결과 (2026-10-22)

| 검사 | 실제 결과 |
|---|---|
| PostgreSQL 공급·주문 | `supplier-store-round-trip.integration.spec.ts`, `neture-pharmacy-commerce.integration.spec.ts`: 2 suite / 55 PASS. canonical bootstrap와 모든 incremental prefix fingerprint 확인 후 실제 SQL·transaction·법정정보 controller·공급→주문→결제→배송/정산 round trip 실행 |
| PostgreSQL 가입·심사·매장 권한 | `service-enrollment-policy.integration.test.ts`, `business-store-access.integration.spec.ts`, `store-cooperation-workflows.integration.spec.ts`, `supply-proposal-review.integration.spec.ts`: 4 suite / 33 PASS |
| PostgreSQL handoff | `src/__tests__/carepharm-handoff.integration.spec.ts`: 21 PASS. issuer→소비처, Store·CarePharm·Neture·Pharmacy 경로와 부적합 host/path 거부 |
| PostgreSQL 사업 HTTP 회귀 | `care-mega-business-ledger.integration.spec.ts`, `collaboration-application.integration.spec.ts`: 2 suite / 5 PASS. CarePharm 전용 정책 증빙 fixture와 새 탈퇴 actor 계약 반영 |
| API 정책·법정정보·소비처 계약 | focused Jest 6 suite / 91 PASS. 기존 서비스 권한, 게시 시행일, 강의 소비처와 admin guard inventory 포함 |
| Neture | 전체 142 file / 1,253 PASS, 이후 법정정보 route/menu 추가 검사 6 PASS. 최종 `tsc && vite build` 및 footer 문구 수정 후 Vite build PASS |
| Store | 전체 63 file / 764 PASS, `tsc --noEmit && vite build` PASS |
| shared-space-ui | 전체 17 file / 169 PASS |
| operator-core-ui | 약국 사업 관리 7 file / 55 PASS, 약관 초안 기본 버전 회귀 2 PASS |
| 다른 소비처 | 약국 협동조합 9 file / 68 PASS + build PASS, KPA 사업 운영 위임 5 PASS + build PASS, admin-dashboard type-check PASS |
| 정적 검사 | API type-check PASS, 변경 TS/TSX ESLint error 0(기존 route `_next` unused warning 1), `git diff --check` PASS, 문서 민감정보 검사 PASS |
| 브라우저 | Chromium 실제 production bundle + 전 요청 합성 API, 1440×1000 / 390×1000. 구버전 거절→메모 보존→새 동의→pending, 미게시 차단/재시도, CarePharm 공개 약관, 관리자 초안 생성, Store 결제 거절 후 회복 링크를 조작·응답 대조. page error 0 / page 가로 넘침 0 / 미정의 fixture API 0 |

초기 handoff 실행 경로 오기 1건은 정확한 `src/__tests__/` 경로로 재실행했다. 추가 회귀에서 발견한 탈퇴 호출 인자 누락과 약관 UI prop 타입 위치 오류는 수정 후 해당 PostgreSQL·build 검사를 재실행해 통과했다. 빌드의 기존 큰 chunk/Browserslist 안내는 남아 있다. 제품 실패를 숨기거나 미실행 검사를 PASS로 바꾸지 않았다.

로그·화면 캡처는 이번 세션의 `/tmp/carepharm-completion*`에 두었다(저장소에 합성 API나 스크린샷을 추가하지 않음). PostgreSQL은 이 작업만의 loopback 컨테이너와 일회용 DB를 사용했다. fixture 전용 schema 잔존 0, 생성 DB 잔존 0을 확인하고 컨테이너·임시 접속정보 파일을 제거했다.

### 미실행·운영 개통 인계

운영 실계정 로그인→실제 가입/승인/발주, 실 PG, 운영 DB 조회·write, 운영 문서 게시·사업 등록·권한 부여는 실행하지 않았다. 브라우저 인증·API는 합성이며, 서버 권한 검증은 별도로 실제 PostgreSQL 원장과 controller를 실행했다. 화면 검증을 운영 종단 검증으로 대신하지 않는다.

배포 후 개통 담당은 사업의 운영 조건·법정정보·CarePharm 약관 2종 문안을 확정하고 기존 기능에서 등록·게시한다. 문서 버전·시행일 일치, 담당자 배정과 실계정의 선택 약국별 신청→승인→자료/공급 접근을 별도 승인된 절차로 확인한다. 약관 게시 전에는 신규·재신청이 차단되며 기존 active 가입은 유지된다. 무료혈당기·CGM·Study 교육 신설·환자 관리·실 PG는 후속 별도 범위다.

### Git·문서 정합

- 작업 branch: `wo/carepharm-membership-supply-completion`. 개발 시작점은 위 기준 main이다. 확인 시 `origin/main`은 `7dc02646dab2808258133139b3ca0714ec3cc14b`로 5 commit 이동했으며 변경 파일 교집합은 0이다. 자동 merge/rebase하지 않았다. 통합 담당이 최신 main 기준 CI·리뷰를 수행한다.
- PR 생성·원격 CI·main 병합·배포는 이번 공간에서 실행하지 않는다. branch와 worktree는 통합/후속 수정용으로 `KEEP`한다. commit·push 결과와 정확한 원격 HEAD·미커밋 상태는 최종 인계 메시지에 기록한다.
- 문서 정합: 조사로 보완한 신청 경영자 권한·CarePharm 증빙·대상 약국 가입·결제 재판정 계약을 commerce 설계 §17-3에 연결했다. 기존 WO 기록 유지, SUPERSEDED 표기 0건, 링크 추가 2건, 별도 WO 제안 0건. 남은 운영 개통은 위 항목으로 구분한다.

## 2026-10-23 통합·배포 후속 (사용자 추가 지시)

사용자가 이 공간에서 main 병합과 배포를 지시했다. 위 개발 종료 당시의 범위와 실행 결과는 당시 기록으로 유지하며, 이후 상태는 이 절과 최종 통합 인계로 구분한다.

최신 main `5a6ab8f23582d8708186459c8c887d68da00ceff`에는 사업별 법정정보·약관이 `business:<semi_franchises.id>`로 분리된 §15-9 구현이 먼저 들어왔다. 통합에서는 이 정본을 우선한다. 앞선 조사·구현 기록의 `carepharm` 정책 namespace, 최소 버전 2, `/operator/legal/carepharm` 전용 편집 경로는 **SUPERSEDED**이며, 담당 사업의 기존 ‘현장 요구 · 사업 약관’ 도구와 `/neture/operator/semi-franchises/:key/legal`을 사용한다. 첫 버전 1을 허용하고 다른 사업·계정 문서의 대체 사용은 거부한다. 별도 legacy namespace·UI·guard는 제거했다.

현재 main의 사업 범위·문서 정책·역할 격리를 유지하면서 신청/탈퇴의 현재 경영자 관계, 대상 약국의 해당 사업 가입, 결제 준비/확정 자격 재검증, 정책 개정 시 신청 메모 보존을 결합했다. 승낙된 역사 문서 불변성은 기존 controller에서 business UUID 범위에 적용한다. 초기 개발 branch의 검증 결과를 이 통합 HEAD의 결과로 간주하지 않고 새 canonical schema·사업 정책 fixture로 다시 검증한다. 병합은 정상 PR gate를 따르며 bypass하지 않는다.

통합 후 실제 로컬 검증: canonical PostgreSQL 공급·주문 55 PASS, 사업별 HTTP/직원 권한 회귀 5 PASS, 기존 공급조건 PostgreSQL suite 17 PASS. API 정책·법정정보·사업 운영 단위 검사 75 PASS, CarePharm 화면·layout 41 PASS, 공통 사업 운영 도구 61 PASS, API type-check·Neture production build·변경 source lint(error 0) 통과. production bundle의 PC 1440 / 모바일 390 합성 API 화면에서 사업 UUID 정책만 조회, 오래된 동의 거절·메모 보존·새 동의 후 신청·미게시 차단·재시도·공개 약관 표시를 확인했다. 테스트 데이터는 전용 loopback DB에만 생성하고 schema/DB 잔존을 확인해 컨테이너와 임시 접속정보를 제거한다.

통합 중 중복 import는 수정 후 type-check를 다시 통과했다. Sonar 지적의 정렬 비교 함수 2건은 명시적 비교로 수정하고 PostgreSQL 55건을 재실행했다. Codex가 발견한 기존 공급조건 테스트의 구 schema/역방향 기대값은 `neture_pharmacy_memberships.status`, membership ID 및 대상 약국 active 가입 검증으로 함께 정리하고 해당 suite 17건을 실제 실행했다. 업무 규칙을 테스트의 옛 기대에 맞춰 완화하지 않았다.

통합 PR: [#779](https://github.com/Renagang21/o4o-platform/pull/779). 최종 HEAD·CI·Sonar·CodeQL·Codex 리뷰·스레드 처리·병합 SHA·Delivery/Promote 및 serving 확인은 이 PR의 최종 인계 기록과 GitHub `production` status를 따른다. 기존 운영 개통 항목은 여전히 별도이며 실제 회원 승인·사업 등록·정책 게시·실 PG·운영 데이터 write를 수행하지 않는다.

추가 Codex P2에 따라 매장 경영자 이용계약도 결제 transaction에서 재판정한다. 기존 `PolicyAcceptanceService` 규칙을 transaction 전용 인스턴스로 호출해 middleware 게시 캐시를 사용하지 않고, 계약 게시 advisory lock 및 현재 문서·승낙 행의 공유 잠금으로 준비/확정 중의 개정·승낙 변경을 직렬화한다. 직원 경로의 기존 권한 규칙은 유지한다. 따뜻한 middleware 캐시를 둔 상태의 준비/확정 거절→최신 계약 승낙 후 성공, 게시 transaction과의 실제 lock 경합→거절을 추가했다. canonical 공급·결제 57건과 공급조건 17건, 총 PostgreSQL 74건을 다시 실행해 통과했다.
