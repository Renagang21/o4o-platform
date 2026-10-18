# CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1

- 작성: 2026-10-18 · branch `wo/carepharm-megapharm-business-ledger-alignment` · base `d830f200df`
- 최종 갱신: 2026-10-18 (KST) — 클라우드 후속 검증·서비스 선택 등록 보완
- 상태: ACTIVE · PR #701 main 병합·배포 완료 · 후속 화면 검증 완료 · 운영 사업 등록/실계정 시나리오는 미실행(§6~8)
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

PR #701 리뷰 반영:

- Codex P2 — 역할은 있지만 Neture 메인 이용 자격이 active 가 아닌 사용자는 사업 운영 경로 가드에서 막힌다. `roleOperators` 에 같은 판정(`resolveNetureMainMembershipStatus`)의 `membershipStatus` 를 함께 내려, 화면은 "Neture 이용 자격 없음 — 사업 운영 불가"로 표시하고 자격 있는 보유자가 없으면 담당 지정 안내를 유지한다(`41a38a2f3c`).
- SonarCloud 새 코드 중복 6.4%(기준 3%) — 신규 통합 spec 의 fixture 보일러플레이트가 기존 spec 과 같았다. 검증 내용은 그대로 두고 fixture 를 다시 작성(`21559da3ed`). 게이트 완화 없음.

## 5. 검증

로컬(이 PC, C: 검증 worktree · 같은 변경 파일):

| 항목 | 결과 |
|---|---|
| operator-core-ui pharmacy-management vitest | 6 파일 42 PASS(신규 4) |
| admin-dashboard vitest `src/tests` | 22 파일 392 PASS(신규 4) |
| tsc `--noEmit` admin-dashboard · api-server | 오류 0 |
| tsc operator-core-ui | 오류 2 — 이번 변경과 무관한 기존 `members/__tests__/MemberHardDeleteConfirmModal.scope.test.tsx` |
| API 빌드 `tsc -p tsconfig.build.json` · tsup | 성공 |
| eslint 변경 파일 | 오류 0 · 경고 1(기존 `useEffect` 의존성) |
| 일회용 PostgreSQL 17(127.0.0.1:55432) 전체 migration 재생 | SUCCESS · schema assertion PASS · 초기 사업 pharmacy 1행 |
| 신규 `care-mega-business-ledger.integration.spec.ts` | 2 PASS — 역할만 있을 때 상세 404 · 목록 미노출 → 관리자 API 등록(중복 409) → 노출 · 가입 미생성 → `roleOperators` 분리 · 메인 이용 정지 시 `membershipStatus=suspended` → 두 사업 신청 pending → 광역 역할 없는 Care 담당은 Care 신청만 조회 · 승인 · Mega 경로 403 · 자기 경로에 타 사업 ID 404 · 상태 불변 → 각 담당 승인 active → 기본 가입 유지 · 협동조합 연결 0. 테스트 행 정리 확인(0) |
| 기존 `neture-pharmacy` suite | 15 PASS · 7 skip · **2 FAIL(7건)**: `collaboration-application`(관리자 생성 403) · `neture-pharmacy-commerce`(6건). 이번 서비스 변경을 되돌려도 동일하게 실패 — 이 로컬 환경의 기존 실패로 판정, 범위 밖 |

인증은 합성 세션이다(실제 Google 로그인 아님). 당시 로컬 세션의 브라우저 검증(데스크톱 · 모바일)은 도구가 없어 **미실행**이었다. 후속 클라우드 검증은 §8에 별도 기록한다.

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
- 테스트 신청·승인은 업무 데이터를 생성한다. 저장소 지침에 따라 생성·연결 데이터의 완전 삭제 방법과 잔존 확인을 사전에 확정한다. 완전 삭제할 수 없는 운영 테스트는 실행하지 않고 격리 환경에서 검증한다. 접속·보안·감사 기록은 정해진 보존 정책을 따른다.


## 8. 클라우드 후속 정비 — 2026-10-18(KST)

사용자 지시로 클라우드 담당자가 후속 정비를 인수했다. 이 공간의 이전 미커밋 수정은 별도 백업했고 최신 main `d9576802c1a44d6c957c702835cb2d09394d08d5` 기준으로 검증했다. 로컬 구현과 중복 적용하지 않는다.

### 병합·배포 사실 정정

- [PR #701](https://github.com/Renagang21/o4o-platform/pull/701): 2026-10-18 19:22:18 KST main 병합, PR·main CI 성공. 기존 리뷰 지적 스레드 resolved 확인.
- [Delivery 39119714548](https://github.com/Renagang21/o4o-platform/actions/runs/39119714548): 19:43:48 KST 성공. API/Admin/Neture/KPA Society/Lecture/Store의 배포 job 및 최종 serving SHA 확인 단계 성공. 해당 SHA의 `production` commit status는 `DEPLOYED` success.
- 위 내역은 이미 실행된 배포의 read-only 확인이다. 이 후속 정비에서 해당 서비스들을 재배포하거나 협동조합을 변경한 것이 아니다.

### 후속 보완·검증

- `parseBusinessLedgerResponse`가 배열 안의 형식 오류 행을 조용히 무시하면 해당 사업을 미등록으로 오인했다. null·서버 형식과 다른 key(공백/대문자/길이 포함)·누락/알 수 없는 상태·중복 key를 응답 오류로 처리하여 등록 링크를 노출하지 않도록 보완했다.
- 관리자 Vitest `src/tests`: 22파일 **403 PASS**(이번 회귀 추가 11개). 공유 약국 사업 관리: 6파일 **47 PASS**. 관리자 TypeScript·변경 파일 ESLint 오류 0. Admin/Neture/KPA Society production build 성공.
- Chromium 실제 브라우저·합성 API로 폭 1440/390 각각 6개, 총 **12 시나리오 PASS**: 사업 미등록/조회 실패/행 형식 오류 구분, 이름 미등록 표시, Care/Mega 서비스 선택·프리셋 자동 저장 없음·기능 체크 후 명시 클릭 시 해당 key와 체크 기능만 1회 생성 요청, 중앙 역할의 개별 해제 버튼 없음.
- 브라우저 검증은 localhost의 합성 데이터이며 Google 로그인·운영 가입 승인·운영 DB 쓰기를 검증한 것이 아니다.
- 운영 공개 URL health/Admin/operators/Neture/pharmacy 200, 비로그인 역할 카탈로그 401 확인. 공개 응답으로 사업 등록·실계정 권한 격리를 판정하지 않는다.

### 남은 TODO

- [x] 기존 병합·배포 사실 확인 및 문서의 미실행 표기 정정
- [x] 최신 main 기준 관리자 회귀·공유 화면·desktop/mobile 검증
- [x] 잘못된 개별 사업 응답을 미등록으로 오인하는 오류 보완
- [x] 후속 보완 commit/push·PR #703·CI·최신 Codex 리뷰·main 병합
- [x] 후속 보완 운영 배포·서빙 SHA·공개 응답 확인 및 결과 기록(§10)
- [ ] 사용자가 Google 로그인한 관리자 화면에서 두 사업의 현재 등록 상태 재확인
- [ ] §6의 구체적인 운영 쓰기 범위 확인 후 미등록 사업만 기존 관리자 화면/API로 등록
- [ ] 사업별 전용 담당 계정·정리 가능한 데이터 범위 확보 후 실제 시나리오 검증

현재 이 클라우드에는 승인된 최신 관리자 인증/계정 기준 파일 및 GCP outbound identity가 없다. 기존 테스트 환경 변수만으로 관리자를 대신하거나 Google 세션·역할을 위조하지 않는다. Google 로그인은 사용자가 자신의 브라우저에서 직접 수행한다. 클라우드로 사용자 세션을 전달하지 않으며 비밀번호·토큰 전달 요청은 철회했다. 운영 사업 등록은 사용자가 로그인한 기존 관리자 화면에서 수행할 수 있다. 운영 데이터 변경은 0건이다.


## 9. 사용자 사용성 보완 — 대상 서비스 선택 → 기능 체크 → 만들기

사용자는 내부 key를 기억해서 입력할 수 없으므로 서비스 선택 방식으로 바꾸도록 지시했다.

- 새 사업 등록의 기본 입력을 **대상 서비스 선택 메뉴**로 변경한다. pharmacy/CarePharm/MegaPharm을 정본 표시 이름으로 선택하면 내부 key와 기본 이름이 자동 지정된다. 기본 선택·자동 저장·자동 기능 부여는 없다.
- 선택한 서비스의 제공 기능을 체크한 뒤 맨 아래 `만들기`를 누른다. 실제 생성은 기존 감사·권한 판정 API를 그대로 사용한다.
- 이미 등록된 서비스는 운영/마감 상태와 함께 선택 불가로 표시한다. 기존 사업 프리셋도 중복 생성 버튼을 비활성화하며 기존 목록에서 수정하도록 안내한다. 서버의 중복 판정도 유지한다.
- 별도 사업 직접 등록 기능은 `기타 협력사업 직접 등록`을 명시적으로 선택할 때만 식별자 입력을 보여 기존 기능을 유지한다.
- 커뮤니티 연결은 필요할 때 펼치는 선택 설정으로 옮긴다. 별도 연결값 없이도 사업을 등록할 수 있다. 이름 수정·가입 조건·기존 기능 선택은 유지한다.
- 협동조합은 이 선택 목록과 이번 변경 범위에서 제외한다.
- 공유 화면 소비처는 전체 관리자와 Neture 관리자다. 두 소비처 및 KPA Society의 build를 확인했다. 권한/API/DB 스키마는 변경하지 않았다.

PR #703의 기존 리뷰 지적(사업 key 전체 형식 검증·상태 변경의 최종 갱신일 표기)을 함께 반영한다. 이 PR의 범위와 설명은 최종 서비스 선택 UI를 포함하도록 갱신하며, 기존 검증 결과와 운영 미실행 상태를 구분한다.


## 10. PR #703 통합·배포 기록

- [PR #703](https://github.com/Renagang21/o4o-platform/pull/703): 2026-10-18 20:34:17 KST main 병합. 코드 SHA `1ba05e353db46f21b29775972b4ae898d6846a2e`.
- PR CI Gate·CodeQL·SonarCloud 통과. 최신 작업 HEAD `8903a75a76`의 Codex 리뷰 완료·추가 지적 없음, 기존 2개 지적 해결.
- [main CI 39123775787](https://github.com/Renagang21/o4o-platform/actions/runs/39123775787) SUCCESS.
- [Delivery 39124459118](https://github.com/Renagang21/o4o-platform/actions/runs/39124459118): **SUCCESS** (2026-10-18 20:50:03 KST). Admin/Neture/KPA Society/Lecture/Store 배포와 최종 serving SHA 확인 단계 성공. production commit status `DEPLOYED` success.

이 절의 기록용 변경은 문서만 포함한다. 해당 문서 commit 때문에 실행 코드를 다시 배포할 필요는 없다. 실제 실행 코드의 서빙 SHA는 위 코드 SHA를 기준으로 확인한다.


운영 공개 검증:

- Admin이 제공하는 실제 배포 JS에서 새 서비스 선택 메뉴의 안내·기타 직접 등록·기등록 상태 문구를 확인했다.
- API health/Admin 메인/operators/Neture/pharmacy 200, 비로그인 역할 카탈로그 401. 공개 검증을 로그인·사업 등록·승인 검증으로 보고하지 않는다.
- API·협동조합은 이번 배포 대상에서 제외됐다. 이번 클라우드 정비가 실행한 운영 DB 변경은 **0건**이다.
- 사용자 흐름: Google 로그인 → 약국 협력사업 관리 → 대상 서비스 선택 → 제공 기능 체크 → 만들기. 실제 등록 상태는 로그인한 관리자 화면에서 확인하며, 이미 등록된 서비스는 중복 생성하지 않는다.
- 원 요청의 운영 가입·담당 승인·권한 격리 실계정 검증은 §7의 조건 확보 전까지 미완료다. 코드·배포 완료와 운영 데이터 작업 완료를 구분한다.
