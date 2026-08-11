# CHECK-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1

- **WO**: 운영자 회원 비밀번호 변경 정책 최소 8자 통일
- **판정**: PASS
- **일자**: 2026-08-11
- **선행 CHECK**: [CHECK-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1](CHECK-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1.md) — 본 CHECK 로 그 문서 §7 잔여 2(최소 길이 6자/8자 불일치)를 닫는다.

---

## 1. 문제

최소 길이의 정본은 **8자**다(회원가입 DTO · 본인 변경 · 재설정 · `auth-core` 기본 정책 · 운영자 회원 **목록** 모달 · `AdminUserController.SERVICE_PASSWORD_MIN_LENGTH`).
그러나 운영자 회원 비밀번호 변경 경로에 두 개의 구멍이 있었다.

| 경로 | 이전 | 성격 |
|---|---|---|
| 회원 목록 모달 (`OperatorMembersConsolePage`) | 8자 | 정상 |
| 회원 상세 모달 (`packages/ui/.../UserDetailPage`) | **6자** | 프런트 불일치 |
| `PUT /operator/members/:userId` 직접 호출 | **검증 없음** | **정책 우회 가능한 백엔드 공백** |

`MembershipConsoleController.changeMemberServicePassword` 는 길이 검증 없이 `hashPassword` → `service_credentials` upsert 로 진행했다.
즉 프런트만 고치면 API 직접 호출로 임의 길이 비밀번호가 저장될 수 있었다.

## 2. 변경

### 2-1. 백엔드 — `apps/api-server/src/controllers/operator/MembershipConsoleController.ts`

`changeMemberServicePassword` **최상단(0단계)** 에 최소 길이 가드를 추가했다.
후보 서비스 SELECT · 계층 판정 · `hashPassword` · credential upsert **모두보다 앞**이다.

- 8자 미만 → `400` / `code: 'WEAK_PASSWORD'`
- 최소 길이 상수는 신설하지 않고 정본 `SERVICE_PASSWORD_MIN_LENGTH`(= 8, `admin/AdminUserController.ts`)를 import 재사용
- 응답 형태는 기존 `platform-accounts.routes.ts` 의 `400 + WEAK_PASSWORD` 선례와 동일

### 2-2. 프런트 — `packages/ui/src/operator-user-detail/UserDetailPage.tsx`

3줄만 변경(6 → 8): 제출 검증 · 오류 문구 · `placeholder` / `minLength`.

## 3. 바꾸지 않은 것

- 회원 **목록** 모달(`OperatorMembersConsolePage`)의 기존 8자 동작 — 무변경 확인
- 비밀번호 **복잡성** 규칙(문자·숫자·특수문자) — 회원가입만 요구하고 본인 변경·재설정은 최소 길이만 요구하는 불일치가 있으나, 이는 사용자 비밀번호 정책 자체의 변경이므로 별도 정책 결정 대상
- 회원가입 · 본인 비밀번호 변경 · 재설정 경로
- DB 구조 · `service_credentials` 계약 · serviceKey 판정 정책 · role/membership 정책

## 4. 검증

| 항목 | 결과 |
|---|---|
| `MembershipConsoleController.servicePassword.test.ts` (jest) | **20/20 PASS** (신규 3건 포함) |
| `UserDetailPasswordModal.test.tsx` (vitest) | **7/7 PASS** (신규 3건 포함) |
| `apps/api-server` `tsc --noEmit` | PASS |
| `packages/ui` type-check · build | PASS |
| 4개 서비스(KPA-Society · GlycoPharm · K-Cosmetics · Neture) typecheck | PASS |

신규 테스트 — 세 경로에 같은 최소 길이가 적용됨을 고정한다.

- 백엔드: 7자 → `400 WEAK_PASSWORD`, `hashPassword` 미호출, credential/`users.password` write 0건
- 백엔드: 정확히 8자 통과(경계값)
- 백엔드: 후보가 복수여도 `SERVICE_KEY_REQUIRED` 보다 `WEAK_PASSWORD` 가 먼저 (서비스 판정 이전 거절)
- 프런트: 7자 → 안내 문구 표시 · `put` 미호출 / 8자 경계값 전송 / `placeholder`·`minLength` 8자

> 목록 모달은 프런트 8자 유지 + 위 백엔드 가드를 공유하므로 목록 · 상세 · 직접 API 가 동일 정책이 된다.

## 5. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(비밀번호 **복잡성** 규칙 통일 — 정책 결정 필요)

## 6. 잔여

1. 비밀번호 복잡성 규칙 불일치(회원가입 = 문자·숫자·특수문자 / 본인 변경·재설정 = 최소 길이만) — 별도 정책 WO
2. `packages/ui` vitest 는 루트 설정으로 수동 실행 상태(CI 미배선) — 선행 CHECK §7 잔여 유지
