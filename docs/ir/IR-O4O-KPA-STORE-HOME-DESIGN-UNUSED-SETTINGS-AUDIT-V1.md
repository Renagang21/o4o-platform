# IR-O4O-KPA-STORE-HOME-DESIGN-UNUSED-SETTINGS-AUDIT-V1

> 조사 대상: KPA 매장 홈 디자인(`/store/settings`)의 미반영 설정 `template`/`components`/`customizations` 청소 가능성
> 유형: **READ-ONLY 조사 (코드/DB/운영데이터 변경 없음)** / 조사일: 2026-06-25 / 범위: KPA 우선 (공통 백엔드 영향 포함)
> 선행: IR-O4O-STORE-SETTINGS-FULL-AUDIT-V1, WO-O4O-KPA-STORE-SETTINGS-NAME-ALIGNMENT-V1(완료)

---

## 0. 한 줄 결론

**KPA UI에서는 청소할 게 이미 없다(template/theme/blocks만 노출, components/customizations는 미노출·미전송).** `template`=**LEGACY_KEEP**(UI에서 블록 재생성 seed + 폴백으로 실제 쓰임), `components`/`customizations`=**LEGACY_KEEP / REMOVE_LATER 후보**(공통 백엔드 store-settings.controller·types·StorefrontHomePage가 GP/KCos 공통이라 KPA 단독 제거 불가). **운영 데이터 확인 결과 components/customizations 값은 전 org(15개) 0건**이라 데이터 손실 위험은 낮으나, 제거는 **크로스서비스 백엔드 작업**이라 이득 대비 비용이 작다 → **권장: 현행 유지 + deprecation 문서화. 즉시 제거 불필요.**

---

## 1. 필드별 매핑표

| 필드 | KPA UI 노출 | 저장 payload(KPA) | preview 반영 | 공개 storefront 반영 | backend 수용(공통) | 공개 API 응답 | 운영데이터 | 판정 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| theme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 사용 | **ACTIVE** |
| blocks | ✅ | ✅ | ✅ | ✅ | ✅(강화 검증) | ✅ | 사용 | **ACTIVE** |
| template | ✅ | ✅ | ✅(선택 시 블록 재생성) | ❌(렌더는 blocks 사용) | ✅(검증·저장, 폴백 seed) | ✅ | template_profile=전부 BASIC | **LEGACY_KEEP** |
| components | ❌ | ❌(미전송) | ❌ | ❌(읽는 곳 0) | ✅(저장만, shallow merge) | ✅(기본 {}) | **0건(키 부재)** | **LEGACY_KEEP / REMOVE_LATER** |
| customizations | ❌ | ❌(미전송) | ❌ | ❌(읽는 곳 0) | ✅(저장만, deep merge) | ✅(기본 {}) | **0건(키 부재)** | **LEGACY_KEEP / REMOVE_LATER** |

---

## 2. 코드 사용처 (확인됨)

- **프론트(KPA) `PharmacyStorePage.tsx`**: form state·UI·PATCH payload에 **template/theme/blocks만** 존재. components/customizations **없음**. 파일 주석(line 10-13)에 "dead 컴포넌트 토글 — storefront_config.components와 연결 없음" 명시(과거 토글 제거됨).
- **공개 storefront `pages/store/StorefrontHomePage.tsx` (공통)**: `/layout` 응답에서 **blocks·theme만** 추출(line 155-160), `blocks.map(renderBlock)`(line 247). components/customizations **읽지 않음**(grep 0).
- **백엔드(공통) `routes/o4o-store/controllers/store-settings.controller.ts`**:
  - GET `buildSettingsData`: `components: cfg.components ?? {}`, `customizations: cfg.customizations ?? {}` → **응답에 빈 객체로 포함**.
  - PATCH: components(shallow)/customizations(deep) merge 저장. **검증 없음.** KPA 프론트는 이 필드를 보내지 않음.
  - template: `normalizeTemplate(cfg.template ?? org.template_profile)` + blocks 폴백 생성에 사용 → **폴백/생성 seed 역할.**
- **타입 `store-settings.types.ts`**: `StorefrontConfig.components?: Record<string,boolean>`, `customizations?: Record<string,any>`("Service-specific extensions") 정의. 실제 read 사용처 **store-settings.controller 저장 로직뿐.**
- **GP/KCos**: 각자 별도 설정 페이지(PharmacySettings/StoreSettingsPage)도 components/customizations 미노출, **공통 API 사용**.

→ **확인:** components/customizations 는 KPA·GP·KCos 어디에서도 읽지 않으며, 공통 컨트롤러의 저장/응답 로직에만 흔적이 남은 **고아 필드**. template 은 UI에서 블록 재생성에 쓰여 살아있다.

## 3. 운영 데이터 확인 (read-only, cloud-sql-proxy)

`organizations` 테이블(전 15개 org) read-only SELECT 결과:

| 항목 | 값 |
|---|---|
| 총 org | 15 |
| storefront_config 보유 | 15 |
| **components 비어있지 않은 org** | **0** |
| **customizations 비어있지 않은 org** | **0** |
| storefront_config 의 실제 key 집합 | **blocks / template / theme** (components·customizations 키 자체 부재) |
| storefront_config.template 키 보유 | 1 |
| template_profile 분포 | **전부 'BASIC'** (15/15) |

→ **components/customizations 는 운영 데이터에 전혀 존재하지 않는다**(키 자체 없음). template_profile 은 전 org 기본값 BASIC(실제 커스터마이즈 흔적 없음).

## 4. 위험도

| 조치 | 위험 | 비고 |
|---|---|---|
| KPA UI 숨김 | — | **이미 숨김**(노출 자체가 없음) — 할 일 없음 |
| KPA 저장 payload 제거 | — | **이미 미전송** — 할 일 없음 |
| 공통 GET 응답에서 components/customizations 제거 | 중간 | **공통(GP/KCos 공유)** — 소비처 0 확인됐으나 3서비스 응답 계약 변경. 데이터 0이라 데이터 위험은 낮음 |
| 공통 PATCH 에서 두 필드 수용 중단 | 낮음~중간 | 보내는 곳 0 → 기능 영향 없음. 공통 변경이라 회귀 확인 필요 |
| DB(storefront_config) key 제거 | 낮음 | 키 자체 부재(0건) → 정리할 데이터 없음. 타입/마이그레이션은 별도 |
| template_profile 컬럼 정리 | 중간 | 전 org BASIC. storefront_config.template 로 일원화 시 폴백 로직(공통) 변경 동반 — 별도 대형 판단 |

## 5. 후속 WO 제안 (작게, 저우선)

> KPA 체감 이득이 거의 없고(이미 UI 깨끗) 제거는 크로스서비스라, **P3(저우선)** 로 둔다.

- **WO-1 (선택·P3, 크로스서비스)**: 공통 `store-settings.types`/`store-settings.controller` 에서 components/customizations **deprecation 주석 + GET 응답 제거 또는 빈값 유지** 결정. 3서비스(KPA/GP/KCos) 회귀 smoke. 데이터 0이라 안전하나 이득 작음.
- **WO-2 (보류·P3)**: `template_profile` 레거시 컬럼 → `storefront_config.template` 일원화. 폴백 로직(공통) 변경 + migration 필요 → 별도 IR 후 판단.
- **권장 기본값**: **현행 유지 + 본 IR 로 "고아 필드/데이터 0" 명문화.** 추후 storefront 설정을 손볼 때 WO-1 을 묶어 처리.

## 6. 확인 vs 추정

**확인됨:** §2 모든 코드 경로(파일:라인), §3 운영 데이터(전 org components/customizations 0·키 부재, template_profile 전부 BASIC). 공통 컴포넌트(StorefrontHomePage/store-settings.controller/types)가 GP/KCos 공유.

**추정/미결:** components/customizations 의 원 도입 의도(과거 토글맵/서비스 확장 예약) — 코드 주석상 "dead 토글" 흔적만 있고 정확한 히스토리는 깊이 추적 안 함. template_profile 폐기 시 영향 범위는 WO-2 에서 정밀 산정 필요.

## 7. 주의
- read-only 조사 종료. 코드/DB/운영데이터 변경 없음. (운영 DB는 read-only SELECT만 수행, 자격증명 미기록.)
- components/customizations 제거는 **KPA 단독 아님**(공통 백엔드/타입) → 반드시 크로스서비스 WO로.
- template 은 dead 아님(UI 블록 재생성 + 폴백) — 제거 금지.
