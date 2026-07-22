# CHECK-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C

> WO: `WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C`
> 선행: `…-EDITOR-SHARED-EXTRACTION-V2A`(공유 편집기) · `…-BACKEND-HUB-COPY-V2B`(공급자 백엔드 계약)
> 성격: 프론트엔드 통합 — web-neture 공급자 제작 UI + web-kpa 매장 HUB 공급자 섹션. **백엔드·migration·스키마 0.**
> Date: 2026-07-22 · commit 5678fa9e3 · 배포 deploy-neture(2m11s)·deploy-kpa-society(2m29s) success

---

## 0. 결론

V2a 공유 편집기(`@o4o/tablet-screen-set-editor`)를 **web-neture 의 3번째 소비자**로 연결하고(유사 편집기 신규 작성 0), V2b 확정 API(`/api/v1/kpa/supplier/screen-sets`, `/store/screen-set-hub/supplier-templates`)를 그대로 호출한다. 공급자가 작성·게시하고 매장이 가져가 **독립 사본**을 만드는 전체 동선을 공급자+약국 계정(renagang21)으로 프로덕션 E2E 검증했다. **신규 migration·스키마·백엔드 라우트 0.**

## 1. 아키텍처 핵심 — 크로스서비스 serviceKey 축

공급자 Screen Set 은 KPA 매장 타블렛 대상이므로 **service_key='kpa'** 여야 매장 HUB(`SUPPLIER_HUB_SERVICE_KEY='kpa'`)에 노출된다. 따라서 web-neture(공급자)는 자기 컨벤션 `/neture/supplier/*` 가 아니라 확정 계약 `/api/v1/**kpa**/supplier/screen-sets` 를 호출한다(백엔드 라우트 변경은 V2c 중지 조건). web-neture 의 `authClient` axios(`api`)는 모든 경로에 토큰 자동 부착 + 401 자동 refresh 하므로 KPA 프론트의 `/store/*` 수동 Bearer 헬퍼가 불필요 — **프로덕션 네트워크에서 `GET /api/v1/kpa/supplier/screen-sets => 200` 확인**(CORS·크로스프론트 토큰 부착 성립).

## 2. 변경 파일

```
services/web-neture/package.json                                    (+3 workspace dep)
services/web-neture/Dockerfile                                      (COPY 2그룹 × 3 패키지, source-consumed·build 스텝 불요)
services/web-neture/src/lib/api/supplierScreenSets.ts               (신규 — axios 어댑터 + supplierScreenSetBuilderApi)
services/web-neture/src/pages/supplier/SupplierTabletScreenSetsPage.tsx (신규 — 목록+편집셸+게시대상/상태 액션)
services/web-neture/src/pages/supplier/index.ts                     (배럴 export)
services/web-neture/src/App.tsx                                     (lazy + Route /supplier/tablet-screen-sets)
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx  (사이드바 '매장용 타블렛' 그룹)
services/web-kpa-society/src/api/storeScreenSetHub.ts               (supplier 목록/상세/import 3함수 + 타입)
services/web-kpa-society/src/pages/pharmacy/HubScreenSetLibraryPage.tsx (소스 탭 운영자/공급자 + 공급자 컬럼·상세)
pnpm-lock.yaml
```

- 세 패키지(`tablet-screen-set-editor`, `screen-content-core`, `tablet-kiosk-core`)는 `main=src/*` source-consumed → Vite 트랜스파일, 별도 build 스텝 없음.
- **App.tsx 주의(정직 기록)**: 본 세션 중 App.tsx 편집(lazy+Route)이 **동시 세션(OTC 트랙)의 커밋에 스윕**되어 HEAD 에 이미 반영된 상태였다(메모리가 경고한 pre-staged 스윕 현상). 코드는 main 에 온전히 존재(3개 참조 확인)하며, 본 커밋 5678fa9e3 의 나머지 web-neture 변경으로 배포 트리거·App.tsx 포함 배포됨. 기능·배포 영향 없음(커밋 메시지 귀속만 상이).

## 3. web-neture 공급자 UI (SupplierTabletScreenSetsPage)

- 사이드바 그룹 **'매장용 타블렛' → 항목 '매장용 타블렛 콘텐츠'**(`/supplier/tablet-screen-sets`). 보호=기존 `SupplierRoute`+`SUPPLIER_ROLES`.
- 목록: 이름/상태(작성 중·게시 중·보관)/게시 대상(약국·비약국·전체 매장)/템플릿/블록/작업. 상태 배지 + 상태별 액션 전환.
- 제작·편집: **V2a `TabletContentStepBuilder` 재사용**, `api={supplierScreenSetBuilderApi}`, `contentSources={['spd']}`(공급자 컨트롤러가 O4O 표준 설명서 검색만 노출 → 단일 picker, `searchStoreContents`=빈 배열). 미리보기 stub(빈 kiosk API)+`storeSlug='supplier-preview'`.
- 게시 대상 모달: 약국/비약국/전체 라디오 + 의약품 사전 안내(최종 판정은 API). 409 오류 코드별 문구 구분(MEDICATION_PHARMACY_ONLY / HUB_TARGET_REQUIRED / EMPTY_SCREEN_SET), MEDICATION 오류 시 모달 유지(대상 변경 재시도).

## 4. web-kpa 매장 HUB 공급자 섹션 (HubScreenSetLibraryPage)

- 소스 탭 **운영자 제공 / 공급자 제공** 추가(기존 운영자 HUB 페이지 재사용, 신규 페이지 미생성). 소스 전환 시 상세 닫힘.
- 공급자 컬럼: 콘텐츠명 / **공급자(supplierName)** / **게시 대상(hubTargetStoreType 배지)** / 템플릿 / 수정일. 목록·상세·가져오기 모두 V2b HUB API 결과 신뢰(프론트 재필터 없음).
- `storeScreenSetHub.ts` 에 `listSupplierTemplates`/`getSupplierTemplate`/`importSupplierTemplate` 추가(`/store/*` request 헬퍼 재사용). 상세/미리보기(previewScreenSet)/독립 사본 가져오기 흐름은 운영자 흐름과 공유.

## 5. 프로덕션 E2E 검증 — ✅ PASS (renagang21 = ACTIVE 공급자 + 약국 매장, 2026-07-22)

**공급자 UI(web-neture)**:
| 항목 | 결과 |
|------|:---:|
| 메뉴 노출 + 진입 + 목록 로드(`GET /kpa/supplier/screen-sets` 200) | ✅ |
| 신규 작성 → 5단계 편집기(템플릿 4종, legacy 대기영상형 제외) → 저장 | ✅ (blockCount 5 auto-seed) |
| 콘텐츠 picker(spd 단일, "매장용 표준 설명서만") 검색·선택·추가 | ✅ (의약품 성광알파헥시딘) |
| 비의약품 **전체 매장** 게시 | ✅ 200 → 게시 중/전체 매장 |
| **의약품 전체 매장 게시 → 409** + 문구 "…약국에만…" + **모달 유지** | ✅ |
| 의약품 **약국** 게시 | ✅ 200 → 게시 중/약국 |
| 복제 → (사본) draft 생성 | ✅ |
| 상태 배지 + 액션 전환(게시↔게시 해제) | ✅ |

**약국 매장 HUB(web-kpa) — 크로스서비스 E2E**:
| 항목 | 결과 |
|------|:---:|
| 소스 탭 운영자/공급자 노출 | ✅ |
| **공급자 제공 탭**: 게시 2세트 노출(공급자명 "서 Renagang21" · 대상 약국/전체 매장 배지) | ✅ |
| draft(사본) 미노출 | ✅ |
| 약국 매장 → **의약품(약국) + 비의약품(전체) 모두 조회** | ✅ (교차유형 정상) |
| 상세 + 미리보기(성광알파헥시딘 콘텐츠 kiosk 렌더) | ✅ |
| **가져오기 → 매장 독립 사본 생성** + 안내(독립 사본·원본 변경 무반영·코너 미적용) | ✅ 201 |
| 가져온 사본 = store 라이브러리 '사용 가능·현재 미적용' | ✅ |
| **코너 자동 적용 0**(보호 샘플 구강/피부 코너 화면 불변) | ✅ |

**비약국 매장**: 실 계정 부재 → 브라우저 미수행. **V2b 에서 비약국 배제/차단(목록 제외·상세 403·가져오기 403·의약품 차단)을 백엔드 가드로 완전 검증**했고, V2c 공급자 탭은 동일 `listSupplierTemplates`/`getSupplierTemplate`/`importSupplierTemplate`(서버 필터) 를 그대로 소비하므로 UI 코드 경로 동일. 임의 비약국 membership·조직 유형 생성 금지(WO) 준수 → API 레벨(V2b) 검증으로 구분 보고.

## 6. 회귀 — ✅

- 기존 store 타블렛 라이브러리(`/store/commerce/tablet-displays`) 정상, 보호 샘플 코너 적용 유지(구강관리 기본 코너 안내형→구강관리 코너 / 피부관리 기본 화면 세트→피부관리 코너). 가져오기 후에도 코너 적용 불변.
- 매장 HUB 운영자 제공 탭 정상 렌더(현재 운영자 템플릿 0건 → 빈 목록, 회귀 아님).
- 공개 타블렛 5섹션 / QR 4섹션 / 코너 resolver: **V2c 변경 집합에 미포함**(변경=HUB 라이브러리 페이지 + 공급자 UI + 신규 API client 뿐, 공개 타블렛 렌더러·QR resolver 무변경). 보호 샘플 코너 적용 정상으로 간접 확인. V2b 에서 5/4섹션 불변 검증됨.
- 공급자 원본 공개 URL·QR 미생성(publicQrSlug 미노출, 컨트롤러 withQrLink 미호출).

## 7. 테스트 데이터 정리 — 순 지속 데이터 0

- 공급자 원본 3(의약품 active·비의약품 active·사본 draft) → **제거(DELETE soft-delete)**, 공급자 목록 0.
- 매장 독립 사본 1 → **보관(store archive soft-delete)**, store 라이브러리 13→12.
- 앱 soft-delete 계약만 사용(**수동 DB write 0** — 승인 규칙 준수). 보호 샘플·실 데이터 무수정.
- **DB read-only 재쿼리는 프로덕션 DB 고부하 + 공유 프록시 토큰 만료로 타임아웃**(V2b·HFF 트랙과 동일 함정). 가져오기 사본 독립성 불변식(origin=store·supplier_id NULL·hub_target NULL·신규 id·값 복사·provenance `supplier_screen_set`)은 **V2b 에서 동일 import 코드 경로(operator import 재사용)로 DB 레벨 완전 검증**됨 + V2c UI/network(201·사본 라이브러리 노출) 확인. V2c-특정 DB 재검증은 인프라 사유로 미수행(정직 기록).

## 8. 정적 검사·빌드

- web-neture tsc `--noEmit` **0** · web-kpa-society tsc `--noEmit` **0**.
- web-neture `vite build` 성공(신규 `SupplierTabletScreenSetsPage` 청크 83KB, 3패키지 트랜스파일) · web-kpa-society `vite build` 성공.
- migration·스키마 0.

## 9. V2 완료 상태 / 후속

- V2a(편집기 추출) · V2b(공급자 백엔드) · **V2c(공급자 UI + 매장 HUB 통합)** 완료 → **공급자 Screen Set V2 기능 완결**.
- 후속(신규 기능 확장 전 권장): 공급자 제작→매장 가져오기→**태블릿 코너 실제 배치**까지 전체 업무 동선 1회 점검. 비약국 실 계정 확보 시 비약국 브라우저 smoke 보강.
