# IR-O4O-OPERATOR-MEMBERS-EDIT-MODAL-COMMONIZATION-AUDIT-V1

**유형:** 완료 상태 확인 IR  
**작성일:** 2026-06-01  
**상태:** 완료 — 추가 WO 불필요  
**코드 변경:** 없음

---

## 핵심 결론

**EditUserModal 공통화는 이미 완료되어 있다.**

3개 서비스(Neture/GlycoPharm/K-Cosmetics) 모두 `CommonEditUserModal` (config-driven) 기반 thin wrapper로 전환 완료. KPA는 `KpaEditUserModal`로 별도 유지 (코드 명시적 금지 주석 포함).

**판정: C — slot 유지 권장** (현재 구조가 이미 안전하며 완료됨)

---

## 완료된 WO / IR 흐름

| 커밋 | 작업 |
|------|------|
| `16c0f11f4` | `IR-O4O-MEMBER-MANAGEMENT-EDIT-USER-MODAL-COMMONIZATION-AUDIT-V1` (archive) |
| `d1382affd` | `IR-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-DESIGN-V1` (archive) |
| `9a8c5d12f` | **`WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1`** — 3서비스 공통화 |
| `a5874c15d` | `WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1` — KpaEditUserModal 추출 |
| `8d7d79c8e` | `WO-O4O-MEMBER-MANAGEMENT-EDIT-USER-MODAL-CONFIG-DOCUMENTATION-V1` — JSDoc 보강 |

---

## 1. CommonEditUserModal 구조

`packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx` (496줄)

**Config-driven 설계:**

```typescript
interface EditUserModalConfig {
  serviceKey: string;
  makeRequest: ApiRequestFn;                   // 서비스별 API 어댑터
  membershipRoleOptions: EditUserModalOption[]; // 회원 유형 선택지
  adminRoleOptions: EditUserModalOption[];      // 운영 권한 선택지
  businessInfoLabel?: string;
  businessNameLabel?: string;
  profileClassification?: ProfileClassificationConfig; // K-Cos 전용
  normalizeAdminRoleDisplay?: boolean;
}
```

**공통 제공 필드:** 이름/이메일/전화번호, 회원 유형, 운영 권한, 사업자 정보, 비밀번호 변경

---

## 2. 서비스별 EditUserModal 상태

| 서비스 | 파일 크기 | 구현 방식 | 서비스별 차이 |
|--------|---------|---------|------------|
| Neture | 67줄 | `CommonEditUserModal` + `NETURE_CONFIG` | 공급자/파트너 역할 옵션, neture: prefix |
| GlycoPharm | 63줄 | `CommonEditUserModal` + `GLYCOPHARM_CONFIG` | pharmacy/supplier 역할, '약국 정보'/'약국명' 레이블 |
| K-Cosmetics | 79줄 | `CommonEditUserModal` + `KCOSMETICS_CONFIG` | 판매자/소비자/파트너, `profileClassification` (cosmetics_members.subRole) |
| KPA | 별도 `KpaEditUserModal` | 별도 컴포넌트 (통합 금지 명시) | kpa_members.id, 분리 API, activity_type 로직 |

### K-Cosmetics만 사용하는 profileClassification

```typescript
profileClassification: {
  label: '매장 역할',
  options: [{ value: 'store_owner', label: '매장 경영자' }, { value: 'store_staff', label: '매장 근무자' }],
  fetchPath: (id) => `/cosmetics/members/${id}`,
  patchPath: (id) => `/cosmetics/members/${id}`,
  responseField: 'subRole',
}
```

다른 서비스에서 미사용 — optional prop으로 설계되어 확장 안전.

---

## 3. API 차이

| 서비스 | 공통 endpoint | 서비스별 추가 |
|--------|------------|------------|
| Neture | `GET/PATCH /operator/members/:userId` | 없음 |
| GlycoPharm | `GET/PATCH /operator/members/:userId` | 없음 |
| K-Cosmetics | `GET/PATCH /operator/members/:userId` | `GET/PATCH /cosmetics/members/:userId` (subRole) |
| KPA | `GET /kpa/members/:id` + `PATCH /kpa/members/:id/info` | 완전 별도 |

Neture/GP/K-Cos는 공통 endpoint 사용 — `makeRequest` 어댑터로 baseURL 차이만 흡수.

---

## 4. 공통화 가능성 판정

**판정: C — 이미 완료된 구조 유지**

현재 구조:
```
OperatorMembersConsolePage
  → renderEditModal slot
    → 서비스별 EditUserModal.tsx (67~79줄)
      → CommonEditUserModal + service config
```

두 단계 공통화가 모두 완료:
1. **목록 레벨**: `OperatorMembersConsolePage` (공통)
2. **편집 모달 레벨**: `CommonEditUserModal` (config-driven 공통)

thin wrapper 파일에는 service-local config 정의 외에 아무 로직도 없다. 추가 공통화 불필요.

---

## 5. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| 운영 UX 공통화 | CommonEditUserModal config-driven으로 3서비스 완전 통일 | ✅ |
| 서비스별 차이 격리 | config 객체에만 차이 집중 (API 어댑터, 역할 옵션, 레이블) | ✅ |
| KPA 도메인 분리 | KpaEditUserModal 별도 유지, 통합 금지 명시 | ✅ 의도된 분리 |
| 확장성 | K-Cos `profileClassification`이 optional — 다른 서비스도 필요 시 사용 가능 | ✅ |
| 1인 개발 생산성 | thin wrapper 67~79줄, 이미 최적화 완료 | ✅ |

**결론**: 현재 구조가 O4O 철학과 완전히 일치. 추가 공통화는 불필요.

---

## 후속 WO 필요 여부

없음. 관련 설계 결정은 archive에 기록됨:
- `docs/archive/investigations/IR-O4O-MEMBER-MANAGEMENT-EDIT-USER-MODAL-COMMONIZATION-AUDIT-V1.md`
- `docs/archive/investigations/IR-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-DESIGN-V1.md`

---

*검증 수행: Claude Code (2026-06-01)*
