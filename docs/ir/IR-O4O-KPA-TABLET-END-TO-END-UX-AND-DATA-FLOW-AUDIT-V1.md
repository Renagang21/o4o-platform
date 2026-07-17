# IR-O4O-KPA-TABLET-END-TO-END-UX-AND-DATA-FLOW-AUDIT-V1

> 성격: **조사 전용**(코드/UI/DB write/데모데이터 수정 없음). 코드 + 배포 실측 + API/DB read 근거.
> 대상: KPA 태블릿 — 콘텐츠 제작 → 코너 연결/적용 → 관리자 화면 → 고객 태블릿 → QR 모바일 → 이미지.
> Date: 2026-07-16

---

## 1. 현재 구조 요약

3개 개념이 있고, 자주 혼동된다.

| 개념 | 저장 | 정체 |
|------|------|------|
| **Screen Set(태블릿 콘텐츠)** | `store_tablet_screen_sets` + `store_tablet_screen_blocks` | 화면 구성 **원본**(템플릿 + 블록). 코너에 매이지 않음(`tablet_id` 있을 수 있으나 재사용). |
| **코너(태블릿)** | `store_tablets` | 물리 태블릿/위치. 진열 상품(`store_tablet_displays`)과 `current_screen_set_id`를 가짐. |
| **연결(코너↔콘텐츠)** | `store_tablet_corner_contents` | 다대다. 코너에 여러 Screen Set 연결, 그중 1개가 `current`(현재 표시). |

**핵심 분리**: Screen Set(원본) ≠ 코너(물리+진열) ≠ 연결(링크) ≠ current(적용). 상품은 **코너의 진열(`store_tablet_displays`)** 이지 Screen Set 소유가 아니다.

---

## 2. 화면별 실제 목적

| 화면 | 소비자 | 목적 | 실기능/미리보기 |
|------|--------|------|:---------------:|
| 태블릿 콘텐츠 리스트 | 관리자 | Screen Set 원본 목록/검색/제작/수정/제거 | 관리 |
| 콘텐츠 제작기(builder) | 관리자 | 템플릿+대기화면/코너설명/추가정보 작성 → 저장(코너 미적용) | 관리(저장=DB) |
| 코너 관리(패널) | 관리자 | 코너에 콘텐츠 연결/현재 전환/순서/제거 | 관리(DB) |
| 현재 화면 보기 | 관리자 | 현재 적용 콘텐츠를 실화면으로 확인 | **미리보기(read-only)** |
| 미리보기(리스트 행) | 관리자 | Screen Set 원본을 코너 없이 확인 | **미리보기(read-only)** |
| 고객 화면 열기 | 관리자 | 실제 공개 태블릿 URL 새 탭 | **실 공개 페이지** |
| 주소 복사 | 관리자 | 공개 URL 클립보드(북마크) | read-only |
| 이 화면 사용 | 관리자 | 코너 current 전환(+초안 자동 활성) | 관리(DB) |
| 공개 태블릿 화면 | 고객 | 매장 태블릿 실행 화면 | 실 런타임 |
| 휴대전화로 보기 | 고객 | QR 모달 → `/qr/{slug}` | read-only(모달) |
| QR 모바일 화면 | 고객(휴대폰) | 같은 코너 콘텐츠의 세로형 뷰 | 실 공개(비로그인) |

---

## 3. 버튼·동선 지도 + **중복 판정**

"화면을 보여주는" 5개 어포던스는 **모두 같은 kiosk 컴포넌트(`TabletKioskPage`)를 렌더**한다. 차이는 (a) 데이터 출처, (b) 코너/상품 문맥(tabletId), (c) 표면(새 탭 vs 오버레이 vs 모달)뿐.

| 어포던스 | 렌더 소스 | tabletId 문맥 | 표면 |
|----------|-----------|:-------------:|------|
| `태블릿에서 화면 열기` (`handleOpenTabletScreen`) | 공개 applied 엔드포인트(fetchScreen/products) | 선택 코너 | 새 탭(실 페이지) |
| 코너 `미리보기` (`handleOpenPreview`) | 공개 applied 엔드포인트 | 선택 코너 | 인페이지 오버레이 |
| 코너 `현재 화면 보기` (`handlePreview`) | `fetchScreenSet`→`previewScreenSet`(블록) | 선택 코너 | 모달 |
| 리스트 `미리보기` | `previewScreenSet` | **없음**(PREVIEW_NO_CORNER) | 모달 |
| builder `태블릿/QR 크게 보기` | `previewScreenSet`(**미저장 편집 상태**) | 없음 | 모달 |

**중복 판정**
- **`고객 화면 열기` ≈ 코너 `미리보기`** = **실질 중복**. 둘 다 *선택 코너의 저장·적용 공개 화면*을 같은 데이터로 렌더. 유일한 차이는 새 탭 vs 인페이지 오버레이. → 하나로 통합 가능(예: 미리보기는 인페이지, 새 탭은 "실제 태블릿에서 열기"만 남김).
- **코너 `현재 화면 보기`** 는 코너 `미리보기`와 **현재 항목 기준 거의 중복**(경로만 previewScreenSet vs applied). 존재 이유는 kebab로 *비현재 연결 항목*도 미리볼 수 있다는 점뿐.
- **리스트 `미리보기`**(코너 없음)와 **builder `크게 보기`**(미저장 초안)는 **비중복**(각각 라이브러리 원본 뷰 / 작업 중 초안 뷰).

→ 사용자가 "미리보기가 왜 이렇게 많나" 느끼는 원인 = 표면만 다른 동일 렌더가 4곳.

---

## 4. 데이터 흐름도 (상품)

```
[코너=store_tablets] --current_screen_set_id--> [Screen Set 원본]
        |                                            |= 블록(대기/코너설명/추가정보/qr/product_list)
        |= 진열 store_tablet_displays(local/supplier) |
        v                                            v
  고객 태블릿:                                   QR 모바일:
   GET /tablet/screen  → sections(블록)            GET /qr/{slug} → PublicScreenSetViewer
   GET /tablet/products?tabletId= → 진열 상품        product_list resolve(별도) → 상품
        └ disp.tablet_id 필터(코너 진열만)              └ ⚠️ 코너 진열 필터 아님(§6 관찰)
```

**결정적**: 상품 목록은 Screen Set이 아니라 **코너 진열(displays)** 에서 온다(태블릿). Screen Set의 `product_list` 블록은 "이 자리에 상품을 보여줄지" 스위치일 뿐, 상품 record를 담지 않는다(`legacy_tablet_displays` 소스).

---

## 5. 이미지 resolve 흐름 (코드 확정 — 추정 아님)

**LOCAL 상품**(데모 6개는 전부 local):
```
store_local_products.thumbnail_url
  → store_local_products.images[0]      (태블릿만; QR은 이 폴백 없음)
  → 📦 placeholder
```
- 태블릿 카드/상세: `mapLocalProduct = p.thumbnail_url || p.images?.[0]` (`TabletKioskPage.tsx:277`), 렌더 `:967`/`:677`.
- QR 모바일: 리졸버가 `thumbnail_url`**만** 사용(`store-public-screen-set-resolve.ts:109`), `images` 폴백 없음.
- **ProductMaster 대표 이미지 단계 없음** — local 상품은 ProductMaster 연결이 없음(store-local). `gallery_images`는 어느 화면도 안 읽음.

**SUPPLIER 상품**: **이미지 경로가 아예 없다.** `/tablet/products`의 supplier 쿼리가 `'[]'::jsonb AS images` 하드코딩(`store-public-utils.ts:474`), ProductMaster/ProductImage 조인 없음 → `mapSupplierProduct.imageUrl = undefined` → 📦. QR도 supplier엔 `imageUrl` 키 자체가 없음.

**우선순위 확정**: `thumbnail_url → images[0](태블릿) → 📦`. (사용자가 예시로 든 "ProductMaster 대표→…"는 **local 상품엔 존재하지 않음**.)

---

## 6. 화면 3종 비교표 (피부관리 코너, 현재=기본 코너 안내형)

| 요소 | 관리자 미리보기(현재 화면 보기) | 고객 태블릿(공개) | QR 모바일(`/qr/tablet-corner-2`) |
|------|------|------|------|
| 대기 영상 | ❌(idleTimeout 미주입 → 미표시)* | 무조작 시 IdleOverlay | ✅ 상단 IdleMediaBlock(Sintel, 스크롤) |
| 코너 설명 | ✅ | ✅ | ✅(헤더로 이동) |
| 상품 목록 | ✅ 코너 진열 3 | ✅ 코너 진열 3 | ⚠️ **8개**(구강 가글+미편집 포함) |
| 상품 이미지 | thumbnail_url | thumbnail_url | thumbnail_url |
| 추가 콘텐츠(content_list) | ✅ | ✅ | ✅ |
| QR | (미리보기엔 버튼) | 우상단 작은 버튼→모달 | ❌(자기 QR 중복 방지) |
| 헤더/제목 | 코너설명 h2 | 헤더밴드 제거, 코너설명 h2 | 세트명 h1 |
| 데이터 출처 | previewScreenSet + /tablet/products(tabletId) | /tablet/screen + /tablet/products(tabletId) | /qr resolve(별도) |

*관리자 미리보기는 `idleTimeoutMs` 미주입이라 대기 오버레이가 안 뜬다. idle_touch_video 템플릿일 때만 hero로 대기영상이 보인다.

**공통이어야 할 것**: 코너 설명 · 추가 콘텐츠 · 상품(코너 진열 기준) · 이미지.
**기기별로 달라야 할 것**: QR 버튼(태블릿만), 대기영상의 "터치 진입"(태블릿만; QR/미리보기는 스크롤), 레이아웃(가로/세로).

---

## 7. 발견 문제 목록

1. **[이미지-데이터] 데모 이미지는 "실제 상품 사진"이 아니라 외부 색상 placeholder다.** 6개 `store_local_products.thumbnail_url`이 `https://placehold.co/...?text=Mint%0AGargle` 형태(§8). 사용자가 "변화 없다"고 느낀 근본 원인.
2. **[이미지-결함] 가글 3종 이미지가 `Mint%0AGargle`로 깨져 표시.** 라벨 개행(`%0A`)을 이중 인코딩(`%250A`)해 `%0A`가 리터럴로 노출(연고류 Fucidin/Bepanthen/Madecassol은 정상). QR 모바일 스크린샷에서 확인.
3. **[상품 소스 불일치] QR 모바일 상품 ≠ 태블릿 코너 진열.** 태블릿(피부)=코너 진열 3, QR 모바일(피부)=**8개**(구강 가글 + Skin/Oral Care 미편집 포함). QR resolve가 코너 displays로 필터되지 않는 것으로 관찰됨 → 코드 확인 필요(정확 원인 미확정).
4. **[SUPPLIER 이미지 부재] supplier 상품은 어느 화면에도 이미지가 없다**(하드코딩 `images=[]`, ProductMaster 조인 없음). 데모가 local만 쓰는 이유이자, "공식 상품 사진"을 태블릿에 태우려면 백엔드 조인 추가가 필요.
4. **[동선 중복] `고객 화면 열기` ≈ `미리보기`**(표면만 다른 동일 렌더), `현재 화면 보기`도 대부분 중복(§3).
5. **[미리보기 정합성] 관리자 미리보기는 대기영상 미표시**(idleTimeout 미주입). "고객 화면과 같게"가 대기영상에선 성립 안 함.
6. **[헤더 일관성] KPA 태블릿은 코너명 헤더밴드 제거**(코너설명 h2가 제목 역할). product 템플릿(코너설명 없음)은 제목이 사라짐 — 의도적이나 확인 필요.

---

## 8. §5 데모 이미지 작업 확정 (레코드·URL)

**중요**: 커밋 `608cd3b6c`은 **QR UI 코드**다. 이미지 변경은 **git 커밋이 아니라 런타임 API PUT**(`PUT /store/local-products/:id`)으로 프로덕션 DB에 직접 쓴 것 → git에 없음.

- **테이블/필드**: `store_local_products.thumbnail_url` + `images`(둘 다 동일 URL).
- **6개 레코드**(id 앞 8자리 / URL):

| 상품 | id | thumbnail_url |
|------|----|----|
| 케어가글액(박하향) | `868341a6` | `placehold.co/600x600/a7f3d0/065f46/png?text=Mint%0AGargle` |
| 케어가글액(사과향) | `91cfdb0d` | `.../fecaca/991b1b/...?text=Apple%0AGargle` |
| 케어가글액(유칼립투스향) | `099eee4f` | `.../bae6fd/075985/...?text=Eucalyptus%0AGargle` |
| 후시딘연고 | `cd3a2b29` | `.../ddd6fe/5b21b6/...?text=Fucidin` |
| 비판텐연고 | `5e7344c5` | `.../fde68a/92400e/...?text=Bepanthen` |
| 마데카솔겔 | `1fcce2f6` | `.../99f6e4/115e59/...?text=Madecassol` |

- **실제 파일 아님** — 전부 **외부 placehold.co URL**(색상+텍스트 동적 생성 이미지).
- **사용 화면**: 태블릿 카드·상세 ✅ / QR 모바일 ✅ / 관리자 코너 미리보기 ✅(코너 문맥). 리스트 미리보기 ❌(상품 미표시).
- **"실제 상품 이미지가 아닌 이유"**: local 상품에 등록된 대표 이미지·O4O 미디어가 없어 WO 3순위(임시 샘플)로 채운 것. 색+영문명 placeholder는 실사진 판정 불가.
- **"변화 없다고 느껴진 원인"**: (a) placeholder라 여전히 데모처럼 보임, (b) 가글은 `%0A` 깨짐, (c) 코너 소개형 현재 화면/리스트 미리보기엔 상품이 아예 안 뜸.

---

## 9. 이미지 resolve 흐름 + "실사진 적용 최소 변경"

**LOCAL 상품 실사진 적용**: `store_local_products.thumbnail_url`(또는 `images[0]`) **한 필드만** 실제 이미지 URL/업로드로 바꾸면 태블릿·QR·상세 전부 반영(단일 소스). → `PUT /local-products/:id { thumbnailUrl }`. **DB/코드 변경 불필요.**

**SUPPLIER(공식 상품) 실사진**: 현재 **불가능**. `queryTabletVisibleProducts`가 `images=[]` 하드코딩 → ProductMaster/ProductImage 조인 추가(**백엔드 코드 변경**) 필요. 별도 WO.

---

## 10. 핵심 질문 답 / 삭제·통합·유지 / 권장 UX / 후속 WO

### 핵심 질문 10
1. **관계**: 태블릿 콘텐츠(Screen Set)=화면 **원본**, 코너 화면=코너에 **적용된** Screen Set, 코너=물리+진열상품. 상품은 코너 진열 소유(Screen Set 아님).
2. **화면 열기 vs 미리보기 둘 다 필요?** — **아니오.** 표면만 다른 중복. "실제 태블릿에서 열기"(새 탭) 1개 + "미리보기"(인페이지) 1개로 통합 권장.
3. **QR에 대기영상?** — 현재는 표시(content-parity WO). 그러나 QR은 무조작 대기 개념이 없어 "안내 영상"으로 스크롤 노출될 뿐. **재검토 대상**(모바일에선 상단 자동재생 영상이 과할 수 있음).
4. **고객 태블릿 첫 화면?** — 현재 = 코너설명+상품+콘텐츠(정적). 무조작 시 대기영상 오버레이. 이 분리가 맞음.
5. **코너명/헤더?** — KPA는 코너설명 h2가 제목 역할 → 전용 헤더밴드 불필요(현 제거 상태 유지). product 템플릿 제목 부재만 판단.
6. **QR 버튼 역할?** — 태블릿에서만 우상단 작은 버튼→모달(현 상태 적절). QR 모바일엔 자기 QR 미표시(정상).
7. **상품 이미지 관리 위치?** — **`store_local_products`**(local). supplier는 ProductMaster(현재 태블릿 미연결).
8. **데모 이미지 적용 위치?** — `store_local_products.thumbnail_url`+`images` 6레코드, 외부 placehold URL(§8). git 아님(런타임 DB).
9. **실사진 적용 최소 변경?** — local: `thumbnail_url` 한 필드. supplier: 백엔드 조인 추가 필요(§9).
10. **부분 수정 vs 재설계?** — **구조는 대체로 건전**(데이터 분리·QR 공개·이미지 단일 소스). **재설계 불필요.** 남은 건 (a) 이미지 실체화 (b) 미리보기 중복 정리 (c) QR 상품 소스 정합 — **부분 수정 3건**으로 충분.

### 삭제·통합·유지
- **통합**: 고객 화면 열기 ↔ 미리보기(표면 통일). 현재 화면 보기 ↔ 코너 미리보기(경로 일원화 검토).
- **유지**: 리스트 미리보기(라이브러리 뷰), builder 크게 보기(초안 뷰), QR 공개 접근, 이미지 단일 소스(thumbnail_url), 데이터 분리 모델.
- **정정 필요**: 가글 이미지 `%0A` 깨짐, QR 상품 소스 불일치.

### 권장 최종 UX (요지)
관리자: 리스트(원본) / 코너 관리(연결·현재) / 미리보기는 **인페이지 1종 + 실태블릿 열기 1종**으로 축소. 상품 이미지는 상품 관리(local-products)에서 실사진 등록 유도. 고객/QR은 현 구조 유지, QR 상품을 코너 진열과 일치시킴.

### 후속 WO 제안 (원인별 3개)
1. **WO-…-DEMO-REAL-IMAGES-V1** — 데모 상품 실사진/적절 이미지로 교체(`thumbnail_url`), 가글 `%0A` 깨짐 제거. (데이터; supplier 이미지 조인은 범위 밖 별도 판단.)
2. **WO-…-QR-PRODUCT-SOURCE-ALIGN-V1** — QR 모바일 `product_list` 상품을 태블릿 코너 진열(displays)과 동일 집합으로 정합(코드 read → 필요 시 resolver 필터 추가). §6·§7-3 원인 확정 포함.
3. **WO-…-PREVIEW-CONSOLIDATION-V1** — 미리보기 4종을 인페이지 1 + 실태블릿 열기 1로 통합, 관리자 미리보기 대기영상 정합(idleTimeout 주입 여부 판단).

---

*조사 전용. Screen Set(원본)/코너(진열)/연결/current 4개념 분리 확정. 상품=코너 진열(displays), 이미지=store_local_products.thumbnail_url 단일 소스(supplier는 이미지 경로 부재). 데모 이미지=외부 placehold 6레코드(런타임 DB, git 아님), 가글 %0A 깨짐. 미리보기 4종 중 화면열기≈코너미리보기 중복. QR 상품이 코너 진열과 불일치(관찰). 재설계 불요, 부분수정 3 WO 제안.*
