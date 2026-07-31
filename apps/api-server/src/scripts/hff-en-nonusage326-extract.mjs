import fs from 'node:fs';
const D='apps/api-server/src/scripts/data';
const S=JSON.parse(fs.readFileSync(`${D}/hff-en-batch01-lastphrase690-selection-v1.json`,'utf8'));
const CATS=['CAUTION','CLAUSE','LABEL','META','STANDARD'];
const rows=S.phrases.filter(p=>CATS.includes(p.category));
const byCat=rows.reduce((a,p)=>{a[p.category]=(a[p.category]??0)+1;return a},{});
fs.writeFileSync(`${D}/hff-en-lastphrase-nonusage326-population-v1.json`,JSON.stringify({
 builtAt:new Date().toISOString(),readOnly:true,dbWrites:0,
 total:rows.length,expected:326,matches:rows.length===326,byCategory:byCat,
 phraseIdDup:rows.length-new Set(rows.map(p=>p.uniquePhraseId)).size,
 normalizedMissing:rows.filter(p=>!p.normalizedKoText).length,
 usageMixedIn:rows.filter(p=>p.category==='USAGE').length,
 phrases:rows},null,1));
console.log(JSON.stringify({total:rows.length,byCat,dup:rows.length-new Set(rows.map(p=>p.uniquePhraseId)).size},null,1));
