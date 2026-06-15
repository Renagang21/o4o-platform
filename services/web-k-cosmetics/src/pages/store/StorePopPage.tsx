/**
 * StorePopPage — K-Cosmetics POP 생성
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 * WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1: POP AI 진입을 인라인 fetch →
 *   공통 AiContentModal(@o4o/content-editor)로 정렬(KPA 패턴). 모델 resolver/preset 적용 가능.
 * Adapted from GlycoPharm StorePopPage (KPA canonical pattern).
 *
 * API prefix: /cosmetics (backend: createStorePopController serviceKey='cosmetics')
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseProductionRouterState, GuideBackLink } from '@o4o/store-ui-core';
import {
  ArrowLeft,
  Megaphone,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  RefreshCw,
  FileDown,
  Save,
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/apiClient';
import { getAccessToken } from '@o4o/auth-client';
import { toast } from '@o4o/error-handling';
// WO-O4O-POP-SAVE-AS-CONTENT-V1: 제작 결과를 재편집 가능한 POP 콘텐츠(store_pops)로 저장
import { createStaffPopPost } from '@/api/popStaff';
import { getStoreSlug } from '@/api/storeHub';
// WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1: POP 에 QR 연결
import { getStoreQrCodes } from '@/api/storeProductionSources';
import type { ProductionTemplate } from '@o4o/types/production-template';
import { findTemplate } from '../../config/productionTemplates';
// WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1: POP AI 진입을 KPA 와 동일한 공통 모달로 정렬
import { AiContentModal } from '@o4o/content-editor';

interface SupplierItem {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  mimeType?: string | null;
  category: string | null;
  supplierId: string;
}

interface PopAiContent {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
}

const TEMPLATES = [
  { id: 'pop-modern',       label: '모던',   desc: '헤드라인 강조, 미니멀' },
  { id: 'pop-soft',         label: '소프트', desc: '부드러운 설명형' },
  { id: 'pop-pharmacy-pro', label: '매장 전문형', desc: '전문 매장 스타일' },
];

export default function StorePopPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<SupplierItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Prefill from library router state if present
  const [selectedTemplate] = useState<ProductionTemplate | null>(() => {
    const prod = parseProductionRouterState(location.state);
    const templateId = prod?.selectedTemplateId;
    return templateId ? (findTemplate(templateId) ?? null) : null;
  });

  const [aiPrompt, setAiPrompt] = useState(() => {
    const prod = parseProductionRouterState(location.state);
    if (prod?.source?.items?.length) {
      const item = prod.source.items[0];
      return [item.title, item.description].filter(Boolean).join('\n');
    }
    return '';
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [popAiContent, setPopAiContent] = useState<PopAiContent | null>(null);

  // WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1: 가져온 POP 사본 prefill (router state)
  useEffect(() => {
    const pf = (location.state as { prefillPop?: { title?: string; content?: string; excerpt?: string } } | null)?.prefillPop;
    if (!pf) return;
    const bodyText = (pf.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setPopAiContent({ title: pf.title || '', bullets: [], shortText: (pf.excerpt || '').trim(), longText: bodyText });
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장
  const [savingContent, setSavingContent] = useState(false);
  const handleSaveAsContent = async () => {
    if (!popAiContent) {
      toast.error('저장할 POP 문구가 없습니다. 먼저 AI 문구를 만들거나 가져온 POP으로 시작하세요.');
      return;
    }
    const slug = await getStoreSlug().catch(() => null);
    if (!slug) {
      toast.error('매장 정보를 확인할 수 없습니다');
      return;
    }
    setSavingContent(true);
    try {
      const contentHtml = [
        popAiContent.shortText ? `<p>${popAiContent.shortText}</p>` : '',
        popAiContent.bullets.length ? `<ul>${popAiContent.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '',
        popAiContent.longText ? `<p>${popAiContent.longText}</p>` : '',
      ].filter(Boolean).join('');
      await createStaffPopPost(slug, {
        title: popAiContent.title || 'POP',
        content: contentHtml,
        excerpt: popAiContent.shortText || undefined,
      });
      toast.success('POP 콘텐츠로 저장되었습니다. 내 매장 POP에서 다시 수정·제작할 수 있습니다.');
    } catch (e: any) {
      toast.error(e?.message || 'POP 콘텐츠 저장에 실패했습니다');
    } finally {
      setSavingContent(false);
    }
  };

  const [layout, setLayout] = useState<'A4' | 'A5'>('A4');
  const [templateId, setTemplateId] = useState('pop-modern');

  // WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1: QR 선택(POP PDF 에 삽입)
  const [qrCodes, setQrCodes] = useState<Array<{ id: string; title: string; landingType?: string; slug?: string }>>([]);
  const [selectedQrId, setSelectedQrId] = useState('');
  useEffect(() => {
    getStoreQrCodes({ limit: 100 })
      .then((items) => setQrCodes(Array.isArray(items) ? items : []))
      .catch(() => setQrCodes([]));
  }, []);

  const [generating, setGenerating] = useState(false);

  const loadItems = async () => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await api.get<{ success: boolean; data: SupplierItem[] }>(
        '/cosmetics/pharmacy/pop/source/supplier-items',
      );
      setItems((res as any).data?.data ?? []);
    } catch (err: any) {
      setItemsError(err?.message || '자료를 불러오지 못했습니다');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 8) { toast.error('최대 8개까지 선택할 수 있습니다'); return prev; }
      return [...prev, id];
    });
  };

  // AiContentModal 진입 시 seed 할 입력 텍스트(주제 직접입력 우선, 없으면 선택 자료 원문).
  const buildAiInputText = (): string => {
    const fromPrompt = aiPrompt.trim();
    if (fromPrompt) return fromPrompt;
    return selectedIds
      .map((id) => {
        const item = items.find((it) => it.id === id);
        return item ? `${item.title}\n${item.description ?? ''}` : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 3000);
  };

  // AiContentModal onInsert — KPA POP 패턴과 동일: html 을 파싱해 popAiContent 로 변환.
  const handleAiInsert = (data: { html: string; title: string }) => {
    setAiOpen(false);
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.html, 'text/html');
    const bullets = Array.from(doc.querySelectorAll('li')).map((li) => li.textContent?.trim() || '').filter(Boolean);
    const paragraphs = Array.from(doc.querySelectorAll('p')).map((p) => p.textContent?.trim() || '').filter(Boolean);
    setPopAiContent({
      title: data.title || paragraphs[0] || '',
      bullets: bullets.slice(0, 3),
      shortText: paragraphs[0] || '',
      longText: paragraphs.slice(0, 3).join(' '),
    });
    toast.success('AI 문구가 생성되었습니다');
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) { toast.error('자료를 최소 1개 선택해주세요'); return; }

    setGenerating(true);
    try {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE_URL}/api/v1/cosmetics/pharmacy/pop/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          supplierItemIds: selectedIds,
          layout,
          templateId,
          ...(popAiContent ? { aiContent: popAiContent } : {}),
          ...(selectedQrId ? { qrId: selectedQrId } : {}),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || 'POP 생성 실패');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success('POP PDF가 생성되었습니다');
    } catch (err: any) {
      toast.error(err?.message || 'POP 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 80px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}><ArrowLeft size={16} /></button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={20} color="#db2777" />
            POP 생성
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            공급자 자료와 AI 문구를 결합하여 매장 POP PDF를 생성합니다
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide/features/pop" label="POP 제작 방법" /></div>
        </div>
      </div>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={stepBadgeStyle}>1</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>공급자 자료 선택</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
            최소 1개, 최대 8개 — {selectedIds.length}/8 선택됨
          </span>
          <button onClick={loadItems} style={{ ...refreshSmallBtnStyle, marginLeft: 'auto' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>

        {itemsLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13 }}>자료를 불러오는 중...</p>
          </div>
        )}

        {itemsError && !itemsLoading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px', color: '#dc2626' }} />
            <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{itemsError}</p>
            <button onClick={loadItems} style={retryBtnStyle}>다시 시도</button>
          </div>
        )}

        {!itemsLoading && !itemsError && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <p style={{ fontSize: 13 }}>사용 가능한 공급자 자료가 없습니다</p>
          </div>
        )}

        {!itemsLoading && !itemsError && items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    border: `2px solid ${selected ? '#db2777' : '#e2e8f0'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    backgroundColor: selected ? '#fdf2f8' : '#fff',
                    transition: 'border-color 0.15s, background-color 0.15s',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {selected ? <CheckSquare size={18} color="#db2777" /> : <Square size={18} color="#94a3b8" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <span style={{ fontSize: 11, color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 6 }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={stepBadgeStyle}>2</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>AI 문구 생성</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>선택 사항 — 미적용 시 자료 원문 사용</span>
        </div>

        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="POP에 담을 내용을 입력하세요 (비워두면 선택한 자료의 설명을 사용합니다)"
          rows={3}
          style={textareaStyle}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <button
            onClick={() => setAiOpen(true)}
            style={aiGenBtnStyle}
          >
            <Sparkles size={14} />
            AI 문구 생성
          </button>
          {/* WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장 (내 매장 POP 재편집·재제작) */}
          {popAiContent && (
            <button
              onClick={handleSaveAsContent}
              disabled={savingContent}
              style={aiGenBtnStyle}
              title="POP 콘텐츠로 저장 (내 매장 POP 에서 재편집·재제작)"
            >
              <Save size={14} />
              {savingContent ? '저장 중...' : 'POP 콘텐츠로 저장'}
            </button>
          )}
          {popAiContent && (
            <button
              onClick={() => setPopAiContent(null)}
              style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              AI 문구 제거
            </button>
          )}
        </div>

        {popAiContent && (
          <div style={aiPreviewStyle}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>
              ✨ AI 생성 문구 ({popAiContent.title && '제목 포함'})
            </p>
            {popAiContent.title && (
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{popAiContent.title}</p>
            )}
            {popAiContent.shortText && (
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>{popAiContent.shortText}</p>
            )}
            {popAiContent.bullets.length > 0 && (
              <ul style={{ fontSize: 13, color: '#64748b', paddingLeft: 18, margin: 0 }}>
                {popAiContent.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={stepBadgeStyle}>3</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>레이아웃 및 템플릿</span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>레이아웃</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['A4', 'A5'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: `2px solid ${layout === l ? '#db2777' : '#e2e8f0'}`,
                    backgroundColor: layout === l ? '#fdf2f8' : '#fff',
                    color: layout === l ? '#db2777' : '#64748b',
                    fontWeight: layout === l ? 600 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>템플릿</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  title={t.desc}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `2px solid ${templateId === t.id ? '#db2777' : '#e2e8f0'}`,
                    backgroundColor: templateId === t.id ? '#fdf2f8' : '#fff',
                    color: templateId === t.id ? '#db2777' : '#64748b',
                    fontWeight: templateId === t.id ? 600 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1: QR 연결(선택) */}
      {qrCodes.length > 0 && (
        <section style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>QR 연결 (선택)</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            POP 에 삽입할 내 QR 코드를 선택하면 생성된 POP PDF 에 함께 표시됩니다.
          </p>
          <select
            value={selectedQrId}
            onChange={(e) => setSelectedQrId(e.target.value)}
            style={{ width: '100%', maxWidth: 480, padding: '8px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}
          >
            <option value="">QR 연결 안 함</option>
            {qrCodes.map((qr) => (
              <option key={qr.id} value={qr.id}>
                {qr.title}{qr.landingType ? ` (${qr.landingType})` : ''}
              </option>
            ))}
          </select>
        </section>
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleGenerate}
          disabled={generating || selectedIds.length === 0}
          style={{
            ...generateBtnStyle,
            opacity: generating || selectedIds.length === 0 ? 0.6 : 1,
            cursor: generating || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {generating
            ? <><Loader2 size={16} className="animate-spin" /> POP 생성 중...</>
            : <><FileDown size={16} /> POP PDF 생성</>
          }
        </button>
      </div>

      {selectedIds.length === 0 && (
        <p style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          자료를 1개 이상 선택하면 POP를 생성할 수 있습니다
        </p>
      )}

      {/* WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1: POP 문구 AI 공통 모달(KPA 패턴) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        initialMode="pop"
        initialText={buildAiInputText()}
        templateId={selectedTemplate?.id}
        templateSystemPrompt={selectedTemplate?.systemPromptOverride}
        templateForcedOptions={selectedTemplate?.forcedOptions}
        headerLabel="POP 문구 AI 생성"
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16,
};

const sectionHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 };

const stepBadgeStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%', backgroundColor: '#db2777',
  color: '#fff', fontSize: 12, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '6px 8px',
  border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#fff', cursor: 'pointer', color: '#64748b',
};

const refreshSmallBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#64748b',
  backgroundColor: '#fff', cursor: 'pointer',
};

const retryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#475569', backgroundColor: '#fff', cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const aiGenBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
  backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const aiPreviewStyle: React.CSSProperties = {
  marginTop: 12, padding: '12px 14px', backgroundColor: '#faf5ff',
  border: '1px solid #e9d5ff', borderRadius: 8,
};

const generateBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 28px', backgroundColor: '#db2777', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
};
