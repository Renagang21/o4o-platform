# CHECK-O4O-SITEGUIDE-RESIDUAL-AUDIT-V1

> **유형**: 잔존 흔적 전수 조사 (read-only) — 코드/DB/인프라 **무변경**. CHECK 문서만 생성.
> **목적**: SiteGuide legacy 제거(WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1 + 인프라 정리) 후
> O4O 저장소·인프라에 siteguide 잔존 참조가 남았는지 전수 조사하고 **삭제 필요 / 보존 / 별도 WO**로 분류.
> **결론(요약)**: **PARTIAL PASS** — 실행 코드·route·API·배포·인프라 리소스에 siteguide 잔재 **0**.
> 남은 것은 ① 문서 정리 후보 2건(deadlink/도메인 표기) ② 로컬 untracked cruft 1건 ③ PlatformInquiry legacy enum(별도 WO) ④ 보존 대상(마이그레이션·CHECK·archive).
> **작성일**: 2026-06-15

---

## 1. 검색 명령 (read-only)

```bash
git grep -n -i -e "siteguide" -e "site-guide" -e "site_guide" -- . ':(exclude)pnpm-lock.yaml'
find . -path ./node_modules -prune -o \( -iname "*siteguide*" \) -print
git ls-files packages/siteguide-widget          # 추적 여부
# 인프라
gcloud run services list --region=asia-northeast3 --project=netureyoutube
gcloud compute backend-services list --global --project=netureyoutube
gcloud compute network-endpoint-groups list --project=netureyoutube
gcloud compute url-maps describe o4o-global-lb --project=netureyoutube --format=json
curl -I https://siteguide.co.kr  https://www.glycopharm.co.kr  ...
```

## 2. 인프라 (실행 리소스) — 잔재 0 ✅

| 점검 | 결과 |
|------|------|
| Cloud Run `siteguide-*` | **0** |
| backend-services `*siteguide*` | **0** |
| serverless NEG `*siteguide*` | **0** |
| url-map `o4o-global-lb` siteguide 참조 | **0** |
| 도메인 응답 | siteguide.co.kr/www → [200] Neture fallback · www.glycopharm/kpa-society/glucoseview → [200] 각 정상 서비스 |

> 실행 배포/라우팅 경로에 SiteGuide **완전 부재**. (이전 CHECK 의 삭제가 실효됨)

## 3. 코드 (tracked) — 실행 잔재 0 ✅, 분류 대상만 잔존

`git grep -i siteguide`(마이그레이션 파일명 제외)로 tracked 코드에서 발견된 전부:

| 파일 | 라인 | 분류 |
|------|------|------|
| `apps/api-server/src/entities/PlatformInquiry.ts` | 5,21,70 | **별도 WO** (PlatformInquiry enum) |
| `apps/api-server/src/controllers/platformInquiryController.ts` | 23 | **별도 WO** |
| `apps/api-server/src/database/migrations/2026012100002-CreatePlatformInquiriesTable.ts` | 6 (주석) | **별도 WO** (PlatformInquiry 테이블) |
| `services/web-neture/src/pages/admin-vault/VaultInquiriesPage.tsx` | 5,16,40,119,134 | **별도 WO** |
| `packages/ai-core/README.md` | 90,92 | **정리 후보** (deadlink) |
| `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` | 358 | **정리 후보** (도메인 표기) |

> SiteGuide 전용 route/page/component/import/API/entity/DataSource/CORS/env 잔재 **0**.
> route·service·controller·entity 모듈은 1차 WO 에서 전부 제거됨(재확인).

## 4. 분류 결과

### 4-1. 삭제 필요 (실행 잔재) — **없음** ✅
- 실행 코드/route/API/배포/인프라 siteguide 잔재 0. → FAIL 조건 미해당.

### 4-2. 로컬 untracked cruft (선택 정리)
- `packages/siteguide-widget/` — **git 미추적**(tracked 0), `dist/` + `node_modules/` 만 존재(`package.json`·`src` 없음). gitignore 아님(단지 미커밋). 워크스페이스 멤버 아님(package.json 부재) → **repo/CI 영향 0**. 소비처 0.
  - 처리: 로컬에서 `rm -rf packages/siteguide-widget` 가능(저장소 무영향). 본 CHECK 는 read-only 라 미삭제.

### 4-3. 정리 후보 (문서 — 현재 서비스처럼 설명/deadlink)
- `packages/ai-core/README.md:90,92` — SiteGuide 를 **현재 독립 서비스로 설명** + `docs/services/siteguide/` 링크가 **존재하지 않는 deadlink**(디렉터리 부재 확인). → 행 제거 또는 "제거됨(별도 저장소 재개 예정)" 주석으로 정정.
- `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md:358` — `siteguide.co.kr (www)` 도메인을 현재 운영 도메인처럼 표기. 현재 미운영 → 정정/제거.
- 처리: 매우 작은 docs patch WO(`WO-O4O-SITEGUIDE-DOC-RESIDUAL-CLEANUP-V1`) 후보. 실행 영향 없음.

### 4-4. 별도 WO (운영 데이터 영향 — 지금 건드리지 않음)
- PlatformInquiry 4파일의 `InquiryType` `'siteguide'` enum/label. **플랫폼 공통 문의 시스템**이며 DB 에 `type='siteguide'` row 존재 가능 → enum 제거는 row 영향 검토 후 별도 migration 필요. 현 상태 유지.

### 4-5. 보존 (삭제 흔적/이력 — 유지)
- `apps/api-server/src/database/migrations/1737330000000-CreateSiteGuideTables.ts` (생성 이력)
- `apps/api-server/src/database/migrations/20261113000000-DropSiteGuideSchema.ts` (DROP 기록)
- `docs/checks/CHECK-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1.md`, `CHECK-O4O-GLYCOPHARM-DOMAIN-MAPPING-SITEGUIDE-REMOVAL-V1.md`, 본 문서
- `docs/archive/**` 8건 (historical audits/investigations/reports — 과거 시점 기록)
- 루트 `IR-O4O-MAIN-TS-BOOTSTRAP-SPLIT-POST-CHECK-V1.md`(L81), `IR-O4O-AUTH-MIDDLEWARE-SPLIT-POST-CHECK-V1.md`(L97) — 과거 post-check 기록(당시 "siteguide 미사용 import/오류 1건" 언급). 역사적 기록이라 보존. (단 루트 위치는 추후 docs 정리 시 이동 후보)
- `apps/api-server/dist/**` 의 `*SiteGuide*.js/.d.ts` — **빌드 산출물(untracked, 재빌드 시 갱신)**. 다음 빌드에서 자동 제거됨. 무시.

## 5. 최종 판정

```
판정: PARTIAL PASS

- 실행 코드/route/API/Cloud Run/backend/url-map/프론트 링크 siteguide 잔재: 0 (PASS 수준)
- 인프라 리소스 잔재: 0 (전수 read-only 확인)
- 문서 정리 후보: 2건 (ai-core README deadlink, IDENTITY-ARCHITECTURE 도메인 표기)
- 로컬 untracked cruft: 1건 (packages/siteguide-widget — repo/CI 무영향)
- 별도 WO: PlatformInquiry 'siteguide' enum (운영 데이터 영향, 유지)
- 보존: Create/Drop migration, CHECK 3건, docs/archive 8건, 루트 IR 2건
```

## 6. 권장 후속 (선택, 비긴급)
1. `WO-O4O-SITEGUIDE-DOC-RESIDUAL-CLEANUP-V1`(소규모) — ai-core README deadlink 행 + IDENTITY-ARCHITECTURE 도메인 표기 정정. 실행 영향 0.
2. 로컬 `packages/siteguide-widget/` 정리(개발 PC 한정, 저장소 무관).
3. PlatformInquiry `'siteguide'` enum 은 문의 시스템 정비 WO 합류 시 처리(운영 row 확인 동반).

---

*Date: 2026-06-15 · read-only 잔존 audit · 코드/DB/인프라 무변경 · 실행 잔재 0(PASS) · 문서 2건 + 로컬 cruft 1건 + PlatformInquiry enum(별도 WO) = PARTIAL PASS.*
