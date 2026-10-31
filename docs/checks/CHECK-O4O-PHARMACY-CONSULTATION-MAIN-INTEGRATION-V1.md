# 약국 서비스 설정·다국어 상담 main 통합 검증

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: LOCAL_VALIDATED — 이후 CI·병합·배포 상태는 PR/Actions 참조
> **작성일**: 2026-10-19
> **범위**: 사용자의 병합·배포 요청에 따른 통합 및 필요한 수정
> **PR**: [#716](https://github.com/Renagang21/o4o-platform/pull/716)

## 통합 결과

선행 서비스 설정 `9af97a9413`, 상담 `36bd4b8d14`, 음성 후속 `b2b2cd4226`을 포함한 동일 작업 branch에 main `51f772caa8`을 통합했다. 관리자 route와 공통 export 충돌은 최신 협력사업 관리 화면·공급 조건 export와 이번 서비스 설정을 함께 보존했다.

추가 main 이동은 `aeabc5daa7`까지 반영했다. 사업 홈/커뮤니티 변경을 보존하고 변경된 lockfile로 frozen/offline 설치를 다시 검증했다. 이번 기능의 dependency 선언·lockfile 변경은 추가하지 않았다.

- 최신 main의 사업 목록 조회 generic에서 기본 사업 행 필드가 빠져 설정 대상 map의 TypeScript 빌드가 실패했다. `SemiFranchiseRow` 교집합을 명시해 실제 SELECT 필드를 보존했다. SQL/실행 로직 변경은 없다.
- Codex P2: Neture 관리자에 플랫폼 전용 메뉴 노출. `getAdminMenu(false)`에서 숨기고 Neture 호환 설정 화면도 기존 `PlatformRoute`로 감쌌다. Neture 관리자 직접 URL은 설정 컴포넌트/API를 실행하지 않으며 전체 관리자는 사용 가능하다. 서버 권한은 넓히지 않았다.
- CI의 Admin Vitest에서 새 정적 메뉴의 권한 등록 누락을 발견했다. `pharmacy-service-settings`를 플랫폼 관리자 전용 등록부에 추가하고 정적 메뉴의 정확한 경로/개수 계약을 보완했다. 플랫폼 허용·서비스 관리자 거절 회귀도 추가했다. 미등록 메뉴의 기본 거절은 유지한다.
- API 전체 3개 shard를 로컬에서 재현해 기존 fixture 3곳의 5개 실패를 확인했다. 미설정 정책과 활성 경영자/직원 관계를 명시했고 기존 유료 종료·다른 매장·미초대 차단 기대를 유지했다. 실제 조회 실패를 503으로 응답하는 구현을 완화하지 않았다.
- Sonar 지적에 따라 숫자/단위를 나눠 검사하고 구두점·어순·단위 경계 회귀를 추가했다. 상태 알림은 native output, dialog 닫기는 명시적 submit으로 표시하고 상담 선택·입력·읽어주기/오류 표시를 작은 함수로 분리했다. 전문인/직원 경계와 입력/번역 수명은 유지한다.
- 새 migration·dependency·배포 설정·운영 정책값 변경은 없다. 음성은 브라우저 Web Speech API이며 Google Cloud 음성 API 연동은 포함하지 않는다.

## 로컬 재검증

| 검증 | 결과 |
|---|---|
| API 단위·전용 PostgreSQL/HTTP·승인·접근·raw-source 계약·기존 tablet 회귀 | 15 suites / 152 tests PASS |
| 공통 operator UI 전체 | 25 files / 195 tests PASS |
| My Home·호스트·플랫폼 설정 진입 | 4 files / 69 tests PASS |
| Store 상담·음성·기능 판정·직원 지원 | 4 files / 30 tests PASS |
| Admin Dashboard 전체·메뉴/권한 계약 | 25 files / 422 tests PASS |
| 합계 | 868 tests PASS |
| 공통 의존 패키지 | `pnpm run build:packages` PASS |
| API·Admin·Neture·Store | 관련 build PASS, API·Neture·Store 타입 검사 포함 |
| PC/모바일 Chromium fixture | 1440/390px, 관리자·My Home·상담·고객 dialog·Neture 관리자 역할 경계 64개 확인 PASS |
| 추가 수정 ESLint·diff·문서 민감정보 | 오류/경고/패턴 0 |

브라우저는 실제 React 페이지·guard·메뉴와 합성 인증/API/음성 API를 연결했다. Neture 관리자에게 메뉴/화면을 제공하지 않고 정책 API도 호출하지 않는지, 전체 관리자에게는 노출/호출하는지 PC·모바일 모두 확인했다. 화면 오류·가로 넘침은 0이다. 실제 마이크·발음 품질·외부 AI 호출·실계정 로그인 검증을 의미하지 않는다.

통합 직후 공통 UI 테스트는 갱신 전 types 산출물 때문에 실패했고 공통 패키지 재빌드 후 통과했다. API 타입 오류와 Codex 지적은 위와 같이 수정했다. CI의 관리자 테스트 실패는 정확한 앱 작업 디렉터리에서 전체 suite를 재현해 원인을 확인했고 수정 후 422개 전체 및 Admin build가 통과했다. API 전체 재현에서는 3 suites/5 tests가 실패했고 해당 fixture 보완 후 관련 15 suites/152 tests를 재실행해 통과했다. 이후 전체 CI 결과는 PR의 새 HEAD를 기준으로 확인한다. DB 검증은 기존 전용 loopback fixture만 사용했고 운영 DB는 쓰지 않았다.

## 소비처·배포 경계

- Admin은 새 협력사업 관리 화면과 설정 화면을 모두 유지한다. Neture 호환 진입은 기존 플랫폼 guard를 재사용한다. My Home·Store·Pharmacy/Drugstore/CarePharm/Cooperative의 공통 제공/직원 허용 구조는 선행 CHECK대로 유지한다.
- `getAdminMenu`의 layout 및 raw-source 소비처를 검색했다. 권한별 메뉴/직접 URL 회귀를 추가했고 기존 App/Store literal 계약을 API 검증에 포함했다.
- 필수 `CI Gate`, Codex 미해결 사항, 현재 main 위치를 확인한 뒤 PR 경로로 병합한다. ruleset 우회·main 직접 push는 사용하지 않는다.
- 배포는 README의 Delivery/promote 경로와 실제 serving SHA 기준 판정을 따른다. 이번 PR은 schema를 추가하지 않는다. 누적 배포에 미승인 migration이 포함되면 그 구체적 범위를 확인하고 별도로 처리한다.
- 코드·정본 내용은 앞선 [상담 CHECK](CHECK-O4O-PHARMACY-MULTILINGUAL-CONSULTATION-V1.md), [음성 CHECK](CHECK-O4O-PHARMACY-CONSULTATION-VOICE-V1.md)에 보존한다. 최종 병합 SHA·운영 배포 결과는 PR #716과 해당 Actions run이 기준이다.

문서 정합: 현재 통합 검증을 새 기록에 남겼으며 과거 완료 기록·canonical index는 변경하지 않았다.
