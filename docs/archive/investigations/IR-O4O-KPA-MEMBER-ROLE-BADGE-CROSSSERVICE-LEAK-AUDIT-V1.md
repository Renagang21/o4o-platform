# IR-O4O-KPA-MEMBER-ROLE-BADGE-CROSSSERVICE-LEAK-AUDIT-V1

> **조사 보고서 (read-only) — 코드·UI·DB·migration 변경 없음.**
>
> KPA-Society 운영자 회원관리 화면의 "추가 권한" 컬럼에 `supplier` (Neture) / `pharmacy` (legacy) / `강사` (LMS) 가 표시되는 원인 분리 — **역할 자체 잘못 부여** vs **타서비스 역할까지 보여주는 표시 문제**.

- **작성일:** 2026-05-30
- **사전 동기화:** origin/main 와 0 commits 차이
- **수정 행위:** **없음** | **DB 변경:** **없음**

---

## 0. 한 줄 결론

> **cross-service role leak 확정 (표시 문제) — Backend 의 KPA list endpoint 가 모든 active `role_assignments` 를 prefix filter 없이 응답** ([member.controller.ts:451-464](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L451-L464)).
>
> `supplier` / `pharmacy` 는 정상 부여 (각 service 가입 흐름의 product). `lms:instructor` 는 정상 경로 (분회 admin 승인) 또는 **migration 자동 부여 가능성** (`20260700200000-MigrateLmsCreatorQualification` — 사용자 신청 없이 레거시 `member_qualifications.status='approved'` 인 자격을 자동 변환) 두 가지 경로 — renagang21 의 정확한 부여 출처는 `member_qualifications` SELECT 1회 필요.
>
> **핵심 해결**: KPA capabilities SQL 에 prefix filter (`role LIKE 'kpa:%'` 또는 화이트리스트) 추가 → 별도 데이터 정리 없이 표시 정합 즉시 회복.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-30 |
| Repo 시점 | origin/main 와 일치 |
| 조사 방법 | 3 회 병렬 Explore agent + 이전 IR (renagang21 본인 login response) 의 roles 데이터 |
| 검증 채널 | 코드 정적 분석 + 이전 IR 의 `/api/v1/auth/login` response (read-only) |

---

## 2. 핵심 발견 매트릭스

| 차원 | 발견 |
|---|---|
| Backend SQL filter | ❌ `SELECT user_id, role FROM role_assignments WHERE user_id = ANY($1) AND is_active = true` — **prefix / service_key filter 0** |
| Frontend filter | ❌ `kpaMemberToUserData` / `capabilitiesColumn` 모두 raw role 그대로 전달 + sort 만 |
| CAPABILITY_LABELS 커버리지 | 5/8 — `kpa:store_owner` / `kpa:operator` / `kpa:admin` / `lms:instructor` / `platform:super_admin` (supplier / pharmacy 등 미등록 role 은 raw 표시) |
| supplier role 부여 | 정상 — `OperatorRegistrationService.approveRegistration` (Neture supplier 승인 시 unprefixed) |
| pharmacy role 부여 | 정상 — `MembershipApprovalService.approveMembership` (GP membership.role 그대로 INSERT) |
| lms:instructor 부여 | 2 경로: (1) 명시 승인 `instructor.service.ts:255`, (2) **migration 자동 변환** `20260700200000-MigrateLmsCreatorQualification` (사용자 신청 없이도 가능) |
| renagang21 의 roles | `["lms:instructor", "pharmacy", "supplier"]` (이전 IR login response 검증) — 3 종 모두 cross-service leak 으로 KPA 화면 표시 |

---

## 3. 조사한 파일

| 파일 | 라인 | 역할 |
|---|---:|---|
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L451-L464) | 451-464 | KPA list endpoint 의 capabilities batch SQL (**필터 0**) |
| [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L108-L135) | 108-135 | CAPABILITY_LABELS / sortCapabilities / formatCapabilityLabel |
| [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L149-L171) | 149-171 | `kpaMemberToUserData` (filter 없이 capabilities 그대로) |
| [apps/api-server/src/modules/neture/services/operator-registration.service.ts](apps/api-server/src/modules/neture/services/operator-registration.service.ts) | 85-142 | Neture supplier 승인 → role_assignments 에 **unprefixed `supplier`** INSERT |
| [apps/api-server/src/services/approval/MembershipApprovalService.ts](apps/api-server/src/services/approval/MembershipApprovalService.ts) | 173-182 | GP/일반 membership 승인 → membership.role 값 그대로 role_assignments INSERT (예: `pharmacy`) |
| [apps/api-server/src/routes/kpa/services/instructor.service.ts](apps/api-server/src/routes/kpa/services/instructor.service.ts#L255) | 255 | 분회 admin 명시 승인 시 `lms:instructor` 부여 |
| [apps/api-server/src/database/migrations/20260700200000-MigrateLmsCreatorQualification.ts](apps/api-server/src/database/migrations/20260700200000-MigrateLmsCreatorQualification.ts#L89-L106) | 89-106 | **레거시 자격 자동 변환 — `member_qualifications.status='approved'` 인 경우 자동 부여** |

---

## 4. 핵심 질문 답변 (Q1-Q8)

| Q | 답변 |
|---|---|
| **Q1.** "추가 권한" 컬럼 데이터 | `KpaMemberRaw.capabilities` (string[]) → frontend `KpaUserData.capabilities` → `capabilitiesColumn.render` 에서 chip 으로 표시 |
| **Q2.** role_assignments 전체 vs KPA 필터링 | **전체 표시** — backend SQL 의 prefix 필터 없음 (`is_active = true` 만) |
| **Q3.** supplier 역할 | Neture 전용 — `OperatorRegistrationService.approveRegistration` 이 **unprefixed `supplier`** 로 INSERT (의도적 — ADMIN_ROLES 만 prefix 적용) |
| **Q4.** pharmacy 역할 | GP membership role 의 직접 mirror — `MembershipApprovalService` 가 membership.role(='pharmacy') 그대로 INSERT (legacy unprefixed). 단 kpa pharmacy_owner 승인은 `kpa:store_owner` (prefixed) 별도 |
| **Q5.** 강사 역할 | `lms:instructor` (prefixed) |
| **Q6.** lms:instructor 자동 부여 코드 | **있음** — `20260700200000-MigrateLmsCreatorQualification` 이 `member_qualifications.qualification_type IN ('instructor','content_provider','survey_operator') AND status='approved'` 인 경우 자동 부여 |
| **Q7.** 모든 서비스 또는 가입 흐름에서 자동 부여 | ❌ 가입 흐름에서는 자동 부여 없음 (auth-register / KPA / GP / K-Cos / Neture 가입 모두). **단 migration 의 backfill 자동 부여 + 분회 admin 의 명시 승인** 2 경로 |
| **Q8.** KPA 회원관리에서 타서비스 role 표시 정책 | 현재 의도된 정책 부재 (코드만 보면 사이드 이펙트). 운영자 mental model 상 KPA 권한만 표시가 자연스러움 (운영 혼선 회피) |

---

## 5. renagang21@gmail.com 검증

이전 IR 의 login response 에서 확인된 데이터:

```json
{
  "roles": ["lms:instructor", "pharmacy", "supplier"],
  "memberships": [
    { "serviceKey": "glycopharm", "status": "active", "role": "pharmacy" },
    { "serviceKey": "neture", "status": "active", "role": "supplier" }
  ]
}
```

| role | 출처 | KPA 관련성 | 표시 정합 |
|---|---|:---:|:---:|
| `pharmacy` | GP membership active (membership.role 그대로 INSERT) | ❌ | leak (KPA 화면에 노출 부적합) |
| `supplier` | Neture supplier 승인 (unprefixed) | ❌ | leak |
| `lms:instructor` | (1) 명시 승인 또는 (2) migration 자동 변환 | ❌ (LMS 권한) | leak |

**lms:instructor 확정 경로 판별** = `member_qualifications` 또는 `kpa_instructor_qualifications` 테이블에서 renagang21 user_id (`6967ebe0-...`) SELECT 1회로 확정 (사용자 승인 후 가능).

→ **3 종 모두 cross-service role leak** (역할 자체는 정상 부여, 표시 정책 부재가 본질).

---

## 6. 원인 분류 (사용자 directive 의 2 축)

### 6.1 역할 자체가 잘못 부여?

| role | 잘못 부여? | 근거 |
|---|:---:|---|
| `supplier` | ❌ | Neture supplier 승인 product (정상) |
| `pharmacy` | ❌ | GP membership 'pharmacy' 의 정상 mirror (단 legacy unprefixed 정책 — 별건 cleanup 후보) |
| `lms:instructor` | ⚠️ **확정 불가** | 정상 (명시 승인) 또는 비정상 (migration 자동) 둘 중 하나 — `member_qualifications` 직접 조회 필요 |

### 6.2 표시 문제 (cross-service leak)?

✅ **확정** — KPA list backend SQL 의 prefix filter 0 + frontend filter 0. 모든 active role 노출.

### 6.3 본질

→ **표시 문제 (B) 가 본질이고 역할 부여 (A) 는 부분적 의심** (instructor 만). B 를 먼저 해결하면 A 의심이 드러나도 운영자 mental model 에 영향 없음.

---

## 7. 표시 정책 후보 비교

### A안 — KPA 관련 role 만 표시 (whitelist)

```sql
WHERE role LIKE 'kpa:%'
   OR role = 'platform:super_admin'
```

- ✅ 운영자 mental model 정합 (KPA 화면 = KPA 권한)
- ✅ 별도 데이터 정리 없이 해소
- ✅ 회귀 위험 매우 낮음 (응답 shape 동일, 일부 role 만 누락)
- ⚠️ 운영자가 "이 사람 다른 서비스 권한 보유" 확인 어려움 — 단 "서비스 멤버십" 컬럼 (이미 존재) 으로 부분 대체 가능

### B안 — 플랫폼 전체 role 표시 유지 (현재)

- ✅ 권한 전체 가시화
- ❌ 운영자 혼선 (KPA 화면에 Neture supplier 가 왜?)
- ❌ legacy unprefixed role (`pharmacy`, `supplier`) 이 raw 표시되어 의미 불명확
- ❌ 신규 service 추가 시 더 noisy

### C안 — KPA / 타서비스 / 플랫폼 그룹 분리 표시

- ✅ 정보 보존 + 시각 분리
- ✅ 운영자가 cross-service 권한 명확히 확인
- ❌ 컬럼 UX 복잡 (그룹 헤더 / 색상 등 추가 구현 비용)
- ❌ 다른 service 의 회원관리 화면과 정합성 점검 필요

| 차원 | A안 | B안 | C안 |
|---|:---:|:---:|:---:|
| 운영자 mental model 정합 | ✅ | ❌ | ✅ |
| 정보 손실 | 약간 (타서비스 권한 미표시) | 0 | 0 |
| 구현 비용 | 매우 낮음 (SQL 1 줄) | 0 | 중간 |
| 회귀 위험 | 매우 낮음 | — | 중간 |
| 권장 | ✅ **권장** | ❌ | ⚪ 장기 가치 (별건) |

---

## 8. 후속 WO 제안 (Priority 순)

### Priority 1 — 표시 정합 즉시 회복 (Recommended)

```
WO-O4O-KPA-MEMBER-ROLE-BADGE-SERVICE-FILTER-V1
  변경:
    - apps/api-server/src/routes/kpa/controllers/member.controller.ts:451-464
      SQL 에 prefix filter 추가:
        WHERE user_id = ANY($1) AND is_active = true
          AND (role LIKE 'kpa:%' OR role = 'platform:super_admin')
    - (선택) CAPABILITY_LABELS 정리 — supplier / pharmacy mapping 추가 또는 제거 (필터 적용 후 사실상 도달 불가)
  영향: KPA 화면에서 supplier / pharmacy / lms:instructor 자동 숨김 (운영자 mental model 정합)
  미변경: 다른 service 의 회원관리 / role 부여 코드 / 데이터
  회귀 위험: 매우 낮음
  검증: /api/v1/kpa/members 응답의 capabilities 가 KPA scope 만 포함 + 화면 chip 정합
```

### Priority 2 — renagang21 lms:instructor 부여 경로 확정 (사용자 검증)

```
사용자 또는 read-only SELECT 1회:
  SELECT user_id, qualification_type, status, created_at
  FROM member_qualifications
  WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef';

  + role_assignments 의 lms:instructor row 의 assigned_by / created_at 확인
```

→ 정상 경로 확인 시 P3 불요. migration 자동 부여 확인 시 P3 진입.

### Priority 3 — instructor 자동 부여 audit (Priority 2 결과 시)

```
WO-O4O-LMS-INSTRUCTOR-AUTO-ASSIGNMENT-AUDIT-FIX-V1
  대상:
    - 20260700200000-MigrateLmsCreatorQualification migration 의 자동 변환 정책 재검토
    - member_qualifications 의 stale approved row 정리 정책
  결과: 사용자 명시 신청 없이 instructor 부여 안 되도록 정책 정리
```

### Priority 4 — legacy unprefixed role 마이그레이션 (별건 — 장기)

```
WO-O4O-LEGACY-UNPREFIXED-ROLE-PREFIX-MIGRATION-V1
  대상:
    - role_assignments 의 unprefixed `supplier` / `pharmacy` → service-prefixed 마이그레이션
    - 또는 의도적 unprefixed 유지 명문화 (IR / 정책 문서)
  주의: cross-service shared role 정책 결정 필요 — 별건 IR 선행 권장
```

### Priority 5 — C안 (그룹 표시) 장기 follow-up

```
WO-O4O-MEMBER-ROLE-BADGE-SERVICE-GROUPING-V1
  내용: KPA / 타서비스 / 플랫폼 권한 시각 그룹 분리 — 운영자가 cross-service 권한 명확히 확인
  공통화 가능 — 4 service 회원관리 모두 적용
```

---

## 9. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 평가 | 충돌 |
|---|---|:---:|
| 서비스별 회원관리에 타서비스 role 표시 | KPA 화면에 Neture supplier / LMS instructor 노출 | **충돌** (서비스 분리 원칙) |
| KPA operator 의 권한 안내 | 운영자가 KPA scope 외 정보로 혼선 | **충돌** (운영 명확성) |
| 신청 없는 권한 자동 부여 | instructor migration 자동 부여 시나리오 | **약함** (권한 최소화 원칙) |
| 서비스별 회원관리 표시 정책 부재 | 4 service 모두 동일 가능성 (별건 audit 필요) | 약함 |
| GP / Neture / K-Cos 회원관리 — 같은 leak 가능성 | 본 IR 범위 외 — `OperatorMembersConsolePage` 의 default columns 에는 capabilities 미포함 → KPA 만 노출 위험 | 없음 (현재 KPA 만 capabilities 컬럼 보유) |

### 판정: **명확한 충돌 2건** (서비스 분리 / 운영 명확성) + 약한 충돌 1건 (권한 최소화)

### 권장

1. **즉시 — Priority 1 WO** (backend SQL prefix filter 1 줄 추가, 회귀 0)
2. **검증 — Priority 2** (renagang21 의 instructor 부여 경로 확정)
3. **장기 — Priority 4/5** (legacy unprefixed role 정책 + 그룹 표시)

---

## 10. 본 IR 이 결정하지 않는 것

- renagang21 의 lms:instructor 부여 경로 (Priority 2 — DB SELECT 1회 필요)
- 정책 결정 (A vs C — Priority 1 으로 A 우선)
- 다른 service 의 회원관리 화면 leak 가능성 (현재 GP/K-Cos/Neture wrapper 는 capabilities 컬럼 미보유로 leak 가능성 낮음, 단 별건 audit 가치)
- legacy unprefixed role 정책 (Priority 4 — 별건)
- Priority 1-5 의 실제 실행 시점

---

## 11. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 큰 결정 | **cross-service role leak = 표시 문제 (B) 확정 + role 부여 (A) 는 instructor 만 부분 의심** |
| 핵심 발견 | KPA capabilities SQL 의 prefix filter 0 + frontend filter 0 — 모든 active role 노출 |
| 후속 WO 제안 | 5 건 (P1 SQL filter, P2 instructor 경로 검증, P3 자동 부여 audit, P4 unprefixed 정리, P5 그룹 표시) |
| 사이클 정리 | "역할 부여 vs 표시" 분리 완료. P1 으로 표시 정합 즉시 회복 가능 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. KPA capabilities SQL 위치
grep -nE "capabilities|role_assignments" apps/api-server/src/routes/kpa/controllers/member.controller.ts | head -20

# 2. lms:instructor 부여 경로 전수
grep -rln "lms:instructor\|'instructor'" apps/api-server/src/ --include="*.ts" | head -10
grep -nE "instructor|qualification" apps/api-server/src/routes/kpa/services/instructor.service.ts | head -20
grep -nE "instructor" apps/api-server/src/database/migrations/20260700200000-MigrateLmsCreatorQualification.ts | head -10

# 3. supplier / pharmacy 부여 위치
grep -nE "INSERT.*role_assignments|supplier|pharmacy" apps/api-server/src/modules/neture/services/operator-registration.service.ts | head -20
grep -nE "INSERT.*role_assignments|approveMembership" apps/api-server/src/services/approval/MembershipApprovalService.ts | head -20

# 4. KPA frontend capabilities render
grep -nE "capabilities|CAPABILITY_LABELS" services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx | head -20

# 5. (사용자 승인 후 1회) renagang21 의 lms:instructor 출처 확정
SELECT user_id, qualification_type, status, created_at
FROM member_qualifications
WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef';

SELECT role, scope_type, is_active, assigned_by, created_at
FROM role_assignments
WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef' AND is_active = true;
```

---

*Created: 2026-05-30*
*Type: Investigation Report (read-only)*
*Status: ✅ cross-service role leak 확정 (표시 문제). instructor 자동 부여 부분 의심 (Priority 2 검증 필요).*
*Decision Required: Priority 1 (KPA capabilities SQL prefix filter) 즉시 진행 여부.*
