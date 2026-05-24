# IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1

> **임시 Seed 계정 잔재 감사 (Read-Only Residue Audit)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> [CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1](CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1.md) 의 검증 결과 (kpa-admin / kpa-operator / phamacy1 3 계정 모두 production users 테이블 부재 — 삭제가 정상 상태) 를 받아, **이 임시 계정들을 "필수 계정" 으로 가정하는 잔재가 시스템 어디에 남아 있는지** 전수 audit.

- **작성일:** 2026-05-24
- **분류:** Residue Audit (Read-Only — 코드/문서/script grep + 정적 분석)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1](IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1.md) — §6.1 (b) recreate 권고 **폐기**
  - [CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1](CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1.md) — recreate 권고 **폐기**
- **SSOT 참조:**
  - `CLAUDE.md §15` Browser Verification Test Accounts — "**자격증명 하드코딩 금지** — 시드 스크립트·테스트 코드·CI 어디에도 이 문서의 비밀번호를 박지 말 것. 발견 시 즉시 제거."
  - `docs/local/TEST-ACCOUNTS.local.md` — 테스트 계정 SSOT (gitignored)
  - Memory: `project_test_account_cleanup_policy` — `xxxx@o4o.com` 임시 계정은 삭제 상태가 정상, 재생성 금지
- **버전:** V1

---

## 0. 결론 / 한 줄 요약

> **문제는 계정이 없는 것이 아니라, 이미 삭제된 임시 계정을 아직도 시스템 일부가 "존재해야 하는 계정" 처럼 생각하고 있는 잔재이다.**

본 IR 의 최종 권고는 **cleanup 방향**:

| 분류 | 항목 수 | 비고 |
|------|:------:|------|
| **A 삭제** (코드/시드/엔드포인트) | **9** | runtime/build 영향, 운영 위험 |
| **B 문서 정정** (recreate · 부재=오류 표현) | **7+** | docs/IR/CHECK 와 reset plan |
| **C historical 유지** (legacy dead code, IR archive) | **2** | dropped columns 참조 → 자연 무효화. 별도 cleanup 불필요 |
| **D 운영 검증 계정 전환** (QA 시나리오용) | **2** | `TEST-ACCOUNTS.local.md` SSOT 로 이전 |

---

## 1. 조사 범위 / 방법

### 1.1 조사 대상 (사용자 명세)

| 축 | 내용 |
|---|------|
| A | migration / bootstrap — seed 생성·재생성 로직 |
| B | docs / investigation — "부재 = 오류" · "재생성 필요" · "recreate" 표현 |
| C | tests / smoke / script — 로그인 / demo 계정 / QA 검증 |
| D | UUID 잔재 — `b0000000-...000002/003/004` 등 |
| E | UI / 운영 문서 — demo 안내 · 임시 로그인 버튼 · 운영 매뉴얼 |

### 1.2 검색 패턴 (read-only)

```bash
Grep "kpa-admin@o4o\.com|kpa-operator@o4o\.com|phamacy1@o4o\.com"
Grep "b0000000-b000-4000-b000-00000000000[234]"
Grep "O4oBootstrap1!|BootstrapCanonicalSeed|BOOTSTRAP_PASSWORD|SEED_BOOTSTRAP_PASSWORD"
Grep "O4oTestPass"
Grep "kcos-admin@|kcos-operator@|glyco-operator@|neture-operator@|super-admin@" (확장 범위)
```

---

## 2. A 축 — Migration / Bootstrap 잔재

### 2.1 핵심 잔재 (active residue — runtime 영향)

| # | 파일 | 역할 | 분류 | 우선순위 |
|---|------|------|:----:|:--------:|
| A1 | [`20260927100000-BootstrapCanonicalSeedAccounts.ts`](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts) | **8 임시 계정 정식 seed** — super-admin / kpa-admin / kpa-operator / phamacy1 / neture-operator / kcos-admin / kcos-operator / glyco-operator. 매 배포마다 idempotent 재실행 (Cloud Run 로그 5 회 확인) | **A 삭제** (또는 super-admin 만 보존) | **HIGH** |
| A2 | [`apps/api-server/src/routes/admin/seed-test-accounts.ts`](apps/api-server/src/routes/admin/seed-test-accounts.ts) | **runtime 엔드포인트 `POST /api/v1/admin/seed-test-accounts`** — 평문 `O4oTestPass@1` 으로 `patient_test@glycopharm.co.kr`, `pharmacist_test@glycopharm.co.kr` 생성. 호출 = production 에 임시 계정 즉시 재생성 | **A 삭제** | **CRITICAL** |
| A3 | [`1769408012358-UpdateOperatorPasswords.ts`](apps/api-server/src/database/migrations/1769408012358-UpdateOperatorPasswords.ts) | 모든 operator 계정 (admin-kpa-society, admin-neture, admin-glycopharm 등) 비밀번호를 평문 `O4oTestPass` 로 일괄 reset. precomputed bcrypt hash 직접 SQL | **A 삭제** (이미 적용됨 — git/migration 파일만 잔재) | M |
| A4 | [`20260212200000-CreateKpaSocietyOperatorAccount.ts`](apps/api-server/src/database/migrations/20260212200000-CreateKpaSocietyOperatorAccount.ts) | `kpa-society@o4o.com` operator 계정 — dropped columns (`role`, `roles`, `permissions`) 참조. legacy dead code | C (자연 무효화) | L |

### 2.2 phamacy1 전용 보조 migration 3 종

| # | 파일 | 역할 | 분류 |
|---|------|------|:----:|
| A5 | [`20260405100000-SeedPhamacy1OrgMember.ts`](apps/api-server/src/database/migrations/20260405100000-SeedPhamacy1OrgMember.ts) | phamacy1 의 organization_members 생성 (`종로구약사회` owner) | **A 삭제** (graceful skip 이지만 의도 자체가 phamacy1 가정) |
| A6 | [`20260419500000-FixPhamacy1OrgMemberAlignment.ts`](apps/api-server/src/database/migrations/20260419500000-FixPhamacy1OrgMemberAlignment.ts) | 종로구 → 대한약사회 정렬 | **A 삭제** |
| A7 | [`20260419600000-EnsurePhamacy1OrgMemberForKpa.ts`](apps/api-server/src/database/migrations/20260419600000-EnsurePhamacy1OrgMemberForKpa.ts) | 대한약사회 멤버 INSERT 보강 | **A 삭제** |

→ **3 종 모두 graceful skip (users 부재 시 `console.log skipping`) 이라 현재는 무동작**. 그러나 코드 잔재로서 "phamacy1 이 필수 계정" 이라는 신호를 남김. 삭제 권고.

### 2.3 legacy seed (별 카테고리)

| # | 파일 | 비고 |
|---|------|------|
| A8 | [`20260216200001-CreateKpaAdminAccount.ts`](apps/api-server/src/database/migrations/20260216200001-CreateKpaAdminAccount.ts) | dropped columns 참조 (`role`, `roles`, `domain`, `service_key`). 신규 배포 시 실행되면 SQL 오류 발생. **이미 production migrations 테이블에 entry 존재 → 재실행 안 됨**. 단 git 잔재. | C (자연 무효화) → 정리 권고 |
| A9 | [`20260403900000-SeedKpaOperatorTestData.ts`](apps/api-server/src/database/migrations/20260403900000-SeedKpaOperatorTestData.ts) | `test-yaksa01~13@o4o.com` 시드 + 평문 `O4oTestPass`. KPI 검증용 가짜 데이터 | 본 IR 범위 밖 (별도 `test-yaksa*` 패턴) — 별도 audit 권고 |

---

## 3. B 축 — 문서 / Investigation 잔재

### 3.1 "필수 계정" / "복구 smoke test" 로 기술

| # | 파일 | 위반 표현 | 분류 |
|---|------|----------|:----:|
| B1 | [`docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md:18`](docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md#L18) | "복구 \| CI/CD main 배포 → BootstrapCanonicalSeedAccounts migration 자동 실행" | **B 정정** |
| B2 | 동 파일:182 | "CI/CD가 BootstrapCanonicalSeedAccounts migration을 자동 실행한다" | **B 정정** |
| B3 | 동 파일:203-205 | "kpa-admin@o4o.com / kpa-operator@o4o.com / phamacy1@o4o.com" smoke test 표 — **production 검증 절차에 임시 계정 로그인 명시** | **B 정정** |

→ 본 reset plan 의 의도 자체가 "운영 데이터 초기화 + bootstrap 자동 복구" 인데, 임시 계정 복구 부분은 본 policy 와 충돌. plan 자체를 일부 수정 또는 deprecated 표시 필요.

### 3.2 본 IR 사이클의 자체 정정 대상

| # | 파일 | 정정 사유 |
|---|------|----------|
| B4 | [`docs/investigations/IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1.md`](docs/investigations/IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1.md) | §1.3(d) "suspended 가설" 폐기, §5.2 (a) 권고 폐기, §6.1 (a)(b) WO 권고 폐기 → **본 IR 가 supersede** 명시 |
| B5 | [`docs/investigations/CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1.md`](docs/investigations/CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1.md) | §3 IR 분류 적용 결과 폐기, §5 후속 트랙 폐기 → **본 IR 가 supersede** 명시 |
| B6 | [`docs/investigations/IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1.md`](docs/investigations/IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1.md) | §2.1 "KPA seed 계정 부재 — 별도 사안" — **이제 별도 사안 아니라 정상 상태** 명시 |

### 3.3 운영 자격증명 참조 (낮은 위협)

다음 문서가 `kpa-admin@o4o.com` 등을 언급하나 단순 history / context 이므로 historical 유지:

- `docs/investigations/IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1.md`
- `docs/investigations/CHECK-O4O-BOUNDARY-POLICY-OPERATIONAL-SMOKE-V1.md`
- `docs/investigations/CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1.md`
- `docs/investigations/IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1.md`
- `docs/investigations/IR-O4O-KPA-OPERATOR-ACCESS-GUARD-MEMBERSHIP-AUDIT-V1.md`
- `docs/investigations/IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1.md`
- `docs/investigations/CHECK-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1.md`
- `docs/investigations/CHECK-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1.md`

→ **C historical 유지**. 각 IR 작성 시점의 추정 / 검증 절차 기록 — 정정하면 audit trail 손상.

---

## 4. C 축 — Tests / Smoke / Script 잔재

### 4.1 평문 비밀번호 하드코딩 (CLAUDE.md §15 직접 위반)

| # | 파일 | 위반 내용 | 분류 |
|---|------|----------|:----:|
| C1 | [`scripts/verify/verify-ai-content-modal.mjs:14-15`](scripts/verify/verify-ai-content-modal.mjs#L14-L15) | `TEST_EMAIL='phamacy1@o4o.com'`, `TEST_PASSWORD='O4oTestPass@1'` | **A 삭제** (또는 env var 화) |
| C2 | [`e2e/registration-approval-login.spec.ts:13,102,161,221,298`](e2e/registration-approval-login.spec.ts) | `TEST_USER` email + `operatorPassword: 'O4oTestPass'` 다중 위치 | **D 전환** (TEST-ACCOUNTS.local.md SSOT 로) |
| C3 | `scripts/care-data-accumulation-test.{mjs,py,sh}` | `O4oTestPass` 패턴 (미상세 검증, 동일 카테고리 추정) | A/D 결정 후 처리 |
| C4 | `scripts/care-e2e-operation-test-v2.mjs` | 동일 | A/D 결정 후 처리 |

### 4.2 본 IR 의 평문 패스워드 매트릭스

| 평문 비밀번호 | 발견된 위치 | 권고 |
|--------------|-------------|------|
| `O4oTestPass` | 19 파일 | env var / SSOT 화 또는 삭제 |
| `O4oTestPass@1` | 다수 | 동일 |
| `O4oBootstrap1!` | A1 (`BootstrapCanonicalSeedAccounts`) 의 default | A1 삭제 시 자연 제거 |

---

## 5. D 축 — UUID 잔재

| UUID | 의미 | 발견된 위치 | 분류 |
|------|------|-------------|:----:|
| `b0000000-b000-4000-b000-000000000002` | kpa-admin (deleted) | `BootstrapCanonicalSeedAccounts.ts:46`, 2 개 IR 문서 (audit context) | A1 삭제 시 자연 제거 |
| `b0000000-b000-4000-b000-000000000003` | kpa-operator (deleted) | 동일 | 동일 |
| `b0000000-b000-4000-b000-000000000004` | phamacy1 (deleted) | 동일 | 동일 |
| `b0000000-b000-4000-b000-000000000001` | super-admin (존재) | 동일 + audit | **유지 또는 정식 계정 UUID 로 마이그레이션** |
| `b0000000-b000-4000-b000-00000000000{5,6,7,8}` | neture/kcos/glyco operator (존재) | 동일 | **D 전환** (정식 운영 계정 UUID 로 마이그레이션 검토) |

→ 본 IR 범위는 002/003/004 의 cleanup. 005~008 은 별도 후속 audit 권고 (CLAUDE.md §15 의 "운영 계정 사용 금지" 와 충돌하는 것 아닌지).

---

## 6. E 축 — UI / 운영 문서 잔재

### 6.1 UI 하드코딩 — 직접적 보안 위협

| # | 파일 | 위반 | 분류 | 우선순위 |
|---|------|------|:----:|:--------:|
| E1 | [`services/web-glycopharm/src/pages/auth/LoginPage.tsx:213-244`](services/web-glycopharm/src/pages/auth/LoginPage.tsx#L213-L244) | "테스트 계정" 섹션 + "약국 경영자 로그인" 버튼 — `phamacy1@o4o.com` + `O4oTestPass@1` setEmail/setPassword 평문 | **A 삭제** | **CRITICAL** |
| E2 | 동 파일:219-223 | "테스트 약국" 버튼 — `pharmacist_test@glycopharm.co.kr` + `O4oTestPass@1` 평문 | **A 삭제** | **CRITICAL** |
| E3 | `services/web-glycopharm/src/components/common/LoginModal.tsx` | 유사 패턴 추정 (확인 필요) | A 삭제 | HIGH |
| E4 | `services/web-k-cosmetics/src/pages/auth/LoginPage.tsx` | 동일 패턴 추정 (Grep 매치) | A 삭제 | HIGH |
| E5 | `services/web-k-cosmetics/src/components/common/LoginModal.tsx` | 동일 | A 삭제 | HIGH |

→ **이 5 곳은 production 빌드에 포함되어 사용자가 보는 화면에 평문 비밀번호 노출**. CLAUDE.md §15 정책 + 보안 양면 위반.

### 6.2 운영 매뉴얼 / Operator Manual

검색 결과 매뉴얼 (KPA guide, operator manual 등) 에는 위 3 계정 직접 언급 없음 — 본 audit 범위 양호.

---

## 7. 분류 요약

| 분류 | 정의 | 항목 수 | 대표 사례 |
|------|------|:------:|----------|
| **A 삭제** | runtime/build 영향, 또는 보안 위협 → 즉시 제거 | **9** | A1(Bootstrap), A2(seed-test-accounts endpoint), A5-7(phamacy1 migrations), C1(verify script), E1-2(LoginPage 평문) |
| **B 문서 정정** | 잘못된 가정 (부재=오류, 복구 필요) | **7+** | B1-3(reset plan), B4-6(이전 IR/CHECK 두 건 + DATA-AUDIT 1 건) |
| **C historical 유지** | dropped columns 의존으로 자연 무효, 또는 audit 시점 기록 | **2** | A4, A8 + 8 개 IR/CHECK 문서 (audit trail) |
| **D 운영 검증 계정 전환** | QA 시나리오 유지하되 SSOT 로 이전 | **2+** | C2(e2e spec) — `docs/local/TEST-ACCOUNTS.local.md` 참조 |

---

## 8. 우선순위 매트릭스

| 우선순위 | 사유 | 항목 |
|:--------:|------|------|
| **P0 (즉시)** | 보안 — production 빌드에 평문 비밀번호 노출 | E1, E2 (+ E3-5 확인 후) |
| **P0 (즉시)** | runtime endpoint — 호출 시 임시 계정 생성 | A2 |
| **P1** | 매 배포마다 임시 계정 재생성 시도 | A1 |
| **P1** | reset plan 이 본 policy 와 정면 충돌 | B1-3 |
| **P2** | phamacy1 전용 보조 migration | A5-7 |
| **P2** | 테스트 스크립트 평문 패스워드 | C1, C3-4 |
| **P3** | 이전 IR/CHECK 정정 | B4-6 |
| **P3** | legacy dead migration | A4, A8 |
| **P4** | 운영 검증 계정 SSOT 전환 | C2, D 축 005~008 후속 |

---

## 9. Current Structure vs O4O Policy Conflict Check

| 차원 | Current | Policy | 충돌 |
|------|---------|--------|:----:|
| Bootstrap migration 의 임시 계정 자동 생성 | 매 배포 idempotent 재실행 | 임시 계정 = 삭제 상태 정상 (memory: `project_test_account_cleanup_policy`) | **위반** |
| LoginPage 평문 quick-login 버튼 | production 빌드 포함 | CLAUDE.md §15 "자격증명 하드코딩 금지 — 발견 시 즉시 제거" | **위반** (CRITICAL) |
| `seed-test-accounts.ts` runtime endpoint | requireAdmin guard 있으나 평문 `O4oTestPass@1` 으로 INSERT | 동일 | **위반** |
| 검증 script 의 `TEST_EMAIL`/`TEST_PASSWORD` | 평문 하드코딩 | 동일 | **위반** |
| reset plan 의 "BootstrapCanonical 자동 복구" smoke test | 임시 계정 로그인을 운영 검증 절차로 명시 | 임시 계정 = 운영 critical path 아님 | **위반** |
| 이전 IR (HYGIENE-AUDIT-V1) 의 recreate 권고 | 본 IR 가 폐기 명시 | cleanup 방향 정상화 | **본 IR 가 해소** |

---

## 10. 본 IR 이 결정하지 않는 것

- 실제 코드 / 데이터 / 문서 수정 — 본 IR 은 read-only audit
- A1 (Bootstrap migration) 의 삭제 방식 — 전체 삭제 / super-admin 만 보존 / down() 만 보강 등 결정은 WO 단계
- `test-yaksa*` 패턴 (A9) 의 cleanup — 본 IR 범위 밖, 별도 audit 권고
- UUID 005~008 (neture/kcos/glyco operator) 의 정식 계정 전환 여부 — 별도 후속 audit 권고
- 본 IR 의 B4-6 정정을 IR 본문 직접 수정 vs supersession note 추가로 처리 — WO 시 결정
- 정식 운영 super-admin 의 인증/MFA 정책 — 본 IR 범위 밖

---

## 11. 후속 WO 제안 (사용자 결정 후)

| # | WO 후보 | 범위 | 의존 |
|---|--------|------|------|
| W1 | `WO-O4O-KPA-TEMP-SEED-RESIDUE-CRITICAL-REMOVAL-V1` | P0 항목만 (E1-2, A2) — 보안 즉시 차단 | 없음 |
| W2 | `WO-O4O-BOOTSTRAP-MIGRATION-DEPRECATION-V1` | A1 의 cleanup + 매 배포 재시드 동작 정지 + super-admin 유지 정책 결정 | W1 |
| W3 | `WO-O4O-PHAMACY1-MIGRATION-RESIDUE-CLEANUP-V1` | A5-7 삭제 | W2 |
| W4 | `WO-O4O-RESET-PLAN-POLICY-ALIGNMENT-V1` | B1-3 정정 + reset plan 재정의 (임시 계정 미복구) | W2 |
| W5 | `WO-O4O-PREVIOUS-IR-SUPERSESSION-NOTE-V1` | B4-6 supersession 노트 추가 | 독립 |
| W6 | `WO-O4O-TEST-SCRIPT-CREDENTIAL-EXTRACTION-V1` | C1, C3-4 평문 → env var / SSOT | 독립 |
| W7 (별도 audit 후) | `WO-O4O-TEST-YAKSA-RESIDUE-AUDIT-V1` | A9 별도 처리 | 별도 IR 선행 |
| W8 (별도 audit 후) | `WO-O4O-OPERATOR-UUID-MIGRATION-V1` | UUID 005~008 정식 계정 전환 | 별도 IR 선행 |

→ **현 사이클은 audit 단계.** 어떤 WO 부터 착수할지는 사용자 결정.

---

## 12. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | W1 (P0 보안 즉시 차단) 즉시 착수 | **YES** (production 빌드 평문 비밀번호 노출 + runtime endpoint) |
| 2 | W2 (Bootstrap deprecation) | YES (W1 직후) — super-admin 보존 여부 결정 필요 |
| 3 | W5 (이전 IR/CHECK supersession 노트) | YES (저비용, audit trail 정합 회복) |
| 4 | W4 (reset plan 재정의) | YES — 현재 plan 이 policy 와 정면 충돌 |
| 5 | A9 / UUID 005~008 별도 audit | YES (별도 IR — 본 IR 범위 밖) |
| 6 | A4, A8 legacy migration (자연 무효) | 우선순위 낮음 — 별도 큰 cleanup 사이클에 포함 |

---

## 13. 부록 — 사용된 검증 절차 (재현 가능)

### 13.1 패턴별 grep

```bash
# 3 KPA 임시 계정 이메일
Grep -r "kpa-admin@o4o\.com|kpa-operator@o4o\.com|phamacy1@o4o\.com" .

# Deterministic UUID
Grep -r "b0000000-b000-4000-b000-00000000000[234]" .

# 평문 패스워드 / Bootstrap 키워드
Grep -r "O4oBootstrap1!|BootstrapCanonicalSeed|O4oTestPass" .

# 확장 — 다른 8 임시 계정
Grep -r "kcos-admin@|kcos-operator@|glyco-operator@|neture-operator@|super-admin@" .
```

### 13.2 핵심 파일 inspection

- `apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts` (전체)
- `apps/api-server/src/database/migrations/2026041*-Phamacy1*.ts` (3 파일)
- `apps/api-server/src/database/migrations/20260216200001-CreateKpaAdminAccount.ts`
- `apps/api-server/src/database/migrations/20260212200000-CreateKpaSocietyOperatorAccount.ts`
- `apps/api-server/src/database/migrations/1769408012358-UpdateOperatorPasswords.ts`
- `apps/api-server/src/routes/admin/seed-test-accounts.ts`
- `services/web-glycopharm/src/pages/auth/LoginPage.tsx:213-244`
- `scripts/verify/verify-ai-content-modal.mjs:14-15`
- `e2e/registration-approval-login.spec.ts:13,102,161,221,298`
- `docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md:18,182,191,203-205`

### 13.3 production API 사실 확인 (CHECK-V1 결과)

```text
kpa-admin@o4o.com    → /operator/members/:uuid → "User not found"
kpa-operator@o4o.com → /operator/members/:uuid → "User not found"
phamacy1@o4o.com     → /operator/members/:uuid → "User not found"
```

(sanity check: super-admin, neture-operator 는 정상 조회됨 → API 채널 결함 아님)

---

*Version: V1 (2026-05-24)*
*Status: Residue Audit Complete — A 9 / B 7+ / C 2 / D 2+ 분류. 우선 W1 (P0 보안 차단) 권고*
*Next: 사용자 검토 → W1 ~ W6 우선순위 결정 → 각 WO 별 IR 또는 직접 착수*
