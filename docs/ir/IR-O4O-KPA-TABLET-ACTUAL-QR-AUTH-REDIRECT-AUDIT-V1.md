# IR-O4O-KPA-TABLET-ACTUAL-QR-AUTH-REDIRECT-AUDIT-V1

> 성격: **조사 전용**(코드·DB write·UI 수정 없음). 코드 + 배포 실측(로그아웃/로그인) + DB read 근거.
> 대상: KPA 태블릿 보호 샘플 2종(피부관리·구강관리)의 **실제 QR 인코딩 값 + 인증/redirect**.
> Date: 2026-07-17

---

## 0. 판정

**태블릿 화면의 screen_set QR은 로그인을 요구하지 않는다 — 템플릿 종류와 무관하게 공개다.** 코드·데이터·라이브(로그아웃 + 로그인) 전 경로에서 확인. 현재 배포된 두 보호 샘플 QR로는 **로그인 화면이 재현되지 않는다.**

```
템플릿별 인증 차이        없음 (모두 동일 /qr/{slug})
대기영상형만 로그인       아님
상품 상세 QR만 로그인     아님
로그아웃 접속             공개 렌더 (redirect 0)
로그인 접속               공개 렌더 (redirect 0)
store_qr_codes 데이터     정상 (screen_set·is_active·landing_target 일치)
→ 현재 태블릿 QR로 로그인  재현 안 됨
```

가장 유력한 원인은 **태블릿 화면 QR이 아닌 다른 QR을 스캔했거나, 예전/캐시된 QR**이다(§4).

---

## 1~3. 실제 QR decode URL (세 위치 동일)

태블릿 렌더러는 제품 상세 QR·플로팅 "휴대전화로 보기"·대기영상형 QR chip이 **모두 같은 `qrGuide.url`** 을 쓴다(`TabletKioskPage.tsx` 659·836·869행). `idle_touch_video`만 QR의 **위치**가 다를 뿐 URL은 동일. 상품 상세 QR도 상품별 URL이 아니라 현재 코너 Screen Set의 동일 QR.

실측(`/tablet/screen` API, 현재 current 기준):
- 피부: `https://kpa-society.co.kr/qr/tablet-corner-11`
- 구강: `https://kpa-society.co.kr/qr/tablet-corner-5`

URL 생성: `buildScreenSetQrUrl(serviceKey, set.publicQrSlug)` → `https://{domain}/qr/{slug}`, domain = 서비스 카탈로그 `kpa-society.co.kr`(`store-screen-set-qr.service.ts:28-32`, `service-catalog.ts:46`). config 자유 입력 URL은 **무시**하고 `public_qr_slug`로 서버 도출(`store-public-screen-set-resolve.ts:212`).

## 4~6. 최초 요청 · redirect chain · 최종 도착 (로그아웃)

시크릿(신규 컨텍스트, 비로그인) 390px 실측:

| slug | final | redirect | login 튕김 | content |
|------|-------|:--------:|:---------:|:-------:|
| tablet-corner-11 (피부 current) | /qr/tablet-corner-11 | 없음 | ❌ | ✅ |
| tablet-corner-5 (구강 current) | /qr/tablet-corner-5 | 없음 | ❌ | ✅ |
| tablet-corner-9 (피부 과거) | /qr/tablet-corner-9 | 없음 | ❌ | ✅ |
| tablet-corner (구강 과거) | /qr/tablet-corner | 없음 | ❌ | ✅ |

chain = `/qr/{slug} → /qr/{slug}`(자기 자신, redirect 0). 최종 = `PublicScreenSetViewer` 공개 렌더(스크린샷 `qrauth-tablet-corner-11.png`: "피부관리 코너 소개형" + 코너 설명 + 콘텐츠 카드). `/login`·인증 요청 0.

## 7. store_qr_codes (4 slug 전부 정상)

| slug | landing_type | landing_target_id | is_active |
|------|:---:|------|:---:|
| tablet-corner | screen_set | 7280872e…(구강 기본) | true |
| tablet-corner-5 | screen_set | 6f10d68e…(구강 current) | true |
| tablet-corner-9 | screen_set | 42f308a7…(피부 상품집중) | true |
| tablet-corner-11 | screen_set | 3af20950…(피부 current) | true |

모두 `landing_type='screen_set'`, `is_active=true`. 예전 임의 URL·다른 landing_type 잔존 없음.

## 8~9. Screen Set ↔ QR 일치

| 코너 | current set id | template_key | public_qr_slug | QR landing_target 일치 |
|------|------|------|------|:---:|
| 피부 | 3af20950 (코너 소개형) | `corner_overview_qr` | tablet-corner-11 | ✅ (=3af20950) |
| 구강 | 6f10d68e (기본 코너 안내형) | `corner_information_basic_v1` | tablet-corner-5 | ✅ (=6f10d68e) |

`public_qr_slug` ↔ `store_qr_codes.slug` ↔ `landing_target_id = 현재 Screen Set id` 3자 정합. 어긋남 없음.

## 10. 로그인 세션에서도 동일

약국 경영자 로그인 상태에서 `/qr/tablet-corner-11` → final `/qr/tablet-corner-11`, redirect 0, content 렌더, `/login` 튕김 없음. 즉 **로그인·비로그인 양쪽 모두 공개.**

---

## 결론 & 가장 유력한 원인

현재 코드·데이터·라이브 어디에도 태블릿 screen_set QR이 로그인을 요구하는 지점이 없다. 따라서 사용자가 본 로그인 화면은 **현재 태블릿 QR의 정상 동작이 아니며, 다음 중 하나**로 추정된다(태블릿 화면 QR 자체 결함 아님):

1. **태블릿 QR이 아닌 다른 QR을 스캔.** 이 매장 org에는 `screen_set` 13개 외에 **`page` 14개 · `link` 4개** QR이 존재(POP·블로그·안내물 등 별도 자산). 이들 landing이 인증 페이지(`/content/{id}`·상품·마이페이지 등)면 스캔 시 로그인이 뜬다 — 그러나 태블릿 "휴대전화로 보기" QR은 아니다.
2. **예전/캐시된 QR.** QR 자동연결(public_qr_slug) 이전에는 `qr_guide`에 임의 URL 입력이 가능했다. 인쇄물이나 새로고침 안 한 태블릿 화면의 옛 QR을 스캔하면 예전 URL로 갈 수 있다. (현재 라이브 렌더는 항상 client-side로 최신 `/qr/{slug}`를 인코딩 — `qrcode.react`.)

**확인 방법(사용자)**: 스캔했을 때 주소창이 `https://kpa-society.co.kr/qr/tablet-corner-11`(피부) 또는 `/qr/tablet-corner-5`(구강)이면 정상(로그인 없음). 그 외 주소(`/login`, `/content/…`, 상품·마이페이지 등)면 **태블릿 QR이 아닌 다른/예전 QR**이다.

## 부수 발견(로그인과 무관, 참고)

보호 샘플의 **current 화면 세트가 드리프트**했다 — WO에 적힌 보호 세트(피부 8c6eb9fe / 구강 7280872e "기본")가 아니라 현재는 피부=3af20950(소개형)·구강=6f10d68e(안내형)이 current. 병렬 세션/검증 흔적으로 추정. QR 인증과 무관하나, 샘플 current를 WO 기준으로 되돌릴지는 별도 판단.

---

*태블릿 screen_set QR = 전 템플릿 공통 공개 `/qr/{slug}`. 로그아웃·로그인 모두 redirect·로그인 0, PublicScreenSetViewer 공개 렌더. store_qr_codes 4 slug 전부 screen_set·is_active·landing_target 정합. 로그인 재현 안 됨 → 태블릿 QR 아닌 다른/예전 QR 유력. 조사 전용, 무변경.*
