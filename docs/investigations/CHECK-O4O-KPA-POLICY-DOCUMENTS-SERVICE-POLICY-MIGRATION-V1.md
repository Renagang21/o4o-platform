# CHECK-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1

> WO: WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1
> 작업일: 2026-06-11
> 상태: PASS
> 선행: `WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1`(e3f9766f9) · `WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1`(4f4ca4b5b)

## 1. 작업 목적

KPA 정책문서(이용약관·개인정보처리방침)의 공개·관리 흐름을 cross-service 표준 `service_policy_documents` 로 전환한다. legacy `kpa_legal_documents`/`/operator/legal` 은 즉시 삭제하지 않고 전환 안전망으로 보존한다. DB schema migration 없음.

## 2. 변경 파일 목록 (KPA only — backend/shared module/타 서비스 무변경)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/lib/legalDocument.ts` | `loadPublishedPolicyDocument()` 신규 — service_policy_documents 우선 + legacy fallback |
| `services/web-kpa-society/src/pages/legal/LegalDocumentView.tsx` | 공개 뷰 소스를 unified loader 로 전환 |
| `services/web-kpa-society/src/pages/legal/PolicyPage.tsx` · `PrivacyPage.tsx` | 주석(소스 기준) 갱신 |
| `services/web-kpa-society/src/pages/admin/ServiceLegalSettingsPage.tsx` | `enabledTabs` 제거 → 전체 탭(법정정보+정책문서+공개상태) + 안내문구 갱신 |
| `services/web-kpa-society/src/pages/admin/components/AdminPublicReadinessCard.tsx` | 정책문서 게시 점검을 service_policy_documents 기준(+legacy 표기) 으로 전환, 안내/링크 갱신 |
| `services/web-kpa-society/src/config/operatorMenuGroups.ts` | 운영자 메뉴 `법률 관리`(/operator/legal) 제거 (route 보존) |
| `services/web-kpa-society/src/pages/operator/LegalManagementPage.tsx` | legacy deprecated 배너 + 표준 위치 링크 추가 |
| `docs/investigations/CHECK-...-MIGRATION-V1.md` | 본 문서 |

## 3. 기존 kpa_legal_documents 사용 위치 → 전환 후

| 위치 | 전 | 후 |
|---|---|---|
| 공개 `/policy`·`/privacy` | `kpa_legal_documents` (`/kpa/legal/documents/published/:type`) | **service_policy_documents** (`/public/services/kpa-society/policies/:type`) + legacy fallback |
| admin 편집 | `/operator/legal`(kpa_legal_documents) | **`/admin/settings/legal` 정책 문서 탭**(service_policy_documents) |
| 공개 상태 점검 | kpa_legal_documents published | service_policy_documents published(+legacy 표기) |
| 운영자 메뉴 | `법률 관리` 노출 | 메뉴 제거(route/page 보존, deprecated 배너) |

## 4. /policy · /privacy 소스 전환 내용

- `LegalDocumentView` → `loadPublishedPolicyDocument(documentType)` 사용.
- 로더 우선순위: ① `GET /api/v1/public/services/kpa-society/policies/:type`(service_policy_documents, published) → ② 없음/오류 시 `GET /kpa/legal/documents/published/:type`(legacy) fallback.
- 게시 문서 없음 → 중립 empty("현재 공개된 문서가 없습니다"), 가짜 약관 없음.

## 5. /admin/settings/legal 탭 확장 내용

- KPA wrapper 의 `enabledTabs={['profile']}` 제거 → 공유 컴포넌트 기본 전체 탭(법정정보 / 정책 문서 / 공개 상태 확인).
- 정책 문서 탭 = service_policy_documents CRUD/게시(`/admin/services/kpa-society/policies`). 게시 시 공개 `/policy`·`/privacy` 에 즉시 우선 반영.
- 안내문구: "법정정보와 정책문서는 KPA 공개 푸터 및 /policy·/privacy 에 반영됩니다. … 기존 운영자 ‘법률 관리’ 화면은 legacy."

## 6. AdminPublicReadinessCard 소스 전환 내용

- 이용약관/개인정보처리방침 점검을 `loadPublishedPolicyDocument` 기준으로 전환.
- source 별 표기: `service`→정상("게시됨(표준)") / `legacy`→주의("게시됨(legacy) — 표준 위치 재게시 권장") / empty→미설정 / error→확인 필요.
- 안내·링크를 `법정정보·약관 설정`(/admin/settings/legal)로 정렬, 운영자 법률 관리 링크 제거.

## 7. /operator/legal legacy 처리 내용

- `operatorMenuGroups.ts` SYSTEM 그룹에서 `법률 관리` 메뉴 **제거**.
- `OperatorRoutes.tsx` `/operator/legal` route + `LegalManagementPage` **보존**(hard delete 안 함, WO §5.4).
- `LegalManagementPage` 상단에 deprecated 배너 + "법정정보·약관 설정으로 이동" 링크 추가.

## 8. 데이터 이관 여부

- **DB migration / 자동 이관 없음**(WO §7 준수). 대신 **service-first + legacy fallback** 설계로 무중단 점진 전환:
  - service_policy_documents 미게시 상태에서도 공개 route 는 legacy(kpa_legal_documents) 문서를 fallback 표시 → **갑자기 빈 문서 노출 0**(WO §5.6 #3).
  - 운영자가 `/admin/settings/legal` 정책 문서 탭에서 약관/개인정보를 작성·게시하면 표준이 legacy 보다 우선 → 자연 이관.
- 프로덕션 SQL 조회는 수행하지 않음 — fallback 설계가 현재 데이터 상태와 무관하게 무회귀를 보장하므로 불필요. (운영자 재게시 후 readiness 카드가 '게시됨(표준)' 으로 전환됨을 통해 이관 완료 확인 가능.)

## 9. kpa_legal_documents 보존 여부

- table/entity/legacy API **미삭제**(WO §5.5). fallback 소스로 계속 동작. 제거는 후속 cleanup WO 판단.

## 10. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society | `tsc --noEmit` | PASS (EXIT 0) |
| web-kpa-society | `vite build` | PASS (✓ built) |

(backend·공유 모듈·타 서비스 미변경 → 재검증 불필요.)

## 11. browser smoke 결과 / 보류 사유

- **보류(정적 검증 대체)**: 배포 + kpa:admin 인증 필요.
- 배포 후 체크리스트:
  1. `/admin/settings/legal` 진입 → 법정정보 / 정책 문서 / 공개 상태 확인 3탭 노출
  2. 정책 문서 탭에서 terms 작성 → 게시 → 공개 `/policy` 가 해당 문서 표시(표준 우선)
  3. privacy 동일
  4. service_policy_documents 미게시 상태에서 legacy 문서가 있으면 `/policy`·`/privacy` 가 legacy fallback 표시(빈 화면 아님)
  5. 공개 상태 점검 카드: 표준 게시 시 "게시됨(표준)", legacy fallback 시 "게시됨(legacy) — 재게시 권장", 미게시 시 "미게시"
  6. 운영자 메뉴에 `법률 관리` 미노출 / `/operator/legal` 직접 진입 시 deprecated 배너 표시
  7. KPA footer(법정정보) 기존 동작 유지

## 12. 후속 legacy cleanup 필요 여부

- **필요**: `WO-O4O-KPA-LEGAL-DOCUMENT-LEGACY-CLEANUP-V1` — service_policy_documents 재게시 완료 확인 후 `/operator/legal` route/page 제거, kpa_legal_documents legacy API/loader fallback 제거, 문서 정리.
- 선행 조건: 운영자가 표준 위치에 terms/privacy 재게시 완료(readiness "게시됨(표준)").

## 13. commit hash

- (commit 후 기재)
