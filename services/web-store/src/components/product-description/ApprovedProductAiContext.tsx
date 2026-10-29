import { useRef, useState } from 'react';
import { getStoreProductAiContext, type StoreProductAiContext } from '../../api/storeProductAi';
import { useLatestStoreRequest } from '../../pages/pharmacy/hooks/useLatestStoreRequest';

const roles = { 'product-fact': '상품 사실', 'professional-reference': '전문 참고', 'counseling-support': '상담 판단지원', unclassified: '미분류·내용 확인 필요' };
const sourceKinds: Record<string, string> = { government: '정부 공개자료', manufacturer: '제조사 자료', user_contribution: '사용자 기여' };
const sourceStates: Record<string, string> = { retrieved: '조회 자료', archived: '보관자료·현행성 확인 필요', user: '사용자 작성' };
export function ApprovedProductAiContext({ listingId, language, disabled, isCurrent, onUse }: Readonly<{
  listingId: string; language: string; disabled: boolean; isCurrent: () => boolean;
  onUse: (value: { facts: string; references: string; source: string }) => void;
}>) {
  const requests = useLatestStoreRequest(`${listingId}:${language}`), lock = useRef(false);
  const [value, setValue] = useState<StoreProductAiContext | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const read = async () => {
    if (disabled || lock.current || !isCurrent()) return;
    lock.current = true; const current = requests.begin(); setBusy(true); setError(''); setValue(null);
    try { const data = await getStoreProductAiContext(listingId, language); if (current() && isCurrent()) setValue(data); }
    catch { if (current() && isCurrent()) setError('AI 상담자료를 조회하지 못했습니다. 현재 매장의 등록 상품인지 확인하고 다시 시도해 주세요.'); }
    finally { lock.current = false; if (current() && isCurrent()) setBusy(false); }
  };
  const description = value?.description;
  return <details className="min-w-0 rounded border p-3">
    <summary className="min-h-11 cursor-pointer">O4O AI 상담자료 확인</summary>
    <p className="text-sm">등록 상품의 승인된 AI 상담자료를 조회합니다. QR 설명서는 이 자료와 별도로 관리됩니다.</p>
    <button type="button" className="min-h-11 rounded border px-3" disabled={disabled || busy} onClick={() => void read()}>AI 상담자료 불러오기</button>
    {error && <p role="alert">{error}</p>}
    {value?.state === 'missing' && <output className="block">이 언어의 승인된 AI 상담자료가 없습니다. 공개 근거를 확인해 작성한 자료는 관리자에게 제안할 수 있습니다.</output>}
    {description && <div className="min-w-0 space-y-2 break-words">
      <p>{value?.name} · {value?.language} · {value?.state === 'structured' ? '구조화 자료' : '기존 미분류 자료'}</p>
      <p className="text-xs">{description.source ? `${sourceKinds[description.source.kind] ?? '출처 확인 필요'} · ${sourceStates[description.source.currentness] ?? '현행성 확인 필요'} · ${description.source.checkedOn ?? '확인일 미상'}` : '연결된 근거 정보 없음'}{description.truncated ? ' · 원문 일부' : ''}</p>
      <div className="max-h-80 space-y-3 overflow-auto">{description.sections.map(section => <section key={section.key}>
        <h4>{roles[section.kind]} · {section.title}</h4><p className="whitespace-pre-wrap">{section.text}</p>
        {section.referenceUrls.map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block break-all underline">{url}</a>)}
      </section>)}</div>
      <p className="text-xs">전문 참고·미분류 자료는 제품의 확정 효과가 아닙니다. 현재 원문과 근거를 확인한 뒤 사용하세요.</p>
      <button type="button" className="min-h-11 rounded border px-3" disabled={disabled || busy} onClick={() => {
        if (!isCurrent()) return;
        onUse({ facts: description.sections.filter(s => s.kind === 'product-fact').map(s => `${s.title}\n${s.text}`).join('\n\n'),
          references: description.sections.filter(s => s.kind !== 'product-fact').map(s => `[${roles[s.kind]}] ${s.title}\n${s.text}`).join('\n\n'),
          source: `O4O B2B ${description.id} / revision ${description.revision}\n${description.source?.references.map(r => r.url).join('\n') ?? '출처 확인 필요'}` });
      }}>확인한 항목을 상담 작성 근거로 사용</button>
    </div>}
  </details>;
}
