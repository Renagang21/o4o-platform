/**
 * 화장품 KO STORE 설명서 본문 렌더러 (파일럿 V2 · 전량 apply V1 공용 단일 출처)
 *
 * census 가 관측한 항목만 렌더한다. 없는 정보를 추론·보강하지 않는다.
 */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderHtml(g) {
  const out = [];
  const sec = (title, body) => out.push(`<h3>${esc(title)}</h3>${body}`);
  if (g.oneLineDescription) out.push(`<p>${esc(g.oneLineDescription)}</p>`);
  if (g.mainFeatures?.length) {
    sec('주요 특징', `<ul>${g.mainFeatures.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>`);
  }
  if (g.productHighlights?.length) {
    sec('제품 포인트', `<ul>${g.productHighlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`);
  }
  if (g.mainIngredients) sec('주요 성분', `<p>${esc(g.mainIngredients)}</p>`);
  if (g.texture) sec('사용감', `<p>${esc(g.texture)}</p>`);
  if (g.usage) sec('사용 방법', `<p>${esc(g.usage)}</p>`);
  if (g.useContext) sec('사용 상황', `<p>${esc(g.useContext)}</p>`);
  if (g.cautions) sec('주의사항', `<p>${esc(g.cautions)}</p>`);
  if (g.variants?.length) {
    sec(
      '구성',
      `<ul>${g.variants.map((v) => `<li>${esc(typeof v === 'string' ? v : (v.text ?? JSON.stringify(v)))}</li>`).join('')}</ul>`,
    );
  }
  if (g.classification) out.push(`<p><small>분류: ${esc(g.classification)}</small></p>`);
  if (g.distributionSources?.length) {
    out.push(`<p><small>유통 확인: ${esc(g.distributionSources.join(', '))}</small></p>`);
  }
  return out.join('\n');
}
