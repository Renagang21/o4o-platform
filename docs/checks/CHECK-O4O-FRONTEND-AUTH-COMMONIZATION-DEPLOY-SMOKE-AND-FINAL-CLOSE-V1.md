# CHECK-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOY-SMOKE-AND-FINAL-CLOSE-V1

- **WO**: WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOY-SMOKE-AND-FINAL-CLOSE-V1
- **대상 커밋**: `f05cb81c0` (WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1)
- **일자**: 2026-08-12
- **성격**: 배포 확인 + 프로덕션 브라우저 smoke (코드 변경 0건)

---

## 1. 배포 확인

`f05cb81c0` = `origin/main` HEAD, 작업트리에 이번 WO 범위 미커밋 변경 0건.

| 워크플로 | 결과 |
|---|---|
| Deploy Web Services (Cloud Run) — run `31552647939` | success (detect-changes + neture / glycopharm / pharmacy-hub / kpa-society / k-cosmetics 5 job 전부 success) |
| Deploy API Server (Cloud Run) | success |
| Deploy Admin Dashboard (Cloud Run) | success |
| CI Pipeline | success |
| CodeQL Security Analysis | success |
| E2E — Auth Runtime Regression | **failure (기존 실패, §4)** |
| Deploy Main Site (Cloud Run) | 미실행 — 트리거 경로가 `apps/main-site/**` 뿐이며 이번 커밋에 해당 변경 없음 (정상) |

## 2. 브라우저 smoke 결과 (프로덕션 실접속)

계정은 `docs/local/TEST-ACCOUNTS.local.md` 기준. 자격증명 값은 본 문서에 기록하지 않는다.

| # | 확인 항목 | KPA | Neture | K-Cos | Glyco | PH |
|---|---|:--:|:--:|:--:|:--:|:--:|
| ① | 정상 로그인·로그아웃 | PASS | PASS | PASS | PASS | PASS |
| ② | 새로고침(전체 로드) 후 세션 복원 | PASS | PASS | PASS | PASS | PASS |
| ③ | 비로그인 보호 화면 접근 처리 | PASS `/login` | PASS 로그인 모달 | PASS `/login` | PASS 로그인 모달 | PASS 동일 URL 안내 |
| ④ | 로그인 사용자의 허용 화면 진입 | PASS | PASS | PASS | PASS | PASS |
| ⑤ | 역할 선택·전환 기존 동작 | 해당 없음 | 해당 없음 | 해당 없음 | PASS | 해당 없음 |
| ⑥ | `logoutAll` 이후 세션 처리 | PASS 현재 세션 종료 | 계약 동일(Glyco와 같은 분기) | 계약 동일 | PASS 현재 세션 유지 | 해당 없음 |
| ⑦ | 표시명·공통 UI 노출 | PASS | PASS | PASS | PASS | PASS |
| ⑧ | `MembershipGate` 동일 URL 안내 UX | — | — | — | — | PASS |
| ⑨ | 관리자·운영자·일반 회원 접근 경계 | PASS | PASS | PASS | PASS | PASS |

세부 관측:

- **③ 판정 경로**: `createRouteGuard` 는 `isLoading → !isAuthenticated → fallback` 순서 그대로 동작.
  Neture `/operator` 에서 관측된 "접근 권한이 없습니다" 는 **로그인 상태의 역할 미보유** 판정이었고
  (저장된 JWT 의 roles 에 neture operator/admin 없음), 로그아웃 후 재확인 시 로그인 안내로 정상 전환.
- **⑤ GlycoPharm**: `/role-select` 에서 `운영자` 선택 → `/operator`, `약사` 선택 → `/store/hub` 로
  `GLYCOPHARM_DASHBOARD_MAP` 대로 이동. `useRoleSelection` 승격 후에도 동작 동일.
- **⑥ 분기 확인**: GlycoPharm(`clearSessionOnLogoutAll: false`) 은 "다른 기기 로그아웃" 후 현재 세션 유지,
  KPA(기본 `true`) 는 현재 화면 세션 종료 후 홈 이동 — 설정으로 흡수한 두 변형이 실제로 갈라져 동작함을 확인.
- **⑦ 표시명**: 5개 서비스 모두 `getUserDisplayName` 결과(`서철환`)가 노출. Pharmacy-Hub 매장 셸 포함.

## 3. 이번 공통화의 직접 회귀

**0건.** 수정·재배포한 코드 없음.

## 4. 기존 문제 (이번 범위 밖 · 보고만)

| 항목 | 근거 | 성격 |
|---|---|---|
| `E2E — Auth Runtime Regression` 3건 실패 (`[K-Cosmetics] 새로고침 시 /auth/me 중복 호출 없음`, `[K-Cosmetics] lazy session checkSession 트리거`, `[Neture] loading freeze 없음`) | 직전 커밋 `6bcae3d89` 에서 **동일 3건 + GlycoPharm 1건 = 4건** 실패. 2026-08-10 `66520eda6` 부터 연속 실패 | 기존 실패. 이번 커밋으로 4→3건 감소 |
| GlycoPharm `/store/hub` 에서 `TypeError: m?.includes is not a function` → ErrorBoundary | `StoreLayout.tsx` 의 `setError(err.message …)` 가 객체를 담아 `error?.includes` 가 터짐. 선행 404(`/glycopharm/stores/hub`) 가 트리거. 해당 파일 최종 변경은 `fe2bff51a` 로 이번 커밋 미접촉 | 기존 결함 (매장 미보유 계정에서 재현) |
| `logoutAll` 이 로컬 토큰을 지우지 않음 — KPA 는 "현재 기기도 로그아웃됩니다" 라고 안내하지만 새로고침 시 세션이 복원됨 | `useServiceAuth.logoutAll` 은 `setUser(null)` 만 수행. 커밋 전에도 동일(`f05cb81c0` diff 는 `if (clearSessionOnLogoutAll)` 조건만 추가) | 기존 결함 · 인증 계약 판단 필요 → 별도 WO |

## 5. 결론

인증 컨텍스트·라우트 가드 공통화(`f05cb81c0`)는 **5개 서비스 프로덕션에서 기존 동작을 그대로 유지**한다.
직접 회귀 0건이므로 해당 WO 를 최종 종료한다.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§4 GlycoPharm StoreLayout 오류표시, `logoutAll` 로컬 토큰 처리)
