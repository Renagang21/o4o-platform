/**
 * StorePopPage — GlycoPharm POP 생성
 *
 * WO-O4O-GLYCOPHARM-POP-STORE-EXECUTION-V1
 * WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1: 페이지형 AI 문구 생성 진입(AiContentModal
 *   initialMode='pop') 제거. POP 문구는 선택 자료 원문 사용. 가져온 POP(prefill) 문구만 패널 표시.
 *   공통 AiContentModal 컴포넌트·백엔드 API 무변경. 편집기 Toolbar "AI 정리"는 본 화면 비대상.
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
 *   매장 자체 상품 POP 의 canonical 제작 화면. router state 의 production.source.items 중
 *   origin='local' (store_local_products) 항목을 organization-scoped 단건 API 로 재조회해 prefill 하고,
 *   기존 `POST /glycopharm/pharmacy/pop/generate` 계약에 localProductItemIds 로 전달한다.
 *   전역 product_ai_contents / ProductMaster POP endpoint 는 호출하지 않는다.
 *
 * 흐름:
 *   1. 공급자 자료 선택 (GET /glycopharm/pharmacy/pop/source/supplier-items)
 *      또는 매장 자체 상품 진입 (origin='local' router state)
 *   2. (가져온 POP 문구가 있을 때만) 문구 패널 — POP 콘텐츠로 저장 / 제거
 *   3. 레이아웃/템플릿 선택
 *   4. POP PDF 생성 (POST /glycopharm/pharmacy/pop/generate, aiContent 포함)
 *
 * 진입점: /store → StoreMainPage QUICK_ACTIONS → /store/marketing/pop
 * 권한: PHARMACIST (StoreLayoutWrapper ProtectedRoute)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GuideBackLink } from '@o4o/store-ui-core';
import {
  ArrowLeft,
  Megaphone,
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
// WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1: 매장 자체 상품 prefill (org 격리 단건 조회)
import { getLocalProduct } from '@/api/localProducts';
import { parseProductionRouterState } from '@o4o/store-ui-core';

// ─── Types ────────────────────────────────────────────────────────────────────

/** WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1: 매장 자체 상품 POP 입력 */
interface LocalProductPopItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

/** HTML 본문 → POP 문구용 plain text (신규 요약 알고리즘 없음) */
function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
  { id: 'pop-pharmacy-pro', label: '약국 전문형', desc: '전문 약국 스타일' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function StorePopPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: supplier items
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1: AI 문구 생성 진입 제거.
  //   popAiContent 는 가져온 POP(prefillPop) 경로에서만 설정된다. POP 문구는 선택 자료 원문 사용.
  const [popAiContent, setPopAiContent] = useState<PopAiContent | null>(null);

  // WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1: 가져온 POP 사본 prefill (router state)
  useEffect(() => {
    const pf = (location.state as { prefillPop?: { title?: string; content?: string; excerpt?: string } } | null)?.prefillPop;
    if (!pf) return;
    const bodyText = (pf.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setPopAiContent({ title: pf.title || '', bullets: [], shortText: (pf.excerpt || '').trim(), longText: bodyText });
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
  //   매장 자체 상품(origin='local') 진입 — source identity 만 router state 로 받고 본문은 재조회한다.
  const [localItems, setLocalItems] = useState<LocalProductPopItem[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const localIdsRef = useRef<string[]>([]);

  const loadLocalProducts = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setLocalLoading(true);
    setLocalError(null);
    const fetched: LocalProductPopItem[] = [];
    let failed = 0;
    let blocked = 0;
    for (const id of ids) {
      try {
        const p = await getLocalProduct(id);
        const detail = p.detail_html ?? p.detailHtml ?? null;
        fetched.push({
          id: p.id,
          title: p.name,
          description:
            (p.summary?.trim() || null)
            ?? (detail ? htmlToPlainText(detail) || null : null)
            ?? (p.description?.trim() || null),
          imageUrl: p.thumbnail_url ?? p.images?.[0] ?? null,
        });
      } catch (e: any) {
        // 404 = 미존재 또는 다른 조직 상품(차단). 그 외 = 조회 실패.
        if (e?.response?.status === 404 || e?.status === 404) blocked += 1;
        else failed += 1;
      }
    }
    if (fetched.length) {
      setLocalItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...fetched.filter((f) => !seen.has(f.id))];
      });
    }
    if (blocked > 0) setLocalError('해당 상품을 찾을 수 없습니다. 내 매장의 자체 상품인지 확인해 주세요.');
    else if (failed > 0) setLocalError('매장 자체 상품 정보를 불러오지 못했습니다.');
    setLocalLoading(false);
  }, []);

  useEffect(() => {
    const production = parseProductionRouterState(location.state);
    const ids = (production?.source?.items ?? [])
      .filter((it) => it.origin === 'local')
      .map((it) => it.id);
    if (!ids.length) return;
    localIdsRef.current = ids;
    loadLocalProducts(ids);
    window.history.replaceState({}, document.title);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장
  const [savingContent, setSavingContent] = useState(false);
  const handleSaveAsContent = async () => {
    if (!popAiContent) {
      toast.error('저장할 POP 문구가 없습니다. 먼저 AI 문구를 만들거나 가져온 POP으로 시작하세요.');
      return;
    }
    const slug = await getStoreSlug().catch(() => null);
    if (!slug) {
      toast.error('약국 정보를 확인할 수 없습니다');
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
      toast.success('POP 콘텐츠로 저장되었습니다. 내 약국 POP에서 다시 수정·제작할 수 있습니다.');
    } catch (e: any) {
      toast.error(e?.message || 'POP 콘텐츠 저장에 실패했습니다');
    } finally {
      setSavingContent(false);
    }
  };

  // Step 3: layout + template
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

  // Generate
  const [generating, setGenerating] = useState(false);

  // ─── Load supplier items ──────────────────────────────────────────────────

  const loadItems = async () => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await api.get<{ success: boolean; data: SupplierItem[] }>(
        '/glycopharm/pharmacy/pop/source/supplier-items',
      );
      setItems((res as any).data?.data ?? []);
    } catch (err: any) {
      setItemsError(err?.message || '자료를 불러오지 못했습니다');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  // ─── Item selection ───────────────────────────────────────────────────────

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 8) {
        toast.error('최대 8개까지 선택할 수 있습니다');
        return prev;
      }
      return [...prev, id];
    });
  };

  // ─── POP PDF generation ───────────────────────────────────────────────────

  const handleGenerate = async () => {
    // WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
    //   공급자 자료 / 매장 자체 상품 중 하나 이상이 필요하다.
    if (selectedIds.length === 0 && localItems.length === 0) {
      toast.error('자료를 최소 1개 선택해주세요');
      return;
    }

    // 매장 자체 상품 POP 은 결과를 매장 소유 제작 자료(store_execution_assets)로 저장한다
    // → 내 자료함(/store/library/production-materials)에서 다시 열고 출력할 수 있다.
    const hasLocal = localItems.length > 0;

    setGenerating(true);
    try {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE_URL}/api/v1/glycopharm/pharmacy/pop/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...(selectedIds.length ? { supplierItemIds: selectedIds } : {}),
          ...(hasLocal ? { localProductItemIds: localItems.map((p) => p.id) } : {}),
          layout,
          templateId,
          ...(popAiContent ? { aiContent: popAiContent } : {}),
          ...(selectedQrId ? { qrId: selectedQrId } : {}),
          ...(hasLocal
            ? { save: true, title: `${popAiContent?.title || localItems[0].title} POP` }
            : {}),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || 'POP 생성 실패');
      }

      if (hasLocal) {
        // save=true 응답은 JSON({ assetId, fileUrl, title })
        const result = await resp.json();
        const fileUrl: string | undefined = result?.data?.fileUrl;
        if (!fileUrl) throw new Error('POP 생성 결과를 확인할 수 없습니다');
        window.open(fileUrl, '_blank');
        toast.success('POP PDF가 생성되었습니다. 내 자료함에서 다시 열고 출력할 수 있습니다.');
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success('POP PDF가 생성되었습니다');
    } catch (err: any) {
      // 실패 시 선택 항목·문구는 유지한다(재시도 가능).
      toast.error(err?.message || 'POP 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={20} color="#ea580c" />
            POP 생성
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            공급자 자료와 AI 문구를 결합하여 약국 POP PDF를 생성합니다
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide/features/pop" label="POP 제작 방법" /></div>
        </div>
      </div>

      {/* WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
          매장 자체 상품 진입(origin='local'). 로딩/실패/차단을 빈 폼으로 위장하지 않는다. */}
      {(localLoading || localError || localItems.length > 0) && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>매장 자체 상품</span>
          </div>

          {localLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
              <Loader2 size={16} className="animate-spin" />
              상품 정보를 불러오는 중...
            </div>
          )}

          {localError && !localLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <AlertCircle size={16} color="#dc2626" />
              <span style={{ fontSize: 13, color: '#dc2626' }}>{localError}</span>
              <button onClick={() => loadLocalProducts(localIdsRef.current)} style={retryBtnStyle}>
                다시 시도
              </button>
            </div>
          )}

          {localItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localItems.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    border: '2px solid #ea580c', backgroundColor: '#fff7ed',
                    borderRadius: 10, padding: '12px 14px',
                  }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{p.title}</p>
                    {p.description && (
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setLocalItems((prev) => prev.filter((x) => x.id !== p.id))}
                    style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    제외
                  </button>
                </div>
              ))}
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                생성된 POP 은 내 자료함(제작 자료)에 저장되어 다시 열고 출력할 수 있습니다.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Step 1: 자료 선택 */}
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
                    border: `2px solid ${selected ? '#ea580c' : '#e2e8f0'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    backgroundColor: selected ? '#fff7ed' : '#fff',
                    transition: 'border-color 0.15s, background-color 0.15s',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {selected
                      ? <CheckSquare size={18} color="#ea580c" />
                      : <Square size={18} color="#94a3b8" />
                    }
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

      {/* WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1: AI 문구 생성 진입 제거.
          POP 문구는 선택 자료 원문을 사용한다. 가져온 POP(prefill) 문구가 있을 때만 패널 표시. */}
      {popAiContent && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={stepBadgeStyle}>2</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>가져온 POP 문구</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장 (내 약국 POP 재편집·재제작) */}
            <button
              onClick={handleSaveAsContent}
              disabled={savingContent}
              style={aiGenBtnStyle}
              title="POP 콘텐츠로 저장 (내 약국 POP 에서 재편집·재제작)"
            >
              <Save size={14} />
              {savingContent ? '저장 중...' : 'POP 콘텐츠로 저장'}
            </button>
            <button
              onClick={() => setPopAiContent(null)}
              style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              문구 제거
            </button>
          </div>

          <div style={aiPreviewStyle}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>
              가져온 POP 문구 ({popAiContent.title && '제목 포함'})
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
        </section>
      )}

      {/* Step 3: 레이아웃 & 템플릿 */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={stepBadgeStyle}>3</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>레이아웃 및 템플릿</span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Layout */}
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
                    border: `2px solid ${layout === l ? '#ea580c' : '#e2e8f0'}`,
                    backgroundColor: layout === l ? '#fff7ed' : '#fff',
                    color: layout === l ? '#ea580c' : '#64748b',
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

          {/* Template */}
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
                    border: `2px solid ${templateId === t.id ? '#ea580c' : '#e2e8f0'}`,
                    backgroundColor: templateId === t.id ? '#fff7ed' : '#fff',
                    color: templateId === t.id ? '#ea580c' : '#64748b',
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

      {/* Generate Button */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleGenerate}
          disabled={generating || (selectedIds.length === 0 && localItems.length === 0)}
          style={{
            ...generateBtnStyle,
            opacity: generating || (selectedIds.length === 0 && localItems.length === 0) ? 0.6 : 1,
            cursor: generating || (selectedIds.length === 0 && localItems.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {generating
            ? <><Loader2 size={16} className="animate-spin" /> POP 생성 중...</>
            : <><FileDown size={16} /> POP PDF 생성</>
          }
        </button>
      </div>

      {selectedIds.length === 0 && localItems.length === 0 && (
        <p style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          자료를 1개 이상 선택하면 POP를 생성할 수 있습니다
        </p>
      )}

    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
};

const stepBadgeStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  backgroundColor: '#ea580c',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 8px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  backgroundColor: '#fff',
  cursor: 'pointer',
  color: '#64748b',
};

const refreshSmallBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  color: '#64748b',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const retryBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const aiGenBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const aiPreviewStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '12px 14px',
  backgroundColor: '#faf5ff',
  border: '1px solid #e9d5ff',
  borderRadius: 8,
};

const generateBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 28px',
  backgroundColor: '#ea580c',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
};
