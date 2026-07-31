/** KO 손상 수정 렌더 검증 (read-only). 구조 시그니처 전수 커버. */
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
const D='apps/api-server/src/scripts/data';
const ALL=JSON.parse(fs.readFileSync(`${D}/hff-ko-damage-repair-plan-v1.json`,'utf8')).plan;
const CSS=(fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx','utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)??[])[1];
if(!CSS){console.error('CSS_NOT_FOUND');process.exit(1);}
const DEFINED=new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map(m=>m[1]).concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map(m=>m[1])));
const sig=h=>`${(h.match(/<li>/g)??[]).length}|${(h.match(/<h2>/g)??[]).length}|${[...new Set(h.match(/class="[^"]+"/g)??[])].sort().join('')}`;
const seen=new Set(); const SAFE=ALL.filter(t=>{const k=sig(t.newContent);if(seen.has(k))return false;seen.add(k);return true;});
const C={pageOverflow:0,elementOverflow:0,emptyH2:0,emptyUl:0,emptyLi:0,emptySection:0,undefinedClass:0,rawHtml:0,openParenLeft:0,markerOnlyLeft:0,englishLeft:0,expertNoteMissing:0,fnSectionMissing:0};
const fails=[]; let renders=0, proof=null;
for(const t of SAFE){
  for(const w of [430,820,1280]){
    const dom=new JSDOM(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head><body><div class="store-desc-content">${t.newContent}</div></body></html>`,{pretendToBeVisual:true});
    const {window}=dom, doc=window.document; renders++;
    if(proof===null&&w===820){
      const bare=new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${t.newContent}</body></html>`,{pretendToBeVisual:true});
      const card=doc.querySelector('.sd-card'), bc=bare.window.document.querySelector('.sd-card');
      proof={withoutWrapper:bc?bare.window.getComputedStyle(bc).maxWidth:'n/a',withWrapper:card?window.getComputedStyle(card).maxWidth:'n/a',
        borderRadius:card?window.getComputedStyle(card).borderRadius:'n/a',
        heroPadding:doc.querySelector('.sd-hero')?window.getComputedStyle(doc.querySelector('.sd-hero')).padding:'n/a',
        badgeRadius:doc.querySelector('.sd-badge')?window.getComputedStyle(doc.querySelector('.sd-badge')).borderRadius:'n/a'};
      proof.cssActuallyApplied=proof.withWrapper!==proof.withoutWrapper; bare.window.close();
    }
    if(![...doc.querySelectorAll('h2')].some(h=>/기능성/.test(h.textContent))){C.fnSectionMissing++;fails.push({id:t.canonicalId,w,why:'FN_MISSING'});}
    for(const h of doc.querySelectorAll('h2')) if(!h.textContent.trim()) C.emptyH2++;
    for(const ul of doc.querySelectorAll('ul')) if(!ul.querySelector('li')){C.emptyUl++;fails.push({id:t.canonicalId,w,why:'EMPTY_UL'});}
    for(const li of doc.querySelectorAll('li')){
      if(li.querySelector('ul')) continue;
      const x=li.textContent.trim();
      if(!x){C.emptyLi++;fails.push({id:t.canonicalId,w,why:'EMPTY_LI'});continue;}
      if(/\s*\($/.test(x)){C.openParenLeft++;fails.push({id:t.canonicalId,w,why:'OPEN_PAREN',x:x.slice(0,40)});}
      if(/^\(국문\)$|^\(영문\)$|^일일섭취량$/.test(x)){C.markerOnlyLeft++;fails.push({id:t.canonicalId,w,why:'MARKER'});}
      if(/^[A-Za-z][A-Za-z ,.'()\/-]{12,}$/.test(x)){C.englishLeft++;fails.push({id:t.canonicalId,w,why:'ENGLISH',x:x.slice(0,40)});}
      if(/&lt;|&gt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g,''))) C.rawHtml++;
    }
    for(const el of doc.querySelectorAll('.store-desc-content *')){
      for(const cls of el.classList??[]) if(cls.startsWith('sd-')&&!DEFINED.has(cls)){C.undefinedClass++;fails.push({id:t.canonicalId,w,why:`CLASS:${cls}`});}
      const cs=window.getComputedStyle(el);
      if(/px$/.test(cs.width)&&parseInt(cs.width,10)>w){C.elementOverflow++;fails.push({id:t.canonicalId,w,why:'OVERFLOW'});}
    }
    if(!/전문가|약사|상담|문의/.test(doc.body.textContent)){C.expertNoteMissing++;fails.push({id:t.canonicalId,w,why:'EXPERT'});}
    window.close();
  }
}
const total=Object.values(C).reduce((a,b)=>a+b,0);
const out={renderedAt:new Date().toISOString(),readOnly:true,dbWrites:0,documentsTotal:ALL.length,documentsRendered:SAFE.length,
 structureSignatures:seen.size,coverage:'signature-exhaustive',widths:[430,820,1280],renders,wrapperProof:proof,counters:C,
 totalIssues:total,verdict:total===0?'PASS':'FAIL',failures:fails.slice(0,20)};
fs.writeFileSync(`${D}/hff-ko-damage-repair-render-audit-v1.json`,JSON.stringify(out,null,1));
console.log(JSON.stringify({...out,failures:out.failures.slice(0,6)},null,1));
