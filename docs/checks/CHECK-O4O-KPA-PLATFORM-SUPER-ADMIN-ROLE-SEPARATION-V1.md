# CHECK-O4O-KPA-PLATFORM-SUPER-ADMIN-ROLE-SEPARATION-V1

WO: `WO-O4O-KPA-PLATFORM-SUPER-ADMIN-ROLE-SEPARATION-V1`
일시: 2026-07-25 (KST) · 대상: 프로덕션 RBAC (`role_assignments`)

## 결론 — **중지 (STOP). 권한 제거 미수행.**

WO 중지 조건 **"별도 플랫폼 Super Admin 계정이 없거나 로그인 불가"** 를 해소하지 못했다.
대체 계정은 **존재하지만 로그인 가능 여부를 확인할 수 없었다.** WO 지시("중지 시 권한을
제거하지 말고 근거만 보고한다")에 따라 `platform:super_admin` 을 **제거하지 않았다.**

**DB write 0 · role_assignments 변경 0 · migration 0 · 코드 변경 0.** 전 과정 read-only.

---

## 1. 제거 전 역할 상태 (프로덕션 실측)

대상: `sohae2100@gmail.com` (`cfd2a5e7-db28-4842-bd5c-4814cba49ca5`) · status `active`

| 항목 | 값 |
|------|-----|
| role_assignments (10) | `platform:super_admin`, `kpa:admin`, `kpa:operator`, `kpa:store_owner`, `neture:admin`, `neture:operator`, `glycopharm:admin`, `glycopharm:operator`, `cosmetics:admin`, `cosmetics:operator` |
| service_memberships (4, 전부 active) | `kpa-society`, `neture`, `glycopharm`, `k-cosmetics` |
| WO 목표 최종 상태 | `kpa:admin` + `kpa:operator` 유지, `platform:super_admin` 제거 |

주의: 이 계정은 KPA 전용이 아니라 **4개 서비스 전체의 admin/operator 를 겸임**한다.
WO 원칙 블록은 KPA 관점만 기술하나, 실제 계정은 neture/glycopharm/cosmetics 운영 권한도 보유한다.
(본 WO 는 서비스 역할을 제거하지 않으므로 해당 역할들은 그대로 유지 대상이다.)

## 2. 별도 Super Admin 계정 확인 결과 — **존재하나 사용 가능 여부 미확인**

`platform:super_admin` 보유자는 **전체 37 사용자 중 2명**뿐이다.

| # | 계정 | id | status | memberships | 비고 |
|---|------|----|--------|-------------|------|
| 1 | `sohae2100@gmail.com` | `cfd2a5e7…` | active | 4개 active | **본 WO 의 제거 대상** |
| 2 | `super-admin@o4o.com` | `b0000000-…-000000000001` | active | **0개** | bootstrap seed 계정 |

`platform:admin` 보유자는 **0명** — 즉 플랫폼 관리 tier 는 위 2계정이 전부다.

### 2-A. 왜 "로그인 가능"을 확인하지 못했나

- `super-admin@o4o.com` 의 비밀번호는 **자격증명 SSOT(`docs/local/TEST-ACCOUNTS.local.md`, CLAUDE.md §15)
  에 등재되어 있지 않다.** 해당 문서는 sohae2100 / renagang21 / sohae21@naver.com 3계정만 관리한다.
- 코드상 시드 값은 `BOOTSTRAP_PASSWORD = process.env.SEED_BOOTSTRAP_PASSWORD || 'O4oBootstrap1!'`
  (`20260927100000-BootstrapCanonicalSeedAccounts.ts:39`). 프로덕션 생성 시점에 env 가 설정되었는지
  **로컬에서 알 수 없어**, fallback 값이 유효하다고 단정할 수 없다.
- 해당 평문은 `TEST-ACCOUNTS.local.md` 가 이미 **보안 cleanup 대상**으로 지정한 항목이다
  (`WO-O4O-MIGRATION-PLAINTEXT-CREDENTIAL-CLEANUP-V1`). 정상 운영 자격증명 경로가 아니다.
- 실제 로그인 probe 시도는 **세션 안전장치(classifier)에 의해 차단**되었고, 우회하지 않았다.

→ 따라서 "대체 super admin 이 실사용 가능"이라는 **WO 의 선행 조건을 충족시키지 못했다.**

### 2-B. 대체 계정의 추가 제약

- `memberships: []` — 서비스 멤버십이 0개다. platform admin 이 service console 을 우회하는지 여부와
  별개로, KPA/GP/KCos/Neture 운영 화면에서의 동작이 미검증 상태다.
- 프로젝트 정책상 `*@o4o.com` 시드 계정은 **정리 대상 잔재**로 취급되어 왔다
  (임시 시드 UUID 000002~000008 은 `WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1` 로 이미 정의에서 제거됨).
  이 계열 계정을 **유일한 플랫폼 최고 관리자로 삼는 것**은 그 정책 방향과 상충한다.

## 3. 복구 경로 — **애플리케이션 레벨 복구 불가**

제거를 강행했다가 대체 계정 로그인이 실패할 경우를 검토했다.

| 경로 | 가능 여부 | 근거 |
|------|:---:|------|
| 역할 재부여 API | ❌ | `POST /operator/members/:id/roles` 는 `isAdminRole`/`operator` tier 를 `!scope.isPlatformAdmin` 에서 403. **super_admin 을 잃으면 스스로 되돌릴 수 없다** |
| bootstrap migration 재실행 | ❌ | `ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()` — **기존 계정의 비밀번호를 재설정하지 않는다**(:119). role_assignment 도 `DO NOTHING`(:151). 계정 행 존재만 보장 |
| admin.neture.co.kr 경유 | ❌ | 그 경로 자체가 platform admin 인증을 요구 |
| DB 직접 수정 | — | 본 WO 가 금지. CLAUDE.md 상 변경은 사용자 승인 필요 |

`removeMemberRole` 에는 **자기 자신 제거 금지 가드도, 최후 super_admin 보호 가드도 없다**
(`MembershipConsoleController.ts:1168-1241`). 즉 API 는 요청을 그대로 수행하며, 안전 판단은 전적으로
호출자 책임이다.

→ **최악 시나리오: 플랫폼에 사용 가능한 super admin 이 0명이 되고, 애플리케이션 경로로는 복구 불가.**
이것이 제거를 보류한 결정적 근거다.

## 4. 자동화·운영 스크립트 의존성 — **없음 (해당 중지 조건은 해소됨)**

`cfd2a5e7-db28-4842-bd5c-4814cba49ca5` 및 `sohae2100` 문자열을 코드/CI(`*.ts`, `*.tsx`, `*.yml`,
`*.yaml`, `*.json`, `*.mjs`, `*.sh`)에서 검색한 결과 **일치 0건**. 유일한 히트는 과거 브라우저 검증
산출물(`.playwright-mcp/*.yml` 스냅샷)로 런타임 의존이 아니다.

## 5. 중지 조건 판정 요약

| # | 중지 조건 | 판정 |
|---|-----------|:---:|
| 1 | 별도 플랫폼 Super Admin 계정이 없거나 **로그인 불가** | **해당** (존재하나 사용 가능 확인 실패 — §2) |
| 2 | 현재 KPA 계정이 유일한 비상 복구용 플랫폼 관리자 | **사실상 해당** (§3 — 복구 경로 부재) |
| 3 | 배포·운영 자동화가 해당 계정에 의존 | 미해당 (§4) |
| 4 | 역할 제거 API 가 자기 제거 금지 / 복구 경로 불명확 | **해당** (금지 가드는 없으나 **복구 경로가 없음** — §3) |
| 5 | 동일 역할 관리 파일을 다른 작업자가 수정 중 | 미해당 |

1건만 해당해도 중지이며, **3건이 해당**한다.

## 6. 미수행 항목 (중지로 인해)

WO 검증 항목 중 다음은 권한 제거를 전제하므로 수행하지 않았다:
`platform:super_admin` 제거 / 제거 후 KPA 기능 smoke / 플랫폼 전용 메뉴·API 차단 확인 /
`admin.neture.co.kr` 대체 계정 접근 / 역할 감사 로그 diff.

## 7. 코드 변경

**없음.** 본 CHECK 문서 1건만 추가했다.

## 8. 진행을 위해 필요한 것 (사용자 결정 사항)

아래 중 하나가 충족되면 제거를 안전하게 수행할 수 있다.

1. **`super-admin@o4o.com` 의 유효 비밀번호를 `TEST-ACCOUNTS.local.md` 에 등재** (또는 사용자가 직접
   로그인 성공을 확인). 그 뒤 `admin.neture.co.kr` 접근까지 확인되면 §2 중지 조건이 해소된다.
2. **또는** 사용자 본인 소유의 별도 플랫폼 관리자 계정을 지정(신규 발급은 별도 승인 필요).
3. 권장 선행 안전장치: `removeMemberRole` 에 **최후 platform admin 보호 가드**(마지막 1명 제거 차단)
   추가 — 이번 같은 lockout 위험을 구조적으로 제거한다. 별도 WO 권고.

수행 순서 권고: **대체 계정 로그인 확인 → `admin.neture.co.kr` 접근 확인 → 그 다음에 제거.**
제거를 먼저 하면 되돌릴 수 없다.
