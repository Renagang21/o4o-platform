# CHECK · O4O Pharmacy-Hub 약사 회원 / 약국 경영자 모델 종결

> **근거 WO**: `WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1`
> **수행일**: 2026-08-21 · **판정**: **CLOSED_WITH_FOLLOWUP**
> **정본 반영**: [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1 §4 · §7`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)

---

## 1. 조사 — KPA/common 은 "약사 자격" 을 어떤 축으로 표현하는가

**결론: 자격은 role 이 아니라 profile 축이다.** (WO 의 최우선 확인 항목)

| 근거 | 내용 |
|---|---|
| `20260326300000-DeactivateQualificationRoles` | `kpa:pharmacist` · `kpa:student` 를 **비활성화**하고 profile 축으로 대체한 KPA 선례 |
| `kpa_pharmacist_profiles` | `user_id` UNIQUE · `license_number`(nullable) · `license_verified` · `activity_type` · `verified_at/by`. **`service_key` 컬럼이 없다** → person 단위 · 서비스 중립 (`kpa_` 는 legacy prefix) |
| `auth-register.controller.ts` | `if (isPharmacist && (resolvedActivityType || data.licenseNumber))` — **실제 자격 데이터가 있을 때만** profile 을 만든다. 빈 skeleton profile 로 "약사임"을 표시하지 않는다 |
| `KPA_SCOPE_CONFIG.allowedRoles` | `['kpa:admin','kpa:operator']` — 일반 회원은 scope 를 갖지 않는다 |

따라서 **`pharmacy-hub:pharmacist` 같은 자격 role 을 신설하지 않았다.**
Pharmacy-Hub 는 기존 profile 축을 재사용하며 전용 자격 테이블도 만들지 않는다.

## 2. 3축 계약 (F9 / F11 재확인)

| 축 | 테이블 | Pharmacy-Hub |
|---|---|---|
| Identity | `users` | 공통 |
| 가입/승인 SSOT | `service_memberships` | `pharmacy-hub:member` / `pharmacy-hub:store_owner` |
| RBAC SSOT | `role_assignments` | 승인 시 membership.role 을 그대로 부여 (`MembershipApprovalService` STEP3) |
| Qualification | `kpa_pharmacist_profiles` | 재사용 (신규 축 없음) |

`MembershipApprovalService` STEP3 의 `resolveGrantedRole(...) || 'member'` 가
프로덕션의 prefix 없는 `member` 역할 row 의 출처다 (§5).

## 3. 최종 역할 모델

| Role | 가입 경로 | 매장 경영 capability |
|---|---|:---:|
| `pharmacy-hub:member` (일반 약사 회원) | `/join` self-signup | ✕ |
| `pharmacy-hub:store_owner` (약국 경영자) | `/join` self-signup | ○ |
| `pharmacy-hub:operator` | 사후 부여 | ✕ |
| `pharmacy-hub:admin` | 사후 부여 | ✕ |

두 가입 유형의 차이는 **매장 경영 capability 하나뿐**이다.
`member` 는 scope 축이 아니다 — `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 는 3역할 그대로다.
(넣으면 mapping 없는 scope 에서 fallback 으로 전체 allowedRoles 가 허용돼 일반 회원이 매장 API 를 통과한다.)

## 4. 변경 목록

**Backend**

| 파일 | 변경 |
|---|---|
| `constants/pharmacy-hub-signup-roles.ts` (신규) | 가입 허용 역할 **SSOT** (`member` / `store_owner`) + 라벨 + type guard |
| `modules/auth/controllers/auth-register.controller.ts` | 허용 목록을 SSOT 로 교체(기존 `['store_owner','supplier']` → 공급자 제거·member 추가). membershipRole 을 `effectiveRole` 이 아니라 **`data.role`** 로 산출 (`VALID_ROLES` 에 `'member'` 가 없어 `'user'` 로 떨어지던 함정 — `kpa-branch` 선례와 동일) |
| `controllers/pharmacy-hub/PharmacyHubJoinController.ts` | 역할 목록·라벨을 SSOT 소비로 전환. `businessName` 필수 검증을 **store_owner 에만** 적용 (일반 약사에게 약국 정보 요구 금지) |
| `types/roles.ts` | `PharmacyHubRole` union + `ROLE_REGISTRY` 에 `pharmacy-hub:member` |
| `middleware/pharmacy-hub-scope.middleware.ts` | 주석만 — member 를 allowedRoles 에 넣지 않는 이유 명문화 (동작 변경 없음) |
| `20270315000000-SeedPharmacyHubMemberRole` (신규) | 역할 카탈로그 멱등 INSERT (`ON CONFLICT DO UPDATE`). `down()` 은 삭제가 아니라 `is_active=false` |
| `20270316000000-NormalizePharmacyHubMemberMembershipRole` (신규) | `service_key='pharmacy-hub' AND role='member'` → `pharmacy-hub:member` 표기 교정. row 삭제 없음·권한 변화 없음·reversible |

**Frontend (`services/web-pharmacy-hub`)**

| 파일 | 변경 |
|---|---|
| `config/service.ts` | `ROLES.member` · `ROLE_LABELS` ('약사 회원') · `ROLE_SCOPE_MAPPING[member] = [member]` (자기 자신만 만족) |
| `pages/JoinPage.tsx` | 가입 유형 라디오 2개. store_owner 일 때만 약국명 필드·전송. 공급자 선택지 없음 |
| `pages/HomePage.tsx` | 역할별 진입점 안내문 — 일반 약사는 커뮤니티·교육을 바로 이용, 나머지는 역할 보유 계정만 |
| `pages/operator/MembershipsPage.tsx` | 신청 역할 컬럼에서 두 유형 구분 표시 |

**권한 분리 확인 (변경 불필요 — 이미 정합)**: `/forum` · `/community` · `/education` = `MembershipGate`(active 만),
`/store-owner` · `/store-hub` = `StoreOwnerShell`(StoreOwnerGuard + MembershipGate),
backend 는 `requirePharmacyHubScope('pharmacy-hub:store_owner')`.
`PharmacyHubStoreProvisioningService` 는 store_owner 가 아니면 `skipped` → 일반 회원에게 매장/조직이 생기지 않는다.

## 5. 기존 프로덕션 `member` 1건 (read-only census)

| 항목 | 결과 |
|---|---|
| 대상 | user `44fa7733…` (마스킹) · membership `pharmacy-hub` / `member` / `active` |
| 생성 | 2026-08-13 — glycopharm · k-cosmetics · kpa-society · neture · pharmacy-hub 5건이 **같은 타임스탬프**로 생성된 시드/QA 계정 |
| role_assignments | 12건 (이미 `pharmacy-hub:store_owner` 포함) |
| users.status | `suspended` |
| 약사 profile | 없음 |
| 업무 연결 | 없음 (매장·주문·운영 업무 연결 0) |

→ **삭제하지 않았다.** migration 으로 `role` 표기만 canonical 로 교정한다. 사용자·승인 상태·권한 불변.

## 6. Drift Guard

`__tests__/pharmacy-hub-member-model-contract.spec.ts` (신규) + `__tests__/security/pharmacy-hub-scope-guard.spec.ts` (보강)

1. 공급자 가입 역할 재등장 금지
2. operator · admin · 강사 self-signup 금지
3. `member` 의 매장 capability 무단 획득 금지 (allowedRoles·mapping 부재 + 3 scope 모두 403)
4. 자격 role 신설 금지 (`pharmacy-hub:*` 에 pharmacist/license/student 계열 0건) · 가입 경로가 자격을 추론하지 않음
5. 가입 write-path 2곳이 모두 SSOT 를 소비 (목록 사본 금지 — 과거 래퍼만 막혀 Core 로 우회 가입이 가능했다)

baseline §7 에 guard 7~10 으로 등재.

## 7. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | PASS (잔여 23건은 전부 `@o4o/action-log-core` 미설치 — 병렬 세션의 working tree 삭제 상태로 본 WO 무관) |
| `services/web-pharmacy-hub` `tsc --noEmit` | PASS |
| `services/web-pharmacy-hub` `vite build` | PASS (1m 11s) |
| Jest `pharmacy-hub` | **6 suites / 105 tests PASS** |
| 프로덕션 DB write | 없음 (census 는 SELECT 전용). 실제 반영은 CI/CD migration |

브라우저 smoke 는 **미수행** — 배포 후 가능. (가입 2유형 → pending → 승인 경로)

## 8. 범위 밖 관찰 (별도 WO 제안)

`service_memberships` 의 pharmacy-hub 에 prefix 없는 `admin`(1) · `operator`(1) · `store_owner`(1) 이 남아 있다.
이들의 표기 교정은 **권한 결과를 바꾸므로**(재승인 시 부여되는 role 이 달라진다) 이번 migration 범위에서 제외했다.
별도 WO 로 판단이 필요하다.

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§8)
