# CHECK-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1

> WO: WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1
> 작업일: 2026-06-11
> 상태: PASS
> 선행: `WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1` (e3f9766f9)

## 1. 작업 목적

KPA 운영자가 법정정보 입력 후 **공개 준비 상태를 한눈에 점검**할 수 있는 읽기 전용 카드를 KPA admin 관리자 홈에 추가한다. 편집 UI 다음 단계인 "점검 UI". 정책문서 트랙(legacy `kpa_legal_documents` ↔ cross-service `service_policy_documents`)은 변경하지 않는다.

## 2. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/admin/components/AdminPublicReadinessCard.tsx` | 신규 — 공개 상태 점검 카드(읽기 전용) |
| `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx` | 카드 import + 4-Block 하단·최근 가입 신청 위에 렌더 |
| `docs/investigations/CHECK-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1.md` | 본 문서 |

→ KPA 2 파일 + CHECK. backend/shared module/타 서비스 **무변경**.

## 3. 추가한 점검 항목

| 항목 | 데이터 소스 | 판정 |
|---|---|---|
| 법정정보 입력 | `GET /admin/services/kpa-society/legal-profile` (service_legal_profiles) | 5개 핵심필드(상호/대표자/사업자등록번호/주소/(이메일\|전화)) 충족도 + isActive → 정상/주의(일부 누락·비공개)/미설정 |
| 공개 footer 표시 | 위 결과 파생 | 법정정보 정상 시 표시됨, 아니면 주의/확인 필요 |
| 이용약관 게시 | `GET /kpa/legal/documents/published/terms` (kpa_legal_documents, public) | 게시됨/미게시/확인 필요 |
| 개인정보처리방침 게시 | `.../published/privacy` | 게시됨/미게시/확인 필요 |
| 문의 설정 | `GET /admin/services/kpa-society/contact-settings` | `configured` 또는 recipientEmails 존재 → 정상/주의/확인 필요 |

상태 4단계: 정상 / 주의 / 미설정 / 확인 필요(배지 색·아이콘).

## 4. 조회한 API (기존 client/loader 재사용)

- `coreApiClient`(`../../../api/client`, prefix 없는 `/api/v1`) — legal-profile, contact-settings (admin)
- `loadPublishedLegalDocument`(`../../../lib/legalDocument`) — terms/privacy published (기존 공개 loader 재사용, WO §6.2)
- 신규 backend endpoint·entity·migration **없음**.

## 5. fallback 처리 방식

- 각 항목 **독립 try/catch** — 한 조회가 실패해도 다른 항목·대시보드에 영향 없음.
- 실패 시 해당 항목 `확인 필요`(unknown) 표시, 카드/대시보드 정상 렌더(크래시 0).
- 권한(403)·네트워크 오류도 `확인 필요`로 안전 격하.

## 6. 법정정보 설정 연결 확인

- 카드 하단 이동 링크: `법정정보 설정 → /admin/settings/legal`, `문의 설정 → /admin/settings/contact`, `법률 문서 관리(운영자) → /operator/legal`.
- `/operator/legal` 은 운영자 영역이나 `RoleGuard[kpa:admin, platform:super_admin]` 로 kpa:admin 접근 허용 → 링크 자연스러움. 라벨에 "(운영자)" 명시.

## 7. 정책문서 트랙 미변경 확인

- `/policy`·`/privacy`·`/operator/legal`·`kpa_legal_documents` 코드 **미변경**.
- 점검 카드는 published terms/privacy 를 **읽기만** 함(게시 상태 표시). service_policy_documents 미사용.
- 정책문서 편집 위치는 운영자 "법률 관리"로 **안내만**.

## 8. 기존 동작 유지 확인

- 문의 설정(`/admin/settings/contact`)·회원 관리(`/admin/members`) 코드 미변경.
- KPA footer(`PublicLegalFooterInfo`)·`/policy`·`/privacy`·`/operator/legal` 미변경.
- 대시보드 기존 4-Block + 최근 가입 신청 섹션 유지, 점검 카드는 추가만.

## 9. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society | `tsc --noEmit` | PASS (EXIT 0) |
| web-kpa-society | `vite build` | PASS (✓ built) |

(공유 모듈·backend 미변경 → 타 서비스 재검증 불필요.)

## 10. browser smoke 결과 / 보류 사유

- **보류(정적 검증 대체)**: kpa:admin 인증 + 배포 환경 필요. typecheck + build + 코드 경로 정적 분석으로 검증.
- 배포 후 체크리스트:
  1. KPA admin 로그인 → 관리자 홈 진입 → "공개 상태 점검" 카드 노출
  2. 법정정보 미입력 상태: 법정정보=미설정, footer=주의 표시
  3. 법정정보 설정에서 입력·활성 저장 후 재진입: 법정정보=정상, footer=정상
  4. terms/privacy 미게시 시 미설정, `/operator/legal` 게시 후 정상
  5. 문의 설정 수신자 지정 후 정상
  6. 조회 실패(권한/네트워크) 시 "확인 필요" fallback, 대시보드 정상
  7. 이동 링크 3종(legal/contact/operator-legal) 정상 이동

## 11. 후속 정책문서 트랙 결정 필요 여부

- **필요**: `IR-O4O-KPA-POLICY-DOCUMENT-TRACK-DECISION-V1` — kpa_legal_documents(legacy) vs service_policy_documents(cross-service) 단일화. 본 점검 카드는 결정과 무관하게 현재 트랙(kpa_legal_documents published)을 읽으므로, 트랙 통합 시 데이터 소스만 교체하면 됨.

## 12. commit hash

- `4f4ca4b5b` — feat(kpa): add admin public-readiness check card (WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1)
