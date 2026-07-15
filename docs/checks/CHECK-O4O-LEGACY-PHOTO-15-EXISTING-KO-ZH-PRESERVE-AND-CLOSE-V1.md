# CHECK-O4O-LEGACY-PHOTO-15-EXISTING-KO-ZH-PRESERVE-AND-CLOSE-V1

> **작업명:** 구형 photo 15건 기존 ko/zh 설명서 보존 + Batch 0 재작성·grounding 종료
> **유형:** read-only 확인 + 문서 확정 — **코드 0 · DB write 0 · 설명서 생성/수정/삭제 0 · canonical/QR 변경 0**
> **결과: PASS — 15건 전량 `PRESERVE`, Batch 0 재작성·grounding 종료**
> **근거 WO:** WO-O4O-LEGACY-PHOTO-15-EXISTING-KO-ZH-PRESERVE-AND-CLOSE-V1 (사용자 지시, 2026-07-15)
> **선행:** [`CHECK-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1`](CHECK-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1.md) · [`CHECK-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1`](CHECK-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1.md)
> **작성일:** 2026-07-15

---

## 0. 요약

구형 photo 기반 15개 제품은 **한국어·중국어 STORE 설명서가 이미 존재하는 완료 콘텐츠**임을 프로덕션 read-only 로 재확인했다. 신규 semantic `ko+en` 설명서를 제작하지 않고, 기존 ProductMaster·ko/zh 설명서·canonical 상태·Landing 을 **현재 상태로 보존**한다. 공식 grounding 을 현재 재현할 수 없다는 이유만으로 기존 설명서를 삭제·재작성·HOLD 전환하지 않는다. 본 결정으로 해당 15건의 Batch 0 재작성 및 grounding 작업을 종료한다. **명백한 오류 0건**(§9). DB write 0, 코드 0.

---

## 1. 실행 전 read-only 확인 (§5)

- 대상 = 프로덕션에서 기존 `zh` STORE 설명서를 보유한 `regulatory_type='건강기능식품'` **정확히 15건**(선행 CHECK 실측). 존재 수 재확인 = **15/15 존재**, 삭제·비활성 0.
- 각 제품: STORE **ko canonical + zh canonical 둘 다 존재**. description_type=STORE(+ 7건 B2B), source_type/status 정상. ProductMaster 연결 정상.
- 삭제된 손상 ProductMaster 5건·일반식품 = 본 WO 무관(미포함).

## 2. 제품별 기록 (§6) — 전량 PRESERVE

| # | 제품 | ProductMaster ID | STORE ko canonical | STORE zh canonical | B2B canon | Landing | QR | 처리 |
|---|------|------------------|--------------------|--------------------|:--:|:--:|:--:|:--:|
| 1 | 맨 파워 포텐 | `f5f88abb-17d6-405c-9450-cc8cb9d0b066` | `ec2a0676-…` | `028e7bf9-…` | 2 | 0 | 0 | PRESERVE |
| 2 | 모어 플러스 & 비오틴 | `50414d47-ff50-430b-8010-c6ca0450add8` | `c28f42be-…` | `ad0cc08b-…` | 2 | 0 | 0 | PRESERVE |
| 3 | 이가돌 맥스 | `90e00d92-d21f-4d8e-8ee0-4b9cd636f9cf` | `e8398ef7-…` | `2bfee3e2-…` | 0 | 0 | 0 | PRESERVE |
| 4 | 코큐텐 액티브 | `cb26c8b3-121c-4cd6-9730-3f5538421895` | `bee50f8c-…` | `2a3ba9d5-…` | 0 | 0 | 0 | PRESERVE |
| 5 | 프리미엄 브레인 솔루션 에스 | `7a5764c6-5870-419e-97b3-40be8e86703b` | `10f427d2-…` | `27c189bc-…` | 2 | 0 | 0 | PRESERVE |
| 6 | 듀얼케어 락토바이옴 | `9440c2ac-0ec1-404f-b6d1-c36a5e7c4fb6` | `138ebe14-…` | `03c62670-…` | 2 | 0 | 0 | PRESERVE |
| 7 | 로얄파워민 프로 | `29286920-36ec-4fe8-a49d-fc72871d4cf5` | `53789801-…` | `d5a24ee6-…` | 0 | 0 | 0 | PRESERVE |
| 8 | 락토밸런스 프로바이오틱스 + 아연 | `a583b71b-c6ab-4440-b421-abe0c6f50e3b` | `6620dd21-…` | `9cfffd7b-…` | 2 | 0 | 0 | PRESERVE |
| 9 | 프리미엄 알티지 오메가3 | `ff92d6bd-087b-40fa-8cd0-153b3752dde9` | `ba968268-…` | `ddd9cc28-…` | 0 | 1 | 0 | PRESERVE |
| 10 | 프리미엄 헤파에이스 400 | `069f70af-43c8-48bb-ba94-a7897bace32d` | `ea57f4eb-…` | `41aae5cf-…` | 0 | 1 | 0 | PRESERVE |
| 11 | 파워 본 케이투 엔 디 5000 | `a7f5272d-7099-491f-b2e8-21d5e13f44f5` | `d76ab8f7-…` | `374ab873-…` | 0 | 0 | 0 | PRESERVE |
| 12 | 아스타잔틴 루테인 600 | `3e46616f-b2ff-4788-b974-08792fd2c0f3` | `b275196d-…` | `9089ee37-…` | 0 | 0 | 0 | PRESERVE |
| 13 | 징코Q 마그시아 | `0a47e0bc-38d0-45ae-9e6a-15a71ff80e1d` | `d7da1738-…` | `ddc50c92-…` | 0 | 0 | 0 | PRESERVE |
| 14 | 징코Q젠시아 | `325c2ad9-4e3f-4870-84e2-e7c558e52223` | `1d78a4bb-…` | `63550c83-…` | 2 | 0 | 0 | PRESERVE |
| 15 | 면역엔 이뮨 부스터 α | `fa5141ee-bec7-4314-9ad8-6d9d0ea7aaaa` | `f1696a17-…` | `3709b3c8-…` | 2 | 0 | 0 | PRESERVE |

- STORE ko/zh SPD 는 전부 **canonical**. 추가로 STORE ko/zh candidate 잔여 및 B2B ko/zh canonical(7건)이 있으나 모두 기존 완료 콘텐츠로 보존(선행 CHECK §1 상태 요약: canonical ko 22/zh 22, candidate ko 9/zh 6).
- SPD id 는 표시 공간상 앞 8자만 표기 — 전체 id 는 작업 스냅샷(scratchpad `hff_preserve.sql`/`hff_spdids.sql` 출력)에 보존.
- **주의(이가돌 맥스)**: LEDGER "충돌 처리(손대지 말 것)" 대상 — 기존 STORE ko/zh canonical 그대로 보존(무변경).

## 3. Landing / QR 연결 현황 (§5.3)

- Landing 보유 = **2건**(알티지 오메가3, 헤파에이스, 각 1). 나머지 13건 = 0.
- 이 2건의 Landing 을 가리키는 QR = **0**(admin-qr-view 계열 프리뷰 아티팩트로 추정, 선행 corrupted-delete 조사와 일관). QR 실사용 노출 0.
- 본 WO 는 연결을 **수정하지 않고 현재 상태만 기록**.

## 4. 확정 정책 반영 (§4)

- 기존 ko/zh 설명서·canonical·candidate·ProductMaster·Landing/QR **전부 유지**.
- 15건 신규 제작 안 함: ko 재작성 0 / zh 재작성 0 / en 추가 0 / semantic 재구성 0 / 신규 STORE SPD 0.
- 영어 설명서는 향후 실제 서비스 요구 확정 시 **별도 작업**(이번 범위 아님).
- grounding 재조사 종료(이번 15건 한정). 원 표시사항 부재는 **오류로 보지 않음**.
- 본 결정은 **구형 photo 15건 보존에 한정** — 신규 HFF 제작 / 41,261 후보 처리 / 일반식품·공급자·다국어 정책은 무변경(§4.4).

## 5. 기존 작업 종료 처리 (§7)

| 계획/문서 | 상태 |
|---|---|
| Batch 0 semantic ko+en 재작성 (15건) | **종료**(미실행) — 본 CHECK 로 대체 |
| Batch 0 grounding 확보 (15건) | **종료**(READY 0, [grounding CHECK](CHECK-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1.md)) |
| `WO-O4O-LEGACY-PHOTO-15-TEMPORARY-DESCRIPTION-RECOVERY-V1` | **미생성·미실행**(repo 부재 확인) — 실행하지 않음 |
| 15건 guarded delete / 상품군 재분류 | **미실행**(계획 폐기) |

- 선행 두 Batch 0 CHECK 는 삭제하지 않는다(역사 보존). 본 CHECK 가 15건에 대한 **최종 상태(PRESERVE) 및 재작성·grounding 종료**를 확정한다.

## 6. 예외 처리 (§9) — 발견 0

15건 전수 확인 결과 아래 오류 **없음**:

```text
ko/zh 설명서 실제 부재      0  (전 제품 STORE ko+zh canonical 존재)
다른 master 오연결           0
본문 비어 있음               0  (길이 3.1k~5.7k)
제품명↔콘텐츠 불일치          0
깨진 HTML 표시 불가           0
Landing/QR 오연결            0  (QR 0)
```

- "공식 품목번호 없음 / 현재 grounding 재현 불가" 는 §9 에 따라 **오류로 분류하지 않음**. 후속 정비 WO 불필요.

## 7. 무변경 확인

```text
ProductMaster 수정        0
regulatory_type/제품명/제조사 변경  0
SPD 생성·수정·삭제         0
canonical 승격·강등        0
언어 추가·삭제             0
ProductLanding/QR 수정     0
migration / API / 프론트   0
deploy                    0
DB 접근                   read-only only
```

## 8. 완료 판정

**PASS.** 대상 15건 정확 확인 · 기존 ko/zh 설명서·상태 기록 · ProductMaster/Landing/QR 무변경 · 신규 ko/en 설명서 0 · 기존 설명서 수정·삭제 0 · DB write 0 · 코드 0 · Batch 0 재작성·grounding 종료. 명백한 오류 0.

## 9. 최종 확정 문구

> 구형 photo 기반 15개 제품은 한국어·중국어 설명서가 이미 존재하는 완료 콘텐츠이므로 신규 설명서를 제작하지 않는다. 기존 ProductMaster, ko/zh 설명서, canonical 상태 및 Landing·QR 연결을 현재 상태로 보존한다. 공식 grounding을 현재 재현할 수 없다는 이유만으로 기존 설명서를 삭제하거나 재작성하지 않는다. 본 결정으로 해당 15건의 Batch 0 재작성 및 grounding 작업을 종료한다.

## 10. 후속 작업 필요 여부

- 15건 관련 **후속 정비 불필요**(오류 0).
- 신규 HFF 설명서 제작은 별개 트랙 — 41,261 후보 중 시판 확인 + 공식 grounding 확보 제품에 한해 진행(준비 완료 CHECK §5 규칙).

## 11. 커밋

- commit: 본 CHECK 문서 1개(docs 전용, path-scoped). 무관 dirty/lockfile 미포함.
- 배포: 없음(문서 전용).
