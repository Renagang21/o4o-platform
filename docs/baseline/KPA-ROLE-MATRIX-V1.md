# KPA-A/B/C 권한 매트릭스 v1.0

> 2026-02 기준 구조 고정 문서
> 이 문서는 KPA 서비스 전체의 역할/권한/격리 원칙을 고정한다.
>
> **상태**: ACTIVE — **범위 축소**(판정 확정 2026-10-06, `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`). 이 문서는 이제 **KPA Society(`kpa:*`, serviceKey `kpa-society`) 역할 문서**다. 분회 서비스(`kpa-branch:*`)의 역할 · 접근 정본은 [`KPA-BRANCH-ROLE-MATRIX-V1`](KPA-BRANCH-ROLE-MATRIX-V1.md) 이다.
> - **경계 확정**: `kpa:*` 와 `kpa-branch:*` 는 독립 권한 경계다. "`kpa:admin` · `kpa:operator` 의 전체 branch 접근 허용"(§3 KPA-c · §4 KPA-c CMS)은 **폐기** — 되돌리지 않는다.
> - 본문의 KPA-b · KPA-c 절(§2 의 `kpa:branch_*` · §3 KPA-c / KPA-b · §4 KPA-c CMS · §6 · §7 · §8 의 KPA-b / KPA-c 행)은 과거 기록으로 보존하며 구현 근거로 쓰지 않는다.
> - **§5 의 분회 guard 단계와 §10 의 Owner 선언도 과거 기록이다** — §5 의 `isBranchOperator()` · "branch 서비스는 서버 측 org lookup"(3단계 organizationId 범위 확인)과 §10 "Owner 모델 유지 (organizationId)" 는 KPA-c 전제다. 현행 KPA Society guard 는 `requireAuth` → `requireKpaScope`(`createMembershipScopeGuard(KPA_SCOPE_CONFIG)` — `kpa-society` membership + `kpa:admin` ⊃ `kpa:operator`)이며 분회 tenant 판정을 하지 않는다. 분회 단위 판정을 Society 에 적용하지 않는다. §5 의 Role 확인 · serviceKey 격리 원칙은 유효하다.
> - 하단 `Status: Frozen` 은 2026-02 작성 시점 표기이며 `CLAUDE.md` §14 Frozen 목록(F1~F12)에 없다.
>
> (2026-10-04 정합) 현행 사실:
> - **KPA-b(데모)** 는 제거 완료(`/demo/*` route 없음 — [KPA-SOCIETY-SERVICE-STRUCTURE](KPA-SOCIETY-SERVICE-STRUCTURE.md) §2).
> - **KPA-c(분회)** 는 독립 serviceKey `kpa-branch` · role prefix **`kpa-branch:*`**(`kpa-branch:admin` · `kpa-branch:operator` · `kpa-branch:member`)로 옮겨졌다. 서비스 축 = `requireKpaBranchScope`(active `service_memberships('kpa-branch')` + role), 분회 축 = `branch_memberships`(`apps/api-server/src/middleware/kpa-branch-scope.middleware.ts`). 옛 `kpa:branch_admin` · `kpa:branch_operator` 는 `20260415000000-ArchiveBranchAndChapterData` 로 비활성화됐다(`WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE3-DATA-AND-ROLE-CLEANUP-V1`).
> - **KPA-a** 의 `kpa:*` 는 serviceKey `kpa-society`(현재 의미 = 약국 사업자 서비스 `pharmacy.neture.co.kr`)의 prefix 이며 KPA 분회와 무관하다([SUBDOMAIN-SERVICE-SEMANTICS](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §원칙 5 · 주소 표). (2026-10-06 정정) 현행 `kpa:*` 는 **scope 허용 역할**과 **`role_assignments` 에 남아 있을 수 있는 행**을 구분해서 읽는다.
>   - **KPA scope 허용 역할 = `kpa:admin` ⊃ `kpa:operator` 뿐**(`packages/security-core/src/service-configs.ts` `KPA_SCOPE_CONFIG.allowedRoles`).
>   - **`kpa:store_owner`** — 매장 workspace 접근 축의 역할이다(KPA scope 를 주지 않음, [STORE-OWNER-RBAC](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md)).
>   - **`kpa:pharmacist` · `kpa:student`** — deprecated(자격은 `kpa_pharmacist_profiles`). 새로 부여하지 않고 scope 도 주지 않는다. 다만 `20260326300000-DeactivateQualificationRoles` 로 비활성화된 뒤 `20260924100000-FixKpaOrphanRoleCleanup` 이 일부(테스트 계정) assignment 를 `is_active=true` 로 복원했으므로 **활성 행이 남아 있을 수 있다** — 권한 감사 · 정리 작업은 이 행들을 포함해 조회한다.
>   - `kpa:district_admin` · `kpa:branch_admin` · `kpa:branch_operator` 는 제거됐다(`WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1`). 조직 단위 역할은 role 이 아니라 `kpa_members.role` 이다.
> - 유효하게 남는 원칙: `platform:*` 은 서비스 scope 를 대신하지 않음 · serviceKey 격리 · 서버 측 org lookup · 이력 데이터 Hard delete 금지(2026-10-06 범위 정정 — §7 주석) · 신규 서비스는 serviceKey · scope 문서화 후 구현 · Core 수정 금지.

---

## 1. 전제

- KPA-a, KPA-b, KPA-c는 **서로 독립 서비스**
- 각 서비스는 **자체 Operator 집합**
- organizationId는 **서비스 내부 범위**
- 플랫폼 전역 조직 개념 없음

---

## 2. Role Namespace (현행 유지)

> (2026-10-06 정정) 아래 목록 중 `kpa:branch_admin` · `kpa:branch_operator` 는 제거된 과거 역할이다. 현행 `kpa:*` 역할은 상단 정합 주석(`kpa:admin` · `kpa:operator` · `kpa:store_owner`)이 정본이다.

```
kpa:admin
kpa:operator
kpa:branch_admin
kpa:branch_operator
```

- `platform:*`은 KPA 영역 접근 불가
- legacy `branch_admin` 차단 유지

---

## 3. 서비스별 역할 범위

### KPA-a (본 서비스)

| Role | 범위 | 설명 |
|------|------|------|
| kpa:admin | 전역 | 회원/콘텐츠/감사 로그 |
| kpa:operator | 전역 | 콘텐츠/포럼 관리 |
| kpa:branch_admin | ❌ | 접근 불가 |
| kpa:branch_operator | ❌ | 접근 불가 |

organizationId = null

### KPA-c (분회 서비스)

> (2026-10-06 판정) 아래 표는 폐기된 과거 기록이다. 분회 서비스의 현행 role 행렬은 [`KPA-BRANCH-ROLE-MATRIX-V1`](KPA-BRANCH-ROLE-MATRIX-V1.md) 이 정본이다. "`kpa:admin` · `kpa:operator` 전체 branch 접근 허용" 은 폐기됐다.

| Role | 범위 | 설명 |
|------|------|------|
| kpa:branch_admin | organizationId 범위 | CMS + 설정 |
| kpa:branch_operator | organizationId 범위 | CMS |
| kpa:admin | 전체 branch 접근 허용 (의도적 정책) | |
| kpa:operator | 전체 branch 접근 허용 (의도적 정책) | |

organizationId = 분회 ID

### KPA-b (데모/별도 서비스)

> (2026-10-04 정합) 데모 서비스는 제거 완료 — 아래 및 §6 · §7 의 KPA-b 행은 과거 기록이다.

현재 CMS 없음.
추후 정의 시:
- organizationScoped 여부 결정
- branch 개념 적용 여부 별도 설계

---

## 4. CMS 권한 매트릭스

### KPA-a CMS (cms_contents)

| Role | CREATE | UPDATE | DELETE | LIST ADMIN |
|------|--------|--------|--------|------------|
| kpa:admin | ✔ | ✔ | ✔ | ✔ |
| kpa:operator | ✔ | ✔ | ✔ | ✔ |
| branch roles | ❌ | ❌ | ❌ | ❌ |

### KPA-c CMS (kpa_branch_news 등)

| Role | CREATE | UPDATE | DELETE | LIST ADMIN |
|------|--------|--------|--------|------------|
| kpa:branch_admin | ✔ | ✔ | ✔ | ✔ |
| kpa:branch_operator | ✔ | ✔ | ✔ | ✔ |
| kpa:admin | ✔ | ✔ | ✔ | ✔ |
| kpa:operator | ✔ | ✔ | ✔ | ✔ |
| 일반 회원 | ❌ | ❌ | ❌ | ❌ |

---

## 5. Guard 원칙

모든 보호 API는 다음 3단계 확인:

1. **Role 확인** — `requireKpaScope()` 또는 `isBranchOperator()`
2. **serviceKey 격리** — CMS는 serviceKey로 데이터 분리
3. **organizationId 범위 확인** — branch 서비스는 서버 측 org lookup

---

## 6. 감사 정책

| 서비스 | 감사 로그 |
|--------|----------|
| KPA-a | 전면 적용 |
| KPA-c | 전면 적용 |
| KPA-b | 미정 |

Audit 실패는 CUD를 차단하지 않는다 (non-blocking).

---

## 7. 삭제 정책

| 서비스 | 정책 |
|--------|------|
| KPA-a | soft delete (status='archived') |
| KPA-c | soft delete (is_deleted=true) |
| KPA-b | TBD |

Hard delete 금지.

> (2026-10-06 범위 정정) 이 금지는 소속 · 감사 이력 같은 **이력 데이터**에 적용한다. KPA Society 에는 의도된 물리 삭제 경로가 현행으로 있다 — archived 뉴스 완전 삭제(`DELETE /news/:id/hard` · `POST /news/batch-hard-delete`, `kpa:operator`) · 회원 삭제 `?mode=hard`(`member.controller.ts`). 이 경로들은 정본 위반이 아니며, 삭제 계약을 바꾸려면 별도 WO 로 한다.

---

## 8. 서비스 간 격리 원칙

- KPA-a는 branch 테이블 접근 불가
- KPA-c는 cms_contents 접근 불가
- serviceKey 없는 cross 조회 금지

---

## 9. 확장 원칙

신규 KPA 서비스 추가 시:
- serviceKey 필수
- organizationScoped 여부 명시
- Role 허용 범위 문서화 후 구현
- Core 수정 금지

---

## 10. 구조 확정 선언

이 문서는 다음을 고정한다:
- Role namespace 유지 (`kpa:*`)
- Owner 모델 유지 (organizationId)
- 서비스 독립 원칙 유지
- Core 동결 준수

---

*Created: 2026-02-14*
*Version: 1.0*
*Status: Frozen* — (2026-10-04 정합) 작성 시점 표기. 현행 상태는 ACTIVE(KPA Society 범위로 축소, 2026-10-06)
