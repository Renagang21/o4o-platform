import { useEffect, useRef, useState } from 'react';
import { readConsultationExpression, saveConsultationExpression, type ConsultationExpression } from '../../../api/consultationWorkspace';

export function ConsultationExpressionSettings({ organizationId }: { organizationId: string }) {
  const [expression,setExpression] = useState<ConsultationExpression | null>(null), [canEdit,setCanEdit] = useState(false);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const [retry,setRetry] = useState(0), [failed,setFailed] = useState(false);
  const scope = useRef(organizationId), generation = useRef(0), lock = useRef(false);
  scope.current = organizationId;
  useEffect(() => {
    const current = ++generation.current;
    const valid = () => generation.current===current && scope.current===organizationId;
    setExpression(null);setCanEdit(false);setMessage('');setFailed(false);setBusy(false);lock.current=false;
    void readConsultationExpression().then(data => {
      if (!valid()) return;
      if (data.organizationId!==organizationId) throw new Error('Store changed');
      setExpression(data.expression);setCanEdit(data.canEdit);
    }).catch(() => { if(valid()) { setFailed(true);setMessage('매장 표현 설정을 확인하지 못했습니다.'); } });
    return () => { generation.current=current+1; };
  },[organizationId,retry]);
  const save = async () => {
    if(!expression || !canEdit || lock.current) return;
    const current=generation.current;
    const valid=()=>generation.current===current && scope.current===organizationId;
    lock.current=true;setBusy(true);setMessage('');
    try { const data=await saveConsultationExpression(expression);
      if(!valid()) return;
      if(data.organizationId!==organizationId) throw new Error('Store changed');
      setExpression(data.expression);setCanEdit(data.canEdit);setMessage('표현 설정을 저장했습니다. 진행 중인 초안은 현재 설정으로 다시 준비하세요.');
    } catch { if(valid()) setMessage('저장하지 못했습니다. 현재 매장과 경영자 권한을 확인해 주세요.'); }
    finally { if(valid()) { lock.current=false;setBusy(false); } }
  };
  return <details className="rounded border p-3"><summary>매장 고객 안내문 표현</summary>
    <p>약사가 검토할 고객 설명 초안의 말투·경어·길이를 설정합니다. 전문 참고 내용과 자료 접근 권한은 바뀌지 않습니다.</p>
    {expression && <fieldset disabled={!canEdit || busy} className="flex flex-wrap gap-3">
      <label>말투<select value={expression.tone} onChange={e => setExpression({...expression,tone:e.target.value as ConsultationExpression['tone']})}><option value="neutral">담백하게</option><option value="friendly">친절하게</option></select></label>
      <label>문장 끝맺음<select value={expression.formality} onChange={e => setExpression({...expression,formality:e.target.value as ConsultationExpression['formality']})}><option value="polite">경어체</option><option value="plain">평서체</option></select></label>
      <label>길이<select value={expression.length} onChange={e => setExpression({...expression,length:e.target.value as ConsultationExpression['length']})}><option value="short">짧게</option><option value="standard">필요한 설명</option></select></label>
      <button type="button" onClick={() => void save()}>매장 표현 설정 저장</button>
    </fieldset>}
    {!canEdit && expression && <p>매장 경영자가 설정을 변경할 수 있습니다.</p>}
    {failed && <button type="button" onClick={() => setRetry(value=>value+1)}>표현 설정 다시 조회</button>}
    {message && <p role="status">{message}</p>}
  </details>;
}
