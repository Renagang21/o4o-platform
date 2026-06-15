# CHECK-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1

> **작업명:** WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1
> **유형:** 저위험 UI 정렬 — 매장 허브 복사 **아이콘(Download→Copy) + "가져오기=복사·원본 단절" 안내 문구** 보강. API/DB/route/복사 구조 무변경.
> **결과: PASS — store-hub 복사 액션 7개 페이지 Download→Copy 아이콘 교체 + content 3서비스 decoupling 안내(infoTextAfter) 추가. 복사 라벨/용어는 서비스 공식 공간명 기준 유지(GP `내 약국`, KPA/KCos `내 매장`). typecheck(5) 0 errors.**
> 선행: `IR-O4O-STORE-CONTENT-PRODUCTION-AND-MANAGEMENT-SUPPORT-FLOW-V1`(B/E 잔여) — 2026-06-15

---

## 1. 목적

IR 에서 확인된 저위험 잔여(B/E): (1) 복사 버튼이 **Download 아이콘**이라 "파일 다운로드"로 오해 소지, (2) content browse 안내가 "복사된 콘텐츠는 [링크]" 로 **원본-사본 단절 안내 부재**. 복사 의미·아이콘·안내만 정렬. **복사 구조/API/DB/route/dedup 정책 무변경.**

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · origin 동기화(0/0) · staged 없음 |

동시 세션 WIP(`CHECK-...-ORDER-VIEW` M, `store-ui-core`/`pnpm-lock` M, PNG/IR untracked)은 미접촉(path-specific).

## 3. 용어 정책 결정 (§6.1)

**원칙: "무조건 통일" 아님 → 서비스 공식 공간명과 일치.**

| 서비스 | 공식 공간명 | 복사 라벨 | 결정 |
|--------|-----------|----------|------|
| KPA | 내 매장 | `내 매장에 복사` | 유지 |
| **GP** | **내 약국**(약국 전용 서비스) | `내 약국에 복사` | **유지** (명시적 가드 주석 `WO-...-GLYCOPHARM-HUBCONTENT-PHARMACY-LABEL-RESTORE-AND-GUARD-V1` "내 매장 일괄 치환 금지" 존중) |
| KCos | 내 매장 | `내 매장에 복사` | 유지 |

→ **라벨 텍스트 변경 0.** copiedLabel 도 3서비스 모두 `복사 완료` 로 이미 일관 — 변경 없음.

## 4. 아이콘 정렬 (§6.3) — Download → Copy

복사/가져가기 **액션 버튼**에 쓰인 `lucide Download`(파일 다운로드 오해) → `Copy` 교체. **실제 파일 다운로드 아이콘은 대상 아님**(검증: 모든 대상이 "복사되어/가져가기/매장 소유" 맥락의 copy 액션, 파일 9개 중 Download 출현은 import+usage 2회뿐).

| 서비스 | 파일 | 위치 |
|--------|------|------|
| GP | `pages/hub/HubContentListPage.tsx` | GlycoContentCard 복사 버튼 |
| GP | `pages/hub/HubBlogLibraryPage.tsx` | ActionBar bulk-import |
| GP | `pages/hub/HubPopLibraryPage.tsx` | ActionBar bulk-import |
| KCos | `pages/hub/HubContentPage.tsx` | KCosContentCard 복사 버튼 |
| KCos | `pages/hub/HubBlogLibraryPage.tsx` | ActionBar bulk-import |
| KCos | `pages/hub/HubPopLibraryPage.tsx` | ActionBar bulk-import |
| KCos | `pages/hub/HubQrLibraryPage.tsx` | ActionBar bulk-import |

> **KPA 는 대상 아님** — KPA content 복사 버튼은 `ContentHubTemplate` 기본 `DefaultTableView`(아이콘 없는 텍스트 버튼) 사용. KPA hub 자산 페이지에 Download-as-copy 없음.

## 5. 안내 문구 정렬 (§6.4) — content browse decoupling

`ContentHubTemplate` 에 **additive optional `infoTextAfter`** 신설(infoLinks 뒤 보조 문구) — 소비처 5곳 모두 미설정 시 무변화(안전).

content 3서비스 안내 보강(기존 "복사된 콘텐츠는 [내 매장/약국 > 자산 관리]" → 문장 완성 + 단절 안내):

| 서비스 | infoTextAfter |
|--------|--------------|
| KPA / KCos | `에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 매장 사본은 영향받지 않습니다.` |
| GP | `에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 약국 사본은 영향받지 않습니다.` |

> **POP/QR/블로그 hub 자산 페이지는 안내 보강 대상 아님** — 이미 충분한 안내 보유("가져온 X 는 매장 소유이며, 초안 상태로 복사되어 자유롭게 수정·발행할 수 있습니다"). WO §6.4 "이미 충분한 화면은 추가 금지" 준수.
> **중복 복사 안내(§6.5) 미적용** — 화면 과복잡 회피. dedup 정책 자체는 `WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1`(후속)로 분리.

## 6. 변경 파일 (9)

- `packages/shared-space-ui/src/ContentHubTemplate.tsx` — `infoTextAfter?` config + 렌더(additive).
- GP `pages/hub/`: `HubContentListPage`(아이콘+infoTextAfter) · `HubBlogLibraryPage`(아이콘) · `HubPopLibraryPage`(아이콘).
- KCos `pages/hub/`: `HubContentPage`(아이콘+infoTextAfter) · `HubBlogLibraryPage` · `HubPopLibraryPage` · `HubQrLibraryPage`(아이콘).
- KPA `pages/pharmacy/HubContentLibraryPage`(infoTextAfter).

총 +23 / -14.

## 7. 검증

- **TypeScript 0 errors:** `shared-space-ui` · `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society` · `web-neture`(shared 소비처) **각각 0**.
- **정적:**
  - 7 페이지 `Download` 잔존 0, `Copy` 2(import+usage) — `{ctx.copyLabel}` 텍스트 참조 유지(라벨 무변경).
  - copyLabel/copiedLabel **텍스트 diff 0** (아이콘 컴포넌트만 교체).
  - **API/route/onCopy/assetSnapshotApi 호출 변경 0** (git diff 확인).
  - `ContentHubTemplate.infoTextAfter` additive — 미설정 소비처(KCos/Neture library) 무영향.
- **무변경:** 복사 구조(o4o_asset_snapshots) · dedup 정책 · DB · migration · route · /store-hub browse 컴포넌트 구조 · 내 매장/자료실/제작자료 구조 · POP/QR/블로그 제작 기능 · AI.
- **browser smoke:** 미수행 — dev 서버 미기동·인증 guard. 라벨/아이콘/문구는 tsc + 정적으로 검증. (배포 후 `/store-hub/content`·`/store-hub/{pop,qr,blog}` 복사 버튼 아이콘(Copy)·안내 문구 렌더 확인 권장.)

## 8. 완료 판정

**PASS.** 복사 액션 아이콘(Download→Copy) 7페이지 + content decoupling 안내 3서비스 정렬. 복사 라벨/용어는 서비스 공식 공간명 기준 유지(GP 약국 가드 존중). API/DB/route/복사 구조/dedup 무변경, typecheck(5) 통과.

## 9. 후속

1. `WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1` — KPA `HubContentLibraryPage` vs GP/KCos near-identical browse wrapper 공통 추출.
2. `WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1` — 중복 복사 정책(허용 유지+안내 vs soft-dedup) 결정.
3. `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1` — 다중 테이블 경계 audit.
4. (선택) browser smoke — 복사 버튼 Copy 아이콘·infoTextAfter 렌더.

---

*Date: 2026-06-15 · WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1 · 복사 아이콘(Download→Copy) 7페이지 + content decoupling 안내 3서비스 PASS. 라벨/용어 공식 공간명 유지(GP 약국). API/DB/구조/dedup 무변경. typecheck(5) 0.*
