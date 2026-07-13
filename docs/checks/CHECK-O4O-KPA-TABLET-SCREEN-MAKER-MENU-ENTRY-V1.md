# CHECK-O4O-KPA-TABLET-SCREEN-MAKER-MENU-ENTRY-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-MAKER-MENU-ENTRY-V1`
> 성격: 매장 관리자 메뉴 **진입성 개선** (신규 기능 아님)
> Date: 2026-07-13

---

## 0. 결론

WO 전제(“태블릿 화면 제작 진입점이 없음 → 메뉴 추가”)와 코드 현실이 달랐다. **진입 메뉴는 이미 존재**했고(KPA: `타블렛 구성` → `/commerce/tablet-displays`), 문제는 부재가 아니라 **라벨이 ‘화면 제작 진입’으로 읽히지 않음**이었다.

→ 신규 메뉴 추가(같은 route 중복·혼란) 대신 **기존 항목의 라벨만 `태블릿 화면 제작`으로 정비**했다. KPA 블록 한정, key/subPath/route/기능/API/DB 무변경.

사용자 확정(2026-07-13): “라벨만 ‘태블릿 화면 제작’으로 변경”.

---

## 1. 기존 메뉴 구조 조사 (read-only)

매장 사이드 메뉴 SSOT = `packages/store-ui-core/src/config/storeMenuConfig.ts` (공통 모듈, 3개 서비스 config).

태블릿 진입점 현황(변경 전):

| 서비스 | 메뉴 | 라벨 | 그룹 | subPath |
|--------|:---:|------|------|---------|
| **KPA-Society** | ✅ | 타블렛 구성 | 약국 경영지원 | `/commerce/tablet-displays` |
| K-Cosmetics | ✅ | 태블릿 | 채널 | `/commerce/tablet-displays` |
| GlycoPharm | ❌ | — | — | (route는 존재, 메뉴 미노출) |

- KPA 진입점은 선행 `WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1` 에서 `약국 경영지원`(상품 설명·블로그·POP·QR 과 동일 그룹)으로 이동하며 `타블렛 구성` 라벨이 부여됨.
- route 등록: `services/web-kpa-society/src/App.tsx:1002` `commerce/tablet-displays` → `StoreTabletDisplaysPage`. (변경 없음)

## 2. Shared Module Change Rule 확인 (CLAUDE.md §1)

- 변경 파일 = 공통 모듈 `storeMenuConfig.ts`. 모든 소비처(KPA/GP/KCos) 영향 검토 완료.
- 수정 범위는 **KPA_SOCIETY_STORE_CONFIG 블록의 단일 항목 label 문자열**뿐 → GP/KCos config 무접촉.
- `타블렛 구성` 라벨을 코드에서 하드코딩하는 다른 소비처 없음(grep: 코드 히트는 이 파일 1건 + 문서만).
- 데드링크 0 / 기능 은폐 0: route 유지, 새 항목 미추가(중복 방지).

## 3. 변경 내용

`packages/store-ui-core/src/config/storeMenuConfig.ts` (KPA 블록):
```
- { key: 'tablet-displays', label: '타블렛 구성',      subPath: '/commerce/tablet-displays' }
+ { key: 'tablet-displays', label: '태블릿 화면 제작', subPath: '/commerce/tablet-displays' }
```
- key / subPath / route / 권한 / 페이지 / API / DB **무변경**.
- 라벨 변경 사유를 in-code 주석으로 명시(WO 참조).

## 4. 메뉴명 / 위치 / 라우트 / 권한

| 항목 | 값 |
|------|------|
| 메뉴명 | 태블릿 화면 제작 |
| 그룹 | 약국 경영지원 (상품 설명 · 블로그 · POP · QR-code 와 나란히) |
| 라우트 | `/store/commerce/tablet-displays` (불변) |
| 권한 | 기존 매장 관리자 접근 정책 그대로(변경 없음) |

- WO §5 “commerce 기술 구조가 메뉴명에 드러나지 않게 / 상품·거래 밑에 숨기지 않게” 기준 충족: 이미 `약국 경영지원` 콘텐츠 제작 그룹에 위치.

## 5. 금지 범위 준수 (WO §8)

새 태블릿 기능 / Screen Set / content_list / API / migration / public viewer / 터치 UI / seed / 운영 샘플 — **전부 무변경**. write = label 문자열 1건.

## 6. 검증

| 항목 | 결과 |
|------|------|
| typecheck (web-kpa-society `tsc --noEmit`) | ✅ EXIT 0 |
| 다른 소비처 라벨 하드코딩 없음(grep) | ✅ |
| GP/KCos config 무영향 | ✅ |
| 브라우저 smoke (메뉴 노출/클릭 이동) | ⏳ 배포 후 prod 검증 |

## 7. 변경 파일

```
packages/store-ui-core/src/config/storeMenuConfig.ts   (KPA 블록 label 1건 + 주석)
docs/checks/CHECK-O4O-KPA-TABLET-SCREEN-MAKER-MENU-ENTRY-V1.md   (신규)
```

## 8. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| 매장 경영자가 메뉴에서 태블릿 화면 제작을 찾을 수 있음 | ✅ (라벨 명확화) |
| 메뉴 클릭 → 기존 태블릿 관리 화면 진입 | ✅ (route 불변) |
| 기존 기능 불변 | ✅ |
| typecheck 통과 | ✅ |
| CHECK 문서 commit/push | ✅ (본 커밋) |

---

*진입점은 이미 존재(KPA `타블렛 구성`). 부재가 아닌 라벨 명확성 문제 → `태블릿 화면 제작`으로 라벨만 정비(KPA 블록 한정, route/기능 무변경). 신규 메뉴 추가 안 함(중복 방지). typecheck PASS. 브라우저 smoke=배포 후 prod.*
