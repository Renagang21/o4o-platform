# 운영자 코드 복잡성 2차 — Neture 가입 신청 첫 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [항목별 TODO](../work-orders/WO-O4O-OPERATOR-COMPLEXITY-PHASE2-TODO-V1.md)

완료는 이번 서비스 내부 함수 추출의 개발·검증·push 범위다. 전체 2차, main 병합·배포 완료를 뜻하지 않는다.

## 기준과 범위

- Base: `origin/main f66ed5f5f8e6198e0043053b24cae6230ffa96cf`.
- Branch: `wo/operator-refactor-phase2`.
- 세션 전용 clone 사용. 기준 checkout과 기존 branch의 미병합 작업을 보존했다.
- 약사회 분회 제외, 서비스 간 공통화 없음, 공통 패키지·공개 API·DB·권한 변경 없음.
- 화면: Neture `/operator/applications`, `RegistrationRequestsPage` (등록 index에서 export, App에서 lazy mount).
- 원문 파일 경로 소비처 검사: 과거 문서 11건, 살아 있는 raw-source 계약 없음.

## TODO 보완 → 작업

D1 중복 판정과 F1 함수 추출을 먼저 확정했다.

1. `mapRegistrationRequest`: 응답→화면 모델 변환. business/처리/메모 필드, fallback과 상태 매핑 보존.
2. `filterRegistrationRequests`: 이름·이메일·회사명 검색과 상태·역할 필터. 기존 대소문자/공백 처리 보존.
3. `getSelectedPendingRegistrationIds`: 알려진 PENDING만 선택 순서대로 추출.
4. 화면의 단일 `selectedPendingIds` 파생 목록을 일괄 승인·반려·표시 count에서 사용.
5. 같은 파일의 사용하지 않는 catch 변수 2개 제거. 오류 처리 결과는 유지.

함수와 타입은 Neture 가입 신청 디렉터리 내부 모듈이다. 서비스 공용 utility나 공유 패키지로 승격하지 않았다.

## 검증

| 검증 | 결과 |
|---|---|
| frozen-lockfile offline install | PASS, tracked manifests/lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| Neture 전체 Vitest | 74파일·638테스트 PASS |
| 최종 편집 후 신규 모델/화면 테스트 재실행 | 2파일·16테스트 PASS |
| Neture `tsc --noEmit` | PASS (최종 편집 후 재실행 포함) |
| Neture production build | PASS |
| 변경 TS/TSX 4파일 eslint `--max-warnings 0` | PASS |
| 1440/390 × approve/reject browser smoke | 4시나리오 PASS |
| docs 민감정보 검사, diff check | PASS |

단위 테스트 13개: 기존 상태 매핑, role/service/date fallback, 사업자/메모/처리 정보 보존,
입력 비변경, 3개 검색 필드, 상태+역할 결합, 공백 처리, 선택 순서와 잘못된/비대기 대상 제외.
화면 테스트 3개: 승인·반려 모두 비대기 회원을 POST 대상에서 제외하고 성공 후 재조회,
일괄 실패 시 기존 선택과 오류 피드백 보존.

최초 lint는 기존 catch 변수와 새 테스트 미사용 import에서 경고가 나왔고 이를 정리한 후 0경고로 통과했다.
최초 browser POST 검증은 mock glob이 하위 `/registrations/batch` 경로를 잡지 못해 로컬 API 연결이 실패했다.
검증 harness의 가로채기 범위를 수정했다. 앱/API 코드를 변경해 검증을 우회하지 않았다.

## Browser smoke

실제 가입 신청 컴포넌트, Neture 스타일, API adapter를 사용한 합성 API 검증이다.
실서비스 route wrapper·인증·실계정 검증은 이번 결과에 포함하지 않는다.

- pending와 active 응답 → 초기 pending 목록 → ALL 전환 → 두 행 선택.
- 일괄 행동 표시 count는 1, 실제 POST ids는 pending 한 건.
- 반려의 기존 사유 `운영자 일괄 거부` 유지.
- 성공 메시지와 최소 2회 GET(최초+재조회) 확인.
- desktop/mobile 승인·반려 각각 browser page error 없음.

실계정 지정·재로그인·접근 검증은 사용자 담당이다.

## 재조사와 검토

화면 줄 수는 879→790줄(마지막 빈 줄 제외), 반복 pending 판정은 3곳에서 하나의 파생 목록으로 정리했다.
주요 컴포넌트의 ESLint cyclomatic complexity는 46→46으로 동일하다.
큰 JSX 표시 분기가 남았으며, 숫자가 줄었다고 보고하지 않는다.
효과는 읽기 모델·필터를 화면과 독립적으로 검증하고 동일 대상 판정을 재사용하는 것이다.

후속: 상품 승인 요청값/선택 대상 조사, 가입 신청의 상세 표시·상태/비동기 책임 분리는 추가 작업.
기존 비동기 수명 문제와 서비스 간 공통화는 이번 완료 항목이 아니다.

최종 diff에서 승인/반려/메모 API 호출·사유·알림·재조회, 테이블/상세 JSX와 route 계약 유지 확인.
새 모듈은 해당 화면과 새 테스트만 소비한다. 다른 서비스나 공통 export에 연결하지 않았다.

## 문서 정합

항목별 TODO를 ACTIVE로 두고 첫 작업 완료와 후속 조사·전체 정비 공통화 후보를 분리했다.
이전 1차 TODO의 공통화 제안은 이번 사용자 지시보다 우선하지 않는다.
현재 main의 회원관리 표준에 남은 과거 권한/용어 문구 차이는 TODO에 기록했고 이번 코드 변경에 섞지 않았다.
