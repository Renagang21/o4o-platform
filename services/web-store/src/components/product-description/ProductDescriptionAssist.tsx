import { useId, useState } from 'react';
import { LlmAssistPanel } from '@o4o/content-editor';
import {
  buildStoreContentAuthoringPrompt, PRODUCT_DESCRIPTION_PURPOSE_LABELS, STORE_LLM_ASSIST_LABEL,
  type ProductDescriptionPurpose, type ProductDescriptionEvidence, type StoreContentLlmContext,
} from '@o4o/store-ui-core';

import { emptyDescriptionAssist, type DescriptionAssistDraft } from './productConsultationDraft';

const inputStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box' as const, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, font: 'inherit' };

/** Optional controlled state lets the store editor persist authoring context with its draft. */
export function ProductDescriptionAssist({ context, onApplyHtml, value, onChange }: {
  context: StoreContentLlmContext;
  onApplyHtml: (html: string) => void;
  value?: DescriptionAssistDraft;
  onChange?: (draft: DescriptionAssistDraft) => void;
}) {
  const id = useId();
  const [local, setLocal] = useState<DescriptionAssistDraft>({ ...emptyDescriptionAssist, purpose: context.purpose ?? 'consumer-qr' });
  const state = value ?? local;
  const { purpose, facts, factSource, factsReviewed, reference, referenceSource, reviewed } = state;
  const change = (patch: Partial<DescriptionAssistDraft>) => {
    const next = { ...state, ...patch };
    if (onChange) onChange(next); else setLocal(next);
  };
  const evidence: ProductDescriptionEvidence[] = [
    ...(context.evidence ?? []),
    { kind: 'product-fact', title: '사용자가 제공한 상품 원문', source: factSource, content: facts, reviewStatus: factsReviewed ? 'reviewed' : 'pending' },
    { kind: 'professional-reference', title: '전문 참고자료', source: referenceSource, content: reference, reviewStatus: reviewed ? 'reviewed' : 'pending' },
  ];
  return <div style={{ width: '100%', display: 'grid', gap: 8 }}>
    <label htmlFor={`${id}-purpose`}>설명서 이용 목적</label>
    <select style={inputStyle} id={`${id}-purpose`} value={purpose} onChange={e => change({ purpose: e.target.value as ProductDescriptionPurpose })}>
      {Object.entries(PRODUCT_DESCRIPTION_PURPOSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <details>
      <summary>상품 근거·전문 참고자료 추가</summary>
      <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
        <label htmlFor={`${id}-facts`}>상품 사실 원문</label>
        <textarea style={inputStyle} id={`${id}-facts`} maxLength={20000} value={facts} onChange={e => { change({ facts: e.target.value, factsReviewed: false }); }} rows={4} />
        <label htmlFor={`${id}-fact-source`}>상품 원문 출처·확인일</label>
        <input style={inputStyle} id={`${id}-fact-source`} maxLength={1000} value={factSource} onChange={e => { change({ factSource: e.target.value, factsReviewed: false }); }} placeholder="허가문서·제조사 자료 이름 또는 URL, 확인일" />
        <label><input type="checkbox" disabled={!facts.trim() || !factSource.trim()} checked={factsReviewed} onChange={e => change({ factsReviewed: e.target.checked })} /> 상품 원문의 출처와 내용을 검수했습니다</label>
        <label htmlFor={`${id}-reference`}>전문 참고정보</label>
        <textarea style={inputStyle} id={`${id}-reference`} maxLength={20000} value={reference} onChange={e => { change({ reference: e.target.value, reviewed: false }); }} rows={4} />
        <label htmlFor={`${id}-reference-source`}>전문 자료 출처·확인일</label>
        <input style={inputStyle} id={`${id}-reference-source`} maxLength={1000} value={referenceSource} onChange={e => { change({ referenceSource: e.target.value, reviewed: false }); }} placeholder="전문 문헌·지침 이름 또는 URL, 확인일" />
        <label><input type="checkbox" disabled={!reference.trim() || !referenceSource.trim()} checked={reviewed} onChange={e => change({ reviewed: e.target.checked })} /> 전문 참고자료의 출처와 내용을 검수했습니다</label>
        <p>환자·고객 개인정보는 입력하지 마세요. {value ? '근거·목적·언어는 본문과 함께 저장합니다. 결과는 편집기에서 검토한 뒤 저장하세요.' : '근거는 이번 AI 작업에 사용하며 결과는 편집기에서 검토한 뒤 저장합니다.'}</p>
      </div>
    </details>
    <LlmAssistPanel label={STORE_LLM_ASSIST_LABEL} contextLabel={PRODUCT_DESCRIPTION_PURPOSE_LABELS[purpose]}
      guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({ ...context, purpose, evidence, additionalInstruction: [context.additionalInstruction, additionalInstruction].filter(Boolean).join('\n') })}
      currentHtml={context.currentHtml ?? undefined} onApplyHtml={onApplyHtml} />
  </div>;
}
