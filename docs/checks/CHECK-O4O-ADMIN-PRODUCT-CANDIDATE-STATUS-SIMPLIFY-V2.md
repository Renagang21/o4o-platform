# CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2

> WO: WO-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2
> 대상 화면: `admin.neture.co.kr` → O4O 상품 DB → 공공데이터 후보 (`/admin/o4o-product-db/candidates`)
> 성격: 화면 상태 필터 단순화 (read-only). DB write 0 / migration 0.

---

## 1. 배경 / 문제

공공데이터 후보 화면의 상태 필터가 원시 DB status 8개(`pending`, `reviewing`, `matched`, `linked`, `approved_new_master`, `rejected`, `merged`, `archived`)를 그대로 노출해 운영자가 이해하기 어려웠다.

운영자가 이 화면에서 실제로 알고 싶은 것은 **후보가 O4O 기본 상품 DB에 반영되었는지 여부**뿐이다. `matched` / `linked` / `approved_new_master`는 내부적으로는 의미가 다르지만(기존 Master 연결 vs 신규 Master 승격), 후보 화면 운영 필터에서는 모두 "등록 완료"에 해당한다.

---

## 2. 변경 전 상태 목록 (화면 select)

```text
전체 상태
pending
reviewing
matched
linked
approved_new_master
rejected
merged
archived
```

## 3. 변경 후 표시 상태 (화면 select)

```text
전체
대기
검토 필요
등록 완료
제외
```

## 4. groupedStatus 매핑표

| 화면 표시 | groupedStatus 값  | 포함 원시 status                            |
| ----- | ---------------- | -------------------------------------- |
| 전체    | (없음 / 필터 미적용)     | 전체                                     |
| 대기    | `pending`         | `pending`                              |
| 검토 필요 | `review_required` | `reviewing`                            |
| 등록 완료 | `registered`      | `matched`, `linked`, `approved_new_master` |
| 제외    | `rejected`        | `rejected`, `merged`, `archived`       |

### "기본상품 연결됨"을 별도 노출하지 않은 이유

이전 안(V1)에서는 `기본상품 연결됨`(matched/linked)과 `기본상품 등록 완료`(approved_new_master)를 나누는 방안이 있었으나,

- 운영자 입장에서는 기존 Master에 연결됐든 신규 Master로 승격됐든 **"O4O 기본 상품 DB에 반영됨"**이라는 결과는 동일하다.
- 기존 연결 vs 신규 승격 구분은 데이터 검증 / 중복 확인 / apply 결과 보고 / rollback 추적 등 **내부 목적**에서만 필요하며, 일반 admin 필터로 노출할 실익이 낮다.

따라서 두 상태를 `등록 완료` 하나로 합쳤다. 내부 구분이 필요할 때는 원시 `status` 파라미터(§6)로 여전히 조회 가능하다.

### merged / archived 처리

WO 본문 매핑표에는 `merged` / `archived`가 명시되지 않았으나, 두 상태 모두 후보 파이프라인의 **종료(비활성) 상태**이므로 `제외(rejected)` 그룹에 포함시켰다. 이렇게 하면 모든 row가 최소 하나의 그룹으로 도달 가능해 `전체` 외 필터에서 누락되는 후보가 없다. (bulk `archive` 액션 결과 = `archived` → `제외`에서 조회됨)

---

## 5. DB status 변경 없음

- DB 원시 status 값·의미는 **일절 변경하지 않는다.**
- candidate 상태 마이그레이션 없음 / 과거 후보 데이터 수정 없음 / 승격 로직 변경 없음.
- ProductMaster / ProductIdentifier 생성·수정 없음.
- **DB write 0 / migration 0.**

## 6. 기존 status 필터 보존 여부

- 백엔드 `GET /operator/product-candidates` 의 기존 `status` 단건 파라미터는 **그대로 유지**한다.
  - 내부 검증 / apply 결과 확인 / 과거 작업 호환 / 의료기기·의약품·의약외품·건강기능식품 seed 작업 추적 목적.
- 추가된 `groupedStatus` 파라미터는 화면(일반 UI) 전용이다.
- 서비스 계층 우선순위: `candidateStatuses`(그룹 배열) > `candidateStatus`(단건). 프론트는 둘을 동시에 보내지 않는다.

---

## 7. 구현 파일

| 계층 | 파일 | 변경 |
| ---- | ---- | ---- |
| Service | `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `FindCandidatesFilter.candidateStatuses?: []` 추가, `findCandidates`에서 `In(...)` 다중 상태 필터 적용 (단건보다 우선) |
| Controller | `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `GROUPED_STATUS_MAP` 추가, `groupedStatus` 쿼리 → 원시 status 배열 변환. 기존 `status` 유지 |
| API client | `apps/admin-dashboard/src/api/o4o-product-db.api.ts` | `ProductCandidateListParams.groupedStatus` 추가 + 쿼리 전송 |
| Page | `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx` | 상태 select 8→5 옵션(그룹), 상태값·URL param `status`→`groupedStatus` 통일 |

---

## 8. 검증 결과

| 항목 | 결과 |
| ---- | ---- |
| 상태 select 옵션 5개로 축소 (전체/대기/검토 필요/등록 완료/제외) | ✅ |
| `groupedStatus` 매핑 (pending / review_required / registered / rejected) | ✅ |
| 기존 `status` 단건 필터 호환 유지 | ✅ (service·controller 모두 보존) |
| api-server typecheck (변경 파일) | ✅ PASS (기존 `src/scripts/drug-otc-*` 중복선언 에러는 본 변경과 무관·선존재) |
| admin-dashboard typecheck (`tsc --noEmit`) | ✅ PASS (exit 0) |
| DB write | 0 |
| migration | 0 |
| candidate 데이터 변경 | 0 |

### 배포

| 워크플로우 | 커밋 | 결과 |
| ---- | ---- | ---- |
| Deploy API Server (Cloud Run) — `o4o-core-api` | `edd7737d0` | ✅ success (run 29019944521) |
| Deploy Admin Dashboard (Cloud Run) — `o4o-admin-dashboard` | `edd7737d0` | ✅ success (run 29019944548) |

> Admin 배포 1차 시도는 **Artifact Registry push timeout**(`context deadline exceeded`)으로 실패 — 이미지 빌드는 정상, 인프라 일시 오류. `gh run rerun --failed` 재실행으로 success.

### Browser smoke (production, 2026-07-09) — ✅ PASS

`admin.neture.co.kr` 로그인(운영자 계정) → client-side `/admin` 진입 → SPA 내부 이동으로 `/admin/o4o-product-db/candidates` 접속. Playwright headless.

| 항목 | 결과 |
| ---- | ---- |
| 상태 select 옵션 5개 (전체/대기/검토 필요/등록 완료/제외) | ✅ 정확히 일치 |
| 각 필터 선택 시 API 쿼리 `groupedStatus=` 사용 (원시 `status=` 미전송) | ✅ pending/review_required/registered/rejected 모두 |
| URL `?groupedStatus=` 반영 | ✅ url bar 동기화 확인 |
| 대기 = pending | ✅ grouped 126,897 = raw pending 126,897 |
| 검토 필요 = reviewing | ✅ grouped 0 = raw reviewing 0 |
| 등록 완료 = matched + linked + approved_new_master | ✅ grouped 251,815 = 1,000 + 0 + 250,815 |
| 제외 = rejected + merged + archived | ✅ grouped 15,779 = 0 + 0 + 15,779 |
| 기존 원시 `status` 단건 필터 유지 (`status=matched` → 200 success) | ✅ |
| console error / network 4xx·5xx | ✅ 0 / 0 |

> grouped `In(...)` 집계 total 이 개별 원시 status total 산술 합과 **정확히 일치** → 그룹 매핑이 누락·중복 없이 올바름을 증명.
> (참고: 현재 프로덕션 데이터엔 `linked` / `merged` / `rejected` 후보 0건, `matched` 1,000건, `approved_new_master` 250,815건, `archived` 15,779건 — 의료기기 등급별 정리 결과 반영.)

---

## 9. 완료 기준 체크

- [x] 화면 상태 필터 5개로 단순화
- [x] 등록 완료 = matched + linked + approved_new_master
- [x] DB write 0 / migration 0 / candidate 데이터 변경 0
- [x] typecheck 통과 (변경 파일)
- [x] CHECK 문서 작성
- [x] commit / push (`edd7737d0`)
- [x] 배포 (API + Admin, Cloud Run) success
- [x] browser smoke (production) PASS
