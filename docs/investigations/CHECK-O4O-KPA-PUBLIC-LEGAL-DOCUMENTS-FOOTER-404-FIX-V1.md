# CHECK-O4O-KPA-PUBLIC-LEGAL-DOCUMENTS-FOOTER-404-FIX-V1

WO: **WO-O4O-KPA-PUBLIC-LEGAL-DOCUMENTS-FOOTER-404-FIX-V1**
작업 제목: KPA 공개 법정문서(terms/privacy) 404 정리

상태: **INVESTIGATION CLOSED / NOT-A-BUG** (코드/DB/UI 변경 없음)
일자: 2026-06-23

## 1. 발견 배경
다국어 콘텐츠 WO 배포 후 UI smoke 중, KPA 화면에서 아래 요청이 404를 반환하는 콘솔 로그 4건 관측.
```
GET /api/v1/public/services/kpa-society/policies/terms      → 404
GET /api/v1/public/services/kpa-society/policies/privacy    → 404
GET /api/v1/kpa/legal/documents/published/terms            → 404
GET /api/v1/kpa/legal/documents/published/privacy          → 404
```
관측 위치: operator 대시보드 "공개 상태 점검" 위젯 (및 `/policy`·`/privacy` 페이지 진입 시).

## 2. 조사 결과 (문제확정)

### 2.1 Route — 정상 (버그 아님)
| 엔드포인트 | 핸들러 | 테이블 | 조건 |
|-----------|--------|--------|------|
| `/public/services/:serviceKey/policies/:type` (primary) | `modules/service-legal/public-service-legal.controller.ts:63` | `service_policy_documents` | service_key + document_type + status='published' |
| `/kpa/legal/documents/published/:type` (legacy fallback) | `routes/kpa/controllers/legal-documents.controller.ts:41` | `kpa_legal_documents` | document_type + status='published' |

두 라우트 모두 **등록·활성**. 매칭 row 없으면 `404 {code:'NOT_FOUND', message:'게시된 문서가 없습니다.'}` 반환 — **정상 동작**(route mismatch 아님).

### 2.2 Frontend — 이미 graceful (JS 에러 0)
- `services/web-kpa-society/src/lib/legalDocument.ts` `loadPublishedPolicyDocument()`:
  - primary 404 → **조용히** legacy fallback 시도 → legacy 404 → `{status:'empty'}` 반환. **console.error 없음.**
- `/policy`·`/privacy` (`pages/legal/LegalDocumentView.tsx`) → `empty` 시 "현재 공개된 문서가 없습니다." 정상 렌더.
- footer(`components/Footer.tsx`)는 `<Link to="/policy">`만 — **fetch 안 함**(404 출처 아님).

### 2.3 404의 실제 원인 — 미게시 placeholder 초안
- KPA terms/privacy 문서가 **published 상태가 아님** (published row 0).
- 시드 마이그레이션 `20260404000200-CreateKpaLegalDocuments.ts` 가 만든 초안은 **placeholder** — 본문에 literal `(이하 내용을 작성해 주세요)` 포함된 미완성본. 게시 대상이 아님.
- canonical `service_policy_documents` 에는 kpa-society terms/privacy published row 자체가 없음.
- operator 대시보드도 이를 "이용약관 미게시 / 개인정보처리방침 미게시" 로 **올바르게** 표시.

### 2.4 콘솔 "Failed to load resource 404"
브라우저가 모든 404 fetch 에 남기는 **고유 네트워크 로그**(개발자도구 표시)일 뿐, JS 런타임 에러가 아니다. 프론트 코드는 정상 처리한다.

## 3. 결론
**코드 버그가 아니다.** Route 정상 · Frontend graceful · 404 = "게시된 법정문서 없음"의 올바른 응답.
근본 해소는 **운영자가 실제 이용약관/개인정보처리방침 본문을 작성해 게시**하면 자동으로 이뤄진다(코드 변경 불요).

## 4. 결정 (사용자)
세 옵션 중 **"조사 CHECK만 닫기 (no-bug)"** 선택 (2026-06-23).
- 코드/DB/UI/migration 변경 없음.
- 후속 운영 조치(법정문서 게시)는 사업/법무 영역으로 분리.
- (대안이었던 백엔드 graceful-empty 404→200 은 공유 컨트롤러 cross-service 영향으로 보류.)

## 5. 권장 후속 (운영 — 별도)
1. 운영자가 `/admin/settings/legal`(법정정보·약관 설정 → 정책 문서 탭)에서 실제 KPA 이용약관·개인정보처리방침 본문 작성 후 게시.
2. 게시 시 primary `service_policy_documents`(kpa-society) published row 생성 → 404 해소 + `/policy`·`/privacy` 정상 콘텐츠 렌더.
3. (선택) 콘솔 404 소음을 게시 전에 제거하려면 → 별도 WO 로 공유 컨트롤러 graceful-empty 검토(neture/GP/KCos 회귀 포함).

## 6. 무변경 확인
다국어 콘텐츠/Store Hub/QR/태블릿/Neture guide/GP·KCos/payment·store-entitlement/DB schema **미접촉**. 본 CHECK 문서만 추가.
