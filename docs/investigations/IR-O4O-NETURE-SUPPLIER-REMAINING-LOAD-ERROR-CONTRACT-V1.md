# IR-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1

> **성격:** Neture 공급자 측 잔여 조회-실패-삼킴(load-error) 계약화 — 묶음 4. frontend-only.
> **작성일:** 2026-07-27
> **선행:** IR-O4O-NETURE-LOAD-ERROR-CONTRACT-FINAL-VALIDATION-V1 §3-E (공급자 잔여 6항목).
> **판정:** 구현 완료 (확정 결함 4함수 정비 · 의도적 fail-open 2건 유지 · backend/DB 변경 0).

---

## 1. Executive Summary

시리즈 표준(실패→고정 코드 throw / 정상 0건만 성공 통과 / 화면 loading·error·empty·data 4상태 + 재시도 / 서버 원문 미노출)을 공급자 측 잔여 6항목에 적용했다. 각 항목을 **확정 결함(정비)** vs **의도적 fail-open(유지)** 로 분류하고, 소비 화면과 백엔드 계약을 근거로 판단했다.

- **확정 결함 4함수 정비:** `getProfile` · `getCompleteness` · `getApplications`(supplier.ts) · `fetchSupplierSignageList`(supplierSignage.ts).
- **의도적 fail-open 2건 유지:** `supplierCopilotApi.*`(대시보드 하단 접힘 보조 위젯) · `fetchSupplierScreenSet`+mutations(이미 계약 준수 = 참조 모델).
- 소비 화면 3종 정비: `SupplierProfilePage` · `SupplierRecruitmentDetailPage` · `SupplierSignagePage`.
- 무변경이 정답인 소비 화면 2종: `SupplierActivationGate`(throw 전환으로 의도된 fail-open 자동 실현) · `SupplierDashboardPage`(`Promise.allSettled` 기반 영역별 fail-open 설계 유지).
- backend / DB / migration / 공통 `call()` 헬퍼 / dependency / 운영 write 변경 0.

---

## 2. 6항목 분류 (근거: 소비 화면 + 백엔드 계약)

| # | 함수 | 기존 삼킴 | 백엔드 계약 | 판정 | 조치 |
|---|------|:---:|------|------|------|
| 1 | `supplierProfileApi.getProfile` | `catch→null` | `requireLinkedSupplier` 뒤 → 항상 200-object, 404/500=오류. 200+null 성공 없음 | **결함** | 고정코드 throw + shape guard |
| 2 | `supplierProfileApi.getCompleteness` | `catch→null` | 404 SUPPLIER_NOT_FOUND / 500. 200+null 성공 없음 | **결함**(소비처 0=dead) | throw 로 정렬(형제 함수 일관성) |
| 3 | `supplierRecruitmentApi.getApplications` | `catch→null` | 404 NOT_FOUND(미존재/타인) vs 500. 200 항상 객체(신청0=`[]`) | **결함** | 404 전용 코드 vs LOAD_FAILED 분리 |
| 4 | `fetchSupplierSignageList` | 200-non-array→`undefined` | list, `[]`=정상 빈 | **결함**(빈상태 위장 + `.length` 크래시 잠재) | screenSets 템플릿 미러(array guard+throw) |
| 5 | `fetchSupplierScreenSet` + mutations | throw(정상) | — | **유지** | 이미 계약 준수 = 참조 모델. 변경 0 |
| 6 | `supplierCopilotApi.getProductPerformance/getDistribution/getTrendingProducts` | `catch→[]` | list | **유지** | 의도적 fail-open. 변경 0 |

**의도적 fail-open = 2건(#5 이미 준수, #6 접힘 보조 위젯).** 나머지 4건은 실패를 "정상 없음/0건" 으로 위장하던 anti-pattern.

---

## 3. 항목별 상세

### #1 getProfile (supplier.ts) — 결함 → throw

**백엔드(supplier-management.controller.ts):** `requireLinkedSupplier` 뒤이므로 연결 공급자 행은 항상 존재 → 200 + `data:{...}`(필드는 null 가능). 404 SUPPLIER_NOT_FOUND / 500 은 오류. 즉 클라이언트의 `null` 은 **오직 오류 조건**이며 "정상 미존재" 가 아니다. `getOnboarding`(이미 throw 로 정비됨, supplier.ts:1436~)과 동형 계약.

**정비:** `catch → throw SUPPLIER_PROFILE_LOAD_FAILED`(console.warn 만, 서버 원문 미노출) + 응답 shape guard(비객체/배열/null→throw). 반환 타입 `Promise<SupplierProfile | null>` → `Promise<SupplierProfile>`.

**소비처 3 + 부수 2 영향:**
- `SupplierActivationGate.tsx:74` — 기존 `.catch(()=>setFetchFailed(true))` 가 **도달 불가**였다(getProfile 이 throw 안 함). 헤더 주석(§15-16)은 "프로필 실패 시 fail-open" 을 명시하나, `null` 이 `active=false` 로 흘러 오히려 **fail-closed**(ACTIVE 공급자에게 "승인 필요" 게이트 표시)로 깨져 있었다. throw 전환으로 `.catch` 가 도달 → `fetchFailed=true` → gate 모드 `!active && !fetchFailed`=false → children 렌더(의도된 fail-open 실현). **화면 코드 변경 없이 자동 정상화.**
- `SupplierProfilePage.tsx:173` — `Promise.allSettled` 소비. 기존: reject→null→"프로필을 찾을 수 없습니다"(재시도 없음, 오류를 미존재로 위장). 정비: `profileLoadError`(=profileRes.rejected) 상태 + 오류·재시도 패널을 "찾을 수 없습니다" 앞에 분리.
- `SupplierDashboardPage.tsx:212` — `Promise.allSettled` + `settled(ops[4],null)`. 프로필은 **영역별 fail-open 설계**(`profileComplete` 미확인 시 true, "확인할 수 없음")로 의도됨. throw→rejected→null→기존 fail-open 표시 유지 → **변경 0**.
- `SupplierProductsListPage.tsx:478`(범위 밖) — `.then().catch(()=>{})`. throw→catch 흡수, `status` 만 읽음. 안전.
- `SupplierStoreDescriptionsPage.tsx:57`(범위 밖) — `.then(setProfile).catch(()=>{})`. 안전.

### #2 getCompleteness (supplier.ts) — dead code, throw 로 정렬

소비처 0(Grep 확인 — `getCompletenessBadge` 는 무관한 로컬 함수). 형제 함수 `getProfile` 와 동형이라 일관성 위해 `throw SUPPLIER_PROFILE_COMPLETENESS_LOAD_FAILED` + shape guard 로 정렬. 소비처가 없어 회귀 0. 향후 배선 시 계약 준수.

### #3 getApplications (supplier.ts) — 결함 → 404 vs LOAD_FAILED 분리

**백엔드(partner-recruitment.controller.ts):** 404 NOT_FOUND(모집 미존재/타인 소유) vs 500 INTERNAL_ERROR. 200 은 항상 RecruitmentDetail(신청 0건이면 `applications:[]`). 200+null 성공 없음.

**정비:** `getShipment`(supplier.ts:1159, status===404 분기) 모델을 따름. `catch`: `isNotFound(error)` → `SUPPLIER_RECRUITMENT_NOT_FOUND`, else `SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED`. shape guard 추가. 반환 `Promise<RecruitmentDetail>`.

**소비처(SupplierRecruitmentDetailPage.tsx):** 기존 `if(!data) setNotFound`. 404·500 모두 "모집을 찾을 수 없습니다" 로 붕괴. 정비: try/catch — 404 코드→`notFound`, 그 외→`loadError`(재시도 패널). 두 상태 분리 렌더.

### #4 fetchSupplierSignageList (supplierSignage.ts) — 결함 → screenSets 미러

공통 `call<T>()` 은 4xx/5xx/네트워크는 throw 하나 200-non-array 시 `undefined` 반환 → 목록 `.length` 접근 크래시 잠재 + 빈상태 위장. **`fetchSupplierScreenSets`(screenSets.ts:70-83)** 가 유일하게 array guard+고정코드 throw 를 이미 갖춘 참조 템플릿. 동일 규칙으로 `SUPPLIER_SIGNAGE_LOAD_FAILED` const + try/catch throw + `Array.isArray` guard 추가. **공통 `call()` 은 변경하지 않음**(screenSets.ts:66 규칙 준수 — 목록 함수에서만 검증).

**소비처(SupplierSignagePage.tsx):** 기존 실패를 `message` 토스트(뮤테이션 피드백과 공용)로만 알려 사라지면 빈상태와 구분 불가. 정비: `loadError` 지속 상태 분리 — 빈목록시 오류 패널+재시도(빈상태 메시지 숨김), 기존목록 유지 재조회 실패시 상단 스트립(§7). 뮤테이션 토스트는 그대로.

### #5 fetchSupplierScreenSet + mutations — 유지(참조 모델)

detail·mutations 모두 `call()`→throw. 소비처 `SupplierTabletScreenSetsPage` 는 `sets: T[]|null` + `loadError` 지속상태 + 재시도 + 뮤테이션 성공/실패 토스트 + publish `err.code` 매핑까지 계약을 완비. 변경 불요 — signage 화면 정비의 UX 모델로 사용.

### #6 supplierCopilotApi.* — 유지(의도적 fail-open)

`getProductPerformance/getDistribution/getTrendingProducts` 는 대시보드 **하단·기본 접힘 "AI·분석" 섹션**의 fire-and-forget 보조 위젯(SupplierDashboardPage.tsx:265-269). 주 KPI/주문/정산 데이터는 별도 `AreaLoadError` throw+재시도 계약을 가지며, copilot 은 의도적으로 그 밖. "일부 API 실패가 전체 대시보드를 무너뜨리지 않는다"(:19) 설계. `[]`→양성 빈상태. **변경 0.**

---

## 4. 신규 오류 코드

| 코드 | 함수 |
|------|------|
| `SUPPLIER_PROFILE_LOAD_FAILED` | getProfile |
| `SUPPLIER_PROFILE_COMPLETENESS_LOAD_FAILED` | getCompleteness |
| `SUPPLIER_RECRUITMENT_NOT_FOUND` | getApplications (404) |
| `SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED` | getApplications (기타 실패) |
| `SUPPLIER_SIGNAGE_LOAD_FAILED` | fetchSupplierSignageList |

---

## 5. 오류 주입 매트릭스 (코드 경로)

| 시나리오 | 결과 |
|----------|------|
| 정상 0건 (200 `[]`/빈객체) | 성공 통과 → 빈 상태 |
| 정상 데이터 | 렌더 |
| profile 500/네트워크 | throw → ProfilePage 오류+재시도 / Gate fail-open(children) / Dashboard "확인할 수 없음" |
| applications 404 | `SUPPLIER_RECRUITMENT_NOT_FOUND` → "모집을 찾을 수 없습니다" |
| applications 500/네트워크 | `..._LOAD_FAILED` → 오류+재시도 |
| signage 200-non-array | `SUPPLIER_SIGNAGE_LOAD_FAILED` → 오류 패널(크래시 0) |
| signage 재조회 실패(목록 존재) | 상단 스트립 + 기존 목록 유지(§7) |
| copilot 실패 | `[]` fail-open(의도) |
| 오류+빈 상태 동시 렌더 | 0 (loadError 시 빈상태 억제) |
| unhandled rejection / 로딩 고착 | 0 (모든 소비처 catch/allSettled + finally) |
| 운영 write | 0 |

---

## 6. typecheck·build

| 앱 | tsc --noEmit | vite build |
|----|:---:|:---:|
| @o4o/web-neture | EXIT 0 | EXIT 0 (14.15s) |

---

## 7. 범위 제외 (준수)

- backend / DB / migration / 공통 `call()` 헬퍼 / dependency / 운영 write: **0**.
- 다른 세션 파일(otc-*/hff-*/pnpm-lock/otc-safety): 미변경.
- 의도적 fail-open(#5·#6)은 근거와 함께 유지 — 무리한 throw 전환 안 함.

---

## 8. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/supplier.ts` | getProfile/getCompleteness/getApplications throw 계약 + 4 신규 코드 |
| `services/web-neture/src/lib/api/supplierSignage.ts` | fetchSupplierSignageList array guard+throw + 신규 코드 |
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | profileLoadError 상태 + 오류·재시도 패널, fetch→useCallback |
| `services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | 404(notFound) vs loadError(재시도) 분리 |
| `services/web-neture/src/pages/supplier/SupplierSignagePage.tsx` | loadError 지속상태 + 오류 패널/스트립 + 재시도 |

CHECK: `docs/checks/CHECK-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1.md`

---

*판정: 구현 완료 · 확정 결함 4함수 정비 · 의도적 fail-open 2건 근거 유지 · backend/DB 변경 0*
