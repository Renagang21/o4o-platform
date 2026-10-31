# 중앙 운영 담당자 지정 진입과 퇴역 서비스 제외

> **상태**: COMPLETED · **검증일**: 2026-10-31 · **범위**: 로컬 구현·타입·빌드·격리 브라우저 검증. 운영 반영 증적과 구분한다.

## 결과

플랫폼 홈 `/admin/platform`에 ‘중앙 운영 담당자 지정·업무 위임’ 배너를 추가했다. `/operators?assignment=central`은 기존 초대 화면을 직영 서비스 선택 모드로 연다. 이 진입에서는 독립 사업·분회를 선택하지 않는다. 일반 ‘서비스 담당자 지정’은 기존 독립 사업·분회 목록을 유지한다.

새 전역 Operator 역할이나 권한 부여 경로는 만들지 않는다. 중앙에서는 서비스 Admin 초대·본인 수락·직영 업무 메뉴 위임을 재사용하고, 서비스 Operator는 서비스 Admin이 관리하는 현재 정책을 유지한다. 기존 담당자의 ‘위임 업무 설정’ 위치를 배너에서 안내한다.

사용자가 제거를 확인한 `kpa-society`는 신규 서비스 관리자 선택에서 제외한다. API도 플랫폼 초대 생성·재발송·미수락 초대 수락을 거절한다. 기존 할당의 조회·필터·회수는 신규 지정 목록과 별도로 유지하고 편집 창에서도 보존되는 과거 역할을 표시한다. 기존 역할 해석·권한 이력·취소와 `kpa-branch`, 약국 협력사업도 보존한다. 정책 정본은 `O4O-CURRENT-ADMIN-ROLE-POLICY-V1`의 2026-10-31 추가 절을 따른다.

## Shared Module Change Verification

### Changed shared module / Consumer impact matrix

| 소비처 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|
| 플랫폼 홈 | 지정 배너와 기존 서비스 관리자 카드 안내 | Vitest·desktop/mobile E2E | PASS |
| `/operators` | 직영 전용 진입·일반 지정·필터 | Vitest·desktop/mobile E2E | PASS |
| Admin 역할 카탈로그 | 신규 지정에서 퇴역 서비스 제외, 과거 metadata 유지 | 서버 카탈로그 대응 테스트 | PASS |
| API 플랫폼 초대 생성·재발송·수락 | 퇴역 서비스 신규 권한 차단 | resolver·service·route Jest | PASS |
| API 기존 역할 해석·권한 해제/취소 | 신규 지정 allowlist와 기존 원장 해석 분리 | 기존 resolver 보존·기존 회귀 | PASS |
| 서비스 자체 Operator·조직·상품 DB·일반 회원 | 신규 권한·scope 확장 없음 | 정책·호출 경로 점검 | 변경 없음 |

### Route / role / capability check

기존 `/operators`의 전체 관리자 보호와 Google·초대 수락·서비스/메뉴 권한 검사를 유지한다. query는 화면 진입 모드이며 서버 권한을 부여하지 않는다. 직영 선택지와 일반 선택지는 기존 카탈로그에서 파생하고 서비스나 역할을 자동으로 선택하지 않는다. 운영 DB나 실제 계정에 권한을 부여하지 않았다.

## 검증

- 공유 패키지 빌드, Admin TypeScript·Vite build, API build tsconfig `--noEmit`: PASS.
- 관련 Admin Vitest: 38 tests PASS (자동 리뷰에서 지적한 과거 Admin 조회·회수 회귀 포함).
- API 카탈로그·초대 service·route: 34 tests PASS. 퇴역 서비스 요청은 DB query/transaction 전에 차단됨을 확인.
- 인증/초대 source contract Jest: 17 tests PASS.
- Chromium 실제 앱 E2E: 4 tests PASS (desktop/mobile 배너→모달→서비스/업무 선택, 닫기 후 query 정리, 일반 지정의 분회·독립 사업 보존, 기존 bookmark, 비로그인·서비스 Operator 접근 차단).
- 브라우저 API는 fixture, 변경 요청 0건. 실제 초대 메일·수락·계정 권한 write는 미검증.
- 초기 브라우저 cold lazy-load가 기본 5초를 초과해 실패했다. 캐시 준비 후 직렬 4/4 통과했고 해당 lazy 페이지 진입의 대기를 20초로 명시했다. assertion을 제거하지 않았다.
- 문서 민감정보 검사·`git diff --check`: PASS.

## 문서 정합

사용자 확인에 따라 현재 관리자 정책에 `kpa-society` 신규 지정 제외 범위를 추가했다. 기존 역할·조직·분회 권한을 전면 폐기하는 의미로 확대하지 않았다.
