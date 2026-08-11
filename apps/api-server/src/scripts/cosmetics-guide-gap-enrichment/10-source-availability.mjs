/**
 * WO §3 · §12 — 추가 원천 확보 시도 결과를 **실측 근거와 함께** 남긴다.
 *
 * 이 파일은 손으로 쓴 요약이 아니라 실제 탐침 결과를 기록한 것이다.
 * 재현: `tmp/cosmetics-guide-gap-enrichment/probe-*.mjs`
 */
import { writeOut } from './lib.mjs';

writeOut('source-availability.json', {
  wo: 'WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1',
  measuredAt: '2026-08-11',
  policy: '차단(401/403/challenge)을 만나면 우회하지 않는다 (WO §3).',
  sources: [
    {
      priority: 1,
      name: '식약처 기능성화장품 보고 상세 (nedrug.mfds.go.kr/pbp/CCBDC01/getItem)',
      status: 'AVAILABLE',
      evidence: '목록 356KB 정상 · 상세 1,289건 수집 실패 0 · 429 0건 · 221초',
      fields: ['효능효과', '용법용량', '사용상의주의사항', '화장품책임판매업자', '보고완료일자'],
      used: true,
      note: '이번 WO 에서 실제로 사용한 유일한 외부 원천. 공식 원천이라 가장 강한 근거다.',
    },
    {
      priority: 2,
      name: '무신사 뷰티 상품 상세 (www.musinsa.com/products/{id})',
      status: 'NO_STRUCTURED_DATA',
      evidence:
        '특징 결손 100건 표본에서 상품정보제공고시 표 확보 0건(0%). 전체 결손 30건 표본에서도 1건(3%). ' +
        '고시 정보는 페이지에 없고 별도 API 로 불러온다 — api2/dp/v1/goods/{id} 400 · goods-detail/goods/{id} 400 · api2/goods/{id} 404.',
      used: false,
      note: '판매자가 상세를 이미지로 올리면 텍스트 사실값이 아예 없다. 사설 API 를 역설계하지 않았다.',
    },
    {
      priority: 3,
      name: '화해 상품 상세 (www.hwahae.co.kr/products/…)',
      status: 'BLOCKED',
      evidence: '상품 페이지·_next/data 모두 HTTP 202 + 본문 0바이트 (봇 차단)',
      used: false,
    },
    {
      priority: 3,
      name: '올리브영 국내몰 (www.oliveyoung.co.kr)',
      status: 'BLOCKED',
      evidence: 'getGoodsDetail.do · getSearchMain.do 모두 HTTP 403',
      used: false,
    },
    {
      priority: 3,
      name: '올리브영 글로벌 (global.oliveyoung.com)',
      status: 'BLOCKED',
      evidence: '검색 HTTP 403 (census 당시 수집한 베스트 100 목록만 보유)',
      used: false,
    },
    {
      priority: 4,
      name: '글로우픽 (glowpick.com)',
      status: 'BLOCKED',
      evidence: '검색 HTTP 403',
      used: false,
    },
    {
      priority: 4,
      name: '네이버 쇼핑 (search.shopping.naver.com)',
      status: 'BLOCKED',
      evidence: 'HTTP 418',
      used: false,
    },
    {
      priority: 5,
      name: '선행 census 판매명 (무신사·화해·올리브영 목록 원문)',
      status: 'AVAILABLE',
      evidence: '이미 보유한 원문. 선행 생산이 놓친 용량·구성 표기를 재추출했다.',
      used: true,
      note: '새 원천이 아니라 **기존 원천의 미추출분**이다. WO §3 우선순위 4 에 해당한다.',
    },
  ],
  conclusion:
    '상업 소매 상세는 전부 차단되거나 텍스트 사실값이 없다. 확보 가능한 추가 원천은 식약처 공식 보고 상세뿐이며, ' +
    '나머지 보완은 이미 게시된 판매명에서 선행 생산이 놓친 사실값을 다시 읽는 방식으로만 가능하다.',
});
