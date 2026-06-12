# CHECK-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1

> `WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1` 결과.
> KPA 공개 `/policy`(이용약관)·`/privacy`(개인정보처리방침)의 데이터 소스를 **localStorage/static fallback →
> 기존 `kpa_legal_documents` published API** 로 정렬(공개 표시 단절 해소). published-only, 미게시→중립 empty.
> `service_policy_documents` 미사용 · `/operator/legal`·backend·footer·타 서비스 무변경.
> **결과: CODE PASS** (tsc 0 + build 0). 배포 후 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
운영자(`/operator/legal`)가 `kpa_legal_documents` 에 입력·게시한 약관/개인정보 문서가 공개 화면에 반영되지 않던
**단절**(공개 페이지가 localStorage/static 사용)을 해소. 공개 route 가 기존 DB published 문서를 읽도록 정렬.

## 2. 선행 IR 반영
- `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` 의 "operator(DB) ↔ 공개(localStorage) 단절" Phase 2.
- 데이터 이관(`service_policy_documents`)은 후속 — 이번은 기존 `kpa_legal_documents` 그대로 공개 연결.

## 3. 기존 `/policy`·`/privacy` 상태
- `pages/legal/PolicyPage.tsx`(이용약관)·`PrivacyPage.tsx` — `localStorage`(`kpa_legal_policy`/`kpa_legal_privacy`) 읽기 +
  미존재 시 **static 하드코딩 약관/방침 본문** fallback. **kpa_legal_documents API 미호출** → 운영자 게시와 무관하게
  static 문구만 노출되던 상태(공개 단절).

## 4. localStorage/static fallback 제거 내용
- `PolicyPage`/`PrivacyPage` 를 thin wrapper 로 교체 → **localStorage 읽기·static fallback 본문 완전 제거**(공개 표시 경로).
- 공통 `LegalDocumentView`(신규)가 DB published 문서를 fetch 해 표시. loading/ok/empty/error 상태.
- localStorage key 자체는 다른 writer 없음(operator LegalManagementPage 는 이미 DB API 사용) — 공개 read 제거로 legacy 흔적 종결.

## 5. 사용한 데이터 소스
- 기존 **`kpa_legal_documents`** public read API: `GET /api/v1/kpa/legal/documents/published/:documentType`
  (`/policy`→`terms`, `/privacy`→`privacy`). loader `lib/legalDocument.ts`(plain fetch, 404→empty, 오류→error).
- **`service_policy_documents` 미사용**(후속 이관 WO 대상).

## 6. published-only 처리 방식
- backend API 가 `status='published'` 최신 1건만 반환(없으면 404) → **draft 미노출**. wrapper 는 ok 일 때만 본문 렌더.

## 7. empty state 정책
- 미게시(404)/문서 없음 → "현재 공개된 문서가 없습니다." 중립 문구. 오류 → "문서를 불러오지 못했습니다…".
- **가짜 약관/static 본문/준비중 미사용.** (현재 seed terms/privacy 는 draft 라, 운영자 게시 전까지 공개는 empty 표시 — 정상.)

## 8. /operator/legal 미수정 확인
- `pages/operator/LegalManagementPage.tsx` 및 route `/operator/legal` **0건 수정**. 기존 입력 경로 그대로 유지.

## 9. kpa_legal_documents backend 미수정 / 10. service_policy_documents 미사용 / 11. backend 미수정
- `apps/api-server/**` **0건**. 기존 public API 재사용만. service_policy_documents 미참조.

## 12. KPA footer 미수정 / 13. 타 서비스 미수정
- KPA `Footer.tsx` 무변경(선행 WO 에서 처리됨). web-neture/glycopharm/k-cosmetics 0건. shared-space-ui 0건.

## 14. 렌더 안전성
- 본문은 **line 기반 markdown 렌더**(기존 PolicyPage 렌더러 — `#/##/###/-/숫자.` → React element 생성).
  **`dangerouslySetInnerHTML` 미사용**, HTML 직접 주입 없음. 빈 줄 `<br>`. plain 텍스트 안전.

## 15. 검증 결과
- tsc web-kpa-society **0** ✅ / build **0** ✅
- 변경 파일: `lib/legalDocument.ts`(신규) · `pages/legal/LegalDocumentView.tsx`(신규) · `PolicyPage.tsx`/`PrivacyPage.tsx`(wrapper 전환).

## 16. 브라우저 smoke 결과 (프로덕션, 로그아웃)
| URL | 결과 |
|-----|------|
| kpa-society.co.kr/policy | 제목 "이용약관" + **"현재 공개된 문서가 없습니다."** — static 약관 본문(제1조 목적 등) 사라짐, localStorage 미사용. `GET /api/v1/kpa/legal/documents/published/terms` 404→empty 처리 ✅ |
| kpa-society.co.kr/privacy | 제목 "개인정보처리방침" + empty state — static 방침 본문 사라짐. `.../published/privacy` 404→empty ✅ |
- seed terms/privacy 가 draft 라 미게시 → 공개는 empty(가짜 약관 0). 운영자가 `/operator/legal` 에서 게시하면 동일 페이지에
  DB 본문이 자동 표시(단절 해소 확인). footer 링크(/policy·/privacy) 정상.

## 17. commit hash
- 구현 + CHECK: `7ca4fc3b0` (web deploy success)
- CHECK smoke 반영: (본 커밋)

---

## Admin/Operator 경계 (WO §12 기록)
- 기존 `/operator/legal`(정책문서 입력)은 유지. 법정정보·장기 약관 설정은 Admin 설정 영역(`/admin/settings/legal-terms`,
  service_legal_profiles/service_policy_documents)으로 **수렴이 원칙**. 이번은 이관이 아니라 공개 route 연결 정렬 —
  중복 입력 경로 신설 없음.

## 후속 작업
1. `WO-O4O-KPA-LEGAL-ADMIN-UI-CONSOLIDATION-V1` — `/operator/legal` ↔ 공통 Admin 법정정보·약관 설정 수렴.
2. `WO-O4O-KPA-LEGAL-DOCUMENTS-MIGRATION-TO-SERVICE-POLICY-V1` — 필요 시 kpa_legal_documents → service_policy_documents 이관.
3. `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`.

*Date: 2026-06-12 · Status: CODE PASS. KPA 공개 정책 route 단절 해소(DB published 연결, localStorage/static 제거). 표준 이관은 후속.*
