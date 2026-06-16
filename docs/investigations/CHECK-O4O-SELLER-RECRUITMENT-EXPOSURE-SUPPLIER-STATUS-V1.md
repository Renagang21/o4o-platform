# CHECK-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1

> 공급자 모집 현황 화면에 **서비스 노출 승인 상태(PENDING/APPROVED/REJECTED)** 와 안내 문구를 표시.
> **결과: PASS (조건부)** — API 응답 보강 + 공급자 목록/상세 표시 완료. 변경 파일 tsc 에러 0.
> ⚠️ web-neture 전체 build 는 **무관한 baseline 워크스페이스 깨짐**(병렬 세션 in-flight)으로 차단 — 아래 §8 참조.
> 선행: IR `dbd2ca435` / backend `67001e6fb,5d6ead8bc` / operator-UI `8996a97f2,3c7e78f14`
> 작업일: 2026-06-16 · 환경: 코드 정적 분석

---

## 1. 목적

운영자 노출 승인 모델이 도입된 뒤, 공급자가 "내 모집이 왜 아직 매장에 안 보이는지"를 확인할 수 있도록
공급자 모집 현황/상세에 **노출 승인 상태 + 안내 문구 + 반려 메모**를 표시한다. 조회·표시만 — 상태 변경 API 없음.

모델(분리된 두 축):
- `RecruitmentStatus`(status): 모집 운영 상태 — recruiting(모집중) / closed(마감)
- `ExposureStatus`(exposureStatus): 서비스 노출 승인 상태 — pending(노출 대기) / approved(노출 승인) / rejected(노출 반려)

---

## 2. 공급자 모집 API 조사 결과

| 항목 | 위치 | exposure 포함(전) |
|---|---|:---:|
| 목록 API | `GET /neture/partner/recruitments/mine` → `partner-recruitment.controller.ts:106` → `netureService.getSellerRecruitments` → `partner-contract.service.ts:243` | ❌ 미포함 |
| 상세 API | `GET /neture/partner/recruitments/:id/applications` → `partner-recruitment.controller.ts:166` → `getRecruitmentApplications` → `partner-contract.service.ts:469` | ❌ 미포함(recruitment 객체) |
| Entity | `NeturePartnerRecruitment.entity.ts` — `exposureStatus`, `exposureReviewedAt`, `exposureReviewedBy`, `exposureReviewNote` | ✅ 이미 존재 |

→ Entity 에는 4개 exposure 필드가 이미 있으나, **공급자 본인 조회 응답 매핑에서 누락**. 응답 보강만 필요(스키마/마이그레이션 불필요).

---

## 3. Backend — exposure fields 응답 보강

`apps/api-server/src/modules/neture/services/partner-contract.service.ts` 2곳에 매핑 추가(읽기 전용, ownership 조건 유지):

- `getSellerRecruitments`(목록): `exposureStatus / exposureReviewedAt / exposureReviewedBy / exposureReviewNote` 추가.
- `getRecruitmentApplications`(상세 `recruitment` 객체): 동일 4필드 추가.

노출 상태 변경 API 는 만들지 않음. 기존 `getPartnerRecruitments`(public browse, exposureStatus=APPROVED 강제)·operator console·apply gate 는 무변경.

---

## 4. Frontend — 타입 보강

`services/web-neture/src/lib/api/supplier.ts`:
- `type RecruitmentExposureStatus = 'pending' | 'approved' | 'rejected'` 신설.
- `SupplierRecruitment` + `RecruitmentDetail.recruitment` 에 `exposureStatus` + review 3필드(읽기 전용) 추가.

---

## 5. Frontend — 공급자 모집 현황(목록) 표시

`SupplierRecruitmentsPage.tsx`:
- 상단 안내 배너: "모집은 서비스 운영자의 노출 승인을 받은 뒤에야 매장/약국 사용자에게 보입니다. 노출 대기·노출 반려 상태는 노출되지 않습니다. (공급자가 직접 변경 불가)".
- "노출 승인" 컬럼 추가 — badge(노출 대기/노출 승인/노출 반려, 운영자 콘솔과 동일 라벨·색). REJECTED 행은 반려 메모를 truncate + title 로 표시.

---

## 6. Frontend — 공급자 모집 상세/신청자 보기 표시

`SupplierRecruitmentDetailPage.tsx`:
- 상단 요약 grid 에 "노출 승인" badge 추가.
- 노출 상태별 안내 배너(요약 하단, 조회 전용):
  - PENDING: "서비스 운영자가 모집 제품의 노출을 검토 중입니다. 승인 전에는 매장/약국 사용자에게 보이지 않습니다."
  - APPROVED: "이 모집은 서비스에 노출 중입니다. 매장/약국 사용자가 신청할 수 있습니다."
  - REJECTED: "서비스 운영자가 이 모집의 노출을 반려했습니다. 매장/약국 사용자에게 보이지 않습니다." + **반려 메모**(`exposureReviewNote`; 없으면 "반려 사유가 입력되지 않았습니다.").
- 일반 표현 사용("매장/약국 사용자") — Neture 공급자 화면이므로 약국 한정 표현 회피.

---

## 7. 상태 label / 문구

| exposureStatus | badge | 색 |
|---|---|---|
| pending | 노출 대기 | amber |
| approved | 노출 승인 | emerald |
| rejected | 노출 반려 | red |

(운영자 콘솔 `RecruitmentExposureConsole.tsx` 와 동일 라벨·색 — 일관성.)

---

## 8. 검증 결과

### 변경 파일 (총 4 코드 + CHECK)
```
apps/api-server/src/modules/neture/services/partner-contract.service.ts   (응답 2곳 보강)
services/web-neture/src/lib/api/supplier.ts                               (타입 보강)
services/web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx        (목록 표시)
services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx   (상세 표시)
```

### TypeScript
- **api-server `tsc --noEmit`**: 변경 파일(partner-contract.service.ts) 에러 **0**. ⚠️ 무관한 기존 baseline 에러 1건(`market-trial/marketTrialController.ts` CreateTrialDto.productId) — 본 WO 변경과 무관.
- **web-neture `tsc --noEmit`**: 변경 파일(supplier.ts / 2 page) 에러 **0**.

### ⚠️ web-neture build 차단 (무관 baseline)
- `pnpm --filter @o4o/web-neture build` 가 `packages/operator-core-ui/.../ProductApplicationManagementConsole.tsx: Cannot find module '@o4o/types'` 로 실패.
- 원인: `node_modules/@o4o/types` 워크스페이스 심볼릭 링크 부재(@o4o/types dist 는 존재). 작업 중 **병렬 세션이 `pnpm-lock.yaml`·`package.json` 을 수정 중(pnpm install in-flight)** 이라 워크스페이스 링크가 일시적으로 깨진 상태.
- **본 WO 변경과 무관**: 변경 4파일 어디도 operator-core-ui / @o4o/types 를 참조하지 않음(grep 확인). 워크스페이스 install 정상화(`pnpm install`) 후 재빌드하면 해소될 baseline 이슈로 판단. 병렬 세션 lock 변경과 충돌 방지를 위해 본 세션에서 `pnpm install` 미실행.

### Smoke
- 미배포 — 배포 후 권장: 공급자 로그인 → 판매자 모집 현황에서 PENDING="노출 대기"/APPROVED="노출 승인"/REJECTED="노출 반려" + 반려 메모, 신청자 보기 상세 동일 표시. 운영자 콘솔 승인/반려 → 공급자 화면 반영 연결 smoke.

---

## 9. 제외 범위 (WO §3 준수)

운영자 승인/반려 액션·권한, exposure model/enum, migration, RecruitmentStatus, browse/apply gate, operator console,
신청 흐름, C bridge, allowedSellerIds/OPL, 계약/RBAC, 가격, 알림/이메일, package.json/pnpm-lock.yaml — **전부 무변경**.

---

## 10. 완료 판정

| 완료 기준 | 충족 |
|---|---|
| 목록에 노출 승인 상태 표시 | ✅ |
| 상세/신청자 보기에 노출 승인 상태 표시 | ✅ |
| 노출 반려 시 반려 메모 표시 | ✅ |
| PENDING "승인 전 매장/약국 미노출" 안내 | ✅ |
| APPROVED 노출 중 안내 | ✅ |
| REJECTED 노출 반려 안내 | ✅ |
| 공급자 노출 상태 변경 불가 (액션 없음) | ✅ |
| operator approval UI/backend 무변경 | ✅ |
| C bridge/OPL/계약/RBAC/가격 무변경 | ✅ |
| migration 미추가 | ✅ |
| api-server typecheck(변경 파일) | ✅ (무관 baseline 에러 별도) |
| web-neture build | ⚠️ 무관 baseline(@o4o/types 링크) 차단 — 변경 파일 tsc 0 |
| CHECK 문서 | ✅ |
| path-specific commit | ✅ (4 코드 + CHECK만, 병렬 세션 파일 제외) |

**판정: PASS (조건부)** — 변경 자체 완료·격리 검증. web-neture 전체 build 그린 확인은 워크스페이스 install 정상화 후 권장.

---

## 11. Commit 기록 / 귀속 경위

- **실제 커밋: `c3b790851`** (변경 5파일 전부 포함 — partner-contract.service.ts +10 / supplier.ts +13 / SupplierRecruitmentDetailPage +48 / SupplierRecruitmentsPage +22 / 본 CHECK +135). origin/main push 완료.
- ⚠️ **귀속 경위(staging 오염)**: 본 WO 파일을 path-specific `git add` 한 뒤 commit 하는 사이, **병렬 세션이 `git add .`/커밋**(`WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2`)을 수행하여 본 WO 의 staged 파일들이 그 커밋(`c3b790851`)에 함께 포함됨. 내용 유실 0(stat 검증), 다만 **전용 커밋이 아닌 sanitize WO 커밋에 혼입**됨.
- 공유 main 에 이미 push + 병렬 세션 활발 → 안전상 history 재작성(force-push) 미수행. 기능/배포 영향 없음(변경 전부 live).
- 교훈: 병렬 세션 동시 작업 시 `git add` 와 `git commit` 사이 간격을 두지 말 것([[feedback-git-commit-workflow]]) — add→commit 단일 호출 + `git commit -- <paths>` 스코프 권장.
