/** Optional editorial tags on the existing CarePharm member-material record. */
export const CAREPHARM_MATERIAL_TAGS = ['자료 묶음', '약국 운영', '안내물', '혈당 관리', '혈압 관리', '생활습관'] as const;

/** Blank writing outlines, never published samples or clinical guidance. */
export const CAREPHARM_MATERIAL_OUTLINES = [
  {
    name: '주제별 자료 묶음', tag: '자료 묶음',
    html: '<h2>자료 묶음의 목적</h2><p>주제와 활용 대상을 작성하세요.</p><h2>포함 자료</h2><p>함께 사용할 자료의 이름과 내용을 안내하세요.</p><h2>내 매장 활용 순서</h2><p>사본을 가져와 편집하고 안내물에 활용하는 순서를 작성하세요.</p><h2>갱신 안내</h2><p>작성 기준일과 변경 사항을 작성하세요. 기존 매장 사본은 자동으로 갱신되지 않습니다.</p>',
  },
  {
    name: '약국 운영 실무자료', tag: '약국 운영',
    html: '<h2>어떤 업무에 쓰나요?</h2><p>이 자료가 필요한 약국 업무를 작성하세요.</p><h2>준비 사항</h2><p>약국에서 준비하거나 확인할 사항을 작성하세요.</p><h2>실행 순서</h2><ol><li>첫 번째 단계를 작성하세요.</li><li>다음 단계를 작성하세요.</li></ol><h2>점검 목록</h2><p>적용 후 확인할 사항을 작성하세요.</p>',
  },
  {
    name: '매장 안내물 원본', tag: '안내물',
    html: '<h2>안내 문구</h2><p>약국에서 활용할 안내 문구를 작성하세요.</p><h2>제작·활용 안내</h2><p>POP 또는 블로그에 활용할 때 편집할 부분을 안내하세요.</p><h2>사용 조건과 기준일</h2><p>자료의 출처·사용 조건·작성 기준일을 작성하세요.</p>',
  },
] as const;
