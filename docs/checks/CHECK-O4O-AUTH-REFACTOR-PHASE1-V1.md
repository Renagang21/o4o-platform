# CHECK-O4O-AUTH-REFACTOR-PHASE1-V1

> **상태**: ACTIVE · **작성일**: 2026-10-08
> **작업**: [WO-O4O-AUTH-REFACTOR-V1](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md) 단계 1

## 변경

사용자용 전체/다른 기기 로그아웃을 공통 인증 클라이언트·Context·계정 보안 화면·전체관리자 메뉴에서 제거했다. 공개 `/auth/logout-all`과 계정 상태/약관 예외도 제거했다. 비밀번호 reset의 서버 내부 전역 폐기는 `revokeAllSessions`로 구분하여 유지했다. 일반 logout API·서비스 epoch 동작은 이번 단계에서 바꾸지 않았다.

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
| API reset/refresh/handoff | 내부 폐기 메서드 이름 변경 | reset 전역 폐기 보존, 공개 endpoint 제거 | 189 tests + 신규 계약 3 tests PASS |

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
- Jest: auth/API 관련 189 + 공개 logout 제거 계약 3 PASS. 기존 DB 통합 suite 1개/2 tests는 skip되었으며 PASS에 포함하지 않는다.
- 합계 **1,170 tests PASS**, 기존 통합 2 tests skipped.
- Neture/KPA production build PASS. 기존 bundle-size/Browserslist 경고 잔존.
- 전체관리자 Vitest 첫 실행은 잘못된 작업 디렉터리로 setup 파일을 찾지 못해 0 tests 실행 실패. CI와 같은 앱 디렉터리에서 재실행하여 338 tests PASS.

## 후속·제약

일반 logout이 같은 서비스의 모든 기기에 영향을 주는 기존 epoch 구조, 비밀번호 변경/access token 즉시 폐기, 카카오 로그인, 명시적 소셜 연결, 기존 두 계정 병합 검토, 실제 테스트 데이터 연결·삭제는 후속 단계다. 기존 데이터 DB와 카카오 설정 binding이 없어 외부 실접속과 데이터 정리는 미실행이다. 이번 단계는 DB write·schema migration·운영 배포를 수행하지 않았다.

필수 CI·PR review·main 위치는 push 뒤 현재 HEAD 기준으로 확인한다. integration-ready와 main 통합은 별개이며 사용자 승인 없이 merge하지 않는다.

## 문서 정합

인증 정본·Identity V3·Demo 정본·canonical index를 승인된 정책에 맞췄다. 과거 카카오 제외/전체 로그아웃 서술은 현행 정본의 갱신 안내로 대체 범위를 명시했다. 단계별 완료 여부는 WO TODO를 따른다.
