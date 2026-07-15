# CHECK-O4O-KPA-TABLET-QR-BACKFILL-AND-END-TO-END-SMOKE-V1

> WO: `WO-O4O-KPA-TABLET-QR-BACKFILL-AND-END-TO-END-SMOKE-V1`
> 성격: 마감 — 보호 운영 샘플 2건에 screen_set QR 백필(멱등) + 프로덕션 전체 흐름 검증.
> 선행: 계약(WO-A) / 뷰어(WO-B) / parity 보정 / 자동연결·URL 도출(WO-C)
> Date: 2026-07-15

---

## 0. 결론

기존 유효 Screen Set 2건(구강/피부)에 `screen_set` QR을 멱등 확보하고 **태블릿 콘텐츠 → 저장 → 태블릿 표시 → QR 스캔 → 모바일 세로 화면** 전체 흐름을 프로덕션에서 검증했다. 모두 **PASS**. 태블릿 콘텐츠 제작 ↔ QR 모바일 연동 트랙을 닫는다.

- 백필: 각 Screen Set 당 **screen_set QR 정확히 1건** 생성 + `public_qr_slug` 동기화. **멱등 재실행 시 신규 0**.
- 태블릿 qr_guide URL = 자기 모바일 landing(`/qr/{slug}`, 절대). QR landing 무인증·sections·UUID 미노출.
- 모바일 세로 parity: idle 영상+문구·코너 설명·콘텐츠 카드·상세 모달 정상, **제외는 qr_guide 하나뿐**.
- 운영 샘플 블록/템플릿/이름/slug 무변경. 코드 변경 없음(백필+검증만).

---

## 1. 실행 전 read-only 점검 (§1)
| set | 이름 | org | status | deleted_at | public_qr_slug(전) | 기존 screen_set QR | qr_guide 블록 | 태블릿 적용 |
|-----|------|-----|--------|-----------|-------------------|------------------|-------------|-----------|
| 7280872e… | 구강관리 기본 화면 세트 | 9c87f46b… | active | NULL | **NULL** | **0건** | 1 | c86863d8 |
| 8c6eb9fe… | 피부관리 기본 화면 세트 | 9c87f46b… | active | NULL | **NULL** | **0건** | 1 | f8b78a16 |
- **중복 QR 0** → 백필 안전. 두 set 동일 org. `tablet-corner%` slug 미사용 확인.

## 2. 백필 (§2, WO 승인된 한정 write)
- 실행 경로: 제한된 단일 목적 백필(§2 허용) — `ensureScreenSetQr` 와 **동일 규칙**(이름 slugify→한글 제거→`tablet-corner` fallback + 충돌 회피)을 SQL 로 재현. **NOT EXISTS 가드**(멱등) + WO-A partial unique(DB) 이중 안전. 트랜잭션.
- 결과: `INSERT 0 1`×2, `UPDATE 2`(public_qr_slug 동기화), COMMIT.

| set | QR slug | public_qr_slug(후) | is_active |
|-----|---------|-------------------|-----------|
| 구강 7280872e… | `tablet-corner` | `tablet-corner` | true |
| 피부 8c6eb9fe… | `tablet-corner-2` | `tablet-corner-2` | true |

- **블록/템플릿/이름/slug 무변경**(QR row + public_qr_slug 만).

## 3. 멱등성 (§3)
- 동일 백필 재실행: `INSERT 0 0`×2, `UPDATE 0` → **신규 QR 0, 변경 0**.
- set 별 `screen_set` QR count = **정확히 1건**(구강 1 / 피부 1).

## 4. 태블릿 runtime (§4) — PASS
`GET /:slug/tablet/screen`:
| set | mode | templateKey | content_list | idle_media | qr_guide.url |
|-----|------|-------------|:-----------:|:---------:|--------------|
| 구강 | screen_set | corner_information_basic_v1 | 5 | 有 | `https://kpa-society.co.kr/qr/tablet-corner` |
| 피부 | screen_set | corner_information_basic_v1 | 4 | 有 | `https://kpa-society.co.kr/qr/tablet-corner-2` |
- **qr_guide.url = public_qr_slug 절대 URL**(임의 URL 미사용). content_list/idle 불변. label 유지.

## 5. QR landing (§5) — PASS
`GET /qr/public/{slug}`(무인증):
| slug | success | landingType | screenSet.name | templateKey | sections | landingTargetId |
|------|:-------:|-------------|----------------|-------------|:-------:|-----------------|
| tablet-corner | true | screen_set | 구강관리 기본 화면 세트 | corner_information_basic_v1 | 5 | **null(UUID 미노출)** |
| tablet-corner-2 | true | screen_set | 피부관리 기본 화면 세트 | corner_information_basic_v1 | 5 | **null** |
- 존재하지 않는 slug → **404 QR_NOT_FOUND**(기존 오류 화면 유지).

## 6. 모바일 세로 parity (§6·§7) — PASS (실기 390px viewport)
`/qr/tablet-corner`, `/qr/tablet-corner-2`(무인증):
- **상단 idle 안내 미디어**(이미지 렌더) + 문구 **"이 코너의 안내 영상을 확인하세요 / Watch this corner introduction"**(§7, "화면을 터치하세요" 미사용).
- 코너 헤더(이름) + corner_description 본문.
- **코너 콘텐츠 카드**: 구강 5(O4O 표준 2 + 매장 제작 3) / 피부 4(매장 제작). 카드 탭 → **상세 모달**(ContentRenderer, SPD 설명서 전문 — 태블릿과 동일 콘텐츠).
- product_list = 등록 상품 0 → 섹션 미표시(빈 목록, 정상).
- **qr_guide 제외**(자기 QR 미표시) — 채널 제외 단 하나.
- 세로 스크롤, **가로 overflow 없음**(375=375), **console error 0**.
- 태블릿(가로·대기영상·터치 후 본문·QR 표시) ↔ 모바일(세로·대기영상 상단·본문 즉시 스크롤·자기 QR 미표시) — 차이는 배치/이용 방식뿐, 콘텐츠 동일.

## 7. 상태 차단 (§8) — 코드/비파괴
- **nonexistent slug → 404 QR_NOT_FOUND**(실검증).
- archived / deleted / QR is_active=false / org 불일치: 운영 샘플 상태 무변경 원칙(§8·§10) → **코드 근거로 대체**(§8 허용). 배포된 게이트: 공용 resolver `organization_id 일치 + deleted_at IS NULL + status <> 'archived'` → null → 404, landing WHERE `qr.is_active = true`(계약 WO). 운영 샘플 보관/삭제/비활성화/조직변경 미실행.

## 8. 회귀 (§9)
- 기존 landing type(product/video/page/promotion/link): screen_set 분기 additive → 미접촉(계약 WO). draft preview·태블릿 제작/수정/표준 리스트·corner mode: 코드 변경 없음.
- 태블릿 runtime sections 불변(구강 5/피부 4). **WO-D 코드 변경 0**.

## 9. 데이터 안전 (§10)
- 운영 샘플 블록/템플릿/이름 변경 없음. slug 변경 없음. QR hard delete 없음. 직접 중복 정리 없음. entitlement 없음.
- 대상 = **보호 샘플 2건만**. 전체 Screen Set 전수 백필 = 별도 운영 판단으로 남김(§10, lazy ensure(WO-C GET 상세)로 owner 접근 시 점진 확보 가능).

## 10. 변경/산출물
- **코드 변경 없음**(백필=DB write + 검증). 산출물 = 본 CHECK.
- 백필 write = WO 승인 한정(2 protected samples, 멱등, block/name/slug/template 불변). cloud-sql-proxy(read-only 자격 추출 → 승인된 한정 write). 임시 SQL 파일 삭제, 프록시 종료.

## 11. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 기존 Screen Set QR 연결 확보 | ✅ (2건) |
| 동일 Screen Set 중복 QR 없음 | ✅ (각 1건) |
| public_qr_slug 동기화 | ✅ |
| 태블릿 메인 QR = 자기 모바일 landing | ✅ (/qr/tablet-corner[-2]) |
| QR 모바일 동일 콘텐츠 | ✅ (parity, 상세 모달 동일) |
| 모바일 제외 = qr_guide 하나 | ✅ |
| 반복 실행 멱등 | ✅ (신규 0) |
| 상태 차단 | ✅ (nonexistent 404 + 코드 근거) |
| 기존 태블릿·QR 회귀 없음 | ✅ |
| commit/push | ✅ (본 CHECK) |

## 12. 트랙 종료 / 후속
- **태블릿 콘텐츠 제작 ↔ QR 모바일 연동 트랙 종료 가능**.
- 남은 것 = 별도 운영 트랙: **코너별 다중 콘텐츠 연결 + 빠른 교체 UI**. (+선택: 전수 백필 운영 판단 / qr_guide URL 입력 UI read-only 정리 / 모바일 상품 상세.)

---

*보호 샘플 2건 백필(구강 tablet-corner / 피부 tablet-corner-2, ensureScreenSetQr 동일 규칙·NOT EXISTS 가드) — 각 QR 1건·public_qr_slug 동기화·멱등 재실행 신규0. 태블릿 qr_guide URL=자기 /qr/{slug} 절대(임의 URL 중단). QR landing 무인증·sections5·UUID 미노출. 모바일 390px parity(idle 이미지+문구 "안내 영상을 확인하세요/Watch"·코너 설명·콘텐츠 카드·상세 모달 SPD 전문·qr_guide 제외·overflow0·console0). 상태 게이트=nonexistent 404 실검증+코드근거. 운영 샘플 블록/이름/slug/템플릿 무변경·코드 변경 0. 트랙 종료.*
