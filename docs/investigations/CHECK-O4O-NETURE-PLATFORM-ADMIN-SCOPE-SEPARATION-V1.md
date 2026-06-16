# CHECK-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1

> WO: WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1
> 작업일: 2026-06-16
> 상태: PASS (1차 표면 분리 — 라벨·설명 정리. route/page/backend/DB 무변경)
> 선행: `IR-O4O-NETURE-ADMIN-PLATFORM-SCOPE-SEPARATION-V1` (52804e82b)

## 1. 작업 목적

Neture admin 안에 섞여 있는 **Neture 서비스 admin** 기능과 **O4O platform admin** 성격 기능을 UI·메뉴·문구상 1차 분리한다. 별도 앱/도메인 생성 없이, 기능·route·API 변경 없이 표면(라벨·설명)만 구분한다.

## 2. 변경 전/후 Neture admin 메뉴표 (getAdminMenu)

| 그룹 | 메뉴(전) | 메뉴(후) | 성격 |
|---|---|---|---|
| USERS | 회원 완전삭제 | 회원 완전삭제 | Neture 서비스 |
| USERS | 운영자 관리 | **운영자 관리 (플랫폼)** | 플랫폼 |
| USERS | 문의 메시지 | 문의 메시지 | Neture 서비스 |
| SYSTEM | 역할 관리 | **역할 관리 (플랫폼)** | 플랫폼 |
| SYSTEM | 이메일 설정 / 법정정보·약관 설정 / 문의 설정 | 동일 (Neture 서비스 클러스터로 상단 배치) | Neture 서비스 |
| SYSTEM | 약국 대상 서비스 설정 | **서비스 대상 정책 (플랫폼)** | 플랫폼 |
| SYSTEM | 운영자 업무 → | 동일 | 게이트 |

- SYSTEM 그룹 내부 순서를 [Neture 서비스 관리: 이메일/법정정보·약관/문의] → [플랫폼 관리: 역할 관리(플랫폼)/서비스 대상 정책(플랫폼)] 로 **클러스터링**(주석 헤더로 구분).
- `UNIFIED_MENU`(operator 영역에 admin 노출되는 동일 항목)의 운영자 관리/역할 관리도 동일하게 "(플랫폼)" 라벨 정합.

## 3. Neture 서비스 admin 으로 유지한 메뉴

회원 완전삭제 · 문의 메시지 · 공급자 승인 · 서비스 승인 · 카테고리/브랜드/마스터/정리/일괄등록/매핑 · 파트너 현황 · 커뮤니티 광고 · AI 관리/카드 규칙/비즈팩 · 이메일 설정 · **법정정보·약관 설정** · **문의 설정** · 관리자 대시보드. (라벨·동작 무변경)

## 4. platform-admin 성격으로 분리(표면화)한 메뉴

| 항목 | 처리 | 근거 |
|---|---|---|
| 약국 대상 서비스 설정 → **서비스 대상 정책 (플랫폼)** | 라벨 + 화면 banner | `/neture/admin/service-audience-policies` 가 **여러 serviceKey 정책 동시 편집**(cross-service) |
| 운영자 관리 → **운영자 관리 (플랫폼)** | 라벨 + 화면 banner | 운영자 지정 = 플랫폼 관리 성격(정비 정책) |
| 역할 관리 → **역할 관리 (플랫폼)** | 라벨 + 화면 banner | 역할/권한 = RBAC, 플랫폼 관리 성격 |

화면 banner(indigo) 추가:
- `ServiceAudiencePolicyPage`: "Neture 자체 설정이 아니라 O4O 내 여러 서비스의 대상 정책을 관리하는 플랫폼 관리 항목" + h1 "서비스 대상 정책 (플랫폼 관리)".
- `OperatorsPage`: "운영자 지정은 플랫폼 관리 성격… 후속 platform-admin 정책 결정에 따라 조정될 수 있음".
- `RoleManagementPage`(wrapper): "역할·권한 관리는 플랫폼 관리 성격…".

## 5. service-audience 정책 소속 변경 근거

`serviceAudiencePolicyApi` → `GET/PUT /neture/admin/service-audience-policies[/:serviceKey]` 가 **모든 serviceKey row 를 순회·편집**(ServiceAudiencePolicyPage). 데이터가 cross-service 이므로 Neture 자체 설정이 아닌 플랫폼 관리로 표면화. **API/데이터/기능 무변경**(라벨·설명만).

## 6. 운영자 관리 / 역할 관리 보존 근거

- `/admin/operators`(adminOperatorApi → `/neture/admin/operators`)·`/admin/roles`(공유 `@o4o/ui` RoleManagementPage) **기능·route·guard 무변경**.
- Neture 가 O4O 허브라 즉시 제거 시 운영 차질 → 보존. 플랫폼 성격만 라벨/설명으로 표시. **소속 최종 결정은 후속**(§9).

## 7. Finance 현상 유지 확인

정산 관리 / 파트너 정산 / 커미션 관리 / 파트너 현황 — **라벨·위치·API 전부 무변경**(WO §3.5). 별도 IR(§9.2)로 경계 결정.

## 8. route/page/backend/DB 무변경 확인

- route 삭제/추가 0, page 삭제/생성 0, backend guard·API·DB·migration 0.
- 신규 group key(OperatorGroupKey)·신규 도메인·공유 모듈 변경 0 → GP/KCos/KPA 무영향.
- 정식 "플랫폼 관리" 그룹(별도 sidebar 섹션)은 공유 `OperatorGroupKey`(packages/ui) 확장이 필요 → 본 1차 범위 외, platform-admin surface 설계 후 분리(§9.1).

## 9. 후속 platform-admin 별도 앱/영역 결정 필요 여부

- **필요**: `IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1` — platform-admin 을 (a) Neture 내 별도 "플랫폼 관리" 섹션(공유 group key 확장) (b) admin.neture.co.kr 내 별도 section (c) 완전 별도 앱/도메인 중 결정 + platform-accounts/platform-services UI 위치.
- `IR-O4O-NETURE-FINANCE-ADMIN-OPERATOR-SCOPE-AUDIT-V1` (보류 해제 시).
- `WO-O4O-NETURE-ADMIN-SCOPE-CLEANUP-V1` (분리 후 실제 제거 대상 있을 때만).

## 10. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-neture | `tsc --noEmit` | PASS (EXIT 0) |
| web-neture | `vite build` | PASS (✓ built) |

(공유 모듈·backend·타 서비스 미변경 → 재검증 불필요.)

## 11. browser smoke 결과 / 보류 사유

- **보류(정적 검증 대체)**: neture:admin 인증 + 배포 필요.
- 배포 후 체크리스트:
  1. Neture admin 사이드바: 운영자 관리/역할 관리/서비스 대상 정책 라벨에 "(플랫폼)" 표시
  2. `/admin/settings/service-audience` 진입 → 상단 indigo "플랫폼 관리" banner + 기능 정상
  3. `/admin/operators` 진입 → 플랫폼 성격 banner + 운영자 추가/비활성 정상
  4. `/admin/roles` 진입 → 플랫폼 성격 banner + 역할 관리 정상
  5. 법정정보·약관/문의 설정/회원 완전삭제 등 Neture 서비스 admin 정상
  6. Finance(정산/커미션) 메뉴·화면 무변경
  7. operator 영역(/operator) 무변경

## 12. 변경 파일 목록 (Neture only)

- `services/web-neture/src/config/operatorMenuGroups.ts` (라벨·클러스터링)
- `services/web-neture/src/pages/admin/ServiceAudiencePolicyPage.tsx` (h1 + 플랫폼 banner)
- `services/web-neture/src/pages/admin/OperatorsPage.tsx` (플랫폼 banner)
- `services/web-neture/src/pages/operator/RoleManagementPage.tsx` (플랫폼 banner)
- `docs/investigations/CHECK-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1.md`

## 13. commit hash

- `d25378ce4` — feat(neture): surface-separate platform-admin from service-admin (WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1)
