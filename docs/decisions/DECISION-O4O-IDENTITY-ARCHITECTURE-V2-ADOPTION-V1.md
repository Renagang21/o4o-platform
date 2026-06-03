# DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1

> **공식 결정 문서 (Decision Record).** O4O Platform 의 Identity Architecture 를 V1 → V2 로 공식 전환한다.

- **결정일 (Decision Date):** 2026-05-23
- **결정자 (Decided By):** O4O Platform 이해관계자 (사용자)
- **결정 상태 (Status):** **ADOPTED**
- **결정 유형:** Architecture Baseline Succession (V1 → V2)
- **승인 WO:** `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1`
- **선행 WO:** `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1` (2026-05-23)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md)
- **영향 Freeze:** F10 (O4O Core), F11 (User/Operator)

---

## 1. 배경 (Background)

O4O Platform 은 5개 독립 서비스 (Neture / GlycoPharm / GlucoseView / KPA Society / K-Cosmetics) + Account Center 로 구성된다. 각 서비스는 **독립 사업자 + 독립 회원 + 독립 권한** 의 성격을 가진다.

2026-03-13 작성된 Identity Architecture V1 은 "공통 password 모델" 을 baseline 으로 채택했다. 즉:

```
1 Email = 1 Account = 1 Password (User-global)
        └─ N Memberships (서비스별)
        └─ N Roles (서비스별)
```

이 모델은 코드와 일관되었고, 2026-03-25 의 Password Sync 제거 결정 (`WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1`) 시에는 "users.email UNIQUE 제약 → 서비스 간 비밀번호 불일치는 구조적으로 불가능" 이라는 논리적 근거가 명시되었다.

---

## 2. 기존 문제 (Problem)

### 2.1 O4O 핵심 철학과의 충돌

O4O 의 5개 철학 원칙은 다음과 같다:

| # | 원칙 | V1 모델 정합성 |
|---|------|---------------|
| 1 | 1 Email = 1 Identity (전역 통합) | ✅ 일치 |
| 2 | 서비스는 독립 사업자 | ⚪ 부분 (membership/role 만 독립, credential 공유) |
| 3 | 회원은 서비스 범위에서 독립 | ✅ 일치 |
| 4 | **Credential 은 서비스 범위에서 독립** (KPA password ≠ GlycoPharm password 가능) | ❌ **충돌** |
| 5 | Role 은 서비스 범위에서 독립 | ✅ 일치 |

V1 모델의 **password owner = User (전역)** 라는 전제가 **원칙 4 (Credential 의 서비스 범위 독립)** 와 정면 충돌함이 2026-05-23 의 [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) §H 에서 확인되었다.

### 2.2 V1 의 구조적 한계

| 한계 | 설명 |
|------|------|
| **단일 password 의 다중 서비스 공유** | 사용자가 KPA 에서 password 를 변경하면 GlycoPharm 에서도 같은 password 가 적용된다 — "독립 사업자" 와 위배 |
| **회원가입 본인 확인의 불완전성** | 기존 사용자가 새 서비스에 가입할 때 "기존 password" 를 재사용해 본인 확인 — 다른 서비스의 password 가 새 서비스 운영자에게 노출되는 셈 |
| **Service Handoff 의 의미 과부담** | "한 번 로그인하면 다른 서비스로 password 없이 이동" 이 공통 password 모델 위에서만 의미가 통한다 — 서비스 독립성과 양립하지 않음 |
| **운영 사고 가능성** | "구조적으로 불가능" 이라는 V1 의 논리적 기반은 다른 모델 가능성을 차단해 사고 대응 폭을 좁힌다 |

### 2.3 사업 관점 손실

- **서비스별 독립 비밀번호 정책 차등** (예: KPA 는 의료 협회 수준의 강한 정책, K-Cosmetics 는 일반 소비자 수준) 적용 불가
- **서비스별 독립 비밀번호 만료 정책** 불가
- **사업자 탈퇴/사고 시 격리 부족** — 한 서비스에서 사고가 나도 다른 서비스의 credential 이 그대로 노출됨

---

## 3. V1 의 명시적 한계 (Limits of V1)

V1 모델은 **"5개 서비스가 사실상 같은 사업자가 운영하는 다중 채널 서비스" 가정 위에서 합리적**이다. 그러나 O4O 는 그 가정을 명시적으로 부정한다:

| 항목 | V1 가정 | O4O 실제 |
|------|---------|---------|
| 서비스 소속 사업자 | 같은 사업체의 다중 채널 | **각각 독립 사업자** (KPA = 약사회, K-Cosmetics = 화장품 매장 등) |
| 회원 관계 | 같은 회원의 다중 서비스 접근 | **각 서비스의 독립 회원** (탈퇴/정지/승인 별도) |
| 비밀번호 정책 책임 | 플랫폼 일괄 | **각 서비스 사업자 책임** |
| 사고 격리 | 단일 점 사고 | **서비스 간 격리 필요** |

→ V1 의 가정 자체가 O4O 의 사업 모델과 불일치한다.

---

## 4. 채택 이유 (Reasons for Adoption)

### 4.1 철학 정합성 회복

V2 의 **"Credential 의 서비스 범위 독립"** 채택으로 5개 철학 원칙 모두 정합 회복. [V2 §10 매트릭스](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md#10-현재-구조-vs-o4o-철학-충돌-체크-) 참조.

### 4.2 작업 순서 회복 (철학 → 문서 → 코드)

지금까지는 코드가 문서를 끌고 왔다 (V1 은 코드 동작의 사후 정리). V2 채택은 **철학 → 문서 → 코드** 순서를 회복한다:

- 본 결정 시점에 코드는 V1 상태 그대로다
- V2 는 향후 모든 Identity 관련 신규 IR / WO / 설계 판단의 **계약 기준 (contract)**
- 코드 이행은 별도 WO 의 책임 — F10/F11 명시적 예외 승인 절차를 거쳐 진행

### 4.3 후속 작업의 명확한 방향

V2 채택 후 다음과 같은 후속 WO 가 **본 V2 의 5개 원칙 + 4-Layer 모델 위에서** 진행된다:

| 후속 WO (예시) | V2 의 기준 |
|---------------|----------|
| `WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-V1` | service_credentials 신설 — L2 Layer |
| `WO-O4O-IDENTITY-V2-PHASE2-DUAL-READ-V1` | login/register/change/reset 의 credential 우선 + fallback |
| `WO-O4O-IDENTITY-V2-PHASE3-NEW-USER-V1` | 신규 가입자는 service_credentials 사용 |
| `WO-O4O-IDENTITY-V2-PHASE4-MIGRATION-V1` | 기존 active membership credential backfill or 강제 reset |
| `WO-O4O-IDENTITY-V2-PHASE5-DEPRECATION-V1` | users.password deprecation |
| `WO-O4O-IDENTITY-V2-SWITCHER-UX-V1` | Switcher "가입" UX 재설계 |
| `WO-O4O-IDENTITY-V2-HANDOFF-POLICY-V1` | Handoff 의 의미 재정의 (해석 A vs B) |

### 4.4 Freeze 와의 양립

V2 채택 자체는 코드/스키마/migration 을 수반하지 않으므로 **F10/F11 Freeze 의 실제 충돌은 발생하지 않는다.** 향후 Phase 1+ 의 구현 진입 시점에 F10/F11 의 **명시적 예외 승인 절차**가 적용된다 (F10 / F11 문서에 명시적 표기 추가됨).

---

## 5. 최종 결정 (Final Decision)

### 5.1 채택 사항

1. **O4O Identity Architecture V2** 를 **Canonical Identity Baseline** 으로 공식 채택한다 (2026-05-23 발효).
2. **O4O Identity Architecture V1** 을 **Legacy Baseline** 으로 격하한다. 운영 코드 현행 동작 기록 / 역사적 판단 기록 용도로 유지한다.
3. **모든 신규 Identity 관련 IR / WO / 설계 판단**은 V2 를 기준으로 한다. V1 §2.1 / §9 의 원문을 인용하는 경우 V2 의 재해석본을 반드시 함께 참조한다.
4. **Phase 1 이후 (코드/migration/DB) 의 구현 진입**은 별도 후속 WO 의 책임이며, **F10 (O4O Core Freeze) / F11 (User/Operator Freeze) 의 명시적 예외 승인 절차**를 거친다.
5. 본 결정은 즉시 발효한다 (Effective 2026-05-23).

### 5.2 비채택 사항 (명시적 제외)

본 결정은 다음을 **포함하지 않는다**:

- 코드 변경 / migration / DB 변경 / Auth 로직 변경 / UI 변경
- 구현 WO 의 자동 생성
- F10 / F11 Freeze 자체의 변경 (해석 절차 표기 추가만 — Freeze 자체는 유효)
- 운영 코드의 V1 → V2 즉시 이행

---

## 6. 철학 정합성 최종 판정 (Final Verdict)

| 원칙 | 정합성 (V2 채택 후) | 근거 |
|------|----|------|
| 1. 1 Email = 1 Identity | ✅ 정합 | users.email UNIQUE 유지 |
| 2. 서비스는 독립 사업자 | ✅ 정합 | L2 Credential / L3 Membership / L4 Role 모두 서비스 범위 |
| 3. 회원은 서비스 범위에서 독립 | ✅ 정합 | service_memberships 구조 유지 |
| 4. **Credential 은 서비스 범위에서 독립** | ✅ **정합 (V2 채택의 핵심 결과)** | service_credentials 신규 — L2 Layer |
| 5. Role 은 서비스 범위에서 독립 | ✅ 정합 | role_assignments `{serviceKey}:{role}` 유지 |

> **5개 원칙 모두 정합**. V2 채택으로 O4O 철학 ↔ Identity Baseline 의 명시적 충돌이 해소되었다.

---

## 7. 향후 방향 (Forward Direction)

### 7.1 즉시 발효 (Effective Immediately)

- 모든 신규 Identity / Auth / Credential / Membership 관련 IR / WO / 설계는 V2 기준
- Claude Code / Codex / 외부 에이전트 / 사람 개발자 모두 V2 를 baseline 으로 참조
- V1 인용 시 V2 재해석본 병기 의무

### 7.2 단계적 이행 (Phased Transition — 별도 WO)

| Phase | 목표 | 책임 |
|-------|------|------|
| **Phase 0** | 문서 정렬 + 채택 (본 결정) | 완료 (2026-05-23) |
| Phase 1 | service_credentials 테이블 신설 | 별도 WO + F10/F11 예외 승인 |
| Phase 2 | login/register/change/reset 의 dual-read | 별도 WO + F10 예외 승인 |
| Phase 3 | 신규 가입자 service_credentials 사용 | 별도 WO |
| Phase 4 | 기존 사용자 마이그레이션 | 별도 데이터 WO |
| Phase 5 | users.password deprecation | 별도 WO + F11 명시적 변경 |
| Phase 6+ | Handoff / Switcher 의 의미 재정의 | 별도 정책 WO |

### 7.3 모니터링 (Monitoring)

- 본 결정 후 작성되는 모든 IR / WO 의 Identity 인용이 V2 기준인지 점검
- V1 인용이 발견되면 V2 재해석본 병기 여부 확인
- Phase 1+ 진입 시 F10/F11 의 명시적 예외 승인 절차 통과 여부 검증

---

## 8. 결정 기록 (Decision Record)

| 항목 | 값 |
|------|-----|
| 결정일 | 2026-05-23 |
| 발효일 | 2026-05-23 (즉시) |
| 결정 종류 | Architecture Baseline Succession |
| 영향 범위 | 문서 체계 전체 (Identity / Auth / Credential / Membership 관련) |
| 코드 영향 | 없음 (Phase 0) |
| Freeze 영향 | F10, F11 — 향후 명시적 예외 승인 절차 적용 |
| 되돌릴 수 있는가 | 형식적으로 가능 (별도 결정 문서로 V1 복귀) — 그러나 철학 정합성 매트릭스 (§6) 가 V2 의 정합성을 입증하므로 복귀 가능성은 매우 낮다 |
| 변경 책임자 | O4O Platform 이해관계자 (사용자) |

---

## 9. 관련 문서

| 문서 | 관련성 |
|------|--------|
| [O4O-IDENTITY-ARCHITECTURE-V2.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) | 채택된 Canonical Baseline (V2) |
| [O4O-IDENTITY-ARCHITECTURE-V1.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) | 격하된 Legacy Baseline (V1) |
| [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) | 본 결정의 선행 조사 |
| `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1` | 본 결정의 선행 정렬 WO |
| `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1` | 본 결정의 승인 WO |
| [O4O-CORE-FREEZE-V1.md](../architecture/O4O-CORE-FREEZE-V1.md) | F10 — Identity V2 예외 승인 절차 표기 |
| [USER-OPERATOR-FREEZE-V1.md](../architecture/USER-OPERATOR-FREEZE-V1.md) | F11 — Identity V2 예외 승인 절차 표기 |

---

*Decision Date: 2026-05-23*
*Effective Date: 2026-05-23*
*Status: ADOPTED*
*Type: Architecture Baseline Succession Decision*
