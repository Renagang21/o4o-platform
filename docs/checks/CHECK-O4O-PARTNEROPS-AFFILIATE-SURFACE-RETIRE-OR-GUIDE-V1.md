# CHECK-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1

> WO: `WO-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1`
> 선행: [`CHECK-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1`](CHECK-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1.md) (데모 데이터 위장 제거)
> 작업일: 2026-08-11 · 기준 commit: `c100b6f71` → 구현 commit: `dace0ed0a`
> 결과: **PASS**

---

## 1. 기준 commit · 범위

| 항목 | 값 |
|------|-----|
| 기준 commit | `c100b6f71` |
| 구현 commit | `dace0ed0a` (9 files, +135 / −1905) |
| 변경 범위 | `apps/admin-dashboard/src/pages/partnerops/**` (frontend only) |
| backend 변경 | **0건** (route mount · migration · schema · 권한 · manifest 모두 미변경) |

**판정 근거 (A안 채택)** — 직전 WO 에서 partnerops backend 는 route factory 만 있고 api-server 마운트가
0건임이 확인됐다(프로덕션 GET 5건 전부 404 + `text/html`). 여기에 `partnerops_*` (install hook) 와
partner-core `partner_*` 의 모델 분기, 그리고 전통 affiliate 수익·전환·자동 정산이 현재 O4O 방향과
맞지 않는다는 판단이 더해져 **backend 복구가 아니라 surface 통합**을 선택했다.

---

## 2. 안내 화면으로 전환한 route

`PartnerOpsRouter` 는 이제 `path="*"` 하나만 두고 모든 하위 경로를 `PartnerOpsGuidePage` 로 연결한다.

| # | 경로 | 이전 화면 | 현재 |
|:--:|------|------|------|
| 1 | `/partnerops/dashboard` | Dashboard (조회 실패 카드) | PartnerOps 안내 |
| 2 | `/partnerops/profile` | Profile (조회 실패 카드) | PartnerOps 안내 |
| 3 | `/partnerops/routines` | Routines (실패 카드 + disabled CTA) | PartnerOps 안내 |
| 4 | `/partnerops/routines/new` | Routines | PartnerOps 안내 |
| 5 | `/partnerops/routines/:id` | Routines | PartnerOps 안내 |
| 6 | `/partnerops/links` | Links (실패 카드 + disabled CTA) | PartnerOps 안내 |
| 7 | `/partnerops/links/new` | Links | PartnerOps 안내 |
| 8 | `/partnerops/conversions` | Conversions (실패 카드 + disabled CTA) | PartnerOps 안내 |
| 9 | `/partnerops/settlement` | Settlement (실패 카드 + disabled CTA) | PartnerOps 안내 |
| 10 | `/partnerops/ai-builder` | `AI Builder is coming soon...` | PartnerOps 안내 |
| 11 | `/partnerops/ai-builder/routine` | 〃 | PartnerOps 안내 |
| 12 | `/partnerops/ai-builder/recommend` | 〃 | PartnerOps 안내 |
| — | 그 밖의 `/partnerops/*` | Dashboard (catch-all) | PartnerOps 안내 |

catch-all 이 Dashboard 였던 기존 동작(임의 경로가 실패 화면을 여는 문제)도 함께 해소됐다.

---

## 3. 삭제 · 유지 파일

### 삭제 (참조 0건 확인 후)

| 파일 | 확인 |
|------|------|
| `pages/Dashboard.tsx` | 라우터 외 참조 0 |
| `pages/Profile.tsx` | 〃 |
| `pages/Routines.tsx` | 〃 |
| `pages/Links.tsx` | 〃 |
| `pages/Conversions.tsx` | 〃 |
| `pages/Settlement.tsx` | 〃 |
| `components/PartnerOpsLoadError.tsx` | 위 6개 페이지 전용 — 삭제로 참조 0 |

참조 확인 방법: `grep -rn "partnerops" apps/admin-dashboard/src` — 남은 소비처는
`routes/apps.routes.tsx` · `components/routing/ViewComponentRegistry.ts` 둘 다 **라우터만** 참조한다.

### 유지 (미변경)

| 대상 | 이유 |
|------|------|
| `routes/apps.routes.tsx` 의 `/partnerops/*` route | WO §1 B안 — route 자체는 비활성화하지 않는다 |
| `AdminProtectedRoute requiredRoles={['partner','admin']}` | 접근 통제 불변 |
| `AppRouteGuard appId="partnerops"` | app availability 게이팅 불변 |
| `ViewComponentRegistry` `partnerops.router` 등록 | 라우터 엔트리 그대로 |
| `packages/partnerops/**` (backend · lifecycle) | backend 무접촉 (WO §4) |
| app manifest / app_registry | 활성 상태 불변 |

### 신규

| 파일 | 내용 |
|------|------|
| `pages/partnerops/PartnerOpsGuidePage.tsx` | API 호출 0 · 버튼 0 · 입력 0 인 안내 화면 |

---

## 4. partnerops API 호출 0 확인

| 방법 | 결과 |
|------|:---:|
| 번들 문자열 — `partnerops/links` · `partnerops/settlement` · `partnerops/dashboard/summary` | **0 파일** |
| 번들 문자열 — `이 기능은 현재 운영 API 검증 전입니다` (직전 WO 문구) | **0 파일** |
| 실브라우저 — `performance.getEntriesByType('resource')` 중 partnerops API | **0건** (12경로 SPA 순회 + 직접 진입 모두) |
| `authClient.api.*` 호출 | 화면 소스에 **0건** (`PartnerOpsGuidePage` 는 import 자체가 없다) |

`데이터를 불러오지 못했습니다` 문자열은 번들에 2건 남아 있으나 `AdminForceAssetPage` ·
`AdminSnapshotBrowserPage` 의 것으로 partnerops 와 무관하다.

---

## 5. demo · failure · mutation surface 제거 확인

| 항목 | 결과 |
|------|:---:|
| 데모/가짜 데이터 | ✅ 0 (직전 WO 에서 제거, 이번에 화면 자체 제거) |
| 조회 실패 카드 노출 | ✅ 0 (API 를 호출하지 않으므로 실패 상태가 없다) |
| mutation CTA (생성·수정·삭제·게시·다운로드·내보내기) | ✅ 0 — 안내 화면의 `button` 개수 **0** |
| 입력 폼 (`input`/`select`/`textarea`) | ✅ 0 |
| 404 HTML 응답 | ✅ 0 |
| blank page | ✅ 0 (12/12 동일 안내 렌더) |

---

## 6. typecheck · build · 배포

| 항목 | 결과 |
|------|:---:|
| `pnpm run type-check` (admin-dashboard) | ✅ PASS |
| `VITE_API_URL=https://api.neture.co.kr/api pnpm run build:prod` | ✅ PASS (39.08s) |
| Deploy Admin Dashboard (Cloud Run) | ✅ PASS (run `31447011415` · success) |
| Deploy API Server | ⛔ 실행하지 않음 (backend 변경 0건) |

---

## 7. 실브라우저 smoke

계정: `sohae2100@gmail.com` (admin) — 자격증명 SSOT `docs/local/TEST-ACCOUNTS.local.md`
배포 스탬프: `배포 테스트 v3.0 · 2026. 8. 11. 오전 9:47:42` (commit `dace0ed0a` 리비전)
가드: `AdminProtectedRoute` → `AppRouteGuard appId="partnerops"` 통과 — app-disabled 리다이렉트 0건

12개 경로 전부 동일 결과:

| 관측 항목 | 값 |
|------|-----|
| `h1` | `PartnerOps 안내` (12/12) |
| 본문 길이 | 500자 (12/12 동일 — 경로별 분기 없음) |
| `main` 내 `button` | **0** (12/12) |
| `main` 내 입력 요소 | **0** (12/12) |
| partnerops API 호출 | **0건** |
| console error | **0건** (직접 진입 후 재확인 포함) |

노출 문구:

```text
PartnerOps는 현재 운영 API가 연결되지 않은 기능입니다.
O4O의 파트너/인플루언서 협업 방향은 별도 기획으로 정리 중입니다.
현재 이 화면에서는 링크 추적, 전환 분석, 자동 커미션 정산을 제공하지 않습니다.
```

직전 WO 대비 변화 — 이전에는 화면마다 `404` 상태 카드와 `console.error` 2건이 났으나,
이번 전환으로 **partnerops 화면의 console error 가 0** 이 됐다.

### 금지사항 준수 (§4)

| 금지 | 준수 |
|------|:---:|
| backend route mount | ✅ 없음 |
| partnerops backend 복구 | ✅ 없음 (`packages/partnerops/**` 미변경) |
| `partnerops_*` migration | ✅ 없음 |
| partner-core schema 변경 | ✅ 없음 |
| 정산 · 전환 · 커미션 엔진 구현 | ✅ 없음 |
| app manifest 활성/비활성 변경 | ✅ 없음 |
| 권한 · role 변경 | ✅ 없음 (guard 문자열 불변) |
| DB write | ✅ 없음 |
| 무관한 dirty 파일 · lockfile 스테이징 | ✅ 없음 (path-specific stage) |

---

## 8. commit · push

| 항목 | 값 |
|------|-----|
| 구현 commit | `dace0ed0a` |
| CHECK commit | 본 문서 커밋 |
| push | `c100b6f71..dace0ed0a` → `origin/main` 반영 완료 |
| 완료 조건 | WO 범위 미커밋 0건 · `HEAD == origin/main` |

---

## 9. 후속 후보 (본 WO 범위 아님)

1. `WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1` — 다음 순번 (사용자 지정)
2. `IR-O4O-PARTNEROPS-PACKAGE-RETIREMENT-SCOPE-V1` — `packages/partnerops` (backend · lifecycle · install DDL) 존치/은퇴 판단. 이번 WO 는 frontend surface 만 정리했고 패키지는 그대로다.
3. `IR-O4O-PARTNER-COLLABORATION-DIRECTION-V1` — 파트너/인플루언서 협업 방향 확정 후 화면 재설계 기준 수립
4. `WO-O4O-ADMIN-APP-REGISTRY-PARTNEROPS-STATUS-REVIEW-V1` — app_registry 의 partnerops active 상태를 유지할지 재검토 (manifest 변경은 본 WO 금지사항이었다)

---

## 10. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§9)
