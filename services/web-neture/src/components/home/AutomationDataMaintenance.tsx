import { useState } from 'react';
import { HOME_CHAT_MAX_MESSAGE_LENGTH } from '../../lib/ai/home-chat';

const topics = ['상품 식별정보', '포장단위·수량 환산', '거래처', '재고 확인', '업무 실행 조건'] as const;
interface Props {
  goal: string;
  neededInput?: string | null;
  draft: string;
  resuming: boolean;
  disabled: boolean;
  onApply: (text: string) => void;
  onClose: () => void;
}
export function maintenanceRequest(input: { topic: string; target: string; details: string; ask: boolean; draft: string }): string {
  // The existing resume anchor already carries the goal; do not recursively copy prior answers.
  const lines = [input.draft.trim(), '데이터 정비',
    `항목: ${input.topic}`, `대상: ${input.target.trim()}`, `${input.ask ? '질문' : '사용자가 확인한 내용'}: ${input.details.trim()}`,
    input.ask ? '부족한 정보는 짧게 질문하고 확인된 내용으로 현재 업무를 이어 주세요.' : '이 내용을 현재 업무에 반영해 이어 주세요. 불명확한 부분은 추측하지 말고 질문해 주세요.',
    '현재 사용자·매장의 허용된 업무 범위를 유지하고, 개인 교정을 공통 규칙으로 자동 적용하지 마세요.'];
  return lines.filter(Boolean).join('\n');
}
export default function AutomationDataMaintenance({ goal, neededInput, draft, resuming, disabled, onApply, onClose }: Readonly<Props>) {
  const [topic, setTopic] = useState<string>(topics[0]);
  const [target, setTarget] = useState('');
  const [details, setDetails] = useState('');
  const [ask, setAsk] = useState(false);
  const text = maintenanceRequest({ topic, target, details, ask, draft });
  const tooLong = text.length > HOME_CHAT_MAX_MESSAGE_LENGTH;
  return (
    <section aria-label="업무 데이터 정비" className="mt-3 w-full max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">데이터 정비</h2>
        <button type="button" onClick={onClose} disabled={disabled} className="rounded border px-3 py-1">닫기</button>
      </div>
      {goal && <p className="break-words">현재 업무: {goal}</p>}
      {neededInput && <p className="whitespace-pre-wrap break-words">확인이 필요한 내용: {neededInput}</p>}
      <p>{resuming ? '확인한 내용을 같은 업무의 다음 답변으로 준비합니다.' : '현재 입력과 함께 정비할 내용을 준비합니다.'}</p>
      <label className="block">정비할 항목
        <select value={topic} onChange={e => setTopic(e.target.value)} disabled={disabled} className="mt-1 w-full rounded border p-2">
          {topics.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="block">상품·거래처 또는 작업 대상
        <input value={target} onChange={e => setTarget(e.target.value)} maxLength={200} disabled={disabled} className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={ask} onChange={e => setAsk(e.target.checked)} disabled={disabled} />
        입력할 내용을 몰라 AI에 질문하기
      </label>
      <label className="block">{ask ? '알고 싶은 내용' : '확인·수정한 내용'}
        <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={3} disabled={disabled} className="mt-1 w-full rounded border p-2" />
      </label>
      {tooLong && <p role="alert">현재 입력과 정비 내용을 합쳐 {HOME_CHAT_MAX_MESSAGE_LENGTH}자 이내로 줄여 주세요. 입력 내용은 유지됩니다.</p>}
      <button type="button" disabled={disabled || !target.trim() || !details.trim() || tooLong} onClick={() => onApply(text)} className="rounded border px-3 py-2 disabled:opacity-40">입력창에 반영</button>
      <p className="text-xs text-slate-500">입력창에만 반영됩니다. 요청 실행 후 결과를 확인하세요. 고객·환자의 개인정보는 입력하지 마세요.</p>
    </section>
  );
}
