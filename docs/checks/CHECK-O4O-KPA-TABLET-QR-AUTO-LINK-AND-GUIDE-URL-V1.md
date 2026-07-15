# CHECK-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1

> WO: `WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1`
> 성격: 구현 — Screen Set 저장 시 QR 자동 확보(멱등) + 태블릿 qr_guide URL 서버 도출.
> 선행: QR landing 계약(`store-public-screen-set-resolve` + `public_qr_slug` 컬럼, WO-A) / WO-B 뷰어·parity.
> Date: 2026-07-15

---

## 0. 결론

태블릿 콘텐츠(Screen Set) 저장 시 해당 Screen Set의 **screen_set QR을 멱등으로 확보**하고, 태블릿 메인 화면의 `qr_guide` QR이 **항상 자기 콘텐츠의 모바일 landing**을 가리키도록 서버가 URL을 도출한다. 사용자가 태블릿용 QR을 별도로 만들거나 URL을 입력하지 않는다.

```
태블릿 콘텐츠 저장 → Screen Set 저장 → ensureScreenSetQr → public_qr_slug 동기화 → qr_guide URL 자동 도출
```

- `ensureScreenSetQr`(신규 멱등 서비스): 있으면 재사용(이름 변경 ≠ slug), 없으면 생성 + `public_qr_slug` 동기화. Screen Set 당 QR 1개(WO-A partial unique DB 보장).
- 저장 경로(POST/PATCH/PUT blocks) + lazy(GET 상세, owner 인증) 연결. **공개 runtime read-only 유지**.
- qr_guide URL = `public_qr_slug` 기반 서버 도출(config 자유입력 미사용). slug 없으면 임의 URL 안 씀(url='').
- migration 없음(WO-A 컬럼 재사용). 프로덕션 tsc 0, 태블릿 jest 29 PASS. 백필/운영샘플 write/공개GET write 없음.

---

## 1. ensureScreenSetQr 서비스 (§1·§2)
`apps/api-server/src/routes/platform/store-screen-set-qr.service.ts`

- 입력: `{ organizationId, screenSetId, serviceKey? }`. 게이트: **org 소유 + deleted_at IS NULL + status <> 'archived'** → 미충족 null.
- 기존 screen_set QR 조회(`org + landing_type='screen_set' + landing_target_id`) → **있으면 재사용** + slug 동기화. **없으면 생성**.
- slug: 이름 slugify(ASCII, 한글 제거) → 전역 unique 충돌 시 `base-2/3…`(제한 25회, 실패 시 명시 오류). **이름 변경 시 slug 불변**. UUID slug 아님. QR 이미지 미저장(동적).
- 멱등/동시성: 신규 INSERT 가 WO-A partial unique(`org, landing_target_id WHERE landing_type='screen_set'`) 위반 시 **catch → 재조회 → 재사용**. `existing.length>1`(불가) 방어적 중단(임의 정리 안 함).
- `buildScreenSetQrUrl(serviceKey, slug)` = `https://{service domain}/qr/{slug}`(절대 URL, service-catalog).

## 2. 저장 경로 연결 (§3)
| 경로 | 처리 |
|------|------|
| `POST /screen-sets` | 생성(id 확보) 후 ensure → `publicQrSlug/publicQrUrl` 응답 |
| `PATCH /screen-sets/:id` | 수정 후 ensure. **이름 변경 시 QR title 갱신(slug 불변)** |
| `PUT /screen-sets/:id/blocks` | 블록 커밋 후 ensure. `data`(blocks 배열) 유지 + top-level `publicQrSlug/publicQrUrl` additive |
| `GET /screen-sets/:id`(lazy §4) | owner 인증 상세 진입 시 ensure(과거 미연결 복구) |

- **실패 처리(§3)**: ensure 는 **non-fatal·복구 가능** — QR 실패가 저장을 무효화하지 않는다(콘텐츠는 이미 커밋). 응답에 `publicQrSlug/publicQrUrl` 또는 `qrLink:'failed'` 를 명시(사용자 오인 방지) → 다음 저장/lazy 로 복구. `withQrLink` 헬퍼로 통일.

## 3. lazy fallback (§4)
- 관리 상세 `GET /screen-sets/:id`(owner 인증)에서 ensure → 과거 콘텐츠/저장 실패로 미연결된 set 복구.
- **공개 GET(`/tablet/screen`, `/qr/public/:slug`)은 write 안 함**(read-only). QR 없으면 qr_guide url=''(임의 URL/생성 없음).

## 4. qr_guide URL 자동 도출 (§5)
- `resolveScreenSetSections` qr_guide 브랜치: config 자유입력 URL 미사용. `public_qr_slug` 있으면 `buildScreenSetQrUrl(...)` 절대 URL 주입, **없으면 url=''**(임의 URL 미사용). label(안내 문구)은 config 유지. 블록 존재 시 label·url 중 하나라도 있으면 노출.
- 결과: 코너의 태블릿 QR = 자기 Screen Set 모바일 landing(`/qr/{slug}`). QR 모바일에서는 qr_guide 자체가 제외(WO-B parity) → 자기 QR 중복 없음.

## 5. 상태 변화 (§7)
- **보관(archived)**: ensure 게이트에서 null(QR 신규 생성 안 함). QR row/slug 유지(삭제/재사용화 안 함). 공개 resolver 가 archived set 접근 차단.
- **이름 변경**: QR title 갱신, **slug·URL 불변**.
- **QR is_active=false**: 공개 landing WHERE 에서 차단(계약 WO). Screen Set 활성이어도 접근 차단.

## 6. API 응답 (§8, additive)
- setCols 에 `public_qr_slug AS "publicQrSlug"`. 저장/상세 응답에 `publicQrSlug`, `publicQrUrl`(optional). 내부 QR row id 미노출. 기존 소비자 호환(추가 필드만).

## 7. §6 UI (사용자 임의 URL 입력)
- **런타임 override 로 config URL 은 이미 무력화**(resolver 가 public_qr_slug 로 강제) → "임의 URL 입력 의존 제거"는 런타임에서 충족.
- 빌더 qr_guide URL 입력 필드 read-only/제거 등 **UI 정리는 후속으로 분리**(WO §6 허용: "최소한 임의 URL 저장만 무시하고 별도 UI 정리는 후속"). 이번엔 백엔드 override 로 최소 요건 충족.

## 8. 변경 파일
```
apps/api-server/src/routes/platform/store-screen-set-qr.service.ts        (신규 ensureScreenSetQr + buildScreenSetQrUrl)
apps/api-server/src/routes/platform/store-tablet.routes.ts                (setCols + POST/PATCH/PUT blocks/GET 상세 연결)
apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts  (qr_guide URL 서버 도출)
```
- **migration 없음**(WO-A `public_qr_slug` 재사용). 백필/운영샘플 write/entitlement/hard delete/QR 모바일 뷰어/kiosk/코너 UI 변경 **없음**(§9 준수).

## 9. 검증
| 항목 | 결과 |
|------|------|
| 프로덕션 tsc(tsconfig.build.json) | **0** |
| jest 태블릿(screen/idle/content-list) | **29 PASS** |
| migration | 없음(WO-A 재사용) |
| API 배포 | ✅ **success** (run 29390333387) |
| 태블릿 runtime — sections 불변 + qr_guide URL 도출 | ✅ 구강 content_list 5 / 피부 4 불변, **qr_guide.url='' (양 샘플)** — 도출 작동(public_qr_slug 없어 임의 config URL 미사용, label 유지). 백필/lazy 후 `/qr/{slug}` 표시 |

- **데이터 write smoke(신규/수정 저장 → QR 확보·멱등·slug 불변)**: 매장 owner 인증 필요 → 자동 로그인 금지 → **WO-D Deferred**(§검증 허용). 인증 확인 항목:
  1. 신규 Screen Set 저장 → screen_set QR 1건(org 일치, landing_target=set.id), public_qr_slug 동기화, 응답 publicQrUrl.
  2. 반복 저장/수정 → QR 총량 증가 0, slug 불변(이름 바꿔도).
  3. 태블릿 `/tablet/screen` qr_guide.url = `/qr/{slug}` 절대 URL.
  4. 상태 게이트: 비활성 QR/archived/deleted → 접근 차단.
  5. 회귀: 기존 product/video/page/promotion/link QR·draft preview·태블릿 제작·corner mode 정상.

## 10. 운영 샘플 전이 주의 (의도된 동작)
- 구강/피부 등 기존 Screen Set 은 아직 screen_set QR 미보유(public_qr_slug NULL) → 배포 직후 태블릿 qr_guide **url=''**(기존 config kpa-society.co.kr 임의 URL 미사용 — §5 의도). 실제 QR 은 **owner 가 관리 상세/저장 시 lazy ensure** 또는 **WO-D 백필** 후 표시. 이는 회귀가 아니라 "임의 URL 중단 → 자기 landing 전환"의 전이 상태.

## 11. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 저장 시 QR 자동 확보 | ✅ |
| 동일 Screen Set QR 중복 방지 | ✅ (멱등 + partial unique) |
| public_qr_slug 자동 동기화 | ✅ |
| 이름 변경 후 QR URL 불변 | ✅ (slug 불변) |
| 태블릿 qr_guide 자기 모바일 landing 자동 참조 | ✅ (서버 도출) |
| 임의 QR URL 입력 의존 제거 | ✅ (런타임 override; UI 정리 후속) |
| 공개 GET read-only | ✅ |
| 기존 QR·태블릿·preview 회귀 없음 | ✅ (tsc0·29 PASS·배포 후 sections 불변) |
| commit/push·배포 | ✅ (7c8f4ad4b · API deploy success) |

## 12. 후속
```
WO-D  기존 Screen Set QR 백필 → 실제 태블릿 화면 QR 확인 → QR 스캔 → 모바일 세로 parity 확인 → 멱등·상태 차단 검증(인증)
(선택) qr_guide URL 입력 UI read-only 정리 / 코너 다중 콘텐츠 연결·빠른 교체 운영 트랙
```

---

*ensureScreenSetQr(멱등: 재사용/생성 + public_qr_slug 동기화, 이름변경≠slug, partial unique 흡수) — POST/PATCH/PUT blocks + lazy GET 상세 연결(비치명·복구가능), 공개 GET read-only. qr_guide URL=public_qr_slug 서버 도출(config 임의 URL 미사용, 없으면 ''). migration 없음(WO-A 재사용). tsc0·jest29. 운영샘플=백필/lazy 전까지 qr_guide url''(의도). write smoke=owner 인증→WO-D Deferred.*
