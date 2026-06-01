# IR-O4O-CROSSSERVICE-MEMBER-TYPE-ROLE-PERMISSION-DISPLAY-AUDIT-V1

> 조사 전용 IR — 원인 판정까지가 목표. **코드 수정 없음.**
> 일자: 2026-05-30
> 출발점: Neture 운영자 회원 리스트 "유형" 컬럼에 `공급자`와 `operator`가 혼재 표시되고,
> 수정 모달의 "회원 유형 / 운영 권한"과 의미 체계가 일치하지 않는다는 관측.

---

## 0. 요약 (Executive Summary)

- **Case B (프론트 표시 매핑 문제) — 확정.** Neture 리스트 "유형" 컬럼은 `service_memberships.role`
  원값을 그대로 렌더한다. `supplier`는 "공급자"로 라벨링되지만 bare `operator`는 매핑이 없어
  raw `operator`(영문)로 노출된다. 즉 한 컬럼에 **참여자 유형 축과 운영 권한 축이 혼합**된다.
- **Case E (서비스별 표시 기준 편차) — 확정.** KPA만 리스트에서 "활동 유형 / 추가 권한"을 2컬럼으로
  분리하고, Neture / GlycoPharm / K-Cosmetics는 1컬럼(`membership.role`) 구조다.
- **Case D (데이터 혼입) — 가능성 있음, 미확인.** 일부 Neture 계정의 `service_memberships.role`에
  bare `operator`가 저장돼 있을 가능성. DB 또는 브라우저 확인 필요.
- 수정 방향은 본 IR에서 확정하지 않는다. 후속은 2단계(IR 확정 → Neture 우선 UI 정렬 WO)로 분리 권장.

---

## 1. 재현 / 관측

- 화면: Neture 운영자 → 회원 관리 리스트.
- 증상: "유형" 컬럼에 `공급자`(한글 라벨)와 `operator`(영문 raw)가 섞여 표시됨.
- 수정 모달을 열면 "회원 유형"(공급자/파트너)과 "운영 권한"(운영자/관리자)이 별도 필드로 분리되어,
  리스트의 단일 "유형" 값과 의미가 맞물리지 않음.

---

## 2. 코드 레벨 원인 (확정)

### 2.1 리스트 "유형" 컬럼 = `service_memberships.role` 원값

[services/web-neture/src/pages/operator/UsersManagementPage.tsx](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx)

```ts
// L34-37 — 유형 컬럼이 읽는 값
function getPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === 'neture');
  return m?.role || 'user';           // ← service_memberships.role 원값 (없으면 'user')
}

// L60 — 라벨 변환 맵이 비어 있음
const NETURE_ROLE_DISPLAY: Record<string, string> = {};

// L213-214 — 공통 콘솔에 그대로 전달
getPrimaryRole={getPrimaryRole}
roleDisplayMap={NETURE_ROLE_DISPLAY}   // ← 빈 맵 → 변환 없음
```

공통 콘솔의 roleColumn은 `roleDisplayMap?.[role] ?? role` 로 표시값을 만든 뒤 `<RoleBadge role={...} />`
로 렌더한다. `NETURE_ROLE_DISPLAY`가 비어 있으므로 **항상 원값**이 RoleBadge로 넘어간다.

### 2.2 RoleBadge — 매핑 실패 시 원값 그대로 출력

[packages/operator-ux-core/src/member-list/MemberBadges.tsx](../../packages/operator-ux-core/src/member-list/MemberBadges.tsx)

```ts
// L30-59 ROLE_STYLES (발췌)
supplier:          { label: '공급자', ... },
partner:           { label: '파트너', ... },
'neture:operator': { label: '운영자', ... },
'neture:supplier': { label: '공급자', ... },
// ※ bare 'operator' / bare 'admin' 키는 없음

// L61-62 — fallback: 매핑 없으면 role 문자열을 그대로 라벨로
export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || { label: role, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
```

따라서 `service_memberships.role` 값에 따라:

| `service_memberships.role` | 리스트 "유형" 표시 |
|---|---|
| `supplier` | "공급자" (정상 라벨) |
| `partner` | "파트너" (정상 라벨) |
| `neture:operator` | "운영자" (정상 라벨) |
| **bare `operator`** | **raw `operator`** (회색 영문 badge) ← 관측된 혼재 |
| `user` (membership 없음) | raw `user` |

→ 리스트 "유형" 컬럼은 **참여자 유형(supplier/partner)** 과 **운영 권한(operator)** 을 **한 컬럼에 혼합**한다.

### 2.3 수정 모달 — 두 축을 분리

[services/web-neture/src/pages/operator/EditUserModal.tsx](../../services/web-neture/src/pages/operator/EditUserModal.tsx) →
공통 [packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx](../../packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx)

| 모달 필드 | 바인딩 소스 | Neture 옵션 |
|---|---|---|
| **회원 유형** | `service_memberships.role` | `[supplier, partner]` 만 |
| **운영 권한** | `role_assignments.role` (isActive) | `['', neture:operator, neture:admin]` |

→ 모달은 **회원 유형 축(service_memberships)** 과 **운영 권한 축(role_assignments)** 을 분리한다.
   리스트가 단일 `membership.role`을 그대로 보여주는 것과 **의미 체계가 다르다.**

### 2.4 리스트 ↔ 모달 불일치의 정확한 메커니즘

- 어떤 계정의 `service_memberships.role`(neture) 가 bare `operator` 라면,
  - **리스트 "유형"** = raw `operator` 로 표시되고,
  - **모달 "회원 유형"** 드롭다운은 옵션이 `[supplier, partner]` 뿐이라 `operator` 를 표현하지 못한다
    (선택 불가 → 첫 옵션/공란).
  - **모달 "운영 권한"** 은 `role_assignments` 에서 따로 읽으므로 리스트 "유형"과 출처가 다르다.
- 결과: 리스트의 "유형"과 모달의 "회원 유형"이 **서로 다른 값/의미**가 된다. (= 관측된 불일치)

---

## 3. 서비스별 현황

| 서비스 | 리스트 표시 기준 | 수정/상세 표시 기준 | 리스트↔수정 일치 | 문제 | 공통 컴포넌트 |
|--------|----------------|------------------|:---:|:---:|:---:|
| **Neture** | 1컬럼 `membership.role` **원값** (operator 혼입 노출) | 모달에서 회원유형/운영권한 **분리** | **불일치** | 있음 | `OperatorMembersConsolePage` 사용 |
| **KPA-Society** | **2컬럼 분리**: 활동 유형(`activity_type`) + 추가 권한(`capabilities` badge) | Drawer 다중 섹션 분리 | 일치 | 낮음 | 독립 구현(`MemberManagementPage`) |
| **GlycoPharm** | 1컬럼 `membership.role` | 모달에서 회원유형/운영권한 분리 | 잠재적 동일 이슈 | 잠재 | 공통 사용 |
| **K-Cosmetics** | 1컬럼 `membership.role` (+ subRole) | 모달에서 회원유형/운영권한 분리 (+ subRole) | 잠재적 동일 이슈 | 잠재 | 공통 사용 |

- **표시 기준 SSOT 부재**: 동일 공통 컴포넌트를 쓰는 Neture/GlycoPharm/K-Cosmetics는 모두 리스트 1컬럼이며,
  운영 권한 값이 `membership.role`에 섞이면 동일하게 raw 노출될 수 있다.
- **KPA만** 리스트에서 "참여자 특성(활동 유형)"과 "플랫폼 권한(추가 권한)"을 명시적으로 2컬럼 분리 →
  사실상 KPA가 의도된(올바른) 분리 모델이고 나머지 3개가 미정렬.

> 위 표는 IR 최초 조사 시점(**수정 전**) 상태다. **Neture는 §7에서 2컬럼 분리(회원 유형 / 운영 권한)로
> 정렬 완료**됐다. GlycoPharm / K-Cosmetics는 아직 1컬럼 구조로, §8 후속 조사 대상이다.

---

## 4. Neture 계정별 확인 — **브라우저 확인 완료 (DB 직접 확인 미완)**

대상: `renagang21@gmail.com`, `sohae21@naver.com`, `sohae2100@gmail.com`

### 4.1 브라우저 확인 결과 (수정 후, 라이브)

`WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1` 배포 후 브라우저 확인:

| 계정 | 회원 유형 | 운영 권한 | 대시보드 접근 |
|---|---|---|---|
| `renagang21@gmail.com` | 공급자 | 일반 회원 | 공급자 대시보드 |
| `sohae21@naver.com` | 공급자 | **운영자** | 운영자 대시보드, 공급자 대시보드 |
| `sohae2100@gmail.com` | 일반 회원 | **관리자** | 관리자 대시보드, 운영자 대시보드 |

→ `sohae21@naver.com`은 **참여 유형(공급자)과 운영 권한(운영자)을 동시에** 가지며, 화면에서 두 축이
  분리되어 모두 정확히 표시된다. 수정 전에는 리스트 "유형"에 raw `operator`가, 모달 "운영 권한"에
  잘못된 "일반 회원"이 표시됐다(= §2.4 분석 확정).

### 4.2 DB 직접 확인 — 미완

두 계정의 `service_memberships.role` / `role_assignments.role` 실데이터 직접 확인은 미완:
- psql 설치 확인(PostgreSQL 17). Cloud SQL 인스턴스 확정: project **`netureyoutube`**, `o4o-platform-db`, 34.64.96.252.
- 직접 TCP는 방화벽 차단. `gcloud sql connect`로 IP allowlist는 성공하나 **프로덕션 postgres 비밀번호 부재**
  (로컬 `.env`는 localhost용 → `password authentication failed`). 프로덕션 비번은 GitHub Secrets.
- 자격증명 확보 시 확인용 쿼리:
```sql
SELECT u.email, sm.role AS membership_role, sm.status,
       ra.role AS assignment_role, ra.is_active
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
LEFT JOIN role_assignments ra ON ra.user_id = u.id
WHERE u.email IN ('sohae21@naver.com','renagang21@gmail.com','sohae2100@gmail.com')
ORDER BY u.email, ra.role;
```

> **브라우저 거동 기준 결론**: `sohae21@naver.com`의 운영 권한은 **bare `operator`**(namespaced 아님)로,
> 참여 유형(공급자)은 `role_assignments`에 존재한다 — 모달 운영 권한이 namespaced-only 매칭이라 "일반 회원",
> 대시보드 접근은 bare를 인정해 "운영자"였던 거동으로 **사실상 확정**. DB 직접 확인만 미완.

---

## 5. 원인 분류

| Case | 내용 | 판정 |
|------|------|------|
| **A** 프론트 라벨만 모호 | bare operator 미번역(영문) | 부분 — Case B의 표면 증상 |
| **B** 프론트 표시 매핑 오류 | 리스트 "유형"이 회원유형/운영권한 축을 한 컬럼에 혼합 + `NETURE_ROLE_DISPLAY` 빈 매핑으로 raw 노출 | **확정** |
| **C** API 응답 부족 | 리스트 API는 `roles[]`(role_assignments) + `memberships[].role` 모두 제공 — 데이터는 충분, 표시 선택의 문제 | 해당 없음 |
| **D** 데이터 모델 혼입 | 일부 계정의 운영 권한이 bare `operator`(membership.role / roles[])로 저장되어 참여유형/운영권한 축이 혼입 | **브라우저 화면 기준 확인 — DB 직접 확인 미완** |
| **E** 서비스별 구현 편차 | KPA만 2컬럼 분리, 나머지 3개 1컬럼 → 공통 표시 기준 부재 | **확정** |

---

## 6. O4O 철학 충돌 점검

- O4O는 **참여 주체(공급자 / 매장 / 운영 사업자)** 와 **운영 권한(operator / admin)** 을 서로 다른 축으로
  정의한다 (`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md §3`, `docs/architecture/USER-OPERATOR-FREEZE-V1.md` F11:
  "Operator=membership 기반, role은 membership에서 파생").
- 리스트 "유형" 한 컬럼에 참여자 유형과 운영 권한을 혼합 표시하는 것은 이 **축 분리 원칙과 충돌**한다.
- 따라서 표시 측면에서 두 축을 분리(KPA식)하는 방향이 철학 정합적이다.

---

## 7. Neture 수정 완료 (1차 UI 표시 정렬)

본 IR 후속으로 Neture는 2개 WO로 표시 정렬을 완료했다 (**데이터 모델/write-path 미수정 — 표시·초기값만**).

| WO | 내용 | 상태 |
|---|---|---|
| `WO-O4O-NETURE-MEMBER-LIST-TYPE-PERMISSION-DISPLAY-ALIGNMENT-V1` | "유형" 컬럼에서 raw operator/admin/user 노출 제거 (참여유형 외는 일반회원 collapse) | 완료·배포 |
| `WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1` | "회원 유형"/"운영 권한" 2컬럼 분리(KPA식) + 모달 운영 권한 초기값을 대시보드 기준과 일치(bare/namespaced 정규화, 관리자>운영자). 공통 컴포넌트는 additive/opt-in으로 타 서비스 무영향 | 완료·배포 |

표시 기준(확정):
- **회원 유형** = 참여 유형(공급자/파트너/셀러/일반 회원). tokens(roles[] ∪ user.role ∪ neture membership.role)에서 참여유형 우선 도출.
- **운영 권한** = 관리자/운영자/일반 회원. 동일 tokens에서 관리자>운영자, bare/namespaced 모두 인정.
- **대시보드 접근** = 실제 접근 가능 대시보드(기존 유지).
- 세 컬럼 + 모달 운영 권한이 **동일 신호**를 사용해 일치한다.

---

## 8. 후속 방향

1. **Neture**: 1차 UI 표시 정렬 완료(§7).
2. **다음 단계 — GlycoPharm / K-Cosmetics 조사** (별도 IR 또는 WO, **바로 수정 금지**):
   - Neture와 동일하게 리스트가 `membership.role` 1컬럼 구조인지.
   - 모달 "운영 권한" 표시가 실제 대시보드 접근(bare operator/admin)과 일치하는지 — namespaced-only 매칭 동일 결함 여부.
   - 운영 권한 값이 membership.role / roles[]에 혼입된 계정이 있는지.
   - 필요 시 KPA(2컬럼 분리 모델)를 기준으로 비교.
3. **데이터 정합성(Case D) — 별도 트랙**: `service_memberships.role`(또는 roles[])에 bare `operator`/`admin`이
   들어가는 write-path 조사. 의도된 legacy인지, 승인/권한 부여 과정의 혼입인지. UI 표시와 분리.

---

## 9. 미확인 항목 (추적)

- [ ] 3계정의 `service_memberships.role` / `role_assignments.role` DB 실데이터 (브라우저 거동 기준 확인됨, DB 직접 미완).
- [ ] bare `operator`/`admin`가 membership.role / roles[]에 들어가는 write-path (Case D 데이터 원인).
- [ ] GlycoPharm / K-Cosmetics 동일 구조·동일 모달 결함 여부.

---

*코드 분석 + 라이브 브라우저 확인 기반. DB 직접 확인 항목은 §4.2·§9에 "미완"으로 명시.*
*본 보강은 IR 문서만 수정. 코드 변경 없음.*
