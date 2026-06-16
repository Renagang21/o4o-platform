# CHECK-O4O-ADMIN-SCOPE-STABILIZATION-CLOSURE-V1

> **성격**: 종료 고정 문서 (documentation-only) — 코드/메뉴/route/backend/DB 수정 0.
> **목적**: GlycoPharm / K-Cosmetics / KPA-Society / Neture 4개 서비스 admin scope 정비 **1차 사이클 공식 종료 고정**. 무엇이 완료/이관/분리/legacy/보류인지 단일 기준으로 정리.
> **작성일**: 2026-06-16
> **기준 commit**: `46d4039d6` (main, working tree clean)
> **선행 결과 문서**: 각 서비스 IR/WO CHECK (§5 commit hash 참조)

---

## 0. 종료 판정 (TL;DR)

> ✅ **4개 서비스 admin scope 정비 1차 = 종료 고정 가능.**
> - GP/KCos: admin → service-settings scope 축소 + 문의 관리 operator 이관 완료.
> - KPA: admin 법정정보 편집 UI + 공개 상태 점검 + 정책문서 표준(service_policy_documents) 전환 완료(legacy fallback 보존).
> - Neture: admin 대부분 neture-scope 정상 — platform-admin 성격 **표면 분리(라벨·배너) 1차** 완료.
> - **보류(의도)**: Finance(정산/커미션) 현상 유지 · platform-admin surface 설계 · KPA legacy legal cleanup.
> - 다음 권장: 신규 구현보다 **배포 후 browser smoke 묶음 수행**(§8 체크리스트).

---

## 1. 최종 역할 기준 (4 서비스 공통)

| 역할 | 담당 |
|---|---|
| **서비스 admin** | 서비스 설정 · 법정정보·약관 · 문의 **설정** · 회원 **데이터 관리(완전삭제/개인정보 파기)** · 공개 상태 확인 |
| **서비스 operator** | 문의 **처리** · 회원 이용중지/운영 대응 · 약국/매장 운영 · 콘텐츠 운영 · 상품/오퍼 운영 · 실무 운영 |
| **O4O platform admin** | 서비스별 admin/operator 지정 · 전체 권한/RBAC · 플랫폼 계정 · cross-service 정책(서비스 대상 정책 등) |

- 회원: 이용중지=operator / 완전삭제·개인정보 파기=admin (4 서비스 공통).
- 문의: 설정=admin / 처리=operator (4 서비스 공통).
- platform admin: 아직 별도 앱 없음 → Neture admin 내부에서 1차 UI·라벨 분리(표면화).

---

## 2. 완료된 IR/WO 목록 + commit hash

### GlycoPharm
| 작업 | commit |
|---|---|
| IR-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-BASELINE-V1 (read-only) | `696b4efe2` |
| WO-O4O-GLYCOPHARM-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1 | `db49c2713` |
| WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1 (admin → service-settings) | `6f33e1b9d` |

### K-Cosmetics
| 작업 | commit |
|---|---|
| WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1 (+ operator-level guard) | `8fdaea452` |
| WO-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1 (admin → service-settings) | `3ce37df29` |

### KPA-Society
| 작업 | commit |
|---|---|
| IR-O4O-KPA-ADMIN-SCOPE-BASELINE-AUDIT-V1 (read-only) | `ffc22c6a3` |
| WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1 (footer 법정정보 편집 UI) | `e3f9766f9` |
| WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1 (공개 상태 점검 카드) | `4f4ca4b5b` |
| WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1 (정책문서 표준 전환) | `6324df9d9` |

### Neture
| 작업 | commit |
|---|---|
| IR-O4O-NETURE-ADMIN-PLATFORM-SCOPE-SEPARATION-V1 (read-only) | `52804e82b` |
| WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1 (표면 분리 1차) | `d25378ce4` |

> 각 WO 의 hash-기록 docs commit 은 본 표에서 생략(해당 CHECK 문서 참조).

---

## 3. 서비스별 최종 admin 메뉴 변화 요약

### 3.1 GlycoPharm
- admin → **service-settings scope** 축소. 문의 관리 admin 진입점 제거 → operator canonical.
- 약국 네트워크 admin 진입점 제거(→ operator stores 일원화), 역할 관리 admin 진입점 제거(O4O 전체 관리자 영역).
- 회원 관리 = 회원 데이터 관리 라벨/설명 정리. **Finance 현상 유지(제외).**
- route/page 보존(직접 URL 동작 가능) — UI 진입점 정리 중심.

### 3.2 K-Cosmetics
- GP 와 동일 패턴(admin → service-settings, 문의 관리 operator 이관, 역할 관리/매장 네트워크 admin 진입점 제거).
- **차이**: KCos `scopeRoleMapping` 이 엄격 → 문의 관리 route 의 backend guard 를 operator 허용으로 **최소 조정**(문의 설정은 admin 유지). 공통 contact-inquiry controller 변경의 GP operator 문의 무회귀 확인 동반.

### 3.3 KPA-Society
- footer 법정정보 → `service_legal_profiles` (`/admin/settings/legal`, 신규 편집 UI).
- 정책문서 → `service_policy_documents` 표준 전환(`/admin/settings/legal` 정책 문서 탭). 공개 `/policy`·`/privacy` = 표준 우선 + legacy `kpa_legal_documents` **fallback**.
- 공개 상태 점검 카드(관리자 홈). `/operator/legal` = legacy 보존(operator 메뉴 제거 + deprecated 배너).

### 3.4 Neture
- admin 대부분 **neture-scope 정상**(삭제/이관 아님). platform-admin 성격만 **표면 분리(라벨 "(플랫폼)" + indigo 배너)**:
  - 운영자 관리 (플랫폼) / 역할 관리 (플랫폼) / 서비스 대상 정책 (플랫폼).
  - admin system 그룹을 [Neture 서비스 관리] / [플랫폼 관리] 클러스터로 정리(주석 헤더).
- 별도 platform-admin 앱·route·backend·DB 변경 **없음**. **Finance 현상 유지.**

---

## 4. operator 이관 완료 항목

| 서비스 | 이관 |
|---|---|
| GlycoPharm | 문의 관리 → operator (`/operator/contacts` canonical). admin 진입점 제거 |
| K-Cosmetics | 문의 관리 → operator (`/operator/contacts`). 문의 route guard operator 허용 |
| KPA | (회원 soft / 문의 처리 이미 operator) — 정책문서 편집은 admin 으로 정리, operator `/operator/legal` deprecated |
| Neture | (이미 operator 분리 양호 — 신규 이관 없음) |

## 5. platform-admin 성격으로 분리(표면화)된 항목

| 항목 | 서비스 | 처리 |
|---|---|---|
| 역할 관리 (RBAC) | GP/KCos: admin 진입점 제거(전체 관리자 영역) · Neture: "(플랫폼)" 라벨+배너 | 분리/표면화 |
| 운영자 지정 | Neture: 운영자 관리 "(플랫폼)" 라벨+배너 | 표면화(정책 결정 대기) |
| 서비스 대상 정책(cross-service) | Neture: 서비스 대상 정책 "(플랫폼)" 라벨+배너 | 표면화 |

## 6. legacy / fallback 으로 남은 항목

| 항목 | 상태 | 후속 |
|---|---|---|
| KPA `kpa_legal_documents` + `/operator/legal` | legacy 보존(table/entity/API 미삭제), 공개 route fallback | `WO-O4O-KPA-LEGAL-DOCUMENT-LEGACY-CLEANUP-V1` (표준 재게시 완료 후) |
| GP/KCos admin route/page (진입점 제거된 것) | route/page 보존(직접 URL 동작) | 필요 시 cleanup |
| Neture platform 항목 route/page | 전부 보존(라벨만) | platform-admin surface 설계 후 |

## 7. Finance 보류 원칙 (4 서비스 공통)

> 결제 기능이 아직 붙어 있지 않다. 정산·커미션·회계성 기능은 **실운영 이후** 구체화한다.
> 이번 정비에서 **이동/삭제/라벨 변경하지 않는다.**

- 대상: GlycoPharm Finance · Neture 정산/커미션/파트너 정산 · (KCos 해당 기능 부재/현상 유지).
- 후속: `IR-O4O-NETURE-FINANCE-ADMIN-OPERATOR-SCOPE-AUDIT-V1` (보류 해제 시).

## 8. 배포 후 browser smoke 체크리스트 (묶음 수행 권장)

> 4 서비스 정비가 정적 검증(typecheck/build) 위주로 완료됨 → 배포 후 1회 묶음 smoke 권장.

- [ ] GlycoPharm admin 메뉴 = service-settings scope(문의 관리/역할 관리/약국 네트워크 admin 진입점 미노출)
- [ ] GlycoPharm `/operator/contacts` 문의 관리 정상
- [ ] K-Cosmetics admin 메뉴 동일 확인
- [ ] K-Cosmetics `/operator/contacts` 문의 관리 정상 (+ GP operator 문의 무회귀)
- [ ] KPA `/admin/settings/legal` 법정정보+정책 문서 탭 정상, 저장/게시
- [ ] KPA `/policy`·`/privacy` = service_policy_documents 우선, 미게시 시 legacy fallback(빈 화면 아님)
- [ ] KPA 관리자 홈 공개 상태 점검 카드(법정정보/약관/개인정보/문의) 상태 정상
- [ ] KPA `/operator/legal` deprecated 배너 + operator 메뉴 미노출
- [ ] Neture admin 사이드바 "(플랫폼)" 라벨 3종 + 3화면 indigo 배너
- [ ] Neture Finance(정산/커미션) 메뉴·화면 무변경
- [ ] 각 서비스 console/pageerror/4xx-5xx 없음

## 9. 최근 typecheck / build 결과 (각 WO CHECK 기준)

| 서비스 | typecheck | build | 출처 |
|---|---|---|---|
| GlycoPharm | PASS | PASS | WO `6f33e1b9d`/`db49c2713` CHECK |
| K-Cosmetics | PASS | PASS | WO `3ce37df29`/`8fdaea452` CHECK |
| KPA-Society | PASS (`tsc --noEmit`) | PASS (`vite build`) | WO `e3f9766f9`/`4f4ca4b5b`/`6324df9d9` CHECK |
| Neture | PASS (`tsc --noEmit`) | PASS (`vite build`) | WO `d25378ce4` CHECK |
| api-server (KCos guard 조정) | PASS | — | WO `8fdaea452` CHECK |

> 본 종료 문서는 코드 무변경 → 신규 빌드 불필요. 위는 각 WO 시점 검증 결과.

## 10. 후속 작업 목록 (우선순위)

| # | 작업 | 성격 | 선행 조건 |
|:-:|---|---|---|
| 1 | `IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1` | platform-admin 위치 결정(Neture 내 섹션 / 별도 section / 별도 앱) + 공유 OperatorGroupKey "플랫폼 관리" 그룹 추가 여부 + platform-accounts/services UI 위치 | 정책 결정 |
| 2 | (배포 후) browser smoke 묶음 | §8 체크리스트 | 배포 |
| 3 | `WO-O4O-KPA-LEGAL-DOCUMENT-LEGACY-CLEANUP-V1` | `/operator/legal`·kpa_legal_documents fallback 제거 | terms/privacy 표준 재게시("게시됨(표준)") 확인 |
| 4 | `IR-O4O-NETURE-FINANCE-ADMIN-OPERATOR-SCOPE-AUDIT-V1` | 정산/커미션 admin/operator 경계 | Finance 보류 해제 |
| 5 | `WO-O4O-NETURE-ADMIN-SCOPE-CLEANUP-V1` (선택) | 분리 후 실제 제거 대상 발생 시 | #1 |

## 11. 당장 더 건드리지 말아야 할 항목

- Finance(정산/커미션/회계) — 실운영 전 손대지 않음.
- platform-admin 별도 앱/도메인 — #1 IR 결정 전 신규 생성 금지.
- KPA legacy legal(`kpa_legal_documents`/`/operator/legal`) — 표준 재게시 확인 전 제거 금지(fallback 안전망).
- GP/KCos/Neture 진입점 제거된 route/page — 직접 삭제는 별도 cleanup WO 판단.

---

## 부록 — 산출/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (종료 고정 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/CHECK-O4O-ADMIN-SCOPE-STABILIZATION-CLOSURE-V1.md` (유일) |
| 기준 commit | `46d4039d6` |
| 4 서비스 정비 | GP/KCos(축소+문의 이관) · KPA(법정정보·정책문서·점검) · Neture(platform 표면 분리) |
| 보류 | Finance · platform-admin surface · KPA legacy cleanup |
| 다른 세션 WIP | 미접촉(본 문서만 staged) |
| browser smoke | 배포 후 §8 묶음 수행(보류) |
| commit hash | `5f2f54ff9` |

> **상태**: O4O 4개 서비스 admin scope 정비 **1차 사이클 종료 고정**. 다음은 신규 구현보다 배포 후 smoke 묶음 + platform-admin surface 설계 IR(정책 결정 선행).
