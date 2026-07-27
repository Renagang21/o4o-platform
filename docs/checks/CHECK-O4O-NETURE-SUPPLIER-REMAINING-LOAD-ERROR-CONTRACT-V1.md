# CHECK-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1

> **대상 WO:** WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1 (묶음 4 — 공급자 프로필·신청·사이니지·스크린셋 잔여 정비)
> **IR:** `docs/investigations/IR-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1.md`
> **검증일:** 2026-07-27
> **판정:** GREEN — 확정 결함 4함수 정비 · 의도적 fail-open 2건 유지 · tsc/build EXIT 0 · backend/DB 변경 0

---

## 1. 시리즈 계약 준수 체크리스트

| 항목 | 결과 |
|------|:---:|
| 실패 → 고정 코드 throw (서버 원문 미노출) | ✅ 5 코드, console.warn 만 |
| 정상 0건(200 빈)만 성공 통과 | ✅ |
| 화면 4상태 분리 (loading/error/empty/data) | ✅ 3화면 |
| 재시도가 상태 보존 | ✅ |
| keep-data-on-refetch-failure | ✅ signage §7 스트립 |
| 오류 상태에서 빈상태 메시지 억제 | ✅ |
| additive / backward-compatible | ✅ |
| 공통 `call()` 헬퍼 무변경 | ✅ |
| backend / DB / migration / dependency / 운영 write | ✅ 0 |
| 다른 세션 파일 미변경 | ✅ |

---

## 2. 6항목 판정

| # | 함수 | 판정 | 조치 |
|---|------|------|------|
| 1 | getProfile | 결함 | throw + guard |
| 2 | getCompleteness | 결함(dead) | throw 정렬 |
| 3 | getApplications | 결함 | 404 vs LOAD_FAILED 분리 |
| 4 | fetchSupplierSignageList | 결함 | array guard + throw |
| 5 | fetchSupplierScreenSet + mutations | 유지 | 참조 모델(이미 준수) |
| 6 | supplierCopilotApi.* | 유지 | 의도적 fail-open |

---

## 3. 핵심 인사이트 — getProfile throw 가 Gate 버그 자동 정정

`SupplierActivationGate.tsx` 헤더 주석은 "프로필 조회 실패 시 fail-open(children 렌더)" 를 명시하나, 기존 `getProfile catch→null` 때문에 `.catch(()=>setFetchFailed(true))` 가 **도달 불가**였고, `null` 이 `active=false` 로 흘러 ACTIVE 공급자에게 게이트를 띄우는 **fail-closed** 로 깨져 있었다. getProfile 을 throw 로 바꾸자 `.catch` 가 도달 → `fetchFailed=true` → 의도된 fail-open 실현. **Gate 화면 코드 변경 0.** 마찬가지로 `SupplierDashboardPage` 의 `Promise.allSettled` 영역별 fail-open 도 변경 0 으로 유지.

---

## 4. 빌드 검증

```
cd services/web-neture
npx tsc --noEmit   → EXIT 0
npx vite build     → EXIT 0 (✓ built in 14.15s)
```

---

## 5. 변경 파일 (5)

- `services/web-neture/src/lib/api/supplier.ts`
- `services/web-neture/src/lib/api/supplierSignage.ts`
- `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx`
- `services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx`
- `services/web-neture/src/pages/supplier/SupplierSignagePage.tsx`

## 6. 무변경 확인 파일 (근거 기록)

- `SupplierActivationGate.tsx` — throw 전환으로 자동 정상화
- `SupplierDashboardPage.tsx` — allSettled fail-open 설계 유지
- `supplierScreenSets.ts` / `SupplierTabletScreenSetsPage.tsx` — 참조 모델

---

## 7. 배포 · 스모크

| 단계 | 상태 |
|------|------|
| commit + push | 본 커밋 |
| Cloud Run 배포 (deploy-neture) | 커밋 후 CI/CD |
| 프로덕션 스모크 | 엔드포인트 게이팅(401) / Playwright(프로파일 여유 시) |

---

*판정: GREEN · 묶음 4 완료 · 시리즈 잔여 소진*
