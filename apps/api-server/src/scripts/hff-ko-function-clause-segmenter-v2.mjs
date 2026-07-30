/**
 * HFF ko 기능성 절 분절기 V2 (제안).
 *
 * 출처: WO-O4O-HFF-KO-FUNCTION-CLAUSE-SEGMENTER-NORMALIZATION-AND-BACKFILL-TARGET-REBASE-V2
 *   전량 41,261건 회귀 · fixture 23/23 PASS · 수동 표본 60건 · 렌더 34건 × 3폭 검증 완료.
 *
 * 다루는 결함(전량 실측 근거):
 *   ① 긴 `[원료명]` 라벨을 기능성 절로 오인 — 길이 상한이 아니라 대괄호 여닫힘 균형 + 구조 조건으로 판정
 *   ② `L.` `B.` `S.` 균종 약어 period 오분절 — 뒤따르는 소문자 종명 문맥과 함께만 보호
 *   ③ `(1)` `①` `⑯~⑳` `가.` `(가)` 마커 인식 — `·` 는 단독 절 구분자로 쓰지 않음
 *   ④ 공식 영문 병기 분류 — ko 만 저장, 영문은 메타데이터. 자동 번역·삭제 없음
 *   ⑤ 제품형태·원료명·인정번호 라인을 기능성 절과 분리
 *   ⑥ 비교기 인공물(선행 `]` `.` · 언어 표기 파편) 제거
 *
 * 불변식: 저장 대상 절은 flat(MAIN_FNCTN) 의 부분문자열. 공식 문구를 삭제·순화·번역·재작성하지 않는다.
 *   불확실하면 삭제하지 않고 사람 검토(UNRESOLVED / LOW)로 분류한다.
 *
 * 의존성 주입: 기존 driver 의 norm/flat 을 그대로 재사용해 정규화 계약을 이중 정의하지 않는다.
 */

/** @param {{norm:(s:string)=>string, flat:(s:string)=>string}} deps */
export function createSegmenter({ norm, flat }) {

  /* ── §9 라벨 인식 ──────────────────────────────────────────────────────────────
     길이 상한을 임의 숫자로 올리지 않는다. "닫는 대괄호 + 구조적 위치 + 라벨 성격" 3조건. */
  // 라벨 안에 실제 기능성 서술이 있으면 라벨이 아니다(여러 절을 한 라벨로 흡수 금지).
  const LABEL_PRED = /도움[을이]?\s*(줄|주는|될|됨|줌)|에\s*필요|개선에|유지에|감소시|억제하|완화하|증진에|줄일\s*수|형성에/;
  // 절 단위 공식 기능성 서술 판정. HFF 공식 기능성 어휘 실측 기반(관대 — 기존 저장 동작 보존 방향).
  const FUNC_PRED = /(도움|필요|개선|감소|유지|증진|억제|보호|완화|형성|촉진|저하|공급|생성|배출|흡수|항산화|기능성|작용|완충|조절|저해|원활|증식|건강|대사|이용|관여|합성|발달|성장|적응|정상|회복|흐름|위험|피로|면역|기억력|운반|활성|보충)/;
  const FORM_WORD = /(정제|캡슐|캅셀|분말|과립|액상|젤리|츄어블|산제|시럽|타블렛|구미|스틱|음료|환$|정$|차$)/;
  const ING_SUFFIX = /(추출물|분말|농축액|복합물|유지|프로바이오틱스|발효물|올리고당|펩타이드|비타민\s?[A-K][0-9]*|엽산|철|아연|구리|셀렌|셀레늄|망간|요오드|칼슘|마그네슘|나이아신|비오틴|판토텐산|루테인|제품)$/;
  const JOSA = /(에|을|를|이|가|은|는|하여|되는|으로|로|와|과)\s/;
  const NOTICE_ONLY = /^[\s()\[\]]*(?:개별인정형?|기능성원료인정|고시형)?\s*제?\s?\d{4}\s?-\s?\d+\s?호[\s()\[\]]*$/;
  const LANG_KO_ONLY = /^\(\s*국문\s*\)\s*$/;
  const LANG_EN_ONLY = /^\(\s*영문\s*\)\s*$/;
  const EN_CLAIM = /\b(may|help|helps|reduce|reducing|improve|maintain|support|supports|promote|health|function)\b/i;
  const HANGUL = /[가-힣]/;

  /** 균종 약어 보호 (§10). 전수 실측 결과 실제 약어는 L./B./R./P. + 소문자 종명.
   *  "대문자 한 글자 + ." 를 무조건 보호하지 않고, 뒤따르는 소문자 종명(3자 이상) 문맥을 함께 요구한다. */
  const ABBREV_SENTINEL = String.fromCharCode(1);
  const protectAbbrev = (s) => s.replace(/(^|[\s(·,])([A-Z][a-z]{0,4})\.(\s*)(?=[a-z]{3,})/g, (_m, pre, ab, sp) => `${pre}${ab}${ABBREV_SENTINEL}${sp}`);
  const restoreAbbrev = (s) => s.split(ABBREV_SENTINEL).join('.');

  /* ── §11 마커 정규화 ──────────────────────────────────────────────────────────
     기존 ①~⑮ 외에 ⑯~⑳ / ⑴~⑽ / (1) / (가) / 가) / 가. / 1) / 1. 를 인식한다.
     `·`(및 ･ ∙ ‧) 는 단독으로 절 구분자로 쓰지 않는다 — 실측상 "면역력 증진·피로개선·뼈 건강에
     도움을 줄 수 있음" 처럼 한 공식 절 내부 구분자이며 원료명·균종명 내부 문자와 구분 불가하다. */
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  const PARENED = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽';
  const PRE = '(?:^|[\\s\\n.。,])';
  const MARKER_SPLITS = [
    new RegExp(`(?=[${CIRCLED}])`),
    new RegExp(`(?=[${PARENED}])`),
    new RegExp(`(?=${PRE}\\(\\s?[가나다라마바사아자차카타파하]\\s?\\)\\s*\\S)`),
    new RegExp(`(?=${PRE}\\(\\s?\\d{1,2}\\s?\\)\\s*\\S)`),
    new RegExp(`(?=${PRE}[가나다라마바사아자차카타파하]\\s?[.)]\\s)`),
    new RegExp(`(?=${PRE}\\d{1,2}\\s?\\)\\s)`),
    // 한글 바로 뒤에 붙은 (1)/(가) 마커 — 마커 위치에서만 분할해 앞 절의 마지막 글자를 옮기지 않는다.
    /(?<=[가-힣])(?=\(\s?\d{1,2}\s?\)\s*\S)/,
    /(?<=[가-힣])(?=\(\s?[가나다라마바사아자차카타파하]\s?\)\s*\S)/,
    // 성분명·숫자 바로 뒤에 붙은 `(1)` — 실측 `비타민 B1(1) 탄수화물과…`
    /(?<=[A-Za-z0-9])(?=\(\s?\d{1,2}\s?\)\s+\S)/,
    // 한글 바로 뒤에 붙은 괄호 없는 `2)` 마커 — 실측 `…시각 적응을 위해 필요2) 피부와 점막을…`
    /(?<=[가-힣])(?=\d{1,2}\s?\)\s+\S)/,
  ];
  /** 절 시작 마커(라벨 뒤 구조 판정용) */
  const MARKER_AHEAD = new RegExp(`^(?:[${CIRCLED}${PARENED}]|\\(\\s?\\d{1,2}\\s?\\)|\\(\\s?[가나다라마바사아자차카타파하]\\s?\\)|\\d{1,2}\\s?[).]|[가나다라마바사아자차카타파하]\\s?[.)]\\s)`);
  const LEAD_MARKER = new RegExp(
    `^(?:[${CIRCLED}${PARENED}\\-·•‧∙･,.。)\\]\\s]|\\(\\s?[가나다라마바사아자차카타파하]\\s?\\)|\\(\\s?\\d{1,2}\\s?\\)|\\d{1,2}\\s?[).](?!\\d)|[가나다라마바사아자차카타파하]\\s?[.)]\\s)+`
  );
  const KO_TAG_LEAD = /^\(\s*국문\s*\)\s*/;

  /* 라벨로 인식되지 않은 잔여 대괄호(조건·단서 표기)는 내부 마커로 분할되지 않도록 보호한다.
     실측 예: "간 건강에 도움을 줄 수 있음[1) (2) (다)의 제조방법에 한함]" */
  const BR_SENTINEL = String.fromCharCode(2);
  const maskBrackets = (s, store) => s.replace(/\[[^\[\]]*\]/g, (mm) => { store.push(mm); return `${BR_SENTINEL}${store.length - 1}${BR_SENTINEL}`; });
  const unmaskBrackets = (s, store) => s.replace(new RegExp(`${BR_SENTINEL}(\\d+)${BR_SENTINEL}`, 'g'), (_x, i) => store[Number(i)]);

  /** 원료·영양성분 이름 형태인지 — 조건·단서 표기(`[1) (2) (다)의 제조방법에 한함]`)와 구분한다. */
  const looksLikeLabelName = (body) =>
    ING_SUFFIX.test(body) || /^비타민\s?[A-K][0-9]*$/.test(body) || /^[가-힣]{2,10}[0-9]?$/.test(body);

  /** 한 줄 → 절 텍스트 배열. 마커 → 문장 종결부호 순으로 누적 분할. */
  function segmentLine(line) {
    const store = [];
    let parts = [maskBrackets(protectAbbrev(line), store)];
    for (const re of MARKER_SPLITS) {
      parts = parts.flatMap((p) => {
        const sp = p.split(re);
        return sp.length >= 2 ? sp : [p];
      });
    }
    parts = parts.flatMap((p) => {
      const sp = p.split(/(?<=[.。])\s+/);
      return sp.length >= 2 ? sp : [p];
    });
    return parts.map((p) => unmaskBrackets(restoreAbbrev(p), store).trim()).filter(Boolean);
  }

  const stripLead = (s) => s.replace(KO_TAG_LEAD, '').replace(LEAD_MARKER, '').replace(/\s+/g, ' ').trim();

  /** §14 비교 정규화 — 비교 전용. 렌더 문구에서 문장부호를 삭제하지 않는다. */
  const cmpKey = (s) => stripLead(s ?? '')
    .replace(/\s| /g, '')
    .replace(/[.,;:·•‧∙･‐‑–—\-()[\]<>*※○●◦▶▪'"“”‘’]/g, '');

  /** §6 비교기 인공물: 기존 분절기가 만든 언어 구분 표기 파편(`(국문) (` 등)은 기능성 절이 아니다. */
  const isLangTagArtifact = (s) => {
    const k = cmpKey(s);
    if (!/^(국문|영문)/.test(k)) return false;
    const rest = k.replace(/^(국문|영문)/, '');
    return !/[가-힣A-Za-z]/.test(rest);   // 잔여가 숫자·마커뿐이면 언어 표기 파편
  };

  /** 절 1개 분류. ctx: {lang:'KO'|'EN', hasKoRegion:boolean, unclosedBracket:boolean} */
  function classifyClause(rawText, ctx) {
    const text = stripLead(rawText);
    if (!text) return { kind: 'EMPTY', confidence: 'HIGH', text };
    if (LANG_KO_ONLY.test(text) || LANG_EN_ONLY.test(text)) return { kind: 'NOTICE_OR_METADATA', confidence: 'HIGH', text, note: '언어 구분 표기' };
    if (NOTICE_ONLY.test(text)) return { kind: 'NOTICE_OR_METADATA', confidence: 'HIGH', text, note: '인정번호 표기' };

    const hasKo = HANGUL.test(text);
    // §13 영문 정책
    if (!hasKo) {
      if (/^[\W\d]+$/.test(text)) return { kind: 'NOTICE_OR_METADATA', confidence: 'HIGH', text, note: '비문자 조각' };
      if (ctx.lang === 'EN' && ctx.hasKoRegion) return { kind: 'ENGLISH_PARALLEL', confidence: 'HIGH', text, note: '(영문) 섹션 병기' };
      // 병기 근거 없는 영문 단독 → 자동 번역·삭제 금지, 사람 검토
      return { kind: 'ENGLISH_ONLY_REVIEW', confidence: 'LOW', text, note: EN_CLAIM.test(text) ? '영문 기능성 추정(병기 근거 없음)' : '영문 텍스트' };
    }

    // §12: 서술어가 없다는 이유만으로 삭제하지 않는다. 공식 기능성 어휘가 있으면 그대로 보존.
    if (FUNC_PRED.test(text)) {
      if (text.length < 4) return { kind: 'FORM_OR_INGREDIENT', confidence: 'HIGH', text, note: '4자 미만 단편(기존 동작과 동일하게 미저장)' };
      if (/\[/.test(text) && ctx.unclosedBracket) return { kind: 'FUNCTION_KO', confidence: 'MEDIUM', text, note: '불완전 대괄호 잔존' };
      // §12: 조사로 끝나는 절은 원문 자체가 절단된 것으로 본다. 삭제하지 않고 저장하되 자동 대상에서 제외한다.
      // 실측 `③혈소판 응집 억제를 통한 혈액흐름에` — 뒤 문장이 원문에서 잘려 있다.
      if (/(에|을|를|와|과|의|로|및|은|는|이|가)$/.test(text)) {
        return { kind: 'FUNCTION_KO', confidence: 'LOW', text, note: '문장 절단 추정(조사 종결)' };
      }
      return { kind: 'FUNCTION_KO', confidence: 'HIGH', text };
    }
    if (text.length < 4) return { kind: 'FORM_OR_INGREDIENT', confidence: 'HIGH', text, note: '4자 미만 단편(기존 동작과 동일하게 미저장)' };
    if (/^[*※]/.test(rawText.trim()) && FORM_WORD.test(text)) return { kind: 'FORM_OR_INGREDIENT', confidence: 'HIGH', text, note: '별표 + 제형어' };
    // 원료명·제형명 단독 줄(라벨 없는 사실상 헤더). 조사·어미가 없고 원료 접미사로 끝난다.
    if (text.length <= 30 && !JOSA.test(`${text} `) && ING_SUFFIX.test(text)) {
      return { kind: 'FORM_OR_INGREDIENT', confidence: 'MEDIUM', text, note: '원료명·제형명 단독(라벨 없는 헤더 추정)' };
    }
    return { kind: 'UNRESOLVED', confidence: 'LOW', text, note: '기능성 서술 근거 부족' };
  }

  /**
   * 정규화 분석.
   * @returns {{pattern, blocks, storeItems, segments, englishParallel, reviewItems, unresolvedCount, flatText, labelIssues}}
   */
  function analyzeFunctions(rawFn) {
    const text = norm(rawFn);
    const flatText = flat(rawFn);
    const out = {
      pattern: 'EMPTY', blocks: [], storeItems: [], segments: [], englishParallel: [],
      reviewItems: [], unresolvedCount: 0, flatText, labelIssues: [],
    };
    if (!flatText) return out;

    // 1) 라벨 후보
    const labels = [];
    // 중첩 대괄호(`[리스펙타(...)[복합물](제2019-26호)]`)를 최외곽 1개 span 으로 인식한다.
    // 길이 상한을 쓰지 않고 여닫힘 균형만으로 경계를 정한다(§8).
    const spans = [];
    let depth = 0, spanStart = -1, strayClose = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '[') { if (depth === 0) spanStart = i; depth++; }
      else if (ch === ']') {
        if (depth === 0) { strayClose = true; continue; }
        depth--;
        if (depth === 0) spans.push({ start: spanStart, end: i + 1, body: text.slice(spanStart + 1, i).trim() });
      }
    }
    const unclosedBracket = depth > 0 || strayClose;
    // 여는 대괄호 누락(`비타민C] …`)과 닫는 대괄호 누락(`[비타민C …`)은 서로 다른 결함이다.
    // 전자는 라벨 복원 규칙으로 해소될 수 있으므로 별도 사유로 기록한다.
    if (depth > 0) out.labelIssues.push({ label: null, reason: 'UNCLOSED_BRACKET' });
    if (strayClose) out.labelIssues.push({ label: null, reason: 'ORPHAN_CLOSE_BRACKET' });

    // 균형이 깨진 구간(닫히지 않은 `[` 안쪽)에 있는 최내곽 span 도 살린다.
    const INNER = /\[([^\[\]]*)\]/g;
    let im;
    while ((im = INNER.exec(text))) {
      const s = im.index, e = im.index + im[0].length;
      if (spans.some((sp) => sp.start <= s && e <= sp.end)) continue;
      spans.push({ start: s, end: e, body: im[1].trim() });
    }
    spans.sort((x, y) => x.start - y.start);

    for (const sp of spans) {
      const body = sp.body;
      // 구조적 절 시작 위치: 문두 / 공백·줄바꿈 / 직전 절이 끝난 문장부호 뒤
      const prev = sp.start === 0 ? null : text[sp.start - 1];
      // 구조 조건 2: 대괄호 직후가 절 시작 마커 또는 줄바꿈이면 라벨 위치로 인정한다
      // (실측 `…도움을 줌[칼슘]①뼈와 치아 형성에 필요`). 길이 추정은 쓰지 않는다.
      const rest = text.slice(sp.end);
      const followedByMarker = MARKER_AHEAD.test(rest.replace(/^\s+/, ''));
      // 구조 조건 3: 원료·영양성분 이름 형태의 닫힌 대괄호 + 같은 줄에 뒤따르는 본문
      // (실측 `…상피세포의 성장과 발달에 필요[크롬] 체내 탄수화물…`). 조건·단서 표기(`[…한함]`,
      // `[기타 II]`)는 이름 형태가 아니어서 라벨로 승격되지 않는다.
      const nameLike = looksLikeLabelName(body);
      const followedBySameLineBody = nameLike && flat(rest.split('\n')[0]).length >= 4;
      // 닫는 인용부호도 앞 절의 종결이다 — 실측 `…줄 수 있음.(기타 II)”[HK 나토배양물]“…`
      const structural = prev === null || /[\s\n,.。)\]·”’"']/.test(prev) || followedByMarker || followedBySameLineBody;
      if (!structural) { out.labelIssues.push({ label: body, reason: 'NOT_AT_SEGMENT_START' }); continue; }
      if (!body) { out.labelIssues.push({ label: body, reason: 'EMPTY_LABEL' }); continue; }
      if (LABEL_PRED.test(body)) { out.labelIssues.push({ label: body, reason: 'FUNCTIONAL_CLAUSE_IN_BRACKET' }); continue; }
      if (!HANGUL.test(body) && EN_CLAIM.test(body)) { out.labelIssues.push({ label: body, reason: 'ENGLISH_CLAIM_IN_BRACKET' }); continue; }
      labels.push({ text: body, start: sp.start, end: sp.end });
    }

    // 1-b) 절 내부 강제 개행(soft wrap) 복원. 실측 `…감소에 도움\n을 줌` — 줄바꿈이 절 경계가
    // 아니라 원문 줄폭 때문에 생긴 경우다. 다음 줄이 마커·언어표기·라벨로 시작하지 않고 앞 줄이
    // 종결부호로 끝나지 않을 때만 이어 붙인다. 이어붙일 때는 원문 개행이 평문에서 공백이 되는 것과
    // 동일하게 공백 1칸을 넣어, 원문 대조(fidelity) 불변식을 깨지 않는다.
    const rejoinWrapped = (bodyText) => {
      const lines = bodyText.split('\n');
      const out2 = [];
      for (const ln of lines) {
        const t = ln.trim();
        const prev = out2.length ? out2[out2.length - 1] : null;
        // 원료 표제 줄(`아연 : …`)은 앞 절에 흡수하지 않는다 — 새 원료 구간의 시작이다.
        const ingredientHeader = /^[^:：\n]{1,40}[:：]\s*\S/.test(t);
        const startsNew = !t || ingredientHeader || MARKER_AHEAD.test(t) || LANG_EN_ONLY.test(t) || LANG_KO_ONLY.test(t) || t.startsWith('[') || t.startsWith('<');
        const prevOpen = prev !== null && prev.trim() !== '' && !/[.。!?:]$/.test(prev.trim());
        // 이어짐 근거: 다음 줄이 조사로 시작하거나(도움 + 을 줌) 앞 줄이 연결어미로 끝난다(보호하는데 + 필요).
        // 조사는 반드시 단독 토큰이어야 한다. `에너지`처럼 조사 글자로 시작하는 단어를 이어짐으로 오판하지 않는다.
        const continues = /^(을|를|이|가|은|는|에|의|와|과|로|으로|도|및)\s/.test(t)
          // 쉼표로 끝나는 줄은 실측상 절 열거 구분자이므로 이어짐 근거로 쓰지 않는다.
          || /(는데|하는|되는|하여|되어|하고|이며|이고|으로|에서)$/.test(prev === null ? '' : prev.trim());
        if (!startsNew && prevOpen && continues) {
          out2[out2.length - 1] = `${prev.replace(/\s+$/, '')} ${t}`;
          continue;
        }
        out2.push(ln);
      }
      return out2.join('\n');
    };

    // 2) 구간 분해: 선행 무라벨 구간 + 라벨별 구간
    const regions = [];
    if (!labels.length) {
      regions.push({ header: null, body: text });
      out.pattern = 'UNLABELED_ONLY';
    } else {
      const lead = text.slice(0, labels[0].start);
      if (flat(lead).length >= 4) regions.push({ header: null, body: lead });
      labels.forEach((l, i) => {
        const end = i + 1 < labels.length ? labels[i + 1].start : text.length;
        regions.push({ header: l.text, body: text.slice(l.end, end) });
        out.segments.push({ kind: 'LABEL', confidence: 'HIGH', text: l.text, header: l.text });
      });
      out.pattern = regions.some((r) => r.header === null) ? 'MIXED_LABELED_AND_UNLABELED' : 'LABELED_ONLY';
    }

    const hasKoRegion = HANGUL.test(text);

    // 3) 구간 → 줄 → 절. (국문)/(영문) 섹션 상태기계 포함.
    for (const r of regions) {
      const items = [];
      const parallel = [];
      let lang = 'KO';
      for (const rawLine of rejoinWrapped(r.body).split('\n')) {
        const line = rawLine.trim();
        if (!line) { lang = 'KO'; continue; }          // 빈 줄 = 섹션 종료
        if (LANG_EN_ONLY.test(line)) { lang = 'EN'; out.segments.push({ kind: 'NOTICE_OR_METADATA', confidence: 'HIGH', text: line, note: '(영문) 섹션 시작', header: r.header }); continue; }
        if (LANG_KO_ONLY.test(line)) { lang = 'KO'; out.segments.push({ kind: 'NOTICE_OR_METADATA', confidence: 'HIGH', text: line, note: '(국문) 섹션 시작', header: r.header }); continue; }

        for (const piece1 of segmentLine(line)) {
          // §5/§12: 대괄호 없는 `원료명 : 기능성 절` 형태의 표제를 절 본문에서 떼어낸다.
          // 길이 상한이 아니라 콜론 구조 + 표제부에 서술어 없음 + 본문에 서술어 있음으로 판정한다.
          let piece = piece1;
          const hm = piece.match(/^([^:：\n]+?)\s*[:：]\s+(\S[\s\S]*)$/);
          // §10: 표제부의 균종 약어 period(`L.plantarum`)는 문장 종결이 아니므로 판정에서 제외한다.
          const headNoAbbrev = hm ? hm[1].replace(/\b[A-Z]\.\s?(?=[a-z])/g, '') : '';
          if (hm && !FUNC_PRED.test(hm[1]) && !/[.。!?]/.test(headNoAbbrev) && (FUNC_PRED.test(hm[2]) || /^\(\s*(국문|영문)\s*\)/.test(hm[2]))) {
            out.segments.push({ kind: 'FORM_OR_INGREDIENT', confidence: 'HIGH', text: hm[1].trim(), note: '원료 표제(콜론 구조)', header: r.header });
            piece = hm[2];
          }
          // §6/§9: 여는 대괄호가 원문에서 유실된 선행 라벨(`비타민C] 결합조직 …`) 처리.
          // 닫는 대괄호가 실제로 존재하고 표제부가 원료명 형태일 때만 라벨로 분리한다(추정 아님).
          const om = piece.match(/^([^[\]\n]{1,40})\]\s*(?=\S)/);
          if (om && looksLikeLabelName(om[1].trim())) {
            out.segments.push({ kind: 'LABEL', confidence: 'HIGH', text: om[1].trim(), note: '라벨(여는 대괄호 유실)', header: r.header });
            piece = piece.slice(om[0].length);
          }
          // §13-A: 절 본문 앞의 `(국문)` 언어 표기는 기능성 문장이 아니라 언어 구분 표기다.
          piece = piece.replace(/^\(\s*국문\s*\)\s*/, '');
          // 한 절 안에 ko + (영문) EN 이 함께 있으면 분리한다(§13-A).
          const mm = piece.match(/^(.*?)\(\s*영문\s*\)\s*(.*)$/s);
          const units = mm
            ? (flat(mm[1]).length >= 4
              ? [{ t: mm[1], lang: 'KO' }, { t: mm[2], lang: 'EN' }]
              : [{ t: mm[2], lang: 'EN' }])
            : [{ t: piece, lang }];
          for (const u of units) {
            if (!u.t.trim()) continue;
            const cls = classifyClause(u.t, { lang: u.lang, hasKoRegion, unclosedBracket });
            if (cls.kind === 'EMPTY') continue;
            const seg = { ...cls, header: r.header, sourceLang: u.lang };
            out.segments.push(seg);
            if (cls.kind === 'FUNCTION_KO') items.push(cls.text);
            else if (cls.kind === 'ENGLISH_PARALLEL') parallel.push(cls.text);
            if (cls.kind === 'ENGLISH_ONLY_REVIEW' || cls.kind === 'UNRESOLVED') { out.unresolvedCount++; out.reviewItems.push(seg); }
            else if (cls.confidence !== 'HIGH') out.reviewItems.push(seg);
          }
        }
      }
      if (items.length) out.blocks.push({ header: r.header, items });
      out.englishParallel.push(...parallel);
    }
    out.storeItems = out.blocks.flatMap((b) => b.items);
    return out;
  }

  /** 자동 backfill 적격 (§16): 저장 대상 전량 HIGH + UNRESOLVED 0 + 불완전 대괄호 없음
   *  + 비기능 제외 판정이 전부 HIGH(불확실한 제외가 하나라도 있으면 사람 검토). */
  function isAutoEligible(a) {
    if (!a.storeItems.length) return false;
    if (a.unresolvedCount) return false;
    if (a.labelIssues.some((i) => i.reason === 'UNCLOSED_BRACKET')) return false;
    // 여는 대괄호 유실은 라벨 복원으로 해소된 경우에만 자동 대상으로 허용한다.
    if (a.labelIssues.some((i) => i.reason === 'ORPHAN_CLOSE_BRACKET')
      && !a.segments.some((s) => s.note === '라벨(여는 대괄호 유실)')) return false;
    // §6: 저장 대상에 짝 없는 대괄호 인공물이 남아 있으면 자동 대상이 아니다.
    if (a.storeItems.some((t) => {
      const s = String(t);
      return (s.match(/\[/g) ?? []).length !== (s.match(/\]/g) ?? []).length;
    })) return false;
    // §9: 원료명 라벨 문구가 기능성 절 안에 남아 있으면 자동 대상이 아니다.
    // 조건·단서 대괄호 표기는 공식 원문의 일부이므로 제외 사유가 아니다.
    const labelInClause = a.storeItems.some((t) =>
      [...String(t).matchAll(/\[([^\]]*)\]/g)].some((m) => looksLikeLabelName(m[1].trim())));
    if (labelInClause) return false;
    const stored = a.segments.filter((s) => s.kind === 'FUNCTION_KO');
    if (!stored.length || !stored.every((s) => s.confidence === 'HIGH')) return false;
    const softExclusion = a.segments.some((s) => s.kind !== 'FUNCTION_KO' && s.kind !== 'LABEL' && s.confidence !== 'HIGH' && (s.text ?? '').length >= 4);
    return !softExclusion;
  }


  /** 기존 driver extractFunctions 와 동일한 반환 형태 + V2 분석 정보. */
  function extractFunctionsV2(rawFn) {
    const a = analyzeFunctions(rawFn);
    return {
      groups: a.blocks,
      flat: a.storeItems,
      flatText: a.flatText,
      analysis: a,
      autoEligible: isAutoEligible(a),
    };
  }

  return { analyzeFunctions, isAutoEligible, cmpKey, isLangTagArtifact, extractFunctionsV2 };
}
