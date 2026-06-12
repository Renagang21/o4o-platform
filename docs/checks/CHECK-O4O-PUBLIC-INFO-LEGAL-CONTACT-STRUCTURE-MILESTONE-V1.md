# CHECK-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1

> **작업명:** WO-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1
> **유형:** read-only 마일스톤 정리 (코드/배포 변경 없음 — 문서 1개 생성)
> **결과: PASS — O4O 4서비스 공개 정보 구조(서비스 안내 → 법정정보·약관 → 공개 약관/개인정보 → 동적 푸터 → Contact 접수·알림·관리) 정비 완료 상태를 단일 마일스톤으로 고정.**
> 2026-06-12

---

## 1. 목적

O4O 4개 서비스(GlycoPharm / K-Cosmetics / KPA Society / Neture)의 **공개 정보 구조 정비 결과를 하나의 마일스톤 문서로 고정**한다.
일련의 WO/IR 을 통해 아래 영역이 순차 정비되었으며, 본 문서는 **새 기능 구현 없이 현재 완료 상태 + 남은 후속 과제**를 정리한다.

```
서비스 안내
→ 법정정보·약관 관리 (Admin)
→ 공개 약관/개인정보처리방침 route
→ 동적 legal footer
→ Contact 접수 · 알림 · Admin 관리
```

## 2. 작업 유형

- read-only 문서 정리 — 코드/backend/API/DB/migration/frontend/배포 **변경 없음**.
- 산출물: 본 문서 1개.

## 3. 정리 대상 서비스

GlycoPharm · K-Cosmetics · KPA Society · Neture (4개).

---

## 4. 서비스별 현재 상태 요약

| 서비스 | 서비스 안내 | 약관/개인정보 | 법정정보 푸터 | Contact 제출 | Contact Admin 관리 |
|--------|:----------:|:-----------:|:-----------:|:----------:|:----------------:|
| **GlycoPharm** | ✅ `/service-guide` | ✅ `/terms`·`/privacy` ← `service_policy_documents` | ✅ `service_legal_profiles` | ✅ `/contact` → `ContactInquiry` | ✅ `/admin/contact-inquiries` |
| **K-Cosmetics** | ✅ `/service-guide` | ✅ `/terms`·`/privacy` ← `service_policy_documents` | ✅ `service_legal_profiles` | ✅ `/contact` → `ContactInquiry` | ✅ `/admin/contact-inquiries` |
| **KPA Society** | ✅ `/service-guide` | ✅ `/policy`·`/privacy` ← `kpa_legal_documents`(public API) | ✅ `service_legal_profiles` | 기존 KPA 구조 유지 | 기존 KPA 구조 유지 |
| **Neture** | ✅ `/guide` | ✅ `/terms`·`/privacy` ← 기존 CMS(`cms_pages`) | ✅ `service_legal_profiles` | 기존 Neture 구조 유지 | 기존 Neture 구조 유지 |

- 법정정보 푸터는 **4서비스 모두 `service_legal_profiles` 기반 동적 렌더**로 통일됨(값 없으면 비표시).
- 약관/개인정보 본문 출처는 서비스별 상이(GP/KCos=`service_policy_documents`, KPA=`kpa_legal_documents`, Neture=CMS) — 장기 일원화는 후속 과제(§7).
- Contact 신규 `ContactInquiry` 흐름은 **GP/KCos 한정**(접수→알림→Admin 관리). KPA/Neture 는 기존 구조 유지.

---

## 5. 완료된 WO/IR 목록 (commit hash)

> hash 는 `feat/fix`(구현) 기준, 괄호는 해당 `docs(check/ir)` 기록 커밋. 각 항목 상세는 해당 CHECK/IR 문서 참조.

### 5.1 서비스 안내

| 작업 | 구현 | CHECK |
|------|------|-------|
| `WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1` | `d63aa54c2` | `1fbf98d5a` |
| `WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1` | `7bda9ece9` | `2a4f65939` |
| `WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1` | `78f21d0f6` | `4945dd0d0` |
| `WO-O4O-NETURE-O4O-GUIDE-PAGE-REFINE-V1` | (현행 `/guide` 유지 판정) `608125933` | `4b5e52582` |

### 5.2 법정정보/약관 조사 (IR)

| 작업 | 구현/문서 | 기록 |
|------|------|-------|
| `IR-O4O-CROSSSERVICE-FOOTER-LEGAL-DISPLAY-REQUIREMENTS-V1` | `b55530d62` | `181d1892b` |
| `IR-O4O-SERVICE-LEGAL-POLICY-SETTINGS-MANAGEMENT-AUDIT-V1` | `dfbadbd7a` | `9408efc50` |
| `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` | `be09cbf71` | — |

### 5.3 법정정보/약관 구현

| 작업 | 구현 | CHECK |
|------|------|-------|
| `WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1` | `8ab6ca741` | `628dd6e56` |
| `WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1` | `95ad3e237` | `d4044bfc5` |
| `WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1` | `202084646` | `ff8be9c1b` |
| `WO-O4O-GP-KCOS-SERVICE-LEGAL-POLICY-SETTINGS-UI-ROLLOUT-V1` | `47e913959`(+`f95d90bdb`) | `8fa64e003` |
| `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1` | `b26c61807` | `0cacaee61` |
| `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` | `6f7e0e22a`(+restore `3bedc8cca`) | `588390b5e` |
| `WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1` | `8831279bf` | `e0e8e626d` |
| `WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1` | `7ca4fc3b0` | `ec4d6294a` |

> ⚠️ `6f7e0e22a` 는 동시 세션 혼입으로 StoreContent 파일이 휩쓸렸고 `3bedc8cca` 로 복구됨 — pathspec 커밋 규칙 재확인 계기(§8.5).

### 5.4 Contact

| 작업 | 구현 | CHECK |
|------|------|-------|
| `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1` | `9acfbb58c` | `b7db3213e` |
| `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` | `6368c6da5` | `6256b50ad` |

---

## 6. 핵심 원칙 정리

### 6.1 법정정보

1. 법정정보는 **코드 하드코딩하지 않는다.**
2. 법정정보는 **`service_legal_profiles` 기반**으로 관리한다.
3. 값이 없거나 비활성 상태이면 **공개 푸터에 표시하지 않는다.**
4. placeholder / 더미 / "준비 중" / "미정" 문구를 **표시하지 않는다.**
5. 사업자 정보 실값은 **Admin 운영자 설정에서 입력**한다.

### 6.2 약관/개인정보처리방침

1. GP/KCos 는 `service_policy_documents` 기반 `/terms`·`/privacy` 사용.
2. Neture 는 기존 CMS 기반 `/terms`·`/privacy` 유지.
3. KPA 는 기존 `kpa_legal_documents` 기반 `/policy`·`/privacy` 사용.
4. KPA 의 장기 표준 일원화는 **후속 과제**로 남긴다(§7).
5. **published 문서만 공개 표시**한다.
6. **draft 문서는 공개 표시하지 않는다.**

### 6.3 Admin/Operator 경계

1. 법정정보·약관 설정은 **Admin 설정 영역**의 기능이다.
2. 일반 Operator 메뉴에 신규 법정정보 설정을 **노출하지 않는다.**
3. KPA 기존 `/operator/legal` 은 기존 정책문서 관리 경로로 **유지 중**이다.
4. 장기적으로 KPA 도 Admin 설정으로 수렴하는 것이 권장된다(§7).

### 6.4 Contact

1. GP/KCos 는 신규 `ContactInquiry` 기반으로 **접수·알림·Admin 관리까지 연결**되었다.
2. Neture/KPA 는 **기존 Contact 구조를 유지**한다.
3. 이메일 알림은 **후속 작업으로 분리**한다.
4. Contact 수신자 설정 Admin 도 **후속 작업으로 분리**한다.

---

## 7. 데이터 소스 / route 정리

### 7.1 데이터 소스

| 영역 | GlycoPharm | K-Cosmetics | KPA Society | Neture |
|------|-----------|-------------|-------------|--------|
| 법정정보 | `service_legal_profiles` | `service_legal_profiles` | `service_legal_profiles` | `service_legal_profiles` |
| 약관 | `service_policy_documents` | `service_policy_documents` | `kpa_legal_documents` | `cms_pages` |
| 개인정보 | `service_policy_documents` | `service_policy_documents` | `kpa_legal_documents` | `cms_pages` |
| Contact | `ContactInquiry` | `ContactInquiry` | 기존 KPA 구조 | 기존 Neture 구조 |

### 7.2 공개 route

| 서비스 | 안내 | 이용약관 | 개인정보처리방침 | 문의 |
|--------|------|---------|----------------|------|
| GlycoPharm | `/service-guide` | `/terms` | `/privacy` | `/contact` |
| K-Cosmetics | `/service-guide` | `/terms` | `/privacy` | `/contact` |
| KPA Society | `/service-guide` | `/policy` | `/privacy` | 기존 route |
| Neture | `/guide` | `/terms` | `/privacy` | 기존 route |

---

## 8. 남은 후속 과제

우선순위 후보:

1. **`WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1`** — GP/KCos Contact 이메일 알림(서비스별 수신자 설정과 함께 검토).
2. **`WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1`** — 서비스별 문의 수신자 / 문의 유형 / 자동응답 문구 / 이메일 알림 사용 여부 Admin 설정.
3. **`WO-O4O-KPA-LEGAL-ADMIN-UI-CONSOLIDATION-V1`** — KPA `/operator/legal` 과 Admin 설정 체계 정리.
4. **`WO-O4O-KPA-LEGAL-DOCUMENTS-MIGRATION-TO-SERVICE-POLICY-V1`** — KPA `kpa_legal_documents` → `service_policy_documents` 이관 여부 검토·실행.
5. **`WO-O4O-SERVICE-LEGAL-POLICY-RICHTEXT-EDITOR-V1`** — 약관/정책 문서 본문 편집기를 RichTextEditor 로 개선.
6. **`WO-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1`** — Neture/KPA 기존 Contact 구조 ↔ 신규 `ContactInquiry` 장기 통합 검토.

---

## 9. 주의사항

1. **실제 사업자등록번호 · 대표자 · 주소 · 통신판매업 신고번호** 등은 사용자/법무 확인 후 입력해야 한다.
2. 현재 미입력 상태에서는 **푸터 법정정보가 비표시**될 수 있다(정상 — placeholder 노출 금지 정책).
3. placeholder 를 넣어 공개 노출하면 **안 된다.**
4. Contact 테스트 문의([SMOKE] GP/KCos 2건)는 smoke 에서 **spam 처리 완료**됨(`CHECK-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` §10).
5. 동시 세션 혼입 방지를 위해 commit 은 반드시 **pathspec(`git commit -- <명시 경로>`)** 로 수행해야 한다(§5.3 `6f7e0e22a` 사고 참조).

---

## 10. 완료 판정

**PASS.** O4O 4서비스 공개 정보 구조(서비스 안내 → 법정정보·약관 관리 → 공개 약관/개인정보 → 동적 푸터 → Contact 접수·알림·관리)의 완료 상태를 단일 마일스톤으로 고정. 완료 WO/IR 18건 + commit hash, 데이터 소스/route 표, 핵심 원칙(법정정보 하드코딩 금지 / published-only / Admin·Operator 경계 / Contact 현황), 후속 과제 6건을 정리. 코드 변경 0.

---

*Date: 2026-06-12 · WO-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1 · read-only 마일스톤. 공개 정보 구조 완료 고정 + 후속 분리.*
