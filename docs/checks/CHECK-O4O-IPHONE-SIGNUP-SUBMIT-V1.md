# iPhone 회원가입 버튼 조사 및 수정 검증

> **상태**: COMPLETED · **검증일**: 2026-10-31 · **범위**: 로컬 코드·격리 API fixture 검증. main 병합·운영 배포·실제 iPhone 검증은 포함하지 않음.

## 조사 결과

`EmailSignupForm`은 닉네임·이메일·이름·국내 휴대전화·비밀번호·확인 일치·게시 약관·필수 동의가 모두 충족돼야 제출 버튼을 활성화한다. 버튼 근처에는 미충족 조건 안내가 없었다.

연락처 자동완성에서 전달될 수 있는 국가코드 포함 국내 번호는 숫자만 남겨도 국내 선행 0이 없어 기존 형태 검사에서 거절된다. WebKit iPhone 에뮬레이션과 Chromium에서 이 형식의 버튼 비활성화를 재현했다. 실제 신고자의 입력값·브라우저·주소는 확보하지 않았으므로 신고의 단일 원인으로 확정하지 않는다.

## Shared Module Change Verification

### Changed shared module

- Package/module: `@o4o/auth-react` / `src/email/EmailSignupForm.tsx`
- Direct consumer: `services/web-neture/src/pages/auth/EmailAuthPages.tsx`의 `SignupPage`.
- Export chain: `src/email/index.ts` → `src/index.ts`.
- Raw-source consumer: `scripts/ci/__tests__/level3-precision.test.mjs`.
- 수정: 명시적 한국 국가코드 형식을 기존 API의 국내 번호 형식으로 변환, 국내 연락처 자동완성 힌트, 입력 필드 이름, 버튼 미충족 조건 안내.
- 서버 인증·비밀번호 정책·필수 동의·API 계약 변경 없음. 다른 국가 번호와 유효하지 않은 번호는 계속 거절한다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|
| Neture `/signup` | 직접 사용 | 연락처 입력·버튼 안내 | TypeScript 포함 build, 실제 페이지 WebKit 모바일·Chromium 데스크톱 smoke | PASS |
| auth-react 공통 UI fixture | 직접 사용 | 동일 UI | 수정 전/후 브라우저 비교, Vitest | PASS |
| KPA / K-Cosmetics / admin / store / 기타 서비스 | 해당 form 직접 사용 없음 | 공통 form 수정의 직접 영향 없음 | symbol·경로·export 소비처 검색 | 확인 |
| CI 위험도 판정 | 소스 경로 참조 | 인증 UI 위험도 판정 유지 | `level3-precision.test.mjs` 29 tests | PASS |

### Route / role / capability check

가입 경로·역할·권한·필수 동의 조건은 유지했다. 숨긴 기능이나 신규 route가 없으며 버튼 비활성화 이유를 추가했다. 이미 제출 중이면 버튼을 계속 비활성화한다.

### Smoke result

- WebKit iPhone 13 에뮬레이션 및 Chromium 데스크톱에서 기존 국가코드 번호 거절 재현.
- 수정 form과 실제 Neture `/signup`에서 필수 입력·동의 후 제출 가능, 국내 번호 payload 1회 전송, 확인 메일 안내 표시.
- 닉네임 미입력 시 구체적 안내, 외국 번호 입력 시 제출 차단, JavaScript page error 0건.
- 가입 API·약관·세션 응답은 격리 fixture로 대체했다. 운영 가입·계정 생성·메일 발송 없음. 실제 iPhone 연락처 자동완성 UI 자체와 메일 수신은 미검증.

## 검증 결과와 한계

- `pnpm run build:packages`: PASS.
- `pnpm --filter @o4o/web-neture build`: PASS (타입 검사 포함, 기존 큰 번들 경고).
- auth-react Vitest: 21 files / 261 tests PASS (추가 회귀 7 tests 포함).
- 공통 패키지 전체 `tsc --noEmit`은 기존 테스트의 rootDir·props 타입 오류가 있어 별도 실패. 프로덕션 소비처 Neture build는 통과하며 해당 미수정 테스트 오류는 이 작업에서 변경하지 않는다.
- `git diff --check`: PASS.

## 미해결 사항

실제 신고 경로·입력 조건 및 실기기 재확인이 남아 있다. 운영 반영 전 main 통합 담당이 PR/CI와 인증 UI 배포 경계를 확인해야 한다. 이 기록은 배포 완료 증거가 아니다.

## 문서 정합

해당 없음. 기존 정책·정본 문서는 변경하지 않았다.
