# CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1

- 작성: 2026-10-18 · branch `wo/carepharm-megapharm-business-ledger-alignment` · base `d830f200df`
- 상태: 코드 LOCAL_VERIFIED · 운영 데이터 변경 · 배포 · 운영 시나리오 **미실행**(아래 §5)
- 범위: CarePharm(`carepharm`) · MegaPharm(`megapharm`). 협동조합(`pharmcoop`)은 별도 작업이라 제외

## 1. 증상

- admin.neture.co.kr `/operators` 에서 CarePharm · MegaPharm Admin/Operator 가 Active 로 보인다.
- 일부 사용자 이름이 Unknown 이다.
- 매장 경영자로 두 사업 상세 API 를 부르면 404, 가입 대상 목록에는 pharmacy 만 나온다.

## 2. 원인

| 증상 | 원인 |
|---|---|
| Active | 사용자 **계정** 상태(`users.status`)다. 역할 유효성이나 사업 개설과 별개 |
| 404 · 목록 미노출 | 사업 상세 · 가입 목록은 active `semi_franchises` 행을 요구한다. 역할(`role_assignments`) 지정은 사업 행을 만들지 않는다 |
| Unknown | 이름 필드가 모두 비었을 때의 화면 fallback |
| 사업 관리 담당자 집계 차이 | 사업 관리 목록이 개별 지정(`semi_franchise_operators`)만 집계해, 운영자 관리 화면에서 지정한 사업 한정 역할이 보이지 않았다 |

## 3. 운영 read-only 조회 (2026-10-18, Cloud SQL Auth Proxy · `BEGIN READ ONLY` · 비식별)

| 항목 | 값 |
|---|---|
| `semi_franchises` | `pharmacy` active 1행뿐. **carepharm · megapharm 행 0** · `semi-franchise-*` 운영 조직도 pharmacy 1개뿐 |
| 유효 사업 역할 | carepharm admin/operator 각 1 · megapharm admin/operator 각 1 · pharmcoop admin/operator 각 1 |
| Care/Mega 역할 보유자 | 4개 역할 모두 **같은 사용자 1명**. 이름 · 성/이름 · 닉네임 모두 비어 있음(Unknown 의 원인). 광역 역할(platform/neture 운영)도 보유 |
| 개별 담당 지정 | 0건 |
| 사업 가입 | pharmacy active 1 · 내 매장(약국) 기본 가입 active 1 |
| 협동조합 | `cooperatives` 0행 — 변경 없음 |

판정: 화면의 "미등록" 판단과 운영 원장이 일치한다. 코드 배포만으로는 사업 행이 생기지 않는다.

## 4. 변경

| 파일 | 내용 |
|---|---|
| `apps/api-server/.../semi-franchise.service.ts` | `listAll()` 에 `roleOperators` 추가 — 사업 한정 역할(`neture:{key}_admin · _operator`, pharmacy · carepharm · megapharm) 보유자. 접근 판정 `BUSINESS_OPERATOR_PREDICATE` 의 key 역할 분기와 같은 조건. 기존 `operators` 는 그대로 |
| `packages/operator-core-ui/.../AdminSemiFranchisePage.tsx` · `api.ts` · `BusinessFeatureSummary.tsx` | `?register=carepharm|megapharm` 등록 양식 프리셋(저장은 "만들기" 클릭 시에만, 이미 등록 시 안내) · 지정 역할 보유자를 조회 전용으로 별도 표시(해제 버튼 없음) · 둘 다 없을 때만 담당 지정 안내 |
| `apps/admin-dashboard/src/lib/business-ledger.ts` (신규) · `OperatorsPage.tsx` | "계정 상태" 열과 별도로 "사업 원장" 열 — 확인 중 · 조회 실패 · 사업 미등록 · 사업 운영 · 사업 마감. 조회 실패 · 형식 오류를 미등록으로 표시하지 않음. 미등록이면 등록 화면 링크 |
| `apps/admin-dashboard/src/lib/assignment-row.ts` | 이름 fallback: name → 성·이름 → 닉네임 → `이름 미등록`. 사용자 DB 프로필 변경 없음 |

추가하지 않은 것: 자동 사업 생성 · 자동 승인 · 권한 우회 · migration · 협동조합 변경.

## 5. 검증

로컬(이 PC, C: 검증 worktree · 같은 변경 파일):

| 항목 | 결과 |
|---|---|
| operator-core-ui pharmacy-management vitest | 6 파일 41 PASS(신규 3) |
| admin-dashboard vitest `src/tests` | 22 파일 392 PASS(신규 4) |
| tsc `--noEmit` admin-dashboard · api-server | 오류 0 |
| tsc operator-core-ui | 오류 2 — 이번 변경과 무관한 기존 `members/__tests__/MemberHardDeleteConfirmModal.scope.test.tsx` |
| API 빌드 `tsc -p tsconfig.build.json` · tsup | 성공 |
| eslint 변경 파일 | 오류 0 · 경고 1(기존 `useEffect` 의존성) |
| 일회용 PostgreSQL 17(127.0.0.1:55432) 전체 migration 재생 | SUCCESS · schema assertion PASS · 초기 사업 pharmacy 1행 |
| 신규 `care-mega-business-ledger.integration.spec.ts` | 2 PASS — 역할만 있을 때 상세 404 · 목록 미노출 → 관리자 API 등록(중복 409) → 노출 · 가입 미생성 → `roleOperators` 분리 → 두 사업 신청 pending → 광역 역할 없는 Care 담당은 Care 신청만 조회 · 승인 · Mega 경로 403 · 자기 경로에 타 사업 ID 404 · 상태 불변 → 각 담당 승인 active → 기본 가입 유지 · 협동조합 연결 0. 테스트 행 정리 확인(0) |
| 기존 `neture-pharmacy` suite | 15 PASS · 7 skip · **2 FAIL(7건)**: `collaboration-application`(관리자 생성 403) · `neture-pharmacy-commerce`(6건). 이번 서비스 변경을 되돌려도 동일하게 실패 — 이 로컬 환경의 기존 실패로 판정, 범위 밖 |

인증은 합성 세션이다(실제 Google 로그인 아님). 브라우저 검증(데스크톱 · 모바일)은 이 세션에 브라우저 도구가 없어 **미실행**.

## 6. 운영 데이터 변경 계획 — 승인 대기

미등록이 확인된 두 사업만, 기존 관리자 API `POST /api/v1/neture/admin/semi-franchises` 로 등록한다(SQL 직접 INSERT · migration seed 금지).

| key | name | 생성 |
|---|---|---|
| carepharm | CarePharm · 만성질환관리 | 운영 조직 1 · active 사업 1 · `business.admin.create` 감사 1 |
| megapharm | MegaPharm · 창고형약국 | 운영 조직 1 · active 사업 1 · `business.admin.create` 감사 1 |

합계 조직 2 · 사업 2 · 감사 2. 기존 사용자 · 역할 · Neture 주 가입은 바꾸지 않는다. 결제 수취 주체 · 유료 기능 · community · 모듈은 비워 둔다.
현재 운영 관리 화면(`/admin/semi-franchises`)의 등록 양식으로도 같은 API 가 호출되므로 이번 배포 전에도 실행할 수 있다.

## 7. 운영 시나리오 검증 — 차단 사항

- 담당자 격리 판정에는 광역 역할 없는 Care 담당 · Mega 담당 계정이 필요하다. 현재 Care/Mega 4개 역할은 광역 역할을 가진 한 계정에 모두 있어 격리 판정에 쓸 수 없다(WO 기준).
- 승인된 비공개 테스트 계정 기준에는 전체 관리자 · 매장 경영자 · 공급자만 있다. Care/Mega 전용 담당 계정이 준비돼야 운영 시나리오(신청 · 사업별 조회 · 교차 차단 · 승인 반영)를 진행할 수 있다.
- 테스트 신청 · 승인 레코드는 운영 가입 원장에 남는다. 보존 · 정리 계획을 운영 write 승인 때 함께 정한다.
