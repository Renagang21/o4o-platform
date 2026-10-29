// Public, read-only diagnostics. This does not change Sonar issues, ratings or CI gates.
import {writeFile} from 'node:fs/promises';

const pullRequest=process.env.SONAR_PR_NUMBER;
if (!/^[1-9][0-9]*$/.test(pullRequest ?? '')) throw new Error('A numeric SONAR_PR_NUMBER is required');
const report={status:'unavailable',project:'Renagang21_o4o-platform',pullRequest:Number(pullRequest),requestedHead:process.env.SONAR_HEAD_SHA ?? null,observedAt:new Date().toISOString(),issues:[],total:null,truncated:false};
try {
  for(let page=1;page<=5;page++) {
    const url=new URL('https://sonarcloud.io/api/issues/search');
    url.search=new URLSearchParams({componentKeys:report.project,pullRequest,types:'BUG,VULNERABILITY',resolved:'false',ps:'100',p:String(page)}).toString();
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error(`SONAR_HTTP_${response.status}`);
    const body=await response.json();
    if(!Array.isArray(body.issues) || !Number.isSafeInteger(body.total)) throw new Error('SONAR_INVALID_RESPONSE');
    report.total=body.total;
    // Keep code findings only; omit user/author/contact fields from the external response.
    report.issues.push(...body.issues.map(issue=>Object.fromEntries(['key','rule','component','line','type','severity','status','message','impacts'].map(key=>[key,issue[key] ?? null]))));
    if(report.issues.length>=report.total) break;
  }
  report.status='collected';report.truncated=report.issues.length<report.total;
} catch(error) {
  report.error=error instanceof Error && /^SONAR_[A-Z_0-9]+$/.test(error.message) ? error.message : 'SONAR_FETCH_FAILED';
  process.exitCode=1;
}
await writeFile('sonar-pr-findings.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,total:report.total,collected:report.issues.length,error:report.error ?? null}));
