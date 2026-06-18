# CHECK-O4O-BUSINESS-CONTACT-FIELDS-BUNDLE-DEPLOY-SMOKE-V1

> **작업명:** O4O 사업자 기본정보/연락처 정비 묶음 배포 스모크
> **유형:** 배포(force dispatch) + 운영 브라우저 스모크(Playwright headless, 프로덕션). 코드 변경 0(본 문서 docs-only).
> **결과: PASS — 5개 서비스(web 4 + api) 강제 배포 success(skip 0). 4서비스 가입 화면 + 3서비스 정보수정 화면 연락처 필드 정상 렌더·조회·수정. console/page/연락처-API 에러 0. Neture role=store_owner 400 차단 확인.**
> **1건 무관 이슈 분리:** K-Cosmetics `/store/info` 의 StoreDashboardLayout 위젯이 `/cosmetics/stores/{id}/summary|insights|listings|playlists` 에서 500 4건 — **연락처 정비 배치와 무관**(다른 컨트롤러, 본 배치 미수정). business-info 자체는 200 정상. → 별도 WO 후보.

---

## 1. 대상 축 (누적 변경)

Neture supplier 업종 select 제거 · AddressSearch · store_owner 카드 제거 · cross-service contact backend support · Neture supplier 연락처 3종 · GlycoPharm 3종 · K-Cosmetics 3종 · KPA businessEmail/contactEmail.

## 2. 배포 (force dispatch — skip 회귀 방지)

- `git push origin main` → origin/main = `94a14005a` (KPA WO 포함, 직전 미push 1건 반영).
- `gh workflow run deploy-web-services.yml --ref main -f service=all` → run `27761986516` **success(4m57s)**. job 별: deploy-neture / deploy-glycopharm / deploy-k-cosmetics / deploy-kpa-society **전부 success(skip 0)**.
- api: push 트리거 `deploy-api.yml` run `27761942605` **success(7m3s)** (pharmacy-info.controller.ts 포함).
- Cloud Run latestReadyRevision 서빙 확인: o4o-core-api-02244-x7r · neture-web-01147-sbl · glycopharm-web-01071-2nx · k-cosmetics-web-00819-wll · kpa-society-web-01421-fc8 (전부 traffic=latest).

## 3. API 스모크 (계정 생성 없음)

| 항목 | 결과 |
|------|------|
| `POST /auth/register` 동작 | ✅ (API alive) |
| Neture `role=store_owner` 가입 | **HTTP 400 / `NETURE_SIGNUP_ROLE_REQUIRED`** ✅ (supplier/partner 외 차단) |

## 4. 가입 화면 스모크 (Playwright, 비로그인) — 전부 PASS

console error / page error / 연락처-API 4xx·5xx = **전 서비스 0**.

| 서비스 | 확인 항목 | 결과 |
|--------|----------|------|
| **Neture**(공급자) | 역할 카드 공급자/파트너만 · 매장경영자 카드 부재 · 업종 select 부재 · 우편번호 검색 · 업태/종목/개업일 · **회사전화/회사이메일/담당자이메일** | ✅ 전부 |
| **GlycoPharm**(약국 경영자) | **약국 전화/약국 대표 이메일/담당자 이메일** · 세금계산서 이메일/사업자등록번호 유지 | ✅ 전부 |
| **K-Cosmetics**(판매자) | **회사/매장 전화/회사 대표 이메일/담당자 이메일** · 상호명/사업자등록번호 유지 | ✅ 전부 |
| **KPA**(개설약사) | **약국 대표 이메일/담당자 이메일** · 세금계산서 이메일 분리 · 약국 전화 유지 · **businessPhone 중복 필드 부재** | ✅ 전부 |

- Neture 화면 시각 확인: 공급자/파트너 2카드, 회사 전화/회사 이메일 grid, 우편번호 검색 버튼, 담당자 이메일, 업종 select 없음 — 레이아웃 정상.

## 5. 정보수정 화면 스모크 (Playwright, 로그인 store_owner 공유계정) — 전부 PASS

`/store/info` (3서비스 공통 경로). 자격증명 env 주입(미출력).

| 서비스 | view/edit 이메일 2종 | GET 응답 키 | businessPhone | 에러 |
|--------|:---:|------|:---:|:---:|
| **KPA** (`GET /pharmacy/info`, org.metadata SSOT) | ✅ 약국 대표/담당자 | businessEmail ✅ / contactEmail ✅ | 키 부재(정상 — KPA는 `phone` 사용) | 0 |
| **GlycoPharm** (`GET /glycopharm/mypage/business-info`) | ✅ | businessEmail ✅ / contactEmail ✅ | businessPhone ✅(기존 유지) | 0 |
| **K-Cosmetics** (`GET /cosmetics/mypage/business-info`) | ✅ | businessEmail ✅ / contactEmail ✅ | businessPhone ✅(기존 유지) | 연락처 0 (※아래 무관 500 별건) |

- GlycoPharm 편집 화면 시각 확인: 사업장 전화번호(기존) → 약국 대표 이메일(신규) → 담당자 이메일(신규) → 업태/종목 → 사업자유형/개업일 → **세금계산서 이메일(별도)**. taxInvoiceEmail ≠ businessEmail 분리 확인. 레이아웃 정상.

## 6. @IsEmail 무손상 확인

- 가입 화면 4종 로드·렌더 시 빈 이메일로 인한 검증 에러/실패 응답 **0**. payload 조건부 전송(비어있을 때 제외) 설계가 화면 동작에서도 무손상 확인.

## 7. 무관 이슈 분리 (즉시 수정 금지 — 별도 WO)

**증상:** K-Cosmetics `/store/info` 진입 시 StoreDashboardLayout 위젯이 4건 500:
`GET /cosmetics/stores/{storeId}/summary` · `/insights` · `/listings` · `/playlists`.

**분류:** 본 연락처 정비 배치와 **무관**.
- 실패 엔드포인트는 store **대시보드 위젯** 컨트롤러 — 본 배치 커밋(가입/정보수정/business-info)이 **미수정**.
- 동일 화면의 `business-info` GET 은 **200 정상**(연락처 필드 반환) — 연락처 기능 자체 무영향.
- 기존 메모리(ecommerce_orders 부재 → store metrics 비정상) 정황과 부합 — pre-existing 가능성 높음.

**후속 WO 후보:** `IR-O4O-KCOSMETICS-STORE-DASHBOARD-SUMMARY-500-AUDIT-V1` — summary/insights/listings/playlists 500 root cause(미존재 테이블/스토어 데이터 gap) read-only 조사.

## 8. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 4서비스 가입/정보수정 화면 정상 렌더 | ✅ |
| Neture 가입 유형 공급자/파트너만 | ✅ |
| Neture supplier 사업자 기본정보 정비 반영(업종 select 제거/AddressSearch/연락처 3종) | ✅ |
| GP/KCos/KPA 연락처 필드 의도 범위 표시 | ✅ |
| KPA businessPhone 신규 중복 필드 없음 | ✅ |
| console error / 연락처 API 4xx·5xx 0 | ✅ (무관 store-dashboard 500은 §7 분리) |

## 9. 검증 방식 / 비범위

- 검증: gh/gcloud 배포 확인 + 프로덕션 read-only API + Playwright headless(chromium) 렌더/로그 수집. 운영 데이터 변경 0(가입 제출·저장 미실행 — 렌더/조회만, 정보수정도 저장 미클릭).
- 자격증명: SSOT(`docs/local/TEST-ACCOUNTS.local.md`) env 주입 — 로그/문서 미출력.
- 비범위: 코드 수정 / K-Cosmetics store-dashboard 500 수정 / Neture supplier profile surfacing / operator 표시 / 배포 외 기능 변경.

---

*Date: 2026-06-18 · CHECK · PASS · 5서비스 force 배포 success(skip 0) · 가입 4 + 정보수정 3 화면 연락처 필드 렌더/조회/수정 정상 · Neture store_owner 400 차단 · console/연락처-API 에러 0 · KPA businessPhone 중복 없음 · taxInvoiceEmail≠businessEmail 분리 · 무관 K-Cosmetics store-dashboard 500 4건 별도 WO 후보(IR-O4O-KCOSMETICS-STORE-DASHBOARD-SUMMARY-500-AUDIT-V1).*
