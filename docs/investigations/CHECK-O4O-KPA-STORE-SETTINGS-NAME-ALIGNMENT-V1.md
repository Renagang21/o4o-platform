# CHECK-O4O-KPA-STORE-SETTINGS-NAME-ALIGNMENT-V1

> 작업: KPA `/store/settings` 명칭 정합 (매장 설정 → 매장 홈 디자인)
> 기준 IR: IR-O4O-STORE-SETTINGS-FULL-AUDIT-V1
> 커밋: `3ef32fd79` / 일자: 2026-06-25

---

## 1. 작업 요약

`/store/settings` 는 일반 설정이 아니라 **공개 매장 홈(storefront) 레이아웃/테마/블록 편집기**임이
IR 에서 확인됨. 라벨이 "설정"이라 매장 기본정보/시스템 설정과 혼동 → 명칭/문구만 정합.
**URL(`/store/settings`)·route·API·저장 로직·설정 항목 모두 불변.**

### 변경 파일 (KPA 전용 — GP/KCos 무영향)
1. `packages/store-ui-core/src/config/storeMenuConfig.ts`
   - `KPA_SOCIETY_STORE_CONFIG` 설정 그룹: `store-settings` 라벨 `매장 설정` → **`매장 홈 디자인`**.
   - 다른 서비스 config(COSMETICS/GLYCOPHARM)는 미변경.
2. `services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx`
   - 페이지 제목 subLabel `· 매장 설정` → `· 매장 홈 디자인`, 접근거부/무slug 뷰 제목 동일 변경.
   - 헤더에 안내 문구 추가: "공개 매장 홈에 보이는 테마와 콘텐츠 블록을 편집합니다.
     약국명·주소·연락처 등 기본정보는 **약국 정보**에서 관리합니다." + `/store/info` 링크.
   - 권한 안내 문구 "매장 홈 디자인은 개설약사만 변경할 수 있습니다."

## 2. 공통 모듈 영향 확인
- 메뉴 라벨은 서비스별 분리 config(`KPA_SOCIETY_STORE_CONFIG`)에 존재 → **KPA 만 수정**.
- COSMETICS/GLYCOPHARM config 의 settings 라벨/항목 미변경 확인.
- `PharmacyStorePage` 는 KPA 전용 페이지.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (store-ui-core + web-kpa) | ✅ PASS (에러 0) |
| 배포 (Deploy Web Services, `3ef32fd79`) | ✅ success |

### 브라우저 smoke (배포본 `3ef32fd79`, Sohae 약국 매장, 2026-06-25)
| 항목 | 결과 |
|---|---|
| 좌측 메뉴 설정 그룹: "약국 정보" + **"매장 홈 디자인"**(→ /store/settings) | ✅ |
| 페이지 제목 "· 매장 홈 디자인" | ✅ |
| 안내 문구(테마/블록 편집 + 기본정보는 약국 정보) + 약국 정보 링크(/store/info) | ✅ |
| URL `/store/settings` 유지 | ✅ |
| 레이아웃/디자인/테마/미리보기 컨트롤 정상 로드 | ✅ |
| 저장 동선(변경사항 저장 → "저장 완료") | ✅ (현재 값 멱등 저장 — 콘텐츠 변경 없음) |
| `/store/info`(약국 정보) 기존 접근 | ✅ (링크 정상) |

## 4. 비고
- 본 작업은 명칭/문구 정합 only. 설정 항목 정리(template/components/customizations),
  채널/온라인판매 정합, 상담요청 알림 등은 IR §8 의 별도 WO(P1-B/P2-C/P2-D 등).
- breadcrumb 은 본 페이지가 "← 내 매장관리" back link 구조라 별도 breadcrumb 변경 없음(제목으로 정합).
