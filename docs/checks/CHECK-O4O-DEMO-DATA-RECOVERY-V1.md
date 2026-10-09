# CHECK-O4O-DEMO-DATA-RECOVERY-V1

> 상태: ACTIVE · 작성일: 2026-10-09 KST
> 근거: 사용자 승인 — main 통합·운영 데이터 복구·배포 후 전체 서비스 smoke 재개
> 상위: [Demo 복구 WO](../work-orders/WO-O4O-DEMO-EXPERIENCE-REPAIR-V1.md)

## 복구 범위

PR #365의 매장 진입 수정은 main에 통합됐다. 데이터 변경은 기존 `deploy-api.yml`의
`o4o-api-migrations`가 소유한다. 새 GCP credential·HTTP repair route·권한 우회는 추가하지 않는다.

Migration `RepairCanonicalDemoExperience1791501198171`은 활성 Demo registry가 정확히 두 유형 각
1개인지 확인한다. 기존 매장 Demo 조직과 공급자 Demo 조직·소유 관계가 유일한지 조회한다.
일반 약국 승인 원장이나 다른 승인 약국의 소유 관계가 발견되면 쓰기 전에 중단한다.
빈 신규 DB에는 백업 테이블만 생성하고 계정 seed는 수행하지 않는다.

매장 Demo의 조직 소유 관계, 합성 약국 승인 원장, `neture:store_owner` 역할과
기존 `pharmacy` 세미프랜차이즈 이용 승인을 복구한다. 활성 세미프랜차이즈가 유일하지 않으면 중단한다.
대상 매장 이름의 테스트/Demo 표식을 확인하고 다른 생존 사용자의 활성 owner/admin/manager가
있으면 중단한다. 삭제된 사용자의 orphan 관계는 접근 자격이 아니며 수정하지 않는다.
샘플 출처는 이전 Demo CHECK에서 명시적 테스트 공급자로 측정한 조직 prefix `95aad740`과
현재 테스트 이름 표식이 동시에 일치하는 유일한 공급자에 한정한다. 그 밖의 비공개 자료는 읽거나 복사하지 않는다.
샘플이 없는 공급자 Demo에는 해당 출처의 상품 offer와 자료에서 최대 5개씩 복사해 연결한다.
상품 master는 재사용하고 상품은 비공개·미승인·비활성 draft로 둔다. 자료도 비공개 personal이다.
다른 조직의 원본, 기존 주문, 비밀번호, 일반 계정, 전체관리자 권한은 변경하지 않는다.
원본 샘플이 없으면 생성 수는 0이며 체험 완료로 판정하지 않는다. 무관한 데이터 삭제는 없다.

변경 전 소속·승인·역할과 변경 후 자료·생성 ID는 `canonical_demo_repair_snapshots`에 보관한다.
출력은 건수뿐이다. migration runner의 트랜잭션에서 실패하면 변경과 백업 모두 rollback된다.
운영 중 새 참조가 생길 수 있어 unattended `down()`은 차단한다. 복구가 필요하면 백업의
before/after와 최신 의존 관계를 확인한 후 승인된 migration 경로로 적용한다.

## 검증

- 격리 PostgreSQL 15에서 canonical bootstrap + incremental 18개 실행, 새 schema fingerprint
  `702c212dfaa42db0e0c5076ab4afb76f382e70992929aeda69d09c314d8112bf`, 6163 lines 확인.
- 같은 격리 DB 재실행에서 pending 0·schema assertion PASS 확인.
- migration contract 21 PASS, 실패 0.
- 실제 SQL 통합 검증: 승인·소유 연결, 비공개 샘플과 원본 보존, 일반 원장 거절,
  합성 원장 재활성화 및 before-image, 연결된 샘플 유지, 후속 insert 실패의 transaction rollback.
  실행: `O4O_DEMO_REPAIR_TEST_PORT=<isolated-port> pnpm --filter @o4o/api-server exec jest
  --runInBand --runTestsByPath src/database/__tests__/canonical-demo-repair.integration.test.ts`.
  대상은 loopback의 전용 `o4o_demo_recovery_test` DB이며 앱 `.env`는 로드하지 않는다.

## 운영 상태

이 기록 작성 시 데이터 복구의 운영 실행·후속 배포·전체 서비스 smoke는 대기 중이다.
CI·merge·배포·운영 결과는 아래에 실제 실행 후 추가한다. 같은 서브도메인의 다른 브라우저
refresh 폐기 문제는 별도 세션 변경이 필요하며 이 migration으로 해결되지 않는다.
Pharmacy-Hub는 사용자 지정 삭제 대상이라 smoke에서 제외한다. 유지하는 약국 서비스는 포함한다.

## 2026-10-09 KST — 실제 통합·운영 복구·배포

- PR #365 main merge `3e7f44c38cee7aa2eacf069d5eedcdf07c7bbaad` 및
  [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/37859526883) 성공으로 API·Neture 진입 수정 배포.
- PR #367 main merge `67a1ac4449206146f451609f53d5273d0dd557d3`, main CI 성공.
  L3 migration 승인 경로의 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/37861774781)가
  database migrations·revision readiness·traffic switch·serving SHA 검증을 모두 통과했다.
  운영 복구와 API 배포는 실제 실행됐다. 앞 절의 대기 상태는 작성 당시 기록이다.
- 운영 Demo 버튼으로 확인한 매장 후보 1개, 약국 capabilities/info 모두 200.
  메인 매장 Demo가 Store로 이동해 `403 STORE_OWNER_REQUIRED` 재현 없이 업무 API를 이용했다.
- 공급자 Demo의 재사용 상품 offer 5개 확인. 샘플 자료 출처가 비어 있어 기존 일반
  공급자 자료 작성 API로 해당 상품의 안내 문서 1개를 비공개 personal로 만들었다(201).
  다른 공급자의 비공개 자료를 복사하지 않았다.

## 2026-10-09 KST — 전체 서비스 smoke 중 발견한 회귀

유지하는 사용자 서비스 8개(Neture·공급자·커뮤니티·펀딩·약국·Store·강의·약사회 분회)의
로그인 화면에서 두 Demo 버튼을 확인했다. 전체관리자는 공개 Demo 대상이 아니다.

공급자 상품 API는 query 없는 조회에서 5건·200이었지만 실제 UI가 사용하는
`GET /api/v1/neture/supplier/products?page=1&limit=20`에서는 500이었다.
재사용 master의 tags에 과거 객체와 배열이 혼재하며 completeness SQL이 객체에도
`jsonb_array_length`를 호출했다. 배열 타입을 CASE로 확인한 뒤 길이를 계산하도록 최소 수정한다.
원본 master·가격·승인·공개 정책은 변경하지 않는다.

약국 Demo의 첫 테스트는 handoff 완료 대기 시간 부족으로 실패했다. 실제 추가 추적에서는
workspace handoff 발급·교환 모두 200, Store의 KPA 업무 경로로 이동, 업무 API 200을 확인했다.
테스트를 실제 이동·인증 완료까지 기다리도록 보완하며 별도 frontend 수정은 하지 않는다.

공급자 수정의 로컬 검증: 실제 격리 PostgreSQL에서 객체·문자열·JSON null·SQL NULL·빈 배열·
비어 있지 않은 배열의 페이지 조회와 completeness 정렬/필터 등 7개 검증 통과.
기존 master 직접 연결 회귀 44개와 합계 51개 통과. 명시 fixture port 없는 CI에서는
DB 통합 7개가 skipped이며 로컬 실행 결과와 구분한다. API type-check 통과.

추가 수정은 onboarding skill의 기존 격리 checkout 예외에 따라 별도 worktree 없이 최신 main의
`wo/auth-demo-smoke-regressions`에서 작업한다. 사용자가 승인한 통합·배포 범위의 발견 회귀이며,
필수 CI·review와 최신 main 확인 후 PR merge 경로를 사용한다. 수정 배포와 PC·모바일 전체
서비스 최종 결과는 실제 실행 후 덧붙인다. 현재 전체 PASS로 판정하지 않는다.

## 2026-10-09 KST — 세션 분리와 공개 화면

두 Demo 유형 × 8개 origin의 `/auth/me` baseline 16개 모두 200이었다.
각 유형의 Neture 정상 logout 2개 모두 200, 그 뒤 다른 7개 origin의 refresh 합계
14개 모두 200·새 access token 발급을 확인했다. 실제 공통 SDK의 `data.tokens` 응답 구조를
기준으로 검사했다. 같은 Neture의 별도 브라우저는 logout 전 me 200, 다른 브라우저 logout 200,
이후 refresh `401 SERVICE_SESSION_REVOKED`였다. 이 항목은 FAIL이며 인증 WO 단계 2에 남는다.

유지 host 8개와 전체관리자 health 9개는 200이었다. 소매 host의 503은
[K-Cosmetics 운영 종료 CHECK](CHECK-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-RUNTIME-V1.md)의
퇴역 대상과 일치한다. Partner host의 403은 예약 주소로 기록하며 유지 서비스 성공에 포함하지 않는다.

변경 없는 병원약국·Cafe24·전체관리자 공개 화면을 PC/모바일 각각 확인했다.
6개 모두 200·실제 안내 화면 표시·page error 0이다. 병원약국은 무로그인 파일 연결 안내이고
실제 원내 파일 연결·약품 업무까지 검증한 결과가 아니다. 전체관리자는 Google 안내·Demo 버튼 0,
두 Demo의 전체관리자 사용자 API는 모두 `403 ROLE_REQUIRED`로 차단됐다.
Google 실제 로그인은 이 환경의 외부 제공자 접근 제한과 개인 계정 인증 없이 미검증이다.
전체관리자 모바일 390px에서 문서 가로 넘침도 관측했다. 공개 로그인 경계 판정과 별도로
레이아웃 후속 확인 항목으로 남기며 모바일 화면 전체 품질 PASS로 확대하지 않는다.

## 2026-10-09 KST — 상품 페이지 수정 배포

PR #368은 main `19f9338a8fcbf036a0a63a8bab058b5cc04e1734`로 통합됐다.
[main CI](https://github.com/Renagang21/o4o-platform/actions/runs/37864683913)와 security analysis가 성공했다.
[Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/37865489452)는 API 배포·migration Job·
새 revision readiness·traffic switch·전환 후 검증·serving SHA report를 모두 통과했다.
commit production status는 `DEPLOYED · deploy: api` 성공이다. 프런트 변경은 없으므로 별도 프런트 배포는 없다.


## 2026-10-09 KST — 배포 후 전체 Demo smoke 최종 결과

API serving target `19f9338a8fcbf036a0a63a8bab058b5cc04e1734` 배포 확인 후 실행했다.
PC 1440×900, 모바일 390×844에서 서비스마다 매장 경영자·공급자 버튼을 실제 클릭했다.
로그인 응답 200·서버 Demo registry 유형·실제 이동 완료·페이지/API 오류·정상 logout 200과
현재 origin 토큰 제거를 각각 확인했다. 아래 32개 시나리오 모두 PASS, API 오류 0·page error 0이다.

| 서비스 | PC 매장 | PC 공급자 | 모바일 매장 | 모바일 공급자 |
|---|---|---|---|---|
| Neture | PASS | PASS | PASS | PASS |
| 공급자 | PASS | PASS | PASS | PASS |
| 커뮤니티 | PASS | PASS | PASS | PASS |
| 펀딩 | PASS | PASS | PASS | PASS |
| 약국 | PASS | PASS | PASS | PASS |
| Store | PASS | PASS | PASS | PASS |
| 강의 | PASS | PASS | PASS | PASS |
| 약사회 분회 | PASS | PASS | PASS | PASS |

메인은 `/login` 직접 방문 결과만으로 대체하지 않고 홈 헤더의 로그인 모달에서 시작했다.
매장 Demo는 실제 Store로 이동해 홈 후보 1개·약국 capabilities/info 200을 확인했다.
공급자 Demo는 실제 UI의 페이지 조회 200·상품 이름 5개와 비공개 안내 자료 1개 표시를
PC/모바일 모두 확인했다. `403 STORE_OWNER_REQUIRED`, 상품 페이지 500, 로그인 이동 오류는
최종 시나리오에서 재현되지 않았다. community/funding의 계정 보안 화면 logout도 통과했다.

PC 진행 중 클라우드 환경 재시작으로 프로세스가 종료됐다. 저장된 완료 7개는 유지하고
미완료 시나리오부터 새 브라우저 context로 재개했다. 실패·중단을 완료 PASS로 기록하지 않았다.
32개는 인증·업무공간 진입·대표 업무 조회·현재 origin logout의 범위이며 모든 서비스 기능,
실제 Google 로그인, 이미지 로딩, 주문·결제까지 완료했다는 의미가 아니다. 외부 제공자와
저장소 이미지 요청은 현재 환경의 domain 제한이 있어 해당 매체/연동 성공을 주장하지 않는다.
다른 브라우저 보존·전체관리자 모바일 레이아웃·불필요 데이터 삭제·Pharmacy-Hub 실제 삭제는
각각 위 후속 항목으로 남는다.

## 2026-10-09 KST — 최신 배포의 세션 회귀 재확인

32개 Demo 시나리오 이후 API `19f9338a8fcbf036a0a63a8bab058b5cc04e1734`에서 두 유형을 다시 확인했다.
Neture 별도 브라우저의 me 200 → 첫 브라우저 logout 200 → 다른 브라우저 refresh
`401 SERVICE_SESSION_REVOKED`가 매장·공급자 모두 재현됐다(보존 요구 기준 2 FAIL).
각 유형의 별도 Store origin은 logout 전 me 200, 이후 refresh 200·새 token 발급이었다(2 PASS).
일반 Demo logout 32 PASS와 다른 브라우저 보존 2 FAIL을 합쳐 전체 인증 PASS로 보고하지 않는다.
