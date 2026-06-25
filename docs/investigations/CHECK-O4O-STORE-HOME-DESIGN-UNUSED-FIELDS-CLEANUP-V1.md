# CHECK-O4O-STORE-HOME-DESIGN-UNUSED-FIELDS-CLEANUP-V1

> 작업: 공통 매장 홈 설정 고아 필드 `components`/`customizations` 제거
> 기준 IR: IR-O4O-KPA-STORE-HOME-DESIGN-UNUSED-SETTINGS-AUDIT-V1
> 커밋: `af374a721` / 일자: 2026-06-25

---

## 1. 사용처 재확인 (제거 전 게이트)

| 영역 | 결과 |
|---|---|
| 프론트 3서비스(KPA/GP/KCos) settings 참조 | **0** (각자 별도 타입 template/theme/blocks만) |
| 공개 storefront 렌더(StorefrontHomePage) | **0** (blocks/theme만 사용) |
| 백엔드 사용처 | store-settings.controller GET/PATCH 저장·응답 로직 + types **뿐** |
| `deepMerge` 사용처 | customizations 1곳뿐 → 같이 제거 |
| 운영 DB(prod 15 org) | components/customizations **0건(키 부재)** (IR §3) |
| 별개 도메인 `customizations` | ThemeService/Theme/signage extensions — **다른 필드, 미변경** |

→ store-settings 한정 안전 제거 확정.

## 2. 변경 (api-server)

- `store-settings.types.ts`: `StorefrontConfig` 와 `StoreSettingsData.settings` 에서
  `components`/`customizations` 제거(+관련 주석). `template/theme/blocks`만 유지.
- `store-settings.controller.ts`: GET `buildSettingsData` 응답에서 두 필드 제거,
  PATCH 의 components(shallow)/customizations(deep) 수용·병합 블록 제거,
  미사용 `deepMerge` 헬퍼 제거.
- **변경 없음**: template/theme/blocks 로직, `/store/settings` UI, DB migration(키 부재 → 불필요),
  ThemeService 등 별개 도메인.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (api-server + web-kpa) | ✅ PASS |
| 배포 (Deploy API Server, `af374a721`) | ✅ success |

### 브라우저 smoke (배포본, Sohae 약국 매장, 2026-06-25)
| 항목 | 결과 |
|---|---|
| GET `/stores/:slug/settings` 응답 settings 키 = `template, theme, blocks` (components/customizations 제거) | ✅ |
| `'components' in settings` / `'customizations' in settings` | ✅ 둘 다 false |
| PATCH(멱등 재저장) 정상(`success:true`), 응답 키 동일 3개 | ✅ (저장 회귀 없음) |
| 매장 홈 디자인 화면 정상 로드(레이아웃/테마/미리보기) | ✅ |

> smoke PATCH 는 현재 값 멱등 재저장(콘텐츠 변경 없음). template=BASIC/theme=professional/blocks 4개 유지.

## 4. 3서비스 영향
- 공통 백엔드(store-settings.controller/types) 변경이나, 응답에서 두 빈 필드만 제거 → 3서비스 프론트가
  애초에 참조하지 않아 무영향. GP/KCos 프론트 타입은 별도(template/theme/blocks 또는 Record<string,any>).
- KPA 타입체크 PASS. (GP/KCos 빌드는 CI 배포 시 검증 — 응답 축소는 런타임/타입 모두 안전.)

## 5. 비고
- DB migration 미수행: storefront_config 에 두 키가 존재하지 않음(운영 0건) → 정리할 데이터 없음.
- 후속(저우선): `qrPublicOrigin`/`storePublicOrigin` 공용 util 추출(코드 청소, 사용자 체감 0) — 보류.
