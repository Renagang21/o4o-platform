# CHECK-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1`
> 목적: Screen Set `templateKey` 에 따라 공개 화면 레이아웃이 달라지도록 **`product_focus` 템플릿 1개**를 추가.
> 저장 → 편집기 선택 → public /screen → kiosk-core 렌더링 **전체 체인**을 `product_focus` 하나로 검증.

---

## 1. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | `SET_TEMPLATE_KEYS_ALLOWED` 에 `product_focus` 추가(whitelist 확장) |
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | 편집기 `TEMPLATE_OPTIONS` 에 `product_focus`(상품 집중형) 추가 + 안내 문구 갱신 |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | `templateKey === 'product_focus'` 레이아웃 분기 + 전용 style 4종 |
| `docs/checks/CHECK-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1.md` | 본 CHECK |

- **public /screen 핸들러 무변경**: `store-public-tablet.handler.ts` 는 이미 `resolveTemplateKey(set)` 로 `templateKey` 를 반환(§3.3 자동 충족). 관련 단위 테스트도 이미 `product_focus` 통과를 assert.
- **DB migration / block schema / 새 block_type / public 핸들러 / OPL·service_key 무변경**(§5 준수).

## 2. 추가한 templateKey

```
product_focus  (표시명: 상품 집중형)
설명: 상품 목록과 제품 안내를 더 크게 보여주는 템플릿입니다.
```

## 3. API whitelist 변경

`store-tablet.routes.ts`:
```ts
const SET_TEMPLATE_KEYS_ALLOWED = ['corner_information_basic_v1', 'product_focus'];
```
- POST/PATCH 저장 허용값 = `corner_information_basic_v1` + `product_focus`(+ null=기본).
- `idle_video_first` / `comparison` 은 **여전히 미허용** → 저장 시 계속 `400 INVALID_TEMPLATE_KEY`(§5, §7).

## 4. 편집기 선택지 변경

- `TEMPLATE_OPTIONS` 에 `product_focus`(상품 집중형) 항목 추가 → 생성 폼·편집 패널·목록 메타에 자동 반영(기존 `TemplateSelectField` 구조 재사용, WO-TEMPLATE-SELECTION-EDITOR-V1 에서 만든 선택형 구조).
- 안내 문구: "기본 코너 안내형과 상품 집중형을 선택할 수 있습니다. 추가 템플릿은 후속 단계에서 제공됩니다."

## 5. kiosk-core 렌더링 분기 (§3.4 / §4)

`TabletKioskPage` Browse view 에 `isProductFocus = (screen?.templateKey ?? 'corner_information_basic_v1') === 'product_focus'` 분기 추가. **새 block 을 요구하지 않고 기존 sections 를 다르게 배치만** 한다.

| 요소 | corner_information_basic_v1 (기본) | product_focus |
|------|-----------------------------------|---------------|
| corner_description | 헤더 제목(20px) + 부제(body) | **축약 헤더**(제목 17px, compact 패딩, 부제 생략) |
| product_list(상품 그리드) | 220px 타일 / 이미지 140px | **주요 영역** — 280px 타일 / 이미지 200px (전면 배치) |
| qr_guide | **상단** 안내 배너 | **하단** 보조 배너 |
| idle_media | auto-return 대기화면 | **동일**(변경 없음) |

추가 style: `headerCompact` / `gridFocus` / `productImgAreaFocus` / `qrGuideBottom`.

## 6. 기존 템플릿 불변 검증

- `isProductFocus === false`(기본 템플릿 + legacy `screen=null`)일 때 헤더/그리드/QR 배너 style 과 배치가 **기존과 byte 동일**(모든 분기가 원래 값으로 폴백). 새 코드 경로는 `product_focus` 에서만 진입.
- `TabletKioskPageProps` / `TabletKioskDisplaySettings` **export 타입 무변경** → 소비 서비스(KPA/Cosmetics/GlycoPharm) 계약 불변.
- **product_list 0건**: `products.length === 0` → 기존 "표시할 상품이 없습니다" centerMessage 로 폴백(분기와 무관). **크래시 없음**(§4, §7).
- idle auto-return 흐름 무변경(§7).

## 7. typecheck / build 결과

| 대상 | 명령 | 결과 |
|------|------|------|
| web-kpa-society | `tsc && vite build` | ✅ **exit 0** (built ~17s) — 편집기 + kiosk-core 소스 컴파일 포함 |
| api-server (production 빌드 스코프) | `tsc -p tsconfig.build.json --noEmit` | ✅ **exit 0** |
| `store-tablet.routes.ts` (변경 파일) | (위 포함) | ✅ 에러 0 |
| web-k-cosmetics | `tsc --noEmit` | ✅ kiosk-core 관련 에러 0 |
| web-glycopharm | `tsc --noEmit` | ✅ kiosk-core 관련 에러 0 |
| public 단위 테스트 | `jest store-public-tablet-screen` | ✅ **6/6 pass** (`resolveTemplateKey('product_focus') → 'product_focus'` 포함) |

### 7-1. 참고: 로컬 baseline 조치(코드/커밋 변경 없음)
- api-server 전체 `type-check`(base tsconfig)에서 `@o4o/ai-prompts/store` 미export 에러가 있었으나 **로컬 stale package dist** 문제(소스는 정상). `pnpm --filter @o4o/ai-prompts run build` 로 재빌드하여 해소(dist=gitignore, git 산출물 없음). 이 WO 변경과 무관.
- 동일 base type-check 의 `src/scripts/drug-otc-*.ts` 중복 선언 에러는 **`tsconfig.build.json` 이 `src/scripts/**` 를 exclude** → **production 빌드 스코프 밖**. 이 WO 와 무관한 pre-existing 이며 배포 빌드에 영향 없음.

## 8. product_focus smoke 결과

- **정적 + 단위 검증 완료**: 위 §7(전 서비스 빌드/타입 + public 단위 테스트).
- **브라우저 smoke: 로컬 실행 불가 → 배포 후 검증 필요(보류)**.
  - 사유: 이 노트북 네트워크는 **Cloud SQL 5432 아웃바운드 차단**(기존 확인)으로 api-server 를 프로덕션 DB 대상으로 **로컬 풀스택 기동 불가** → 전체 체인(세트 적용 → GET /screen → 뷰어 렌더)을 로컬 브라우저로 재현할 수 없음.
  - **배포 후 검증 절차**(CI/CD 배포 완료 후, §6 검증 흐름):
    1. 관리 UI(`/store/commerce/tablet-displays`)에서 구강관리 기본 화면 세트 편집 → 템플릿 `상품 집중형(product_focus)` 저장.
    2. 배포 API `GET /:slug/tablet/screen` (구강관리 태블릿) → `data.templateKey === 'product_focus'` 확인(curl 가능).
    3. 공개 태블릿 뷰어 접속 → product_focus 레이아웃(상품 전면·축약 헤더·QR 하단) 표시 확인.
    4. 다시 `기본 코너 안내형(corner_information_basic_v1)` 저장 → 기존 레이아웃 복귀 확인.
    5. console/network error 0 확인.

## 9. 운영 샘플 최종 templateKey 상태

- 본 WO 는 코드/UI 만 변경했고 **운영 샘플의 templateKey 를 변경하지 않았다**(운영 샘플 유지, §5). 구강관리 기본 화면 세트는 기존 값 유지.
- product_focus 적용/복귀는 위 §8 배포 후 검증 절차에서 수행(§6 검증 흐름은 적용→복귀까지 포함, 최종은 `corner_information_basic_v1` 로 되돌림).

## 10. 완료 상태 / 남은 항목

- ✅ product_focus 저장 허용(whitelist) / 편집기 선택 / public /screen 반환(기존) / kiosk-core 렌더 분기
- ✅ 기존 corner_information_basic_v1 불변 / 전 서비스 typecheck·build / public 단위 테스트
- ⏳ 브라우저 smoke = **배포 후** 수행(로컬 DB 방화벽 제약). 배포 후 API curl 검증은 즉시 가능.
