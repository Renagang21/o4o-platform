# CHECK-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1

> 승인된 매장 경영자가 약국 staff 콘텐츠 API 에서 잘못 차단(403 "Not the store owner")되던 결함 수정 검증.
>
> WO: `WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1`
> 선행 조사: [`IR-O4O-KPA-OPERATOR-STORE-SHARED-FUNCTION-LIVE-UX-VALIDATION-V1 §4.6`](../ir/IR-O4O-KPA-OPERATOR-STORE-SHARED-FUNCTION-LIVE-UX-VALIDATION-V1.md)
> 작성일: 2026-06-27
> 상태: 구현·배포·smoke 완료 (PASS — 결함 해소). 커밋 `d6134eea1` + `bb1986d74`(가드 결정화) + `96997db8f`(IR 정정)

---

## 1. Summary

O4O 정책: 매장 경영자가 가입 신청 → 운영자 승인 시 별도 소유자 지정 없이 즉시 내 매장 이용 가능. 따라서 "매장 소유" SSOT 는 **생성자(created_by)** 가 아니라 **승인 결과(`role_assignments.kpa:store_owner`, RBAC F9)** 다.

`o4o-store` 의 blog/pop/qr/video staff 컨트롤러가 소유권을 `created_by_user_id === userId` 로 검사한 탓에, 승인된 약국 경영자라도 약국 레코드 생성자가 아니면 **403 "Not the store owner"** 가 발생했다(라이브 IR §4.6 에서 `renagang21` 실측). 이를 RBAC role 게이트 + 매장-특정 멤버십 매칭으로 교체했다.

**범위: KPA 전용**(`serviceKey === 'kpa'`). GlycoPharm/K-Cosmetics 는 동일 결함이 잠재하나 기존 `created_by` 유지 — 별도 parity WO. **교차 매장 차단은 유지/강화**.

검증: api-server `tsc` 0 errors(본 변경분) · 프로덕션 배포 후 라이브 smoke PASS.

---

## 2. 근본 원인 (read-only 확정)

| 항목 | 확인 |
|---|---|
| 차단 코드 | `o4o-store/controllers/{blog,pop,qr,video}.controller.ts` `verifyOwner = pharmacy.created_by_user_id === userId` (blog ~9곳, pop 5, qr 1, video 4) |
| 정답 SSOT | `isStoreOwner(ds, userId, 'kpa')` → `role_assignments.kpa:store_owner` (`utils/store-owner.utils.ts`). store-content.controller 는 이미 마이그레이션됨(`WO-O4O-KPA-STORE-CONTENT-STORE-OWNER-GUARD-FIX-V1`) |
| renagang21 데이터 | JWT roles 에 **`kpa:store_owner` 보유**, me-context org `c92b857f`("테스트 약국", `organizationRole=owner`) → **순수 코드 게이트 결함, 데이터/백필 아님** |
| 결론 | 승인 경영자(role 보유)인데 약국 생성자가 아니라 403 → 정책 위반 결함 |

---

## 3. 수정 내용

### 3.1 신규 헬퍼 `o4o-store/utils/kpa-store-owner.util.ts`
`kpaStoreOwnerOwnsStore(ds, userId, storeId)`:
1. **role 게이트**: `isStoreOwner(ds, userId, 'kpa')` — `kpa:store_owner` 미보유 시 false.
2. **매장-특정 멤버십**(결정적): `organization_members WHERE user_id=$1 AND organization_id=$2(=storeId) AND role IN ('owner','admin','manager') AND left_at IS NULL`. → "사용자의 임의 org(LIMIT 1)" 가 아니라 **storeId 를 직접 조건**에 넣어 다중 org 경영자의 비결정성/오차단 제거.
3. **kpa_members fallback**: `member.organization_id === storeId` (organization_members 미반영 승인 매장 대비, store-content 선례 동일 소스).
- Raw SQL parameter binding(CLAUDE.md §7 Guard Rule 2). KPA 전용.

> 초기 구현(`d6134eea1`)은 store-content 선례의 `resolveDualOrgId`(LIMIT-1 org) 를 그대로 차용했으나, 다중 org 사용자에서 본인 매장 오차단 위험이 있어 `bb1986d74` 에서 **매장-특정 직접 조회**로 결정화. (smoke 중 발견·교정.)

### 3.2 4개 컨트롤러
`verifyOwner` 를 async + KPA 분기로 교체:
```
async function verifyOwner(pharmacy, userId): Promise<boolean> {
  if (serviceKey === 'kpa') return kpaStoreOwnerOwnsStore(dataSource, userId, pharmacy.id);
  return pharmacy.created_by_user_id === userId; // GP/Cosmetics 유지
}
```
모든 호출부 `!verifyOwner(...)` → `!(await verifyOwner(...))`. 영어 `'Not the store owner'` → `'이 매장의 경영자만 접근할 수 있습니다.'`.

---

## 4. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/o4o-store/utils/kpa-store-owner.util.ts` | 신규 — KPA 매장 소유 판정 헬퍼(결정적 store-specific) |
| `.../o4o-store/controllers/blog.controller.ts` | verifyOwner async+KPA 분기, await, 한글 메시지 |
| `.../o4o-store/controllers/pop.controller.ts` | 동일 |
| `.../o4o-store/controllers/qr.controller.ts` | 동일 |
| `.../o4o-store/controllers/video.controller.ts` | 동일 |
| `docs/ir/IR-...-LIVE-UX-VALIDATION-V1.md` | §4.6/§7 정정(게이트→결함) |

> backend 기타/DB/migration/엔티티/프론트 무변경. GP/Cosmetics 소유 로직 무변경. neture market-trial tsc 에러는 **기존(타 세션) 무관**.

---

## 5. 배포 후 라이브 Smoke (프로덕션)

배포: Deploy API Server (Cloud Run) `28290058964`(초기) + `28290593033`(가드 결정화) 둘 다 success.

| 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|
| **renagang21(승인 경영자) → 본인 매장 blog/staff** | 200 (결함 해소) | **200** | ✅ 결함 FIX |
| renagang21 → 본인 매장 pop/staff · video/staff | 200 | **200 / 200** | ✅ |
| 브라우저: `/store/content/blog` "Not the store owner" 노출 | 없음 | **미노출**(EN/KO 모두), staff API 200 | ✅ #7 |
| sohae21(공유 테스트계정, 동일 매장 공동 org 멤버) → 같은 매장 | 200(정당 공동소유) | **200** | ✅ 누수 아님(공유 org 멤버십, 결정적 가드로 확인) |
| 토큰 없음 → blog/staff | 401 | **401** | ✅ |
| 미존재 slug → blog/staff | 404(STORE_NOT_FOUND) | **404** | ✅ |

> `tsc`: 본 변경 5파일 0 errors(전체 tsc 의 유일 에러는 무관한 `marketTrialController.ts` 기존 이슈).

---

## 6. 교차 매장 차단(완료조건 #5) — 구조적 보장 + 라이브 한계

- 가드는 **매장-특정 결정적 쿼리**(`organization_id = $storeId`)다. 해당 매장 org 의 owner/admin/manager 멤버가 아니면(그리고 kpa_members org 도 아니면) **false → 403**. 비멤버가 false-positive 를 얻을 경로가 없다(구조적 보장).
- **라이브 distinct-3rd-store 테스트는 미수행** — 현재 KPA 약국 테스트 계정(`renagang21`, `sohae21`)이 **동일 매장(네뚜레-약국)을 공동 소유**(둘 다 me-context/슬러그가 같은 매장으로 해석)하여, 서로를 "다른 매장"으로 쓸 수 없음. 제3 매장 슬러그를 확보하지 못함.
- **권고(follow-up)**: 서로 다른 매장을 가진 2개 약국 계정 확보 시, A→B 매장 staff API 403 라이브 확인 1회. 본 CHECK 는 구조적 보장 + 본인매장 200 + no-token 401 + 미존재 404 로 갈음.

---

## 7. 완료 조건 점검 (WO §)

| # | 조건 | 결과 |
|:--:|---|---|
| 1 | 승인 경영자 별도조치 없이 내 매장 블로그 이용 | ✅ renagang21 200 |
| 2 | 신규 승인 경로 소유권/권한 자동 설정 | ✅ `role_assignments.kpa:store_owner`(승인 시 부여) 를 SSOT 로 신뢰 — 추가 셋업 불필요 |
| 3 | 기존 승인 매장 데이터 점검 | ✅ renagang21 role+org 정상 → 코드 결함 확정(백필 불요) |
| 4 | created_by 잘못된 SSOT → 정식 role/org 권한 교체 | ✅ |
| 5 | 다른 매장 접근 차단 유지 | ✅ 결정적 store-specific 가드(구조적). 라이브 3rd-store 는 한계(§6) |
| 6 | 운영자/일반구성원/미승인 경계 유지 | ✅ role 게이트 + GP/Cosmetics created_by 유지 |
| 7 | 영어 "Not the store owner" 미노출 | ✅ 한글 메시지 + 승인 경영자는 애초 403 없음 |
| 8 | API negative smoke + 브라우저 smoke | ✅ §5 (positive/co-owner/401/404 + browser) |

---

## 8. Follow-ups
- GlycoPharm / K-Cosmetics 동일 `created_by` 결함 정비(별도 parity WO) — 본 WO 는 KPA 한정.
- `o4o-store/controllers/{kpa-store-template,layout}.controller.ts` 에도 `Not the store owner` 잔존(staff content 4종 외 surface) — 동일 패턴 점검 후보.
- 교차 매장 차단 distinct-3rd-store 라이브 확인 1회(§6).

---

**작성:** O4O Platform Team · 2026-06-27
**상태:** 결함 해소 PASS — 승인 매장 경영자 정상 이용 확인, role 기반 SSOT + 결정적 store-specific 가드. 라이브 cross-store 3rd-store 만 환경 한계로 보류.
