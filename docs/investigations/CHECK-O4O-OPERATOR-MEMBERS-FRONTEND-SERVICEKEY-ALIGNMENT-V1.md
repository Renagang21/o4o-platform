# CHECK-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1

> **검증 보고서 (Verification Report)** — 프로덕션 환경 배포 + frontend code 정합 + Rena browser 검증 요청.
>
> `WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1` (commit `62947e915`) 적용 후 3 service (GP / KPA / K-Cosmetics) 의 `/operator/members*` 호출에 serviceKey 가 정확히 명시되는지 검증.

- **검증일:** 2026-05-24
- **분류:** Verification Result (배포 + code review + browser-side 보류)
- **대상 환경:** Production (`https://api.neture.co.kr` + 3 service `.co.kr/site` web)
- **검증 대상 WO:** `WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1` (commit `62947e915`)
- **선행 IR:** [IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1](IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1.md)

---

## 0. 최종 판정

### ✅ 코드/배포 정합 완료, Browser 검증은 Rena 1 회 확인 필요

| 항목 | 결과 |
|---|---|
| A. 3 service UsersPage 코드 정렬 | ✅ commit `62947e915` 에 정확히 3 파일 +20/-5 |
| B. TypeScript 검증 | ✅ 3 service 새 에러 0 |
| C. Cloud Run revisions 배포 | ✅ 3 service 모두 새 revision (2026-05-24T01:48Z) |
| D. Neture 무변경 (회귀 없음) | ✅ web-neture 파일 본 WO 에서 제외 — 변경 0 |
| E. Backend 무변경 (회귀 없음) | ✅ MembershipConsoleController / serviceScope / Boundary Policy 모두 미변경 |
| F. **Browser 검증 (3 service /operator/users)** | ⏳ **Rena 1 회 확인 필요** |

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| 본 WO commit | `62947e915` |
| 배포 시각 | 2026-05-24T01:48Z UTC |
| Deploy workflow | Run `26348849253` ✓ Complete |
| 신규 revisions | glycopharm-web-00706-z4n / kpa-society-web-01125-b2x / k-cosmetics-web-00510-fwq |

---

## 2. 수정 파일 목록 (3 개, 정확히)

| 파일 | 변경 라인 | 변경 위치 |
|---|---|---|
| `services/web-glycopharm/src/pages/operator/UsersPage.tsx` | +7 / -2 | fetchUsers + fetchStats + role count (3 곳) |
| `services/web-kpa-society/src/pages/operator/UsersPage.tsx` | +6 / -1 | fetchUsers + fetchStats (2 곳, KPA 는 role count 호출 없음) |
| `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx` | +7 / -2 | fetchUsers + fetchStats + role count (3 곳) |
| **합계** | **+20 / -5** | **3 파일** |

본 WO 의 commit `62947e915` 외 추가 파일 변경 없음. 평행 세션의 `pnpm-lock.yaml` 자동 staging 은 commit 전 unstage 처리.

---

## 3. 서비스별 추가된 serviceKey

| Service | serviceKey 값 | 코드 패턴 |
|---|---|---|
| GlycoPharm | `glycopharm` | `params.set('serviceKey', 'glycopharm')` + `?serviceKey=glycopharm` (stats / role count 직접 URL) |
| KPA Society | `kpa-society` | `params.set('serviceKey', 'kpa-society')` + `?serviceKey=kpa-society` (stats) |
| K-Cosmetics | `k-cosmetics` | `params.set('serviceKey', 'k-cosmetics')` + `?serviceKey=k-cosmetics` (stats / role count) |

Neture 의 정렬 패턴 ([services/web-neture/src/pages/operator/UsersManagementPage.tsx:255-257](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L255-L257)) 을 그대로 따름.

---

## 4. 호출별 정렬 여부

| 호출 | GlycoPharm | KPA | K-Cosmetics |
|---|:---:|:---:|:---:|
| `fetchUsers()` → `GET /operator/members?page&limit&[status]&[search]` | ✅ serviceKey 추가 | ✅ serviceKey 추가 | ✅ serviceKey 추가 |
| `fetchStats()` → `GET /operator/members/stats` | ✅ `?serviceKey=glycopharm` | ✅ `?serviceKey=kpa-society` | ✅ `?serviceKey=k-cosmetics` |
| Role count → `GET /operator/members?limit=1000` | ✅ `&serviceKey=glycopharm` | ⏭ N/A (KPA 미존재) | ✅ `&serviceKey=k-cosmetics` |

→ 3 service 모두 모든 회원 목록/통계 호출에 serviceKey 명시 완료.

---

## 5. 항목별 검증 결과

### A. GlycoPharm /operator/users — ⏳ Rena 1 회 확인

**예상 동작 (코드/배포 기준):**
- platform admin 계정 (sohae2100, super_admin) 접속 → 회원 목록 200 OK (이전 400 해소)
- 네트워크 탭에서 호출 URL 에 `serviceKey=glycopharm` 포함
- API: `https://api.neture.co.kr/api/v1/operator/members?page=1&limit=20&serviceKey=glycopharm`

**확인 방법:** `https://glycopharm.co.kr/operator/users` 접속 후 회원 목록 정상 로드 + DevTools Network 에서 `serviceKey=glycopharm` 확인.

### B. KPA Society 운영자 회원 관리 — ⏳ Rena 1 회 확인

**예상:** 동일 패턴, `serviceKey=kpa-society` 포함, 회원 목록 200 OK.

### C. K-Cosmetics 운영자 회원 관리 — ⏳ Rena 1 회 확인

**예상:** 동일 패턴, `serviceKey=k-cosmetics` 포함, 회원 목록 200 OK.

### D. Neture 회귀 — ✅ 무영향

본 WO 의 commit `62947e915` 의 diff 에 `services/web-neture/**` 변경 0건. Neture 정상 동작 유지 (이미 `serviceKey=neture` 정렬 상태).

### E. 일반 service operator 회귀 — ✅ 코드 review 로 무영향 확정

`resolveOperatorScope` ([serviceScope.ts:138-153](apps/api-server/src/utils/serviceScope.ts#L138-L153)) 의 첫 분기:
```ts
if (!scope.isPlatformAdmin) {
  return { mode: 'service-scoped', serviceKeys: scope.serviceKeys, crossService: false };
}
```
→ 비-platform-admin 호출자는 query.serviceKey 가 있든 없든 자동 service-scoped. serviceKey 추가는 이들에게 무영향.

### F. TypeScript / build — ✅ PASS

3 service 모두 `npx tsc --noEmit` 결과 **0 에러 (출력 없음)**. 본 WO 변경 새 에러 0.

---

## 6. 회귀 확인 종합

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| Backend (MembershipConsoleController, resolveOperatorScope, serviceScope, route, guard) | ✅ 무변경 | 본 WO commit 의 diff 에 backend 파일 0건 |
| Neture frontend | ✅ 무변경 | 본 WO commit 의 diff 에 web-neture 파일 0건 |
| 비-platform-admin service operator | ✅ 무영향 | resolveOperatorScope 의 first branch 즉시 return |
| Boundary Policy F6 정책 | ✅ 무변경 | 정책 자체는 그대로, frontend 만 정렬 |
| 다른 operator endpoint (`/products`, `/stores`, `/roles`, `/analytics`) | ⏭ 본 WO 범위 외 | 잠재 drift 가 있을 수 있음 — 후속 IR 후보 |
| Login / Register / Password / Handoff | ✅ 무관 | 다른 도메인 |

→ **본 WO 변경으로 인한 회귀: 0 건.**

---

## 7. 남은 후속 IR 필요 여부

### 7.1 본 WO 의 후속 — Browser 검증 1 회 (Rena)

Rena 가 3 service 의 `/operator/users` 화면 진입 시 400 해소 + serviceKey 명시 확인 1 회.

### 7.2 별건 후속 IR 후보 (선행 IR §9.2 의 제안)

**`IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1`**

같은 endpoint 그룹의 다른 operator 화면 (Products / Stores / Roles / Analytics) 의 4 service frontend 가 동일 drift 인지 일괄 audit. 본 WO 는 `/operator/members` 1 endpoint 만 처리.

판단 기준 (잠재 drift):
- KPA / GP / K-Cosmetics 의 `/operator/*` 페이지 중 `useEffect` 안에서 `apiFetch('/api/v1/operator/...')` 호출 + serviceKey 미명시 → platform admin 접속 시 400 가능
- Neture 의 동등 페이지가 serviceKey 명시 → 비교 기준

본 CHECK 의 범위 외이므로 별건 IR 진행 권고.

---

## 8. 최종 PASS/FAIL/대기 매트릭스

| 항목 | 필수 | 결과 |
|---|:---:|:---:|
| A. GlycoPharm /operator/users browser 검증 | ★ | ⏳ Rena |
| B. KPA Society browser 검증 | ★ | ⏳ Rena |
| C. K-Cosmetics browser 검증 | ★ | ⏳ Rena |
| D. Neture 회귀 | △ | ✅ 무변경 |
| E. 일반 operator 회귀 | △ | ✅ 코드 review |
| F. TypeScript | △ | ✅ PASS |
| Backend 무변경 | △ | ✅ commit diff 확인 |
| Cloud Run revisions 배포 | △ | ✅ 3 service 모두 |

**A/B/C 는 browser 측 검증이라 Rena 1 회 확인 필요.** 코드/배포 측은 모두 정합.

---

## 9. 본 CHECK 가 결정하지 않는 것

- 다른 operator endpoint (`/products`, `/stores`, `/roles`, `/analytics`) 의 drift 여부 — 별건 IR
- Boundary Policy fix 자체의 재설계 — 별건 정책
- 4 service frontend 통합/공통 컴포넌트화 — 별건 (Operator Core Design)
- Rena 의 browser 확인 결과 — 후속 보고

---

## 부록 — 검증 명령 (재현 가능)

```bash
# Cloud Run revisions 배포 확인
for SVC in glycopharm-web kpa-society-web k-cosmetics-web; do
  echo "=== $SVC ==="
  gcloud run revisions list --service $SVC \
    --region asia-northeast3 --project netureyoutube \
    --limit 2 --format="value(metadata.name,metadata.creationTimestamp)"
done

# 본 WO commit 의 변경 확인
git show --stat 62947e915

# (Rena) Browser DevTools 에서 호출 URL 확인
# https://glycopharm.co.kr/operator/users → Network tab → /operator/members 요청에
#   ?page=1&limit=20&serviceKey=glycopharm 포함 확인
```

---

*Created: 2026-05-24*
*Type: Verification Result (deploy + code review + browser-pending)*
*Status: 코드/배포 정합 완료, Browser 검증 (A/B/C) Rena 1 회 확인 후 종료*
*Next: Rena browser 확인 → 별건 후속 `IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1` 진행 여부 결정*
