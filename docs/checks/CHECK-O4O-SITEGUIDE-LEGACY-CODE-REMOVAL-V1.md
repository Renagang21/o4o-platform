# CHECK-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1

> **결정:** SiteGuide 는 O4O 에서 완전히 제거한다. 향후 SiteGuide 가 필요하면
> **별도 저장소에서 신규 서비스로 처음부터 다시 개발**한다. O4O 저장소 안에는
> SiteGuide 의 코드·route·entity·배포 참조·DB 스키마를 남기지 않는다.

- **WO:** WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1
- **일자:** 2026-06-15
- **유형:** 서비스 경계 정리 (분리/이전이 아니라 삭제)

---

## 1. 배경

SiteGuide 는 O4O 핵심 서비스(KPA / GlycoPharm / K-Cosmetics / Neture)와 성격이
다른 별도 제품이다. O4O 저장소 안에 코드·DB 가 남아 있으면 "미완성 서비스" 잔재가
되어 배포·도메인·검증 기준만 복잡해진다. 따라서 이전/보존이 아니라 **삭제**한다.

## 2. 조사 결과 (IR 통합)

| 위치 | 성격 | 처리 |
|------|------|------|
| `services/web-siteguide/` | 독립 프론트 (CI 미연결 고아) | **삭제** |
| `services/api-siteguide/` | 독립 백엔드 마이크로서비스 (CI 미연결 고아) | **삭제** |
| `apps/api-server/src/routes/siteguide/` | core API 내 routes·service·entities | **삭제** |
| `register-routes.ts` | import + 엔티티 import + `/api/siteguide` 마운트 | **배선 제거** |
| `database/connection.ts` | 엔티티 import + DataSource 등록 | **배선 제거** |
| `bootstrap/setup-middlewares.ts` | CORS origin `siteguide.co.kr` | **제거** |
| `apps/api-server/.env.example` | `SITEGUIDE_ADMIN_KEY` 블록 | **제거** |
| `pnpm-lock.yaml` | 두 워크스페이스 importer 엔트리 | **재생성으로 제거** |
| 라이브 DB `siteguide` 스키마 (4 테이블) | 운영 DB | **신규 DROP 마이그레이션** |

### 보존 (SiteGuide 전용 아님 — 공통 자산)

- `apps/api-server/src/entities/PlatformInquiry.ts`
- `apps/api-server/src/controllers/platformInquiryController.ts`
- `services/web-neture/src/pages/admin-vault/VaultInquiriesPage.tsx`

→ 플랫폼 공통 문의 시스템이며, `InquiryType` 의 `'siteguide'` 는 enum 값 하나일 뿐이다.
SiteGuide 서비스 코드가 아니므로 유지한다.

### GlycoPharm 서빙 원인

`services/web-glycopharm` 내부에 siteguide 참조는 **0건**. www.glycopharm.co.kr 이
SiteGuide 를 서빙한 적이 있다면 그것은 **Cloud Run 도메인 매핑/DNS 설정** 문제이지
저장소 코드 문제가 아니다. (본 WO 의 코드 삭제 범위 밖 — 인프라에서 별도 확인 필요)

## 3. DB 처리

- 신규 마이그레이션: `20261113000000-DropSiteGuideSchema.ts`
- 운영 DB 직접 DROP 금지 — CI/CD 자동 마이그레이션으로 적용 (main 배포 시)
- 대상: `siteguide_execution_logs` / `siteguide_usage_summaries` / `siteguide_api_keys`
  / `siteguide_businesses` 테이블 + ENUM 4종 + `siteguide` 스키마
- 기존 `1737330000000-CreateSiteGuideTables.ts` 는 마이그레이션 이력으로 보존
  (forward-only: create → drop 순서로 적용되어 최종 상태는 테이블 없음)

## 4. 검증

- `pnpm --filter @o4o/api-server typecheck` — PASS 여부 본문 보고
- `apps/api-server` build — PASS 여부 본문 보고
- SiteGuide route(`/api/siteguide`, `/api/v1/siteguide`) 더 이상 노출되지 않음

## 5. 재개 방침

SiteGuide 를 다시 다룰 경우, O4O 저장소가 아닌 **별도 저장소**에서 수집 스크립트·
이벤트 API·대시보드·광고 모델까지 새로 설계하여 처음부터 개발한다. 본 문서가 그
삭제 결정과 범위의 단일 기록이다.
