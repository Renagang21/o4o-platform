# CHECK-O4O-AUTH-REFACTOR-PHASE1-V1

> **상태**: ACTIVE · **작성일**: 2026-10-08
> **작업**: [WO-O4O-AUTH-REFACTOR-V1](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md) 단계 1

## 변경

사용자용 전체/다른 기기 로그아웃을 공통 인증 클라이언트·Context·계정 보안 화면·전체관리자 메뉴에서 제거했다. 공개 `/auth/logout-all`과 계정 상태/약관 예외도 제거했다. 자동 review에서 확인된 API 안내·Postman의 폐기 요청도 제거하고, 과거 migration guide에는 현재 사용 금지 안내를 추가했다. 비밀번호 reset의 서버 내부 전역 폐기는 `revokeAllSessions`로 구분하여 유지했다. 일반 logout API·서비스 epoch 동작은 이번 단계에서 바꾸지 않았다.

보안 화면의 Google 고정 표기를 공통 O4O 계정 표시로 바꿨다. Neture/KPA 설정에는 일반 logout을 연결했고, 처리 중 중복 클릭 방지와 실패 안내를 유지했다. 전체관리자 메뉴의 일반 logout은 완료를 기다린 뒤 성공 메시지를 표시한다.

정본·색인에는 전체관리자 용어, 카카오 추가 정책, 테스트 데이터 재사용·정리 승인과 새 세션 정책을 반영했다. 정책과 구현 완료를 구분하며 후속 구현 TODO를 WO에 기록했다. 이전 WO/CHECK 기록과 Frozen 본문은 변경하지 않았다.

## Shared Module Change Verification

수정 모듈: `@o4o/auth-client`, `@o4o/auth-context`, `@o4o/auth-react`, `@o4o/account-ui` 및 API auth façade/controller/router.

### Consumer impact matrix

| 소비처 | 사용 여부·영향 | route/role/capability 영향 | 검증·결과 |
|---|---|---|---|
| Neture·community/funding host profile | 공통 auth, 별도 Context, 설정 UI | 공개 전체 logout 제거, 서비스 진입 권한 불변 | 360 tests·typecheck·Neture build·desktop/mobile fixture smoke PASS |
| KPA-Society | 공통 auth, 별도 Context, 설정 UI | 전체 logout 제거, 설정의 일반 logout 연결 | 69 tests·typecheck·build·desktop/mobile fixture smoke PASS |
| KPA-Branch | 공통 auth | 제거된 계약 직접 소비 없음 | 34 tests·typecheck PASS |
| Pharmacy-Hub | 공통 auth·account UI | 기존 일반 logout 유지 | typecheck PASS |
| Store | 공통 auth | 제거된 계약 직접 소비 없음 | typecheck PASS |
| Lecture | 공통 auth | 제거된 계약 직접 소비 없음 | typecheck PASS |
| 전체관리자 | auth-context·auth-client·header | 메뉴의 전체 logout 제거, Google/role guard 불변 | 338 tests·typecheck PASS |
| 사용자 서비스 operator/store/forum/mypage | 상위 auth Context의 간접 소비 | 역할·보호 route·capability 불변 | 서비스 타입 검사·관련 계약 테스트 PASS |
| retired K-Cosmetics | 현재 앱 없음 | 신규 복구 없음 | 최신 checkout 소비처 검색 |
| Hospital Pharmacy | 인증 모듈 미사용 | 변경 없음 | 최신 checkout 소비처 검색 |
| API reset/refresh/handoff | 내부 폐기 메서드 이름 변경 | reset 전역 폐기 보존, 공개 endpoint 제거 | 189 tests + 신규 계약 4 tests PASS |

symbol, endpoint, 화면 문구, 수정 파일 경로 및 raw-source 소비처를 검색했다. `/auth/logout-all`·`logoutAll`은 활성 런타임/UI 소비처가 없고 제거 회귀를 확인하는 negative assertion만 남았다. WebSocket의 미사용 전 기기 logout 요청 메서드도 제거했고 서버 수신 이벤트·보안 처리 계약은 확대하지 않았다.

### Route / role / capability check

설정 route와 일반 logout은 유지했다. 전체 logout 공개 endpoint는 제거했다. Demo 인가 우회, 새 역할, 서비스 가입 자동 생성, menu capability 변경은 없다. 공개 Demo 버튼은 기존 구현이 있는 6개 사용자 웹 앱을 확인했으며, 실제 데이터 체험 완료는 후속 DB 연결 단계에서 검증한다.

### Smoke result

Chromium에서 Neture와 KPA `/mypage/settings`를 1440×900 및 390×844로 확인했다. 공통 계정 표기, 일반 logout, 전 기기 action 부재, POST `/auth/logout`, 로컬 access token 삭제, page error 부재를 확인했다. **API fixture 기반**이며 기존 DB 로그인·OAuth·실제 소유 데이터 체험을 증명하지 않는다.

## 검증

- 공통 패키지 빌드 PASS.
- 루트 `pnpm run type-check` PASS: 전체 앱·서비스·App Store packages.
- `node scripts/lint-ratchet.mjs` PASS: 기존 오류 46건 유지, warning 998건. lint 오류 0으로 보고하지 않는다.
- `node scripts/check-doc-sensitive.mjs` PASS.
- Vitest: auth-react 149, auth-client 15, auth-context 13, Neture 360, KPA 69, KPA-Branch 34, 전체관리자 338 PASS.
- Jest: auth/API 관련 189 + 공개 logout 제거 계약 4 PASS. 기존 DB 통합 suite 1개/2 tests는 skip되었으며 PASS에 포함하지 않는다.
- 합계 **1,171 tests PASS**, 기존 통합 2 tests skipped.
- Neture/KPA production build PASS. 기존 bundle-size/Browserslist 경고 잔존.
- 전체관리자 Vitest 첫 실행은 잘못된 작업 디렉터리로 setup 파일을 찾지 못해 0 tests 실행 실패. CI와 같은 앱 디렉터리에서 재실행하여 338 tests PASS.

## 후속·제약

일반 logout이 같은 서비스의 모든 기기에 영향을 주는 기존 epoch 구조, 비밀번호 변경/access token 즉시 폐기, 카카오 로그인, 명시적 소셜 연결, 기존 두 계정 병합 검토, 실제 테스트 데이터 연결·삭제는 후속 단계다. 기존 데이터 DB와 카카오 설정 binding이 없어 외부 실접속과 데이터 정리는 미실행이다. 이번 단계는 DB write·schema migration·운영 배포를 수행하지 않았다.

필수 CI·PR review·main 위치는 push 뒤 현재 HEAD 기준으로 확인한다. integration-ready와 main 통합은 별개이며 사용자 승인 없이 merge하지 않는다.

## 문서 정합

인증 정본·Identity V3·Demo 정본·canonical index를 승인된 정책에 맞췄다. 과거 카카오 제외/전체 로그아웃 서술은 현행 정본의 갱신 안내로 대체 범위를 명시했다. 단계별 완료 여부는 WO TODO를 따른다.

## 운영 배포 후 공개 Demo 실접속 검증 — 2026-10-08

위 로컬/fixture 검증 이후, 사용자 승인으로 [PR #361](https://github.com/Renagang21/o4o-platform/pull/361)을 main에 통합하고 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/37769623016)로 배포했다. 대상은 `0795464cc5597eb995d591b99ef7587a20da7d14`이며, main CI 및 최종 serving SHA 보고가 성공하고 commit status `production`은 `DEPLOYED`다.

사용자 지시에 따라 로그인 화면의 공개 테스트 버튼을 직접 클릭했다. 인증 응답이나 업무 조회를 fixture로 대체하지 않았다. 시스템 Chromium의 격리된 프로필에서 환경 프록시와 TLS 검증을 유지했고, credentials는 정본의 두 Demo만 사용했다. token·개인정보·응답 원문을 검증 기록에 남기지 않았다.

### 버튼·일반 로그인·일반 로그아웃

| 운영 로그인 화면 | 약국장/매장 경영자 버튼 | 공급자 버튼 | desktop/mobile 로그인 | 일반 로그아웃 |
|---|---|---|---|---|
| `neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | 설정 화면에서 PASS |
| `supplier.neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | 설정 화면에서 PASS |
| `pharmacy.neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | 설정 화면에서 PASS |
| `store.neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | PASS |
| `study.neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | PASS |
| `kpa.neture.co.kr` | 표시·클릭 정상 | 표시·클릭 정상 | 두 역할 PASS | 서비스 홈에서 PASS |

범위는 5개 앱의 6개 로그인 화면 × 2개 역할 × 2개 viewport = **24개 조합**이다. desktop은 1440×900, mobile은 390×844다. 모든 버튼이 viewport 안에 있었고, 로그인 HTTP 200과 해당 브라우저의 `/auth/me` HTTP 200·Demo 판정을 확인했다. 일반 logout은 HTTP 200과 access/refresh token 삭제를 확인했다. 첫 실행에서 로그아웃을 확인하지 못한 6개 조합은 설정/서비스 홈으로 이동한 추가 실행에서 확인했다. 실제 접속한 화면에는 누락 버튼이 없으므로 앱 코드는 변경하지 않았다.

Neture·약국 계정 보안 화면에서 일반 logout과 공통 계정 표시를 확인했고, 전체/다른 기기 logout action은 보이지 않았다. 두 Demo의 인증 응답에는 각각 `kpa:store_owner`, `neture:supplier` 역할만 있었으며 전체관리자 역할은 없었다.

### 기능 체험에서 확인된 미완료 사항

| 대상 | 실제 결과 | 판단·후속 |
|---|---|---|
| 약국장: Neture/공급자 호스트의 Demo 매장 자동 이동 | 로그인은 성공했지만 이동 실패 안내 표시. `/neture/home/entry`는 HTTP 200·매장 0건. Neture·약국 서비스 membership은 active | 유효한 매장 진입 연결이 없음. 승인 원장·매장 ownership·진입 데이터를 조사하고 연결해야 함 |
| 약국장: 약국 업무 화면 | `/api/v1/kpa/store-hub/capabilities`, `/api/v1/kpa/pharmacy/info`가 desktop/mobile 모두 HTTP 403·`STORE_OWNER_REQUIRED` | 로그인된 identity와 업무 접근 요건은 별개. 서버 guard를 우회하지 않고 승인·소유 관계를 확인해야 함 |
| 공급자: 대시보드·상품·자료 | 대시보드 진입 성공. 상품 조회 HTTP 200·0건, 라이브러리 조회 HTTP 200·자료 0건 | 샘플 데이터가 없는 상태이므로 데이터 기능 체험 완료로 판정하지 않음. 재사용할 데이터를 Demo ownership에 연결해야 함 |
| 같은 Neture 서브도메인의 다른 브라우저 | 일반 logout 전후 기존 access token의 `/auth/me`는 HTTP 200. logout 후 다른 브라우저의 refresh는 HTTP 401·`SERVICE_SESSION_REVOKED` | 같은 서비스 epoch가 다른 브라우저의 갱신까지 막는 기존 동작 재현. 2단계의 브라우저별 세션 종료 및 access token 판정 TODO 유지 |
| 다른 서브도메인: 약국·Store | 두 Demo 모두 Neture logout 전후 인증 조회 HTTP 200. 실제 클라이언트와 같은 refresh 옵션으로 HTTP 200·새 access token 발급 확인 | 확인한 방향(Neture → 약국/Store)의 세션 분리 PASS. 모든 서브도메인 조합을 검증했다는 뜻은 아님 |

### 범위와 제약

- 업무 조회를 수행했다. 상품 생성·주문 확정·결제·메일 발송·승인/role/ownership 변경·데이터 삭제는 수행하지 않았다.
- 공개 테스트 로그인·logout·refresh로 생기는 정상 인증 상태 변경 외에 운영 업무 데이터를 수정하지 않았다. 운영 DB 직접 조회·승인 원장 row 조사도 수행하지 않았으므로 매장 접근 실패의 정확한 DB 원인은 아직 미확정이다.
- `pharmacyhub.co.kr`은 현재 환경 허용 도메인에 없어 운영 화면을 검증하지 못했다. 접근 정책을 우회하지 않았다. 나머지 Neture host profile 전체에 대한 실접속도 미실행이다.
- Google SDK 호스트가 환경 네트워크 정책으로 접근 실패했다. 공개 이메일 Demo 흐름은 정상이며, Google·카카오 실제 OAuth 성공을 이 검증으로 주장하지 않는다.
- 비밀번호 변경·소셜 연결·실제 데이터 연결 및 정리는 후속 단계다. 24개 조합의 로그인 성공을 전체 업무 기능 PASS로 확대하지 않는다.

**운영 판정:** 1단계의 로그인·일반 logout 및 공개 전체 logout UI 제거는 확인했다. 두 역할의 완전한 기능 체험은 매장 접근/샘플 데이터 연결과 후속 세션 처리 작업이 남아 있어 미완료다. 단계별 TODO를 유지한다.

## 사용자 삭제 대상 지정 반영 — 2026-10-09 KST

사용자가 Pharmacy-Hub(`pharmacy-hub`, `pharmacyhub.co.kr`)를 삭제 대상으로 지정했다. 이후 인증 리팩토링·공개 Demo·기능 체험 검증 대상에서 제외하며, 도메인 허용 설정을 추가해야 하는 인증 검증 미완료 항목으로 취급하지 않는다. 위 소비처 matrix와 운영 접속 제약은 지정 이전의 실행 기록이다. 약국장 검증을 수행한 별도 약국 서비스 `pharmacy.neture.co.kr`(`kpa-society`)는 삭제 대상에 포함하지 않는다.

코드 조사에서 `services/web-pharmacy-hub`, API의 service catalog와 Pharmacy-Hub routes, Store의 `/pharmacy-hub` 경로, 배포 workflow와 deploy-risk 참조가 남아 있음을 확인했다. canonical index의 약관·개인정보 설명에도 활성 서비스로 기재되어 있다. [WO의 삭제 대상 서비스 정리 TODO](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md#삭제-대상-서비스-정리-pharmacy-hub)에 의존 관계·보존 대상·코드/운영/데이터 제거·문서 정합 검토를 기록했다. 이번 변경은 범위와 TODO 반영이며, 실제 앱·운영 서비스·데이터 삭제는 수행하지 않았다.
