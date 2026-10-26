import { sanitizeRichHtml } from '@o4o/content-editor';
import { useState } from 'react';
import { ProductDescriptionAssist } from './ProductDescriptionAssist';
import { ProductEvidencePicker, type ProductEvidenceSelection } from './ProductEvidencePicker';
import { consultationLanguages, type ProductConsultationDraft } from './productConsultationDraft';

export function ProductConsultationAuthoring({ value, title, html, disabled, isCurrent, onChange, onApplyHtml }: Readonly<{
  value: ProductConsultationDraft; title: string; html: string; disabled: boolean; isCurrent: () => boolean;
  onChange: (value: ProductConsultationDraft) => void; onApplyHtml: (html: string) => void;
}>) {
  const [applyError, setApplyError] = useState('');
  const [source, setSource] = useState<ProductEvidenceSelection | null>(null);
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-sm font-semibold">상품 상담자료</legend>
    <p className="text-sm">상품·근거 확인 → ChatGPT 요청문 복사 → 결과를 편집기에 적용 → 내용 확인 후 저장</p>
    <p className="text-xs text-slate-600">{value.product.name} · 원본 상품과 공개 설명서는 바뀌지 않습니다.</p>
    <label className="flex flex-wrap items-center gap-2 text-sm"><span>작성 언어</span>
      <select aria-label="상담자료 작성 언어" value={value.language} className="min-h-11 rounded border px-2"
        onChange={e => onChange({ ...value, language: e.target.value as ProductConsultationDraft['language'] })}>
        {Object.entries(consultationLanguages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
    <ProductEvidencePicker key={`${value.product.sourceType}:${value.product.sourceId}:${value.language}`}
      mode="evidence" kind={value.product.sourceType} id={value.product.sourceId} locale={value.language}
      disabled={disabled} isCurrent={isCurrent} onLoaded={setSource} onInsert={body => {
        if (!source || !isCurrent()) return;
        if (value.assist.facts.trim() && !window.confirm('작성 중인 상품 사실 근거를 확인한 원문으로 바꾸시겠습니까?')) return;
        onChange({ ...value, assist: { ...value.assist, facts: body.slice(0, 20000),
          factSource: `${source.source}${body.length > 20000 ? ' · 원문 일부(20,000자)' : ''}`.slice(0, 1000), factsReviewed: false } });
      }} />
    <ProductDescriptionAssist value={value.assist} onChange={assist => onChange({ ...value, assist })}
      context={{ task: 'product-description', title, productName: value.product.name, currentHtml: html,
        additionalInstruction: `결과는 ${consultationLanguages[value.language]}로 작성하세요.` }}
      onApplyHtml={body => {
        if (!isCurrent() || disabled) return;
        const clean = sanitizeRichHtml(body);
        if (!clean.trim()) { setApplyError('적용할 본문이 없습니다. 결과 HTML을 확인해 주세요.'); return; }
        setApplyError(''); onApplyHtml(clean);
      }} />
    {applyError && <p role="alert" className="text-sm text-red-700">{applyError}</p>}
    <p className="text-xs text-slate-500">저장은 내 매장 자료함에만 수행합니다. ChatGPT 연결·게시·QR 생성은 이 단계에서 실행하지 않습니다.</p>
  </fieldset>;
}
