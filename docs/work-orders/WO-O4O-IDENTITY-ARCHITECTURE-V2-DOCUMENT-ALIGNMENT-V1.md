# WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1

> **Document Alignment Work Order — 코드 변경 없음.**
> 본 WO 는 O4O 철학과 Identity Baseline 문서 (V1) 간의 명시적 충돌을 해소하는 **문서 정렬** 작업이다.

- **작성일:** 2026-05-23
- **분류:** Document Alignment (NO code / migration / DB / UX changes)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md)
- **관련 Freeze:** F9 (RBAC SSOT), F10 (O4O Core), F11 (User/Operator)

---

## 1. 목적

현재 O4O 철학 (서비스별 독립 사업자 + 서비스별 독립 회원 + Credential 서비스 범위) 과 Identity Baseline V1 문서 (`docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md`) 간의 충돌을 **문서 차원에서 정렬**한다.

본 작업의 본질:
- 코드는 V1 동작 그대로 유지 (변경 없음)
- 문서가 V1 동작과 V2 지향 모델을 **모두 명시적으로 표기**
- 향후 구현 WO 의 진입 조건 (계약 기준) 마련

> 지금까지 코드가 문서를 끌고 왔다면, 본 작업은 **철학 → 문서 → 코드** 순서를 회복하는 첫 단계다.

---

## 2. 작업 범위 (수행 완료)

### 2.1 V1 문서 수정 — `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md`

| 변경 지점 | 내용 |
|----------|------|
| **상단 배너 추가** | V2 전환 예정 + 충돌 명시 + V2 DRAFT 링크 |
| **§2.1 단일 계정 원칙** | V1 (현재 코드 동작) ↔ V2 (지향 모델) 병기, "비밀번호 동기화" 문구를 V2 에서 폐기 예정으로 표기 |
| **§9 [REMOVED] Password Sync** | §9.1 (V1 원문 보존) + §9.2 (V2 기준 재해석) 추가. "구조적으로 불가능" 의 논리적 기반이 V2 에서 뒤집힘을 명시 |
| **Footer Status** | `Active Reference` → `Active Reference (V2 전환 예정 — V2 DRAFT 참조)` |

### 2.2 V2 DRAFT 문서 신설 — `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md`

| 절 | 내용 |
|----|------|
| §0 | V2 의 범위/비범위 |
| §1 | O4O 철학 5개 원칙 (Restated) |
| §2 | V1 ↔ V2 모델 차이 |
| §3 | **4-Layer Identity Model** (L1 Identity / L2 Credential / L3 Membership / L4 Role) |
| §4 | §2.1 V2 재작성안 |
| §5 | §9 V2 재해석 |
| §6 | 전환 단계 (Migration Path 골격) — 구현 사양 아님 |
| §7 | Service Handoff 의미 재정의 (해석 A vs B) |
| §8 | Service Switcher 재검토 |
| §9 | Freeze (F9 / F10 / F11) 영향 정리 |
| §10 | **현재 구조 vs O4O 철학 충돌 체크** (정합성 매트릭스) |
| §11 | 향후 구현 WO 의 계약 기준 (Acceptance Criteria) |
| §12 | 본 WO 의 종료 조건 |

### 2.3 작업 외 (명시적으로 수행하지 않음)

- 코드 변경 (auth controller / service / entity / migration / DB)
- UI/UX 변경 (LoginModal / RegisterPage / ServiceSwitcher / Handoff)
- 구현 WO 생성 (Phase 1+ 의 후속 WO 들)
- F10/F11 Freeze 의 공식 해석 변경 (별도 거버넌스 절차 필요)

---

## 3. 산출물 목록

| # | 파일 | 변경 유형 | 상태 |
|---|------|---------|------|
| 1 | `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` | Modify (배너 + §2.1 + §9 + footer) | ✅ |
| 2 | `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md` | New | ✅ |
| 3 | `docs/work-orders/WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1.md` (본 파일) | New | ✅ |

---

## 4. 핵심 결과 — 철학 충돌 정렬

### 4.1 정렬 전 (V1 baseline 만 존재)

| 원칙 | V1 baseline 일치 여부 |
|------|---------------------|
| 1 Email = 1 Identity | ✅ |
| 서비스는 독립 사업자 | ⚪ 부분 (credential 공유) |
| 회원은 서비스 범위에서 독립 | ✅ |
| **Credential 은 서비스 범위에서 독립** | ❌ **명시적 충돌** |
| Role 은 서비스 범위에서 독립 | ✅ |

### 4.2 정렬 후 (V2 DRAFT 존재, V1 은 transition 표기)

- 5개 원칙 모두 **V2 모델에서 일치**
- V1 코드 동작은 변경 없이 유지 (backward compat)
- V1 문서는 "현재 동작 정확히 기술 + V2 지향 명시" 의 dual 역할

---

## 5. 본 WO 의 종료 조건

- [x] V1 §2.1 / §9 + 상단 배너 + footer status 수정
- [x] V2 DRAFT 문서 생성 (§0-§12 완성)
- [x] §10 (현재 구조 vs O4O 철학 충돌 체크) 명시
- [x] Freeze (F9 / F10 / F11) 영향 정리
- [x] 향후 구현 WO 의 계약 기준 (§11) 명시
- [x] 본 WO 기록 문서 생성
- [ ] **이해관계자 합의 (사용자) — V2 모델 채택 여부 확정** ← 본 WO 의 진짜 종료 트리거

---

## 6. 본 WO 이후 (Out-of-Scope)

본 WO 종료 후 별도 WO 의 책임:

| 후속 WO (예시) | 책임 |
|---------------|------|
| `WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-V1` | `service_credentials` 테이블 신설 — F10/F11 명시적 WO 승인 필요 |
| `WO-O4O-IDENTITY-V2-PHASE2-DUAL-READ-V1` | login/register/change/reset 의 dual-read 도입 |
| `WO-O4O-IDENTITY-V2-PHASE3-NEW-USER-V1` | 신규 가입자는 service_credentials 사용 |
| `WO-O4O-IDENTITY-V2-PHASE4-MIGRATION-V1` | 기존 active membership credential backfill or 강제 reset |
| `WO-O4O-IDENTITY-V2-PHASE5-DEPRECATION-V1` | users.password deprecation |
| `WO-O4O-IDENTITY-V2-SWITCHER-UX-V1` | ServiceSwitcher "가입" UX 재설계 (본인 확인 + 신규 password 입력) |
| `WO-O4O-IDENTITY-V2-HANDOFF-POLICY-V1` | Handoff 의 의미 재정의 (해석 A vs B 결정) |

→ 모든 후속 WO 는 **본 V2 DRAFT 의 합의 후** 진행한다. 본 WO 자체는 구현 WO 를 생성하지 않는다.

---

## 7. 정리 — 본 WO 의 메타 의미

본 WO 는 단순한 문서 수정이 아니다. **O4O 플랫폼에서 "철학 → 문서 → 코드" 의 작업 순서를 회복하는 시작점**이다.

- 이전 순서: 코드 → 문서 정합 (사후 정렬)
- 본 WO 이후: 철학 → 문서 (정렬 합의) → 코드 (구현 WO)

향후 모든 Identity 관련 구현 WO 는 V2 DRAFT 의 4-Layer 모델과 5개 철학 원칙을 위반하지 않아야 한다. 본 WO 의 산출물 (V1 transition + V2 DRAFT) 이 후속 작업의 **계약 기준 (contract)** 이 된다.

---

*Created: 2026-05-23*
*Type: Work Order — Document Alignment*
*Status: Completed (Documents) — Awaiting stakeholder acceptance for V2 model*
