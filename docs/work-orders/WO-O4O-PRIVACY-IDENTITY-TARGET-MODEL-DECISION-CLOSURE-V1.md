# WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1

> **성격**: **Decision Closure 전용** — 구현 · migration · 신규 테이블 · 컬럼 삭제 · 개인정보 이동 없음. Phase 1 IR 의 219 필드 재조사도 하지 않는다. Architecture 정본 승격 전에 남은 설계 결정 7건(D1~D7)을 닫고, 그 결과를 별도 IR 로 기록한다. **정본 승격 자체는 이 WO 에서 하지 않는다.**
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **선행 완료**: [`IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1`](../investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md)(Phase 1 COMPLETE, `0e119389d`) · [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md)(`ef9265810`) · [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1`](WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md)(IR 산출 완료 · 검토 대기)
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)(auth-core · organization-core 동결) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md)(`role_assignments` SSOT) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · CLAUDE.md §16(기준 문서 drift 는 보고).

---

## 1. 목표와 배경

Phase 1 IR 은 219 필드를 16 판정으로 매핑하고 신규 테이블 0 · 정본 3곳(면허=`kpa_pharmacist_profiles` · 사업자=`organizations` · Identity=`linked_accounts`) 을 도출했다. 사용자 검토 결과, 정본 승격 전에 **설계 결정 7건**이 IR 결론과 다르거나 IR 이 명확히 적지 않았다. 이 WO 는 그 7건을 **결정 문서로 닫는다**. 219 필드를 다시 매핑하지 않고, 결정이 기존 IR 결론을 바꾸는 지점만 기록한다.

```text
Phase 1 IR (매핑 완료) → 본 WO: D1~D7 결정 마감 → 정본 승격 WO (별도) → Phase 2 Google 전환
```

## 2. 결정 항목 (D1~D7)

### D1. Minimal users — 가입 필수 정보

- `users` 에 `email · name · nickname · phone` 컬럼 유지는 허용하되 **가입 필수정보가 아니다**.
- 필수 = `users.id · users.status · created_at · updated_at`. `email / name / nickname / phone` = 선택적 프로필 · 연락 정보.
- Google 가입은 Google `sub` 연결만으로 성공해야 한다.
- `email / name / phone` 은 어떤 경우에도 O4O Identity Key 가 아니다.
- `phone` 은 실제 목적(약사 확인 · 연락)이 생길 때만 수집한다.
- IR §3-3(users 잔존 10) 을 이 원칙으로 재표기한다.

### D2. Credential SSOT — 논리 vs 물리

- `Logical SSOT = O4O Professional Credential Domain` 과 `Initial Physical Storage = kpa_pharmacist_profiles` 를 구분해 적는다.
- KPA 서비스가 O4O 전체 전문자격의 **영구 소유자**로 정의되지 않는다. 이후 중립 Credential 구조로 승격 가능해야 한다.
- 지금 `professional_credentials` 테이블을 만들지 않는다.

### D3. Business ≠ Store ≠ User — row 분리 재검토

- IR 의 "약국 1매장 = `organizations` 동일 row" 결론을 재검토한다.
- **논리 객체 · row 분리**(예: organization A `type=business`, organization B `type=store parent_id=A`) 를 우선 검토한다. 매장 1개인 약국이어도 적용.
- 평가 기준: 다점포 확장 · 매장 이전 · 폐업 · 사업자 변경 시 ID 안정성.
- 별도 row 가 기존 코드 · 계약(organization-core · Boundary Policy `organizationId` 축 · `organization_members`) 과 크게 충돌하면 근거를 `REVIEW` 로만 기록하고 임의 결정하지 않는다.

### D4. Kakao — Public Contact Channel vs Authenticated Connected Channel

- `users.kakao_open_chat_url` · `users.kakao_channel_url` · `neture_suppliers.contact_kakao` = **Public Contact Channel**(공개 연락 URL). AI 업무명령용 Connected Channel 이 아니다.
- Authenticated Connected Channel = O4O `user_id` ↔ 외부 메신저 사용자 식별자의 인증된 연결(AI 작업 요청 · 업무 자동화 명령 · 결과 통지).
- URL 컬럼은 현 위치 유지 가능. 단 IR 의 "두 번째 메신저가 생길 때만 `connected_channels` 를 만든다" 결론은 **폐기 또는 수정** — Kakao AI Command Channel 은 Kakao 단독이어도 별도 인증 연결 구조가 필요하다.
- Connected Channel 구현은 하지 않는다. Kakao OAuth/Login legacy 와 Connected Channel 자산을 반드시 구분한다.

### D5. `refresh_tokens` 실제 SSOT 판정

- Census 는 dead · 삭제 후보, Target IR 은 token/deviceId 를 Session 으로 재분류했다. 상충을 닫는다.
- Census 재실행 없이 **교차 확인만**: 현재 refresh token writer · reader · refresh family SSOT · `users.refreshTokenFamily` 와의 관계 · 활성 login/refresh 경로에서 `refresh_tokens` 테이블 실사용 여부 (참고: refresh family 승계 `3a182eb92` · `742ef54a7`).
- 판정은 `ACTIVE_SSOT | ACTIVE_AUXILIARY | DEAD_RETIRE` 중 하나. 구조가 보기 좋다는 이유로 dead 테이블을 되살리지 않는다.
- 코드만으로 런타임 사용 여부를 확정할 수 없으면 `REVIEW`(§5).

### D6. Consent History — 개념 확장

- `users` 동의 3 컬럼(`tos_accepted_at · privacy_accepted_at · marketing_accepted`) 유지는 **초기 구현**으로 허용.
- Architecture 는 consent 를 3 boolean/timestamp 로 고정하지 않는다. Target 개념은 최소 `consent_type · policy_version · accepted_at · withdrawn_at(필요 시)` 를 표현한다.
- 지금 `consents` 테이블을 만들지 않는다. 정책 버전 변경 · 동의 이력 요구가 실제 발생할 때 이력 구조로 확장 가능함을 명시한다.

### D7. 사업자등록증 파일

- 기본 = 사업자등록증 파일을 받지 않는다.
- 우선 = 사업자등록번호 · 사업자정보를 공식 조회/API/운영자 확인으로 검증한다.
- 예외 = 공식 검증이 실패할 때만 제한적 증빙파일.
- 따라서 `kyc_documents.business_registration` = **예외 검증 수단**이지 상시 필수 KYC 저장소가 아니다. 기존 파일 · 테이블은 지금 삭제하지 않는다.
- 기존 개인정보 보존정책과 충돌하면 `REVIEW`(§5).

## 3. Credential / Role / Relationship 접근 규칙 (Target 에 명시)

```text
Credential   = 현재 자격 상태 (예: credential.pharmacist.status)
Role         = 서비스 권한 할당 기록 (role_assignments · 예: kpa-society:store_owner)
Relationship = 사업자/매장/조직 소속 (organization_members · branch_memberships)

실제 접근 허용 = Role 존재 + 필요 Credential 조건 충족 + 필요 Relationship 조건 충족
```

- Role 은 `credential.pharmacist.status != verified` 인 상태에서도 존재할 수 있다 → 정책이 자격을 요구하는 경로에서는 접근 거부.
- Credential 변경 시 Role row 를 자동 삭제하지 않는다. Role lifecycle 은 Credential lifecycle 에 묶이지 않는다.
- `role_assignments` 는 Authorization SSOT 로 유지하며 Credential/Relationship 과 합치지 않는다.

## 4. 제외 범위

219 재매핑 · Census 재실행 · DB migration · 신규 테이블 · Google 로그인 구현 · password 로그인 제거 · `users` 컬럼 삭제 · `organizations` 구조 변경 · Credential schema 변경 · Connected Channel 구현 · Consent History 구현 · KYC 파일 삭제 · Claim resolver 구현 · Role/Guard 코드 변경 · 동결 Core(`auth-core` · `organization-core`) 수정 · Architecture 정본 승격.

이메일 동일성 기반 기존 사용자 ↔ Google 계정 자동 병합 모델은 제안하지 않는다.

## 5. 중지 조건 (`REVIEW` 로 남기고 임의 결정하지 않는다)

- Business/Store 별도 row 가 기존 정본 계약과 직접 충돌
- `refresh_tokens` 런타임 사용 여부를 코드로 확정 불가
- 기존 개인정보 보존정책이 D6/D7 과 충돌
- Target 정책이 동결 Core 변경 없이는 표현 불가
- 다른 세션의 dirty · 미추적 파일 접촉 필요
- **프로덕션 개인정보 실값은 조회하지 않는다**

## 6. 산출물과 Git

- `docs/investigations/IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md` — **기존 Phase 1 IR 을 덮어쓰지 않는다.**
- 필수 포함: Decision Table

```text
Decision | 기존 IR | 최종 결정 | 구현 영향 | 정본 승격 반영
D1 ~ D7
```

- §3 접근 규칙(Credential / Role / Relationship) 명문화.
- D5 교차 확인 근거(writer / reader / family SSOT / active path) 와 판정.
- D3 별도 row 타당성 평가(ID 안정성 4 시나리오 · 기존 계약 충돌 여부).
- IR 조사 전용 → CHECK 문서 없음. 이 WO 의 footer 상태 갱신.
- Git: `git fetch origin` → `git status -sb` → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. `--force` · `git add .` · stash 금지.

## 7. 완료 보고

다음 8 질문에 답한다.

1. Google 가입 직후 필수 개인정보는 무엇인가?
2. `kpa_pharmacist_profiles` 는 논리 SSOT 인가, 초기 물리 저장소인가?
3. Business / Store 는 하나의 row 인가, 별도 row 인가?
4. Kakao 공개 URL 과 AI Command Channel 은 어떻게 구분되는가?
5. `refresh_tokens` 는 ACTIVE 인가 DEAD 인가?
6. `users` 동의 3 컬럼은 영구 구조인가 임시 구조인가?
7. 사업자등록증 파일은 기본 수집인가 예외 수집인가?
8. Credential ↔ Role 충돌 시 접근 판단은 어떻게 되는가?

그리고 정본 승격 판정 `APPROVE | APPROVE_WITH_REVIEW | REJECT` 를 낸다. `APPROVE` 또는 `APPROVE_WITH_REVIEW` 이면 다음 WO `WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1` 을 제안한다(승격은 본 WO 에서 하지 않는다).

- `HEAD == origin/main` · 작업트리 상태 · `문서 정합:` 한 줄 · 한국어 존댓말 · 보고 뒤 멈춘다.

---

*작성: 2026-09-17 · 상태: **DRAFT — 핸드오프 대기** · 실행 지시 전 착수하지 않음*
