# CHECK-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1

- **WO**: `WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1`
- **일자**: 2026-08-11
- **판정**: PASS
- **선행**: `CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1` · `CHECK-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1` · `CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-CACHE-INVALIDATION-V1`

---

## 1. 목표

Neture `/admin/operators` 의 자체 운영자 관리 화면(목록·생성·역할 지정·해제)을 제거하고,
중앙 관리자 `/operators` 로 이동을 안내하는 화면으로 교체한다.
운영자·관리자 역할 부여·회수는 플랫폼 관리자 권한이므로
(`IR-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-V1`), 서비스별 화면을 남겨두면 우회 동선이 유지된다.

---

## 2. 중앙 이동 URL — 계약 확인 결과

| 항목 | 확인 근거 |
|---|---|
| Route | `apps/admin-dashboard/src/routes/users.routes.tsx:40` — `<Route key="/operators" path="/operators">` |
| 접근 주체 | 같은 파일 `AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'platform:super_admin']}` |
| 배포 도메인 | `.github/workflows/deploy-admin.yml:49` — production `app_origin=https://admin.neture.co.kr` |
| 사용 URL | **`https://admin.neture.co.kr/operators`** |

조사 결과가 WO 전제(`admin.neture.co.kr/operators`, 플랫폼 관리자 전용)와 일치하여 그대로 사용했다.
안내 화면에는 "중앙 운영자 관리는 **플랫폼 관리자 전용**이며 권한이 없으면 이동해도 사용할 수 없다"를 명시했다.

---

## 3. 적용 내용

### 3-1. `services/web-neture/src/pages/admin/OperatorsPage.tsx` — 전면 교체 (405줄 → 79줄)

제거된 것:

- `adminOperatorApi.getOperators` / `deactivateOperator` / `reactivateOperator` / `createOperator` 호출 전부
- 운영자 `DataTable`, 검색·역할 필터·비활성 포함 토글, `RowActionMenu` 권한 해제/복원 액션
- 운영자 생성 모달(이메일·이름·비밀번호·역할 선택)
- 관련 state 12개와 `useEffect` 로딩 흐름

남은 것 — 정적 안내 화면 하나:

- 중앙 관리자에서 관리한다는 설명
- 플랫폼 관리자 전용 경고 박스
- **사용자가 직접 누르는 이동 버튼** (`<a target="_blank" rel="noopener noreferrer">`) + URL 표기

**API 호출 0 · 자동 redirect 없음 · 데이터 조회 없음.** 새 공용 컴포넌트나 API 를 만들지 않았고,
`lucide-react` 아이콘과 기존 Tailwind 클래스만 사용했다.

### 3-2. 명칭·설명 정리

| 파일 | 변경 |
|---|---|
| `config/operatorMenuGroups.ts:35` (operator 사이드바 · adminOnly) | `운영자 관리 (플랫폼)` → **`운영자 관리 안내`** |
| `config/operatorMenuGroups.ts:132` (admin 사이드바) | 동일 |
| `pages/admin/platform/PlatformAdminLandingPage.tsx` Tier1 카드 | desc 를 "중앙 관리자에서 수행 · 이 항목은 이동 안내" 로, badge `현 위치 유지` → **`중앙 관리 안내`** (tone `keep` → `move`) |
| `pages/admin/AdminMemberManagementPage.tsx:162` | 완전삭제 차단 alert 의 안내 위치를 `운영자 관리(/admin/operators)` → `중앙 관리자(admin.neture.co.kr)의 운영자 관리` 로 정정 |

마지막 항목은 이번 교체로 **문구가 가리키는 화면이 실제로 해제 기능을 잃었기 때문**에 함께 정정했다.
차단 조건·삭제 로직은 그대로다(문구만 변경).

`path` 는 네 곳 모두 `/admin/operators` 유지 — **기존 진입 동선은 깨지지 않고 안내 화면으로 연결된다.**

### 3-3. 이번 작업에서 삭제하지 않은 것 (WO 명시)

- `services/web-neture/src/lib/api/admin.ts` 의 `adminOperatorApi` 4개 함수와 `NetureOperatorInfo`
- `lib/api/index.ts` 의 re-export
- 백엔드 Neture 전용 4개 API (`GET/POST /neture/admin/operators`, `PATCH .../deactivate`, `PATCH .../reactivate`)

---

## 4. 검증

### 4-1. Neture 화면의 전용 API 호출 소멸 — 확인

```
grep -rn "adminOperatorApi" services packages apps --include=*.ts --include=*.tsx
→ services/web-neture/src/lib/api/admin.ts:41   (정의)
  services/web-neture/src/lib/api/index.ts:122  (re-export)
```

**런타임 소비처 0.** 정의와 re-export 외에 호출 지점이 없다.
`NetureOperatorInfo` 도 `admin.ts` 내부 시그니처와 `index.ts` type re-export 두 곳뿐이다.
즉 `adminOperatorApi` 는 **미사용 코드로만 남았다** — 다음 은퇴 WO 의 전제 조건이 충족됐다.

### 4-2. 화면·동선

- `App.tsx:1075` `/admin/operators` route 는 그대로 `OperatorsPage` 를 렌더 (교체된 안내 화면)
- 사이드바 2곳 · 플랫폼 랜딩 카드 1곳의 링크가 모두 같은 경로를 유지 → dead link 0
- 안내 문구 · 플랫폼 관리자 전용 경고 · 이동 버튼 · URL 표기 렌더 확인 (빌드 산출물 기준)

### 4-3. 테스트 · typecheck · build

```
services/web-neture: npx tsc --noEmit -p tsconfig.json   → exit 0
services/web-neture: npm run build                        → ✓ built in 16.25s
```

`services/web-neture` 에는 test script 와 테스트 파일이 없다(`find src -name "*.test.ts*"` → 0건).
백엔드는 이번 WO 에서 미변경이며, 직전 WO 에서 확인한 `admin`·`operator` 컨트롤러 스위트 118 PASS 상태를 유지한다.

---

## 5. 변경하지 않은 것

- Neture 의 다른 관리자 기능·메뉴·권한 가드 (route guard·`adminOnly` 플래그 모두 그대로)
- 백엔드 Neture 전용 운영자 API 와 그 guard
- 중앙 `/operators` 화면·route·guard
- role · membership · credential · DB schema

---

## 6. 후속 (마지막 단계)

1. 프런트 `adminOperatorApi` 4개 함수 + `NetureOperatorInfo` + `index.ts` re-export 은퇴
2. 백엔드 Neture 전용 4개 API 은퇴 → `neture:admin` 이 중앙 정책을 우회해 운영자·관리자를 지정하는 경로 **완전 폐쇄**

접두 없는 `role` 파라미터 불일치 · 비활성 유령 assignment 는 이번 전환과 분리된 정합성 작업으로 유지한다.

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
