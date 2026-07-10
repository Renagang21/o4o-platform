# CHECK-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1

> WO: `WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1`
> 선행 근거: `CHECK-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-UNMATCHED-FULL-AUDIT-AND-DISPOSITION-DRYRUN-V1` (Q11·Q12)
> 병행 정렬: `WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1` (commit 58e12778d)
> 성격: **프론트엔드 표시 정리** — DB write 0 / migration 0 / 백엔드 API 0 / 후보 상태변경·재매칭·승격 0
> 작업일: 2026-07-10

---

## 1. 목적

공공데이터 후보 화면(`admin/o4o-product-db/candidates`)에서 **이미 종료된 후보에 남아 있는 `unmatched` 기술 표시와, 식별자가 없는 후보의 불필요한 충돌·식별자 UI를 정리**한다. 데이터·상태·승격 로직은 건드리지 않고 화면 표시 규칙만 조정한다.

audit(선행 CHECK) 결론: `unmatched` 146,258건 중 19,604건은 종료(archived/approved)된 후보에 낡게 남은 값이며, `match_status` 는 등록완료/이력 행에서는 업무 의미가 없다.

---

## 2. 변경 내용

### 2.1 신규 공용 유틸 — `candidate-status.util.ts`
표시 규칙을 3개 화면이 공유하도록 단일 출처로 분리 (DB/상태 무변경, 표시 계산만).
- `CLOSED_CANDIDATE_STATUSES` = `approved_new_master · matched · linked · archived · rejected · merged`
- `matchStatusBusinessLabel(candidateStatus, matchStatus)`:
  - 종료 상태 → `null` (뱃지 미표시)
  - `unmatched`/`no_match` → **"기존 기본상품 없음"**
  - `conflict` → **"식별자 충돌 검토"**
  - `exact/possible_identifier_match` → "기존 기본상품 있음", `possible_text_match` → "유사 상품 있음", `manually_matched` → "수동 매칭됨"
- `isConflictCandidate(matchStatus)` = `matchStatus === 'conflict'`

### 2.2 목록 — `ProductCandidatesPage.tsx`
| WO 항목 | 변경 |
|---|---|
| ① 종료 상태 match 뱃지 숨김 + ③ 문구화 | `매칭 상태` 컬럼 → 헤더 **"기본상품 매칭"**, 렌더를 `matchStatusBusinessLabel` 로 교체. 종료 후보는 `—`(회색), 등록 전은 업무 문구 |
| ② 기본 진입 = 등록 전 중심 | `groupedStatus` 기본값 `''`(전체) → **`'before_registration'`** (URL 파라미터 있으면 우선) |
| ⑤ 상세 진입 라벨 | 행 액션 라벨을 실제 충돌 후보만 `상세·충돌 검토`, 일반 후보는 **`상세`** |
| ⑥ 종료·이력 조회 유지 | `등록 완료`/`제외` 필터 옵션 그대로 유지 — 숨김이 아니라 필터로 조회 |

### 2.3 상세 드로어 — `CandidateConflictDrawer.tsx`
| WO 항목 | 변경 |
|---|---|
| ⑤ 상세 제목 | 실제 충돌(`matchStatus==='conflict'`)일 때만 `후보 상세 · 충돌 검토`, 아니면 **`후보 상세`** |
| ④ 식별자 없으면 숨김 | `hasIdentifier`(식별자 값/정규화 값 존재) 가 false 면 **"동일 식별자 다른 후보"** + **"식별자 일치 기본상품"** 섹션 + 주요 원천값의 식별자 3필드 숨김 |
| ①③ match 표시 | `매칭 상태` 필드 → **"기본상품 매칭"**, `matchStatusBusinessLabel` 적용(종료면 `—`) |

> 유지: rawPayload 원천 보존/표시, 수동 매칭 검색, 신규 승격 게이트 안내(drug 전용), archive/제외/보류 액션 — **모두 무변경**.

### 2.4 (레거시) 상세 페이지 — `ProductCandidateDetailPage.tsx`
- `candidates/:id` 라우트(목록에서 직접 링크되지 않는 레거시)에도 일관성 위해 `매칭 상태` 필드를 `기본상품 매칭` + `matchStatusBusinessLabel` 로 정리. 기능·라우트 무변경.

---

## 3. 병행 WO 정렬 확인

`WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1`(58e12778d) 은 `ProductMastersPage.tsx`/`ProductMasterDetailPage.tsx` 를 정리(dead 선택 제거·QR placeholder 제거). 본 WO는 **`ProductCandidate*` / `CandidateConflictDrawer` 만** 수정하여 파일 충돌 없음. 화면 원칙 정렬:
- "동작하지 않는/의미 없는 UI 제거" 원칙 동일 적용 (여기서는 종료행 match 뱃지·식별자 없는 후보의 식별자 UI).
- 목록 선택/일괄 액션은 candidate 화면에서는 **실동작**(bulkCandidateAction)이므로 제거하지 않음(ProductMasters 의 dead 선택과 다름).

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| `git diff --check` | PASS (공백 오류 0) |
| `pnpm --filter @o4o/admin-dashboard type-check` | **PASS** (tsc --noEmit, 에러 0) |
| `pnpm --filter @o4o/admin-dashboard build:prod` | **PASS** (✓ built in 38.37s) |
| 잔여 raw `Badge value={*.matchStatus}` | 0 (전부 유틸 경유) |
| 잔여 무조건 `충돌 검토` 제목/라벨 | 0 (전부 조건부) |

### 4.1 실브라우저 smoke — **PASS** (2026-07-10, admin.neture.co.kr, Playwright)
배포(Deploy Admin Dashboard, run 29062367861 = success) 후 로그인(sohae2100@) → 사이드바 내비로 검증. 딥링크는 /login 튕김 → UI 내비 경유.
1. ✅ 진입 기본 = **등록 전**(`?groupedStatus=before_registration`, 셀렉트 "등록 전" selected), 총 **126,897건**.
2. ✅ 컬럼 헤더 = **"기본상품 매칭"**. 등록 전 후보: unmatched → **"기존 기본상품 없음"**(치관용 레진/재사용가능 안과용 겸자), conflict → **"식별자 충돌 검토"**(심미수복용 복합레진). **raw `unmatched` 미노출**.
3. ✅ `등록 완료`(registered) 필터: approved_new_master 행 `기본상품 매칭` = **`—`** (뱃지 숨김). 종료 후보는 필터로 정상 조회.
4. ✅ 식별자 없는 후보(의료기기 치관용 레진) 드로어: 식별자 필드 + **"동일 식별자 다른 후보"** + **"식별자 일치 기본상품"** 섹션 **숨김**, rawPayload/수동매칭/승격안내 유지.
5. ✅ 상세 제목: 일반(unmatched) = **"후보 상세"**, 충돌(conflict) = **"후보 상세 · 충돌 검토"** — 조건 분기 정상.
6. ✅ 종료·이력 후보 삭제 없이 `등록 완료`/`제외` 필터로 조회 유지.

증빙: 스크린샷 `candidate-cleanup-smoke.png` (등록 전 목록 — 헤더/뱃지 문구 확인).

---

## 5. 변경 파일

| 파일 | 구분 |
|---|---|
| `apps/admin-dashboard/src/pages/o4o-product-db/candidate-status.util.ts` | 신규 (공용 표시 유틸) |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx` | 수정 (목록) |
| `apps/admin-dashboard/src/pages/o4o-product-db/CandidateConflictDrawer.tsx` | 수정 (상세 드로어) |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidateDetailPage.tsx` | 수정 (레거시 상세) |
| `docs/checks/CHECK-...-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1.md` | 신규 (본 문서) |

---

## 6. 안전 확인 / 범위 준수

- DB write: **0** · migration: **0** · 백엔드 API: **0** · 후보 상태변경/재매칭/승격 파이프라인: **0** · 원천 데이터 삭제: **0**
- 프론트엔드 표시 로직만 변경 (신규 유틸 1 + 화면 3).
- audit 에서 발견된 `approved_new_master` back-link 누락·공통 승격 설계는 **본 WO 범위 밖**으로 미포함(별도 후속).
- 종료·이력 후보는 삭제하지 않고 `등록 완료`/`제외` 필터로 조회 유지.
- 타 세션 WIP(`pnpm-lock.yaml`)는 커밋에서 제외(path-specific).
