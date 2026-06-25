# CHECK-HOTFIX-O4O-STORE-POP-PUBLIC-DOMAIN-CANONICAL-FIX-V1

> 작업: POP 출력물 embed QR URL 서비스별 도메인 hotfix (o4o.kr 제거)
> 커밋: `64cfb0d28` / 일자: 2026-06-25
> 선행: HOTFIX-O4O-QR-PUBLIC-URL-SERVICE-DOMAIN-FIRST-V1 (`9cd443e9c`)

---

## 1. 원인

`apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts`
- (구) `const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr'` (전역, 서비스 무관).
- POP 생성 시 QR 을 함께 넣는 경우(`qrId` 지정) embed URL 을
  `https://${PUBLIC_DOMAIN}/qr/${qr.slug}` (line 328) 로 생성 → 운영 env 미설정 시 `o4o.kr` 오염.
- QR hotfix 와 동일 계열(출력물 내부 URL 오염). POP/PDF 는 출력해 오래 쓰므로 동일 위험.

## 2. 수정

- `storePublicOrigin(serviceKey)` 신설 — service-catalog(SSOT) 기반 서비스별 origin
  (`kpa→kpa-society.co.kr`, `glycopharm→glycopharm.co.kr`, `cosmetics→k-cosmetics.site`),
  카탈로그 누락 시 `kpa-society.co.kr` 폴백. `o4o.kr` 전역 fallback 제거.
  - store-qr-landing 의 `qrPublicOrigin` 과 동일 정책. 도메인 출처는 service-catalog 단일.
- `popItems[].qrUrl` 생성부(line 328)만 교체. POP UI/스키마/데이터/생성 로직 변경 없음.

## 3. 범위 확인 (잔여 o4o.kr / PUBLIC_DOMAIN)

`rg "o4o.kr|PUBLIC_DOMAIN"` (o4o-store routes + pop/qr 서비스):
- store-pop: 주석 1건만 남음(코드 사용 0).
- o4o-store 라우트 / pop-generator / qr-print / qr-flyer 서비스: 잔여 0.
- (별개) `modules/neture/neture.routes.ts` 는 `PUBLIC_DOMAIN` env 를 쓰나 기본값이 neture 도메인
  (o4o.kr 아님) — 동일 장애 아님, 본 hotfix 범위 외.

## 4. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (api-server) | ✅ PASS (에러 0) |
| 배포 (Deploy API Server, `64cfb0d28`) | ✅ success |
| store-pop 출력물 경로의 `o4o.kr`/`PUBLIC_DOMAIN` 코드 사용 | ✅ 제거(주석만) |
| POP embed QR URL = `https://kpa-society.co.kr/qr/:slug` | ✅ 코드 확정 |

> **검증 방식 주석**: POP embed QR URL 은 `storePublicOrigin('kpa')` = `https://${getService('kpa-society').domain}`
> = `https://kpa-society.co.kr` 로 결정적이며, 이는 직전 QR hotfix 에서 **PNG 디코딩으로 실측 확인된**
> 동일 헬퍼 로직·동일 service-catalog 출처다. POP PDF 내부에 래스터화된 QR 을 다시 디코딩하는 것은
> 비현실적이라, 동일 메커니즘의 코드 확정성으로 마감. POP UI/생성 자체는 미변경(회귀 없음).

## 5. 기존 데이터
- POP/PDF 는 출력 시점 생성(저장 PDF 에 URL 박힘). 이미 출력/저장된 o4o.kr POP 은 **재생성/재다운로드** 필요.
- DB 보정 불필요(POP 레코드는 slug/참조만, URL 은 생성 시점 조립).

## 6. 후속
- `/store/settings` 전면 감사: IR-O4O-STORE-SETTINGS-FULL-AUDIT-V1 (별도, 다음 우선순위).
- (정리) `qrPublicOrigin`/`storePublicOrigin` 동일 로직 2곳 → 공용 util 추출 검토(저우선).
