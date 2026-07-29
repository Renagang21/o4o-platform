const fs=require('fs');
const na=fs.readFileSync('src/scripts/otc-v3-topical-oromucosal-apply.na.ts','utf8');
const da=fs.readFileSync('src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts','utf8');
const grab=(s,name)=>{const i=s.indexOf(`async function ${name}(`);const j=s.indexOf('\nasync function ',i+10);return s.slice(i, j<0?s.length:j);};
for(const fn of ['execKoFp','execEnFp','rollbackTestFp','applyFp']){
  const a=grab(na,fn), b=grab(da,fn);
  const norm=t=>t.replace(/\r/g,'');
  console.log(fn, 'identical=', norm(a)===norm(b), 'lenNa='+a.length, 'lenDa='+b.length);
  if(norm(a)!==norm(b)){
    const al=norm(a).split('\n'), bl=norm(b).split('\n');
    for(let k=0;k<Math.max(al.length,bl.length);k++) if(al[k]!==bl[k]) console.log('  L'+k+'\n   na: '+(al[k]||'').trim().slice(0,200)+'\n   da: '+(bl[k]||'').trim().slice(0,200));
  }
}
