import fs from 'node:fs';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
const a=JSON.parse(fs.readFileSync('C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard/hff-probiotics-prod-c-cp02.json','utf8'));
let b=0,r=0,pass=0;const rules:Record<string,number>={};
for(const it of a){const res=runGuard(it,{phase:'all'});if(res.overallStatus==='BLOCKED')b++;else if(res.overallStatus==='REVIEW_REQUIRED')r++;else pass++;for(const f of res.findings)if(f.status==='BLOCKED'||f.status==='REVIEW_REQUIRED')rules[`${f.ruleId}`]=(rules[`${f.ruleId}`]??0)+1;}
console.log(`PASS ${pass} REVIEW ${r} BLOCKED ${b}`,JSON.stringify(rules));
