/** Track B 신규 STORE/ko canonical 본문 생성기 (driver 계약 구조 재사용). */
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildTrackBCanonical(o) {
  const groups = [];
  for (const line of (o.fn ?? '').replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean)) {
    const m = line.match(/^\[([^\]\n]+)\]\s*(.*)$/);
    if (!m) continue;
    const body = m[2].trim();
    const cs = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(body)
      ? body.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map((x) => x.replace(/^[①-⑮\s]*/, '').trim()).filter((x) => x.length >= 4)
      : (nrm(body).length >= 4 ? [nrm(body)] : []);
    if (cs.length) groups.push({ label: m[1].trim(), clauses: cs });
  }
  const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join('');
  const fnHtml = groups.length >= 2
    ? `<div class="sd-core">${groups.map((g) => `<div class="sd-item"><span class="sd-tag">${esc(g.label)}</span><ul>${li(g.clauses)}</ul></div>`).join('')}</div>`
    : `<ul class="sd-why">${li(groups[0]?.clauses ?? [])}</ul>`;

  const hint = nrm(o.hint);
  const hintItems = hint
    ? hint.split(/(?=[①-⑮])|(?<=[.。])\s+/).map((x) => x.replace(/^[①-⑮\s]*/, '').replace(/^\d+\s*[).]\s*/, '').trim()).filter((x) => x.length >= 4)
    : [];
  const hintHtml = hintItems.length ? `\n  <h2>섭취 시 참고사항</h2><div class="sd-item"><ul>${li(hintItems)}</ul></div>` : '';

  const specs = nrm(o.base).split(/(?<=[.。])\s+/).map((x) => x.trim()).filter((x) => x.length >= 3).slice(0, 6);
  const specHtml = specs.length
    ? specs.map((x) => `<div class="sd-item">${esc(x)}</div>`).join('')
    : '<div class="sd-item">공식 기준·규격은 제품 표시사항을 확인하십시오.</div>';

  const chip = (nrm(o.srv).match(/1일\s*[0-9~〜\-]+\s*회/) ?? [])[0] ?? null;
  const chipHtml = chip ? `<span class="sd-tag">${esc(chip)}</span>` : '<span class="sd-tag">제품 표시사항 참고</span>';

  return `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">건강기능식품</span>${chip ? `<span class="sd-badge">${esc(chip)}</span>` : ''}</div>
  <h1>${esc(nrm(o.name))}</h1><p class="sd-meta">건강기능식품 · 공식 인정 기능성 기반 매장 설명서</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 식약처에 신고된 건강기능식품입니다. 공식적으로 인정된 기능성은 아래와 같습니다.</p>
  <h2>주요 기능성</h2>${fnHtml}
  <h2>섭취량 및 섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipHtml}</span><p class="sd-meta">${esc(nrm(o.srv))}</p></div>${hintHtml}
  <h2>확인 가능한 기준·규격 정보</h2><div class="sd-spec">${specHtml}</div>
  <h2>매장 전문가 문의 안내</h2><div class="sd-cta"><p>섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.</p></div></div>
  <div class="sd-foot">제품 표시사항을 함께 확인하십시오.</div></div>`;
}
