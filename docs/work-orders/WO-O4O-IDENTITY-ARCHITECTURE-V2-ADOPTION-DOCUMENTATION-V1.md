# WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1

> **Documentation-only Work Order — 코드 / DB / migration / Auth 구현 변경 없음.**
> 본 WO 는 O4O Identity Architecture V2 의 **공식 채택 결정을 문서 체계에 반영**하는 작업이다.

- **작성일 / 실행일:** 2026-05-23
- **분류:** Documentation (Canonical Baseline Succession)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md)
- **선행 WO:** `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1` (2026-05-23)
- **결정 문서:** [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)
- **영향 Freeze:** F10 (O4O Core), F11 (User/Operator)

---

## 1. 목적

O4O Platform 의 Identity Architecture V2 채택 결정 (2026-05-23) 을 **공식 문서 체계에 반영**한다.

본 WO 의 본질:
- 코드는 V1 동작 그대로 유지 (변경 없음)
- 문서 체계가 V2 를 **Canonical Identity Baseline** 으로 명시
- V1 은 **Legacy Baseline** 으로 격하 (운영 코드 현행 동작 기록 용도)
- F10 / F11 Freeze 에 Identity V2 명시적 예외 승인 절차 표기 추가
- 향후 구현 WO 의 계약 기준 확정

> 본 WO 가 끝나면 이후 Claude Code / Codex / IR / WO 모두 **"V2 기준"** 으로 움직인다.

---

## 2. 작업 기준 준수 사항 (CLAUDE.md)

### 2.1 사전 동기화

- [x] `git pull origin main` 실행 — Already up to date (2026-05-23)
- [x] `git status` 확인 — 예상 변경 (이전 정렬 WO 산출물 4개) 만 확인됨
- [x] 예상 밖 변경 없음 — 진행 안전

### 2.2 작업 범위 제약

- [x] 작업 범위 외 수정 없음
- [x] 코드 / DB / migration / Auth 구현 변경 없음
- [x] CLAUDE.md 본체 수정 없음 (요청 외)

---

## 3. 작업 범위 (수행 완료)

### 3.1 Identity V2 상태 변경 (DRAFT → CANONICAL)

**파일:** `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md`
**선행 파일명:** `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2-DRAFT.md` → rename (untracked 단계라 plain mv)

| 변경 지점 | 내용 |
|----------|------|
| **파일명** | `V2-DRAFT.md` → `V2.md` |
| **타이틀** | "V2 — DRAFT" → "V2" |
| **상태** | DRAFT → **CANONICAL** (Adopted) |
| **채택일 메타** | "채택일: 2026-05-23", "채택 WO: WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1" |
| **채택 근거 섹션** | 4개 근거 명시 (철학 정합성 / IR 결과 / 이해관계자 합의 / 구현 비충돌) |
| **구현 상태 안내** | "Canonical 이지만 구현 미진행" 양립 명시 |
| **§6 Phase 0** | "현재 — 본 V2 DRAFT" → "완료 — 2026-05-23" |
| **§7.3 / §8.3 / §9.2 / §11** | "본 V2 DRAFT" 표현을 "본 V2 채택 단계" 등으로 갱신 |
| **§12 Phase 0 추적** | Stage 1 (Document Alignment) + Stage 2 (Adoption) 두 단계 모두 ✅ 표기 |
| **Footer** | "DRAFT — Awaiting stakeholder acceptance" → "CANONICAL (Adopted) — Phase 0 완료, Phase 1+ 별도 WO 책임" |

### 3.2 Identity V1 상태 정리 (Active Reference → Legacy Baseline)

**파일:** `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md`

| 변경 지점 | 내용 |
|----------|------|
| **상단 배너** | "V2 전환 예정" → "**Legacy Baseline — V2 가 Canonical 로 채택됨**" |
| **V1 유지 사유** | 3개 명시 (운영 코드 동작 기록 / 역사적 판단 기록 / V1↔V2 차이 명확화) |
| **신규 구조 판단 기준** | "모든 신규 Identity 관련 IR / WO / 설계 판단은 V2 기준" 명시 |
| **V1 인용 시 의무** | "V1 §2.1 / §9 원문 인용 시 V2 재해석본 병기 의무" 명시 |
| **결정 문서 링크** | DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1 추가 |
| **Footer Status** | "Active Reference (V2 전환 예정)" → "**Legacy Baseline** — 운영 코드 현행 동작 기록용. 신규 구조 판단은 V2 기준" |

### 3.3 결정 문서 신설

**신규 파일:** `docs/decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md`

**디렉터리:** `docs/decisions/` (신규 디렉터리 — 본 WO 가 최초 생성)

**섹션 구성:**
| 절 | 내용 |
|----|------|
| §1 | 배경 (V1 의 공통 password 모델 + 2026-03-25 의 Password Sync 제거 결정) |
| §2 | 기존 문제 (철학 충돌 매트릭스, V1 의 구조적 한계, 사업 관점 손실) |
| §3 | V1 의 명시적 한계 (V1 가정 ↔ O4O 실제 비교) |
| §4 | 채택 이유 (철학 정합성 / 작업 순서 회복 / 후속 작업 방향 / Freeze 양립) |
| §5 | **최종 결정** (5개 채택 사항 + 비채택 사항 명시) |
| §6 | 철학 정합성 최종 판정 (5개 원칙 모두 정합) |
| §7 | 향후 방향 (즉시 발효 + Phase 1-6+ 단계적 이행) |
| §8 | 결정 기록 (메타데이터) |
| §9 | 관련 문서 |

### 3.4 Freeze 영향 문서 정리

#### F10 (O4O-CORE-FREEZE-V1.md)

| 변경 지점 | 내용 |
|----------|------|
| **§5-A 신설** | "Identity Architecture V2 채택과의 관계 (2026-05-23 추가)" |
| **§5-A.1** | F10 영향 범위 (V2 변경 항목 vs 명시적 예외 필요 여부) — HIGH 4건, 없음 2건 |
| **§5-A.2** | 명시적 예외 승인 절차 (5단계) |
| **§5-A.3** | V2 와 무관한 Core 변경은 기존 F10 절차 유지 |
| **Footer** | "Updated: 2026-05-23 — Identity V2 Canonical 채택과의 관계 추가. Freeze 자체는 변경 없음." |

#### F11 (USER-OPERATOR-FREEZE-V1.md)

| 변경 지점 | 내용 |
|----------|------|
| **§10 신설** | "Identity Architecture V2 채택과의 관계 (2026-05-23 추가)" |
| **§10.1** | F11 의 핵심 의도 (3축 고정) |
| **§10.2** | V2 의 4-Layer 모델과 F11 의 관계 (Layer별 위반 여부 매트릭스) |
| **§10.3** | **F11 공식 해석** — "테이블 개수 제한이 아니라 책임 침해 방지" — V2 4-Layer 와 양립 |
| **§10.4** | 명시적 예외 승인 절차 (5단계) |
| **§10.5** | V2 와 무관한 User/Operator 변경은 기존 F11 절차 유지 + 기존 Forbidden Pattern 유지 |
| **Footer** | "Updated: 2026-05-23 — Identity V2 Canonical 채택과의 관계 (§10) 추가. F11 본체는 변경 없음." |

### 3.5 향후 구현 기준 (Acceptance Criteria for Future WOs)

V2 §11 에서 이미 명시된 계약 기준이 본 WO 채택으로 **공식 발효**됨. 후속 구현 WO 들은 다음을 위반하지 않아야 한다:

- V2 §1 의 5개 철학 원칙
- V2 §3 의 4-Layer Identity Model
- V2 §10 의 정합성 매트릭스

### 3.6 현재 구조 vs O4O 철학 충돌 체크 (최종 판정)

| 원칙 | 채택 후 정합성 | 근거 |
|------|--------------|------|
| 1. 1 Email = 1 Identity (전역 통합) | ✅ 정합 | users.email UNIQUE 유지 |
| 2. 서비스는 독립 사업자 | ✅ 정합 | L2/L3/L4 모두 서비스 범위 (V2) |
| 3. 회원은 서비스 범위에서 독립 | ✅ 정합 | service_memberships 유지 |
| 4. **Credential 은 서비스 범위에서 독립** | ✅ **정합 (V2 핵심)** | service_credentials 신규 (V2) |
| 5. Role 은 서비스 범위에서 독립 | ✅ 정합 | role_assignments 유지 |

→ **5개 원칙 모두 정합**. 본 WO 의 핵심 결과: **O4O 철학 ↔ Identity Baseline 의 명시적 충돌 해소 완료**.

---

## 4. 산출물 목록

| # | 파일 | 변경 유형 | 상태 |
|---|------|---------|------|
| 1 | `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2-DRAFT.md` → `O4O-IDENTITY-ARCHITECTURE-V2.md` | Rename | ✅ |
| 2 | `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md` | Promote (DRAFT → CANONICAL) | ✅ |
| 3 | `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` | Degrade (Active Reference → Legacy) | ✅ |
| 4 | `docs/decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md` | New (디렉터리 + 파일) | ✅ |
| 5 | `docs/architecture/O4O-CORE-FREEZE-V1.md` | Update (§5-A 추가) | ✅ |
| 6 | `docs/architecture/USER-OPERATOR-FREEZE-V1.md` | Update (§10 추가) | ✅ |
| 7 | `docs/work-orders/WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1.md` | Update (V2-DRAFT → V2 링크) | ✅ |
| 8 | `docs/work-orders/WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1.md` (본 파일) | New | ✅ |

---

## 5. 본 WO 의 종료 조건

- [x] V2 상태 DRAFT → CANONICAL 승격 (채택일 + 채택 근거 + 결정 문서 링크)
- [x] V1 → Legacy Baseline 표기 (유지 사유 + 신규 판단 기준 명시)
- [x] DECISION 문서 신설 (`docs/decisions/` 디렉터리 + 파일)
- [x] F10 (O4O Core Freeze) 에 §5-A 추가 — 명시적 예외 승인 절차
- [x] F11 (User/Operator Freeze) 에 §10 추가 — 명시적 예외 승인 절차 + 4-Layer 양립 해석
- [x] 향후 구현 기준 (V2 §11) 의 공식 발효 명시
- [x] 현재 구조 vs O4O 철학 충돌 체크 최종 판정 기록
- [x] 본 WO 기록 문서 (본 파일) 신설

---

## 6. 본 WO 의 비범위 (Out-of-Scope)

본 WO 는 다음을 **수행하지 않는다**:

- 코드 / DB / migration / Auth 구현 변경
- UI/UX 변경 (LoginModal / RegisterPage / ServiceSwitcher / Handoff)
- 후속 구현 WO 의 자동 생성 (Phase 1+ 는 별도 WO 의 책임)
- F10 / F11 Freeze 본체의 변경 (예외 승인 절차 표기 추가만 — Freeze 자체는 유효)
- 운영 코드의 V1 → V2 즉시 이행
- CLAUDE.md 본체 수정 (Identity V2 캐논 참조는 향후 별도 PR/WO 에서 검토)

---

## 7. 후속 WO (Future Work — Out-of-Scope)

본 WO 종료 후 별도 WO 의 책임:

| 후속 WO (예시) | 책임 | 예외 승인 필요 |
|---------------|------|---------------|
| `WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-V1` | `service_credentials` 테이블 신설 (L2) | F10 + F11 |
| `WO-O4O-IDENTITY-V2-PHASE2-DUAL-READ-V1` | login/register/change/reset 의 dual-read | F10 |
| `WO-O4O-IDENTITY-V2-PHASE3-NEW-USER-V1` | 신규 가입자 service_credentials 사용 | (Phase 2 기반) |
| `WO-O4O-IDENTITY-V2-PHASE4-MIGRATION-V1` | 기존 active membership credential backfill or 강제 reset | 데이터 작업 |
| `WO-O4O-IDENTITY-V2-PHASE5-DEPRECATION-V1` | users.password deprecation | F10 + F11 |
| `WO-O4O-IDENTITY-V2-SWITCHER-UX-V1` | ServiceSwitcher "가입" UX 재설계 | 별도 UX WO |
| `WO-O4O-IDENTITY-V2-HANDOFF-POLICY-V1` | Handoff 의 의미 재정의 (V2 §7) | 별도 정책 WO |

→ 모든 후속 WO 는 본 V2 의 5개 철학 원칙 + 4-Layer 모델 + V2 §11 의 계약 기준을 위반하지 않아야 함.

---

## 8. 정리 — 본 WO 의 메타 의미

본 WO 는 단순한 문서 승격이 아니다. **O4O 플랫폼에서 "철학 → 문서 → 코드" 의 작업 순서를 공식 확정**하는 작업이다.

| 시점 | 상태 |
|------|------|
| **WO 전** | V1 baseline 만 존재. 코드와 문서 일치, 그러나 철학과는 충돌 |
| **선행 WO (Document Alignment)** | V1 보존 + V2 DRAFT 신설. 두 모델 병존 |
| **본 WO (Adoption Documentation)** | V2 가 Canonical, V1 은 Legacy. 신규 판단의 단일 기준 확립 |
| **이후 (Phase 1+)** | 별도 WO 들이 V2 를 계약 기준으로 삼아 코드 이행 |

본 WO 의 산출물 (V2 Canonical + V1 Legacy + DECISION + F10/F11 §추가 + 본 WO 기록) 이 후속 작업의 **단일 기준 (Single Authority)** 이 된다.

향후 모든 Identity 관련 IR / WO / 설계는 다음 우선순위로 참조한다:
1. **V2 Canonical** (Identity Architecture)
2. **DECISION 문서** (채택 근거 / 5개 채택 사항)
3. F10 §5-A, F11 §10 (Freeze 예외 승인 절차)
4. V1 (Legacy — 운영 코드 현행 동작 기록 용도만)

---

*Created: 2026-05-23*
*Type: Work Order — Documentation (Canonical Baseline Succession)*
*Status: Completed — V2 채택 발효 (Effective 2026-05-23)*
