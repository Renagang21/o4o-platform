# O4O User / Membership / Role / Qualification Structure v1

> **WO-O4O-USER-STRUCTURE-DOCUMENTATION-V1**
> Status: **Design Standard — Implementation Pending**
> Date: 2026-04-15
> Scope: 설계 기준 문서화 (코드/DB 변경 없음)

---

## A. 목적 및 배경

### 현재 가입 구조의 한계

| 항목 | 현재 구조 | 한계 |
|------|-----------|------|
| 회원 유형 | `service_memberships` (active/pending/inactive) | 사용자 "누구인가"를 표현하지 못함 |
| 약사 구분 | `kpa_pharmacist_profiles.membership_type` = `pharmacist \| student` | 2가지만 존재, 병원/산업/비활동 등 미분류 |
| 일반 회원 | Profile 기반 판정 (암묵적 구조) | 명시적 회원군 없음 |
| 자격 구조 | 없음 | 강사·콘텐츠 제공자·설문 운영자 역할 부여 불가 |
| LMS 연결 | 없음 | "누가 수강 가능한가" 판단 기준 없음 |

### 확장 필요성

- **사용자군 다양화**: 약사(개국/근무/병원/산업/비활동) + 학생 + 외부 전문가 + 공급자 + 소비자
- **강사 역할 도입**: 기본 role이 아닌 추가 자격으로 부여
- **LMS / 설문 / 퀴즈 / 마케팅** 구조 확장 대비
- **Neture Credit 보상 체계** 연동

---

## B. 핵심 설계 원칙

| # | 원칙 |
|---|------|
| 1 | **모든 참여자는 공통 User 계정으로 시작한다** — 서비스별 별도 계정 없음 |
| 2 | **"누구인가"와 "무엇을 할 수 있는가"를 분리한다** — Identity ≠ Permission |
| 3 | **강사는 기본 role이 아니라 추가 자격(Qualification)이다** — 심사·승인 후 부여 |
| 4 | **가입은 넓게, 권한은 정교하게 제어한다** — 진입 장벽 최소화, 기능 접근은 세분화 |

---

## C. 4층 구조 정의

```
┌────────────────────────────────────────────────────────┐
│  Layer 1. User (Identity)                              │
│  → 플랫폼 공통 계정. 이메일·비밀번호·이름.            │
├────────────────────────────────────────────────────────┤
│  Layer 2. Membership Group (회원군)                    │
│  → "이 서비스에서 나는 누구인가"                       │
│  → 가입 시 선택. 기능 접근의 1차 판단 기준.            │
├────────────────────────────────────────────────────────┤
│  Layer 3. Sub Role (세부역할)                          │
│  → 회원군 내의 직종/직위 세분화                        │
│  → 프로필 표시·커뮤니티 분류·통계 기준으로 활용         │
├────────────────────────────────────────────────────────┤
│  Layer 4. Qualification (자격)                         │
│  → 심사·승인 후 부여되는 추가 자격                     │
│  → 강사·콘텐츠 제공자·설문 운영자 등                   │
└────────────────────────────────────────────────────────┘
```

### 각 Layer 상세

| Layer | 정의 | 역할 | 예시 |
|-------|------|------|------|
| **User** | 로그인 주체. 플랫폼 전역 단일 계정 | Identity SSOT | `users` 테이블 |
| **Membership Group** | 서비스 내 사용자 범주 | 기능 접근 1차 판단 | `pharmacist_member`, `consumer` |
| **Sub Role** | 회원군 내 세부 직종/직위 | 프로필·분류·통계 | `pharmacy_owner`, `doctor` |
| **Qualification** | 심사 후 부여 추가 자격 | 강의·콘텐츠·설문 기능 | `instructor`, `content_provider` |

---

## D. 회원군 정의 (1차안)

| 회원군 | 키 | 설명 | 비고 |
|--------|-----|------|------|
| **약사 회원** | `pharmacist_member` | 약사 면허 보유자. 개국/근무/병원/산업/비활동 포함 | KPA, GlycoPharm 주 대상 |
| **약대생 회원** | `pharmacy_student_member` | 약대 재학 또는 졸업예정자 | KPA 주 대상 |
| **외부 전문가** | `external_expert` | 의사·영양사·마케터·연구자·교수 등 | 강의·콘텐츠 기여자 |
| **공급자 스태프** | `supplier_staff` | 제약·의료기기·식품 공급사 담당자 | Neture 주 대상 |
| **소비자** | `consumer` | 당뇨인·건강 관심 일반인 | GlucoseView, 향후 확장 |

> **현재 코드와의 관계**: 이 회원군은 향후 `service_memberships.metadata` 또는 별도 `member_profiles` 테이블로 구현한다. 기존 `kpa_pharmacist_profiles.membership_type`은 `pharmacist_member`의 세부역할로 흡수된다.

---

## E. 세부역할 정의

### 약사 회원 (`pharmacist_member`) 세부역할

| 세부역할 키 | 한국어 | 설명 |
|-------------|--------|------|
| `pharmacy_owner` | 개국 약사 | 약국을 직접 운영하는 약사 |
| `employed_pharmacist` | 근무 약사 | 타인 약국 또는 조직에 소속된 약사 |
| `hospital_pharmacist` | 병원 약사 | 병원/의원 소속 약사 |
| `industry_pharmacist` | 산업 약사 | 제약·의료·연구 기관 종사 약사 |
| `non_practicing_pharmacist` | 비활동 약사 | 면허 보유 + 현재 비종사 |
| `etc` | 기타 | 분류 외 상황 |

### 외부 전문가 (`external_expert`) 세부역할

| 세부역할 키 | 한국어 | 설명 |
|-------------|--------|------|
| `doctor` | 의사 | 의사 면허 보유 전문의/일반의 |
| `nutritionist` | 영양사/영양전문가 | 영양 관련 전문 자격 보유자 |
| `marketer` | 마케터 | 헬스케어/제약 마케팅 전문가 |
| `researcher` | 연구자 | 학술·임상 연구 종사자 |
| `professor` | 교수 | 대학/교육기관 교원 |
| `etc` | 기타 전문가 | 분류 외 전문 직종 |

### 약대생 회원 (`pharmacy_student_member`) 세부역할

| 세부역할 키 | 한국어 |
|-------------|--------|
| `undergraduate` | 학부생 |
| `graduate` | 대학원생 |
| `graduate_expected` | 졸업예정자 |

### 공급자 스태프 (`supplier_staff`) 세부역할

| 세부역할 키 | 한국어 |
|-------------|--------|
| `sales_rep` | 영업 담당자 |
| `medical_rep` | MSL/메디컬 담당자 |
| `marketing_staff` | 마케팅 담당자 |
| `operations` | 운영/물류 담당자 |

---

## F. 자격(Qualification) 정의

자격은 **가입 시 부여되지 않으며**, 별도 신청 → 심사 → 승인 후 부여된다.

| 자격 키 | 한국어 | 기능 범위 |
|---------|--------|-----------|
| `instructor` | 강사 | LMS에서 강의 개설·수강생 관리·콘텐츠 업로드 |
| `content_provider` | 콘텐츠 제공자 | 플랫폼 HUB에 콘텐츠 등록·배포 |
| `survey_operator` | 설문 운영자 | 설문/퀴즈 생성·배포·결과 열람 |
| `reviewer` | 리뷰어 | 상품/강의/콘텐츠 공식 리뷰 작성 (신뢰도 배지) |

> 자격은 복수 보유 가능하다. 예: `pharmacist_member` + `instructor` + `content_provider`.

---

## G. 가입 흐름 정의

```
1. User 생성
   └── 이메일·비밀번호·이름·전화번호 입력
   └── 서비스 선택 (KPA / GlycoPharm / Neture 등)

2. 회원군 선택 (Membership Group)
   └── "나는 약사입니다 / 약대생입니다 / 전문가입니다 / 소비자입니다"

3. 세부역할 선택 (Sub Role)
   └── 회원군에 따라 분기
   └── 예: 약사 선택 → 개국약사 / 근무약사 / 병원약사 선택

4. 추가 정보 입력
   └── 면허번호 (약사), 소속 기관 (전문가), 사업자등록번호 (약국 운영자) 등

5. 승인 (조건부)
   └── 약사 회원: 면허 확인 후 승인 (KPA: 관리자 승인)
   └── 소비자: 즉시 활성화

6. 로그인
   └── JWT 발급 (role_assignments 기반)
   └── service_memberships 생성

7. 자격 신청 (선택, 필요 시)
   └── 강사 신청 → 서류 제출 → 관리자 심사 → `instructor` 자격 부여
```

---

## H. 강의 서비스(LMS) 연결 기준

| 항목 | 기준 |
|------|------|
| **강의 이용자** | 로그인 사용자 전원 (기본 접근) + 유료/제한 강의는 별도 구매·권한 필요 |
| **강사** | `instructor` 자격 보유자만 강의 개설 가능 — 기본 role로 부여 금지 |
| **강의 접근 제어** | "로그인 여부"가 아닌 **"권한(Qualification) 보유 여부"** 기반 |
| **회원군별 기본 접근** | `pharmacist_member`, `pharmacy_student_member` → 약사 전용 강의 접근 가능 |
| **외부 전문가** | `external_expert` → 전문가용 강의 접근 + `instructor` 자격 시 강의 개설 |

---

## I. Neture Credit 연계 개념

```
강의 이수 → 포인트 적립 → Neture Credit으로 환산
강의 제공 → 수강료 배분 → Neture Credit 정산
설문 참여 → 보상 → Neture Credit 지급
```

- **Neture Credit**: 플랫폼 공통 보상 단위. 강의·설문·리뷰 보상에 사용.
- 향후 상품 구매·서비스 이용에 사용 가능한 플랫폼 포인트로 확장 예정.
- 현재 구현 없음 — Phase 4 이후 설계 확정.

---

## J. 확장 고려 사항

### 설문 / 퀴즈 / 캠페인 구조

| 역할 | 조건 |
|------|------|
| 설문 개설 | `survey_operator` 자격 보유자 또는 관리자 |
| 설문 응답 | 대상 회원군으로 지정된 사용자 |
| 퀴즈 참여 | 강의 수강자 또는 지정 회원군 |
| 캠페인 참여 | 소비자(`consumer`) + 약사 회원 모두 가능 |

### 소비자 참여 구조

- `consumer` 회원군은 제품 리뷰·설문·건강 정보 공유에 참여.
- 개인 건강 데이터(혈당 등)는 GlucoseView 서비스로 연결.
- 소비자의 플랫폼 참여 이력 → Neture Credit 보상.

### 공급자 마케팅 활용

- `supplier_staff`는 자사 제품 캠페인 설계 및 약사 대상 홍보 가능.
- 캠페인 결과(클릭·설문·리뷰)는 공급자 대시보드에서 확인.

---

## K. 현재 구조와의 차이

### 코드 기준 현재 구조

```
service_memberships
  └── serviceKey, status (active/pending/inactive)
  → "서비스에 가입했는가"만 표현. 회원 유형 없음.

kpa_pharmacist_profiles
  └── membership_type: 'pharmacist' | 'student'
  → 2가지뿐. 외부 전문가·소비자 불가.

role_assignments
  └── role: 'admin' | 'operator' | '{service}:{type}'
  → 운영자·관리자 구분용. 일반 회원 자격 표현 불가.

organization_members
  └── role: owner | manager | staff | member
  → 조직 내 역할. 회원군과 무관.
```

### 설계 목표 구조와의 Gap

| 항목 | 현재 | 설계 목표 | Gap |
|------|------|-----------|-----|
| 회원군(Membership Group) | ❌ 없음 | `member_group_profiles` 또는 `service_memberships.metadata` | **신규 설계 필요** |
| 세부역할(Sub Role) | 부분 (`membership_type` 2가지) | 회원군별 6~7가지 | **확장 필요** |
| 자격(Qualification) | ❌ 없음 | `qualifications` 또는 `member_qualifications` 테이블 | **신규 설계 필요** |
| 강사 자격 | ❌ 없음 | `instructor` Qualification + 심사 워크플로우 | **Phase 3 구현** |
| LMS 접근 제어 | ❌ 없음 | Qualification 기반 Guard | **Phase 4 구현** |

> **명시**: 현재 `role_assignments`, `users`, `service_memberships` 3개 테이블은 FROZEN(F9/F10/F11) 상태이다. 회원군·자격 구조는 이 테이블을 수정하지 않고 **별도 테이블로 추가**한다.

---

## L. 구현 전략

> **본 구조는 전면 설계 기준이며, 실제 구현은 단계적으로 진행한다.**

### Phase별 구현 계획

| Phase | 범위 | 주요 작업 | 전제 조건 |
|-------|------|-----------|-----------|
| **Phase 1** | 가입 구조 확장 | 회원군 선택 UI 추가, `service_memberships.metadata`에 group 정보 임시 저장 | 없음 |
| **Phase 2** | 회원군/세부역할 반영 | `member_group_profiles` 테이블 설계·생성, 프로필 UI 반영 | Phase 1 완료 |
| **Phase 3** | 자격 신청 구조 | `member_qualifications` 테이블, 신청·심사·승인 워크플로우 | Phase 2 완료 |
| **Phase 4** | 강사/LMS 연결 | 강사 자격 Guard, 강의 개설 기능, 수강 접근 제어 | Phase 3 완료 |

### 구현 제약 사항

```
FROZEN 테이블 (수정 금지):
  - users
  - role_assignments
  - service_memberships

신규 추가 가능 테이블:
  - member_group_profiles   (회원군 + 세부역할)
  - member_qualifications   (자격)
  - qualification_requests  (자격 신청 심사)
```

### 서비스별 적용 우선순위

| 서비스 | 적용 회원군 | Phase 1 대상 | 비고 |
|--------|------------|-------------|------|
| **KPA Society** | pharmacist_member, pharmacy_student_member | ✅ 우선 | 현재 가입 구조와 가장 연관 |
| **GlycoPharm** | pharmacist_member (pharmacy_owner 중심) | Phase 2 | 약국 승인 구조와 연동 필요 |
| **Neture** | supplier_staff, external_expert | Phase 2 | Neture 조직 통합 WO 이후 |
| **GlucoseView** | consumer | Phase 3 | 환자 구조와 별도 설계 필요 |

---

## 연관 문서

| 문서 | 관계 |
|------|------|
| [O4O-IDENTITY-ARCHITECTURE-V1.md](./O4O-IDENTITY-ARCHITECTURE-V1.md) | 인증·JWT·서비스 Handoff 기준 |
| [O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md](./O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md) | 조직 기반 멤버십 구조 |
| [O4O-ORGANIZATION-ROLE-STANDARD-V1.md](./O4O-ORGANIZATION-ROLE-STANDARD-V1.md) | Layer A/B Role 표준, 서비스별 Gap 분석 |
| [USER-OPERATOR-FREEZE-V1.md](./USER-OPERATOR-FREEZE-V1.md) | users/service_memberships/role_assignments 3테이블 동결 선언 |
| [../rbac/RBAC-FREEZE-DECLARATION-V1.md](../rbac/RBAC-FREEZE-DECLARATION-V1.md) | RBAC SSOT 기준 |

---

*Version: 1.0*
*Created: 2026-04-15*
*WO: WO-O4O-USER-STRUCTURE-DOCUMENTATION-V1*
*Status: Design Standard — 코드/DB 변경 없음*
