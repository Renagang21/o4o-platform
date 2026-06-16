# CHECK-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1

> **작업명:** WO-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1
> **유형:** copy 정책 사용자-facing 문구 정렬 (조사 중심, 코드/DB/API 무변경)
> **판정: PASS (by verification).** copy/import 주요 UI 문구를 4서비스+공통 package 전수 조사한 결과, **가져오기=복사·원본 단절·재복사 허용·삭제 영향·publish↔copy 구분이 이미 정책대로 정렬**되어 있음(선행 WO들이 달성). 정책 위배 anti-pattern 0건. **코드 변경 불요** → 문구 churn 미수행(다른 세션 WIP 충돌 회피). 잔여는 cosmetic nit 1건만.
> 선행: CONTENT-TYPE-TAXONOMY-V1 · CONTENT-SURFACE-COMMONIZATION-MAP-V1 · STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1 · STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1 — 2026-06-16

---

## 1. 조사 범위

- Frontend: web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture 의 store-hub / library / my-content / content hub 페이지.
- Packages: `@o4o/shared-space-ui` ContentHubTemplate/ContentHubCardGrid(공통 copy 문구 주입), store-ui-core.
- 키워드: 가져오기/가져가기/복사/사본/담기/내 약국/내 매장/내 보관함/원본/삭제/Hub/publish/assetSnapshot/dashboardCopy.

## 2. 핵심 결론 — 이미 정렬됨 (선행 WO 달성)

**Store Hub content 복사(WO §9 우선순위 #1)는 공통 `ContentHubTemplate` config 로 3 store service 전부 정렬 완료:**

| 서비스 | copyLabel | infoTextAfter (원본 단절) |
|---|---|---|
| KPA `HubContentLibraryPage` | "내 매장에 복사" | "…별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 매장 사본은 영향받지 않습니다. 다시 복사하면 새 사본으로 저장…" |
| GlycoPharm `HubContentListPage` | "내 약국에 복사" | "…원본이 수정·삭제되어도 내 약국 사본은 영향받지 않습니다…" |
| K-Cosmetics `HubContentPage` | "내 매장에 복사" | (동일 gold-standard 문구) |

근거: `STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1`(가져오기=복사·원본 단절) + `STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1`(재복사 허용, '복사 완료'=이력) 이 이미 적용. 공통 props: `copyLabel/copiedLabel/copyingLabel/recopyLabel/infoText/infoTextAfter`(`shared-space-ui/ContentHubTemplate.tsx`).

## 3. surface 별 정렬 상태

| Surface | 상태 | 근거 |
|---|---|---|
| Store Hub content 복사 버튼/안내 | ✅ 정렬 | §2 (copyLabel + 원본 단절 infoTextAfter) |
| copy 성공 toast | ✅ | GP "…내 약국에 복사되었습니다", KCos "…내 매장에 복사되었습니다", blog "가져오기 완료 — 내 매장 블로그(초안)에 추가" |
| Blog/POP/QR Hub 가져가기 | ✅ copy 전달 | 버튼 "내 매장에 가져가기" + info "가져온 블로그는 매장 소유이며, **초안 상태로 복사**되어 자유롭게 수정·발행" + toast "초안" |
| My Store/library 사본 삭제 confirm | ✅ | KPA ResourcesPage snapshot 삭제 "내 자료함에서 제거…**원본 커뮤니티 자료는 삭제되지 않습니다**"(단건/일괄). 직접 업로드(비-사본)는 원본 문구 미적용(정상) |
| Hub publish ↔ copy 구분 | ✅ | anti-pattern("Hub에 복사"/"원본 가져오기"/"상품설명으로 가져오기") **0건**. publish=노출, copy=사본 분리 유지 |
| Neture dashboardCopy 문구 | ✅(문구 한정) | MyContentPage "허브에서 **복사**한 콘텐츠", "허브에서 가져온 콘텐츠 관리", 카드 "…복사"(copiedAt). 구조 정렬은 후속 |
| 서비스별 용어 | ✅ 유지 | KPA/KCos="내 매장", GP="내 약국"(가드됨, PHARMACY-LABEL-RESTORE-AND-GUARD-V1). 선행 결정 보존 — 본 WO 에서 변경 안 함 |

## 4. anti-pattern 점검 (WO §4.4)

```
rg "Hub에 복사|허브에 복사|원본 가져오기|연결된 콘텐츠 가져오기|상품설명으로 가져오기" → 0건
```
→ publish 를 copy 로, copy 를 reference 로 오인시키는 문구 **없음**.

## 5. 잔여 nit (코드 변경 미수행)

| nit | 판단 |
|---|---|
| Blog/POP/QR Hub 버튼 동사 "가져가기"(≠"복사") | info+toast 가 "초안 상태로 복사"로 copy 의미 전달 → WO §4.1 이 "가져가기"를 허용 가능 표현으로 명시. 3서비스×3타입(9파일) 동사 변경은 cosmetic + 회귀/WIP 충돌 위험 > 가치 → **미변경**(필요 시 후속 cosmetic 건) |
| Neture dashboardCopy 구조(draft/publish/archive) | 문구는 "복사/가져온"으로 정렬됨. 모델 구조 정렬은 후속 `HUB-MY-STORE-COPY-CONTRACT` |

## 6. 코드 변경 / 무변경

- **코드 변경 없음.** 조사 결과 정책 위배·오해 유발 문구가 없어 추가 정렬 불요.
- API/DB/schema/route/menu/copy 동작 **무변경**.
- 다른 세션 WIP(`web-glycopharm`/`web-k-cosmetics` App.tsx·operatorMenuGroups, `operator-core-ui/forum-hub`, 3서비스 OperatorForumPage = FORUM-HUB-READONLY-INTRODUCE) **미접촉**.

## 7. Typecheck

- 코드 변경 없음 → typecheck 비대상(문서 단독). 향후 cosmetic 후속에서 TSX 변경 시 해당 서비스 typecheck 수행.

## 8. 완료 판정

**PASS (by verification).**
- copy/import 주요 UI 문구 전수 조사 완료.
- 가져오기=복사·원본/사본 분리·삭제 영향·재복사 허용·publish↔copy 구분 **이미 정렬 확인**(선행 WO 달성), anti-pattern 0.
- 서비스별 내 약국/내 매장 표현 유지.
- API/DB/schema 변경 없음.
- 잔여는 cosmetic nit(blog/pop/qr 동사)만 — 후속 선택.

> 본 WO 의 실질 가치 = "이미 copy 인 동작이 사용자에게 copy 로 정확히 설명되고 있음"을 근거와 함께 **검증·확정**. 추가 문구 변경은 가치 대비 위험(WIP 충돌·회귀)으로 미수행.

## 9. 후속 WO 후보

1. (선택, cosmetic) `WO-O4O-CONTENT-HUB-IMPORT-VERB-MICROCOPY-V1` — blog/pop/qr Hub 버튼 "가져가기"→"복사" 미세 정렬(원하면).
2. `WO-O4O-CONTENT-HUB-MY-STORE-COPY-CONTRACT-V1` — assetSnapshot ↔ Neture dashboardCopy 모델 정렬(구조).
3. `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — 보안 backlog(raw 저장 sanitize 확장).
4. `WO-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1`.

## 10. Commit Hygiene

- 본 CHECK 문서 **단독** path-specific stage, 단일 shell call 로 `add → diff --cached → commit → push` 체인. 다른 세션 WIP 미접촉.

---

*Date: 2026-06-16 · content copy policy UI label · PASS(by verification) · Store Hub 복사 문구(copyLabel+원본 단절 infoTextAfter) 3서비스 정렬 완료(선행 WO) · blog/pop/qr "초안 상태로 복사" · 삭제 confirm 원본 영향 안내 · anti-pattern 0 · Neture "허브에서 복사" · 코드/DB/API 무변경 · 잔여 cosmetic nit(가져가기 동사)만.*
