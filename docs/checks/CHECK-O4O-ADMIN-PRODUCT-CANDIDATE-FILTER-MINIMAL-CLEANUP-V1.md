# CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-FILTER-MINIMAL-CLEANUP-V1

> WO: WO-O4O-ADMIN-PRODUCT-CANDIDATE-FILTER-MINIMAL-CLEANUP-V1
> 대상 화면: `admin.neture.co.kr` → O4O 상품 DB → 공공데이터 후보 (`/admin/o4o-product-db/candidates`)
> 선행: [CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2](CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2.md)
> 성격: 화면 필터 최소화 (read-only). DB write 0 / migration 0.

---

## 1. 핵심

공공데이터 후보 화면은 **"매칭 검토" 화면이 아니라 "공공데이터 후보가 O4O 기본상품 DB에 등록되었는지 흐름을 확인하는" 화면**이다.

- 상태 필터 → 등록 흐름 3단계(+전체): `전체 / 등록 전 / 등록 완료 / 제외`
- 매칭(matchStatus) 필터 → 일반 UI 에서 **제거** (API 파라미터는 호환 유지)

---

## 2. 변경 전 필터 구조

```text
상태:  전체 / 대기 / 검토 필요 / 등록 완료 / 제외   (V2, groupedStatus)
매칭:  전체 매칭 / unmatched / exact_identifier_match / possible_identifier_match
       / possible_text_match / conflict / no_match / manually_matched   (원시 matchStatus)
source: (유지)
검색/source_label: (유지)
```

## 3. 변경 후 필터 구조

```text
상태:  전체 / 등록 전 / 등록 완료 / 제외   (groupedStatus)
매칭:  (제거)
source: (유지)
검색/source_label: (유지)
```

---

## 4. 상태 필터 최종 매핑표

| 화면 표시 | groupedStatus 값       | 포함 원시 status                            |
| ----- | --------------------- | -------------------------------------- |
| 전체    | (없음)                   | 전체                                     |
| 등록 전  | `before_registration` | `pending`, `reviewing`                 |
| 등록 완료 | `registered`          | `matched`, `linked`, `approved_new_master` |
| 제외    | `rejected`            | `rejected`, `merged`, `archived`       |

### 표현 변경 사유 ("대기/검토 필요" → "등록 전")

이 화면 목적은 세밀한 매칭 상태 구분이 아니라 **기본상품 DB 등록 흐름 확인**이다. 운영자 관점에서는 3단계면 충분하다.

```text
등록 전   : 아직 O4O 기본상품 DB에 반영되지 않은 후보 (pending/reviewing)
등록 완료 : O4O 기본상품 DB에 반영된 후보
제외      : 넣지 않기로 했거나 종료 처리된 후보
```

`pending`(대기)과 `reviewing`(검토 필요)를 굳이 나눌 실익이 없어 `등록 전` 하나로 합쳤다.

---

## 5. 매칭 필터 제거 사유

```text
1. 현재 공공데이터 후보는 대부분 신규 후보 → 기존 상품과 매칭될 대상이 거의 없다.
2. 기존 O4O 기본상품 데이터가 적은 상황에서 matchStatus 는 운영 핵심 기준이 아니다.
3. possible_identifier_match / possible_text_match 는 참고값이지 별도 운영 큐가 아니다.
4. conflict 도 일반 후보 화면에서 별도 필터로 노출할 필요가 낮다.
5. 이 화면은 세밀한 매칭 검토 화면이 아니라 등록 흐름 확인 화면이다.
```

> row 단위 "매칭 상태" 컬럼(표시용 Badge)은 정보 제공 목적으로 **유지**한다. 제거 대상은 상단 **필터 select** 이다.

---

## 6. DB status / matchStatus 변경 없음

- DB 원시 `status` / `matchStatus` 값·의미 일절 변경 없음.
- candidate 데이터 수정 / migration / 대량 보정 없음.
- ProductMaster / ProductIdentifier 생성·수정 없음.
- 매칭 로직 / 자동 매칭 알고리즘 변경 없음.
- **DB write 0 / migration 0.**

## 7. 기존 API 호환 유지

| 파라미터 | 상태 |
| ---- | ---- |
| `status` (원시 단건) | 유지 |
| `groupedStatus` | 유지 + `before_registration` 키 추가. 기존 `pending`/`review_required`/`registered`/`rejected` 키도 그대로 둠 |
| `matchStatus` (원시 단건) | API/클라이언트 파라미터 유지 (일반 UI 에서만 미사용) |

- 일반 admin UI 에서는 `matchStatus` / `groupedMatchStatus` query 를 **생성하지 않는다.**
- 기존 URL 에 `matchStatus` 가 남아 있어도: 화면은 그 값을 읽지 않으며, URL sync 시 q 에 싣지 않아 다음 `replace` 에서 자동 제거된다. **화면은 깨지지 않는다.**

---

## 8. 구현 파일

| 계층 | 파일 | 변경 |
| ---- | ---- | ---- |
| Page | `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx` | 상태 select 4옵션(전체/등록 전/등록 완료/제외), `matchStatus` 필터 state·select·URL sync 제거 |
| Controller | `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `GROUPED_STATUS_MAP` 에 `before_registration: [pending, reviewing]` 추가 (기존 키 유지) |

> `o4o-product-db.api.ts` 는 `matchStatus`/`groupedStatus` 파라미터를 이미 지원(호환) → 변경 없음.

---

## 9. 검증 결과

| 항목 | 결과 |
| ---- | ---- |
| 상태 필터 4개(전체/등록 전/등록 완료/제외) | ✅ |
| 매칭 필터 UI 제거 | ✅ |
| `before_registration` = pending + reviewing 매핑 | ✅ (controller) |
| 기존 `status`/`matchStatus`/`groupedStatus` API 호환 | ✅ 유지 |
| admin-dashboard typecheck (`tsc --noEmit`) | ✅ PASS (exit 0) |
| api-server typecheck (변경 파일) | ✅ PASS (기존 `src/scripts/drug-otc-*` 무관 에러는 선존재) |
| DB write / migration / candidate 변경 | 0 / 0 / 0 |

### 배포 (Cloud Run, `5ffde7577`)

| 워크플로우 | 결과 |
| ---- | ---- |
| Deploy Admin Dashboard | ✅ success (run 29022423098) |
| Deploy API Server | ✅ success (run 29022422756) |

### Browser smoke (production, 2026-07-09) — ✅ PASS

`admin.neture.co.kr` 로그인 → client-side `/admin` → SPA 이동으로 `/admin/o4o-product-db/candidates`. Playwright headless.

| 항목 | 결과 |
| ---- | ---- |
| 상단 select 개수 2개 (상태 + source, 매칭 select 제거됨) | ✅ |
| 상태 select 4개 (전체 / 등록 전 / 등록 완료 / 제외) | ✅ 정확 일치 |
| 매칭 필터 옵션 부재 (`unmatched`/`전체 매칭` 없음) | ✅ |
| 각 그룹 선택 → `groupedStatus=` 사용, `matchStatus=` 미생성 | ✅ before_registration/registered/rejected 전부 |
| URL `?groupedStatus=` 반영 | ✅ |
| 등록 전 = pending + reviewing | ✅ grouped 126,897 = 126,897 + 0 |
| 등록 완료 = matched + linked + approved_new_master | ✅ grouped 251,815 |
| 제외 = rejected + merged + archived | ✅ grouped 15,779 |
| 기존 `matchStatus` API 호환 (`matchStatus=unmatched` → 200 success) | ✅ |
| console error / network 4xx·5xx | ✅ 0 / 0 |

---

## 10. 완료 기준 체크

- [x] 상태 필터 4개로 단순화 (전체 / 등록 전 / 등록 완료 / 제외)
- [x] 매칭 필터 일반 UI 에서 제거
- [x] DB write 0 / migration 0 / candidate 변경 0 / ProductMaster·Identifier 변경 0
- [x] 기존 API 호환성 유지
- [x] typecheck 통과
- [x] CHECK 문서 작성
- [x] commit / push (`5ffde7577`)
- [x] 배포 (Admin + API) success + 배포 후 smoke PASS
