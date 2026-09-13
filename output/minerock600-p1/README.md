# MINEROCK600 VIDEO ASSET PREP P1 — 진행 기록

2026-09-13. 최종 영상은 제작하지 않았다. 신규 이미지 업로드는 Chrome 확장 파일 접근 설정 때문에 대기 중이다.

## VIDEO Job

- ID: `f7d74952-da6e-48ad-9472-bbfdd60fbc7c`
- [관리자 작업](https://admin.neture.co.kr/automation/video-jobs/f7d74952-da6e-48ad-9472-bbfdd60fbc7c)
- 제목: MINEROCK600 12편 설명형 판매영상 파일럿
- 상태: DRAFT
- INPUT: 기존 제품 Master 1건 연결을 화면에서 확인.
- INTERMEDIATE: 0건. 신규 업로드 대기.

## 기존 공개 자산 census

전체 50건, 3페이지의 파일명을 조사했다. 기존 검색은 제목·태그 등이 비어 있는 파일을 찾지 못했다. 미네락/MINEROCK/해양심층/암반수 검색은 기존 메타데이터 기준 0건이었다.

| 파일 | 판정 | 근거 |
|---|---|---|
| minerock-s.jpg | 사용: 실제 제품 identity anchor | 500×500 광고 이미지의 정면 제품. 원본 변경 없음. 고해상도 독립 제품 사진은 아님 |
| 미네락 600 상세.jpg | 보완: 스토리 참고 | 239×1200 저해상도 상세페이지. 제목·태그를 보완하고 REFERENCE/REVIEW로 저장 |
| item600_1000a.jpg | 보완: 상세페이지 변형 | 직접 내려받아 확인. 정면 단독 사진이 아닌 상세페이지 |
| minerock600.jpg | 중복 후보 | 이름과 50.61KB 크기가 기존 상세페이지와 유사. 바이트 단위 중복 확인 안 함 |
| image.png | 중복 후보 | 인접 등록·50.66KB. 내용 및 바이트 동일 여부 확인 안 함 |
| 해양 심층수 효능 POP.pdf | 사용 안 함: P1 이미지 원본에서 제외 | 기존 POP. 제품 근거·권리·표현 검수 미완료 |
| 해양 심층수 POP.pdf (2건) | 중복 후보, 이번 작업 제외 | 동일 이름·크기. 바이트 비교 안 함 |
| 해양 심층수 음용수 가치.pdf | 이번 작업 제외 | 문헌 내용 및 재사용 권리 미확인 |
| 해양 심층수 움용수와 이의 용도 알츠하이머 등.pdf | 이번 작업 제외 | 내용·권리 미확인. 질환 표현을 신규 제품 자산에 전용하지 않음 |

## 제품 Master

- 기존 asset ID: `215592fd-1a89-4db6-b716-0b78234c2b83`
- 제목: MINEROCK600 실제 제품 Master — 기존 정면 원본
- 실제 저장: `usageType=INPUT`, `status=APPROVED`, tags=`minerock600, product-front, bottle, master`
- 승인 범위: 기존 사진을 변경하지 않은 identity anchor. 확대 영상용 품질·AI 파생물 승인을 뜻하지 않는다.
- 원본: [product-master-source.webp](product-master-source.webp)
- 요청 Category=PRODUCT는 전용 필드가 없어 구조화 저장 미완료. 요청 분류와 승인 범위를 내부 메모에 기재했다. 기존 scope는 화면에서 확인되지 않았다.
- 참고 상세페이지 asset ID: `c54ea10d-9f04-412e-846d-a912ea113032` (`REFERENCE`, `REVIEW`).
- Cutout: 생성 시도 불합격. 원본의 `10 kcal`이 `(0 kcal)`로 바뀌고 작은 라벨 문자가 재생성됨. 승인·업로드·Job 연결하지 않았다.
- 보조 광고 scene: 정확한 cutout 확보 전 보류.

## 설명자 후보

- 로컬 후보명: O4O 한국 여성 약사 A (`presenter-a-review.png`). 실존 약사와 무관한 가상 AI 설명자.
- 제작: built-in image_gen. 외부 avatar/character ID는 아직 없음.
- 상태: REVIEW. 사용자가 선택하기 전 최종 APPROVED 등록하지 않는다.
- 한국어 음성/lip-sync: 미시험. 대표 이미지 확보와 말하는 avatar 생성은 별개다.
- [HeyGen 가격](https://www.heygen.com/pricing): 무료 사용 안내를 확인했으나 계정별 포함량·구체 후보 ID·음성 품질은 확인하지 못함.
- [HeyGen 한국어 지원](https://www.heygen.com/zh-hk/text-to-speech/korean): 한국어 음성과 자동 동기화 안내. 실제 청취 검증 없음.
- [Synthesia 라이선스](https://help.synthesia.io/en/articles/6341928-synthesia-video-licensing): avatar 유형별 조건이 달라 본 프로젝트에 적합한 개별 스톡 후보를 확정하지 않음.
- 스톡 인물의 얼굴·인종·나이·ID를 확인한 것처럼 보고하지 않는다. 외부 서비스 결제·로그인·계정 생성은 수행하지 않았다.

## 공통 그래픽

| 파일 | 요청 Category | Media Type | Purpose | 제작 검수 | Media Asset ID |
|---|---|---|---|---|---|
| mineral-icon-set.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| mineral-Na.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| mineral-K.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| mineral-Mg.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| mineral-Ca.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| cell-base.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| na-k-pump-static.png | PRODUCTION | IMAGE | REUSABLE | APPROVED | 업로드 대기 |
| east-sea-bedrock-reference.png | REFERENCE | IMAGE | REFERENCE | REVIEW | 업로드 대기 |

제작 검수 상태는 로컬 판정이며 Media Library 저장 완료 상태가 아니다. 공통 그래픽은 직접 작성한 도형으로 만들었다. 각 SVG에 `graphics`와 `editable-labels` 그룹이 있으며, PNG도 `-base.png`와 투명 `-labels.png`로 분리했다. SVG와 제작 코드는 공개 업로드 대상에서 제외하고 로컬 제작 원본으로 유지한다. 평면 PNG 8개를 등록한 뒤 Job에는 INTERMEDIATE로 연결할 예정이다.

Na/K 펌프는 세포 밖으로 3 Na+, 안으로 2 K+, 1 ATP를 사용하는 순이동 개념도다. [NCBI 설명](https://www.ncbi.nlm.nih.gov/books/NBK537088/)을 확인했으며 제품 효능으로 연결하지 않았다. 동해/암반 그래픽은 기존 공개 상세페이지의 `동해 1,050m 암반수` 문구에 기반한 참고도다. 1,050m를 해양 수심으로 표시하지 않으며 실제 지질·취수관·축척을 재현하지 않는다.

## 등록 제약과 EP01 전 필요 사항

1. Chrome 확장의 파일 URL 접근 허용 후 PNG 업로드 재개. 업로드 시도는 `fileChooser.setFiles: Not allowed`로 실패했으며 첨부 추가를 확인하지 못했다.
2. 신규 자산 메타데이터 저장, 공개 URL 검수, VIDEO Job INTERMEDIATE 연결 확인.
3. Category 전용 필드는 현행 UI/API에서 확인되지 않음. schema/API 변경은 별도 승인 범위이며 이번 작업에서 코드 변경하지 않았다.
4. 고해상도 실제 정면 원본 또는 제품 픽셀을 보존한 정확한 cutout 필요.
5. 설명자 후보 선택, 이후 서비스의 실제 avatar ID·한국어 음성·lip-sync·사용 조건 검증 필요.
6. 최종 영상 생성은 이번 범위 밖.

## 검증 / Git / 문서 정합

- 생성 toast와 Job 상세에서 DRAFT 생성 및 INPUT 1건 연결을 확인.
- 기존 2개 자산의 메타데이터 저장 결과를 화면에서 확인.
- 원본 이미지 3개와 생성 캐릭터, 공통 그래픽 검수. Na+ 글꼴 깨짐을 수정하고 Na/K 도식 재검수.
- 코드·DB schema·dependency·배포 변경 없음. commit/push 없음. 다른 세션 변경은 건드리지 않음.
- 문서 정합: 콘텐츠 검색의 파일명 누락과 요청 Category 분류 대비 구현 격차를 보고. canonical 문서 변경 없음.
