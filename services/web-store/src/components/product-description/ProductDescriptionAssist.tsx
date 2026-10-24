import { useId, useState } from 'react';
import { LlmAssistPanel } from '@o4o/content-editor';
import {
  buildStoreContentAuthoringPrompt, PRODUCT_DESCRIPTION_PURPOSE_LABELS, STORE_LLM_ASSIST_LABEL,
  type ProductDescriptionPurpose, type ProductDescriptionEvidence, type StoreContentLlmContext,
} from '@o4o/store-ui-core';

const inputStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box' as const, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, font: 'inherit' };

/** 근거 입력은 이번 편집 세션에만 사용한다. 저장·게시·권한 계약은 기존 편집기가 담당한다. */
export function ProductDescriptionAssist({ context, onApplyHtml }: {
  context: StoreContentLlmContext;
  onApplyHtml: (html: string) => void;
}) {
  const id = useId();
  const [purpose, setPurpose] = useState<ProductDescriptionPurpose>(context.purpose ?? 'consumer-qr');
  const [facts, setFacts] = useState('');
  const [factSource, setFactSource] = useState('');
  const [factsReviewed, setFactsReviewed] = useState(false);
  const [reference, setReference] = useState('');
  const [referenceSource, setReferenceSource] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const evidence: ProductDescriptionEvidence[] = [
    ...(context.evidence ?? []),
    { kind: 'product-fact', title: '사용자가 제공한 상품 원문', source: factSource, content: facts, reviewStatus: factsReviewed ? 'reviewed' : 'pending' },
    { kind: 'professional-reference', title: '전문 참고자료', source: referenceSource, content: reference, reviewStatus: reviewed ? 'reviewed' : 'pending' },
  ];
  return <div style={{ width: '100%', display: 'grid', gap: 8 }}>
    <label htmlFor={`${id}-purpose`}>설명서 이용 목적</label>
    <select style={inputStyle} id={`${id}-purpose`} value={purpose} onChange={e => setPurpose(e.target.value as ProductDescriptionPurpose)}>
      {Object.entries(PRODUCT_DESCRIPTION_PURPOSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <details>
      <summary>상품 근거·전문 참고자료 추가</summary>
      <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
        <label htmlFor={`${id}-facts`}>상품 사실 원문</label>
        <textarea style={inputStyle} id={`${id}-facts`} value={facts} onChange={e => { setFacts(e.target.value); setFactsReviewed(false); }} rows={4} />
        <label htmlFor={`${id}-fact-source`}>상품 원문 출처·확인일</label>
        <input style={inputStyle} id={`${id}-fact-source`} value={factSource} onChange={e => { setFactSource(e.target.value); setFactsReviewed(false); }} placeholder="허가문서·제조사 자료 이름 또는 URL, 확인일" />
        <label><input type="checkbox" disabled={!facts.trim() || !factSource.trim()} checked={factsReviewed} onChange={e => setFactsReviewed(e.target.checked)} /> 상품 원문의 출처와 내용을 검수했습니다</label>
        <label htmlFor={`${id}-reference`}>전문 참고정보</label>
        <textarea style={inputStyle} id={`${id}-reference`} value={reference} onChange={e => { setReference(e.target.value); setReviewed(false); }} rows={4} />
        <label htmlFor={`${id}-reference-source`}>전문 자료 출처·확인일</label>
        <input style={inputStyle} id={`${id}-reference-source`} value={referenceSource} onChange={e => { setReferenceSource(e.target.value); setReviewed(false); }} placeholder="전문 문헌·지침 이름 또는 URL, 확인일" />
        <label><input type="checkbox" disabled={!reference.trim() || !referenceSource.trim()} checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> 전문 참고자료의 출처와 내용을 검수했습니다</label>
        <p>환자·고객 개인정보는 입력하지 마세요. 근거는 이번 AI 작업에 사용하며 결과는 편집기에서 검토한 뒤 저장합니다.</p>
      </div>
    </details>
    <LlmAssistPanel label={STORE_LLM_ASSIST_LABEL} contextLabel={PRODUCT_DESCRIPTION_PURPOSE_LABELS[purpose]}
      guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({ ...context, purpose, evidence, additionalInstruction })}
      currentHtml={context.currentHtml ?? undefined} onApplyHtml={onApplyHtml} />
  </div>;
}
