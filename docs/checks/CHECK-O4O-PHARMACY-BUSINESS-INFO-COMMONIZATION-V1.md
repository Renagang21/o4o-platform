# CHECK — Pharmacy Business Info Commonization V1

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20
> **근거**: 사용자 Sonar 중복률 해소 요청 · PR #734

## Shared Module Change Verification

### Changed shared module

- Module: `PharmacyBusinessInfo`와 관련 입력/주입 타입.
- Package: `@o4o/account-ui` (`packages/account-ui/src/components/PharmacyBusinessInfo.tsx`, `src/index.ts`).
- Direct consumers: Store와 KPA의 `src/pages/pharmacy/PharmacyInfoPage.tsx` 두 어댑터.
- Indirect consumers: 각 서비스의 기존 lazy route. Neture는 같은 package barrel의 기존 계정·알림·프로필 export를 사용하지만 새 컴포넌트는 사용하지 않는다.
- 조사 범위: `apps`, `services`, `packages`의 package import·선언, 새 심볼, 기존 페이지 경로, route/role/capability, raw-source assertion. `scripts/quality/check-literal-consumers.mjs --source`로 두 페이지 경로를 확인했다. 살아있는 raw-source 계약은 발견되지 않았고 과거 조사 기록은 수정하지 않았다.
- package import 검색 파일 수(테스트·타입 import 포함): Store 3, KPA 18, Neture 15. package dependency 선언도 이 세 서비스뿐이다. 이는 새 컴포넌트의 사용 수와 구분한다.

### Consumer Impact Matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|---|
| Store | 새 컴포넌트 직접 사용 | 복제된 화면을 기존 API·테마·주소 검색 주입 어댑터로 변경 | 기존 store child route 및 상위 gated layout 유지 | production build, 어댑터 Vitest 16건, 실제 어댑터 격리 Chromium 1280/390 | PASS |
| KPA-Society | 새 컴포넌트 직접 사용 | 동일 화면을 같은 공통 구현으로 연결 | `/store/info`, `KpaUnifiedStoreHandoff`·`PharmacyGuard`·layout 유지 | production build, 어댑터 Vitest 1건, 실제 어댑터 격리 Chromium 1280/390 | PASS |
| Neture | 기존 package barrel 간접 소비; 새 컴포넌트 미사용 | 기존 export 구현·props 변경 없음 | 계정·My Home·공급자 경로 및 권한 유지 | production build, 실제 공통 package를 로드하는 헤더 회귀 렌더 5건 | PASS |
| K-Cosmetics | 활성 package/새 심볼 소비 없음 | 없음 | 없음 | import·dependency·심볼 검색 | 해당 없음 |
| admin | 활성 package/새 심볼 소비 없음 | 없음 | 없음 | 검색, PR CI 관리자 build | PASS |
| operator | 별도 새 컴포넌트 소비 없음 | 기존 서비스의 다른 package export만 사용 가능 | operator route·capability map 수정 없음 | 심볼·경로 및 diff 확인 | 해당 없음 |
| forum / store-hub | 새 컴포넌트 소비 없음 | 없음 | 메뉴·권한·노출 조건 수정 없음 | 심볼·경로 검색 | 해당 없음 |
| My Home / shared UI / core / extension | 기존 account-ui export 유지; 새 컴포넌트의 추가 소비 없음 | 기존 business/profile 입력 UI 구현은 이 작업에서 변경하지 않음 | 서비스별 기존 경계 유지 | 전 소비처 검색, package 테스트 28건·공통 패키지 build·PR CI | PASS |

### Route / role / capability check

- Route existence: 두 `PharmacyInfoPage` named export와 lazy import를 유지했다. Store의 기존 `storeChildRoutes()` mount와 KPA `/store/info`가 같은 어댑터를 계속 사용한다. 새 route는 없다.
- Role guard: `App.tsx`와 상위 layout/guard는 수정하지 않았다. 공통 컴포넌트는 identity·service key·회원 상태·권한을 판정하거나 주입하지 않는다.
- Capability map: 변경 없음.
- Visibility/filter: 메뉴·sidebar·capability 필터 변경 없음. 기존 조회 데이터 없음/실패 시 `/pharmacy`로 보내는 동작도 유지했다.
- Empty group/block removal: 관련 그룹·블록 변경 없음.
- API boundary: 기존 서비스별 `getPharmacyInfo`·`updatePharmacyInfo`와 `/pharmacy/info` 계약 유지. 사업자번호는 읽기 전용, `managerPhone`·사업자번호는 저장 payload에 추가하지 않는다. 주소·이메일·개인/법인·다른 기존 필드는 같은 경로로 저장한다.
- DB schema / migration / dependency / lockfile / 배포 설정 / Sonar exclusion·threshold 변경 없음.

### Smoke result

- Store / KPA: 실제 두 서비스 어댑터를 import한 격리 Vite fixture에서 각각 1280px·390px Chromium smoke를 실행했다. API와 주소 검색의 외부 연동만 fixture로 대체했다. 과거 과세값 재선택, 개인/법인 선택지, 미선택 저장 차단, 주소 포함 저장 payload, 저장 후 재표시, 실패 안내를 확인했다. 네 조합 모두 page error 0·가로 넘침 없음.
- Store 어댑터 테스트 16건: 개인/법인 저장, 실패·빈 조회의 약국 게이트 이동, 수정 취소, 읽기 전용 사업자번호, payload 정규화·재조회, 이메일 3종의 유효·오류·빈값 검증.
- KPA 어댑터 테스트 1건: 과거 과세값을 추론하지 않고 재선택한 개인 값을 실제 어댑터 API mock으로 저장.
- Neture: 헤더 계정 메뉴 5개 host profile의 JSDOM 렌더·열기 회귀 5건 PASS. 전체 운영 로그인/브라우저 세션 smoke로 표현하지 않는다. 새 약국 컴포넌트는 Neture에서 mount하지 않는다.
- K-Cosmetics: 이번 module의 활성 소비처가 없어 미실행. 서비스·사업 정책을 공통화하는 작업이 아니다.
- 공통 account-ui 테스트 28건 PASS. account-ui·공통 패키지·Store·KPA·Neture build PASS. 변경 파일 ESLint와 공백 검사 PASS.
- 운영 DB·실제 업무 데이터 쓰기 없음. 일회성 fixture는 브라우저 메모리에만 존재하며 검증 후 브라우저와 임시 서버를 종료했다.

## Sonar / CI evidence

코드 검증 대상은 `b485239539278081959516e0cbcf84bbe838585c`이다. 이후 이 CHECK 추가는 코드 수정이 아니다.

- 기존 #728: 새 코드 중복률 22.6%로 Quality Gate 실패한 과거 분석.
- 첫 수정 `cd2e1ef58b`: Sonar check `118519643095`에서 중복률 0.0%·Quality Gate PASS. 이동된 코드의 경고 17건은 후속 수정했다.
- 코드 수정 완료 `b485239539`: Sonar check `118524261708`에서 중복률 0.0%·새 이슈 0·Security Hotspot 0·Quality Gate PASS.
- 코드 CI run `39390631875` PASS. 이전 코드 CI `39389196137`도 PASS. CodeQL PASS.
- 로컬 jscpd 100 tokens / 10 lines: 이전 두 페이지 전체 690줄 clone 확인 → 두 어댑터와 공통 컴포넌트의 clone block 0건. 이 수치를 전체 저장소 중복률로 표현하지 않는다.
- 최종 문서 포함 HEAD의 CI·리뷰·통합 현황은 [PR #734](https://github.com/Renagang21/o4o-platform/pull/734)의 해당 commit 검사를 따른다. 이 기록은 main 병합·운영 배포 완료를 뜻하지 않는다.

## 문서 정합

[Shared Module Change Protocol](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) §5·§7·§10의 Consumer Impact Matrix와 smoke 기록을 추가했다. 정책·권한·기존 계약 의미 변경은 없으며 FROZEN 기준 문서와 과거 기록은 수정하지 않았다.
