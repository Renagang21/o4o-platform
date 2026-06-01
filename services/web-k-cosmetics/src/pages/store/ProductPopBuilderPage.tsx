/**
 * ProductPopBuilderPage — K-Cosmetics 상품 POP 만들기 (AI 자동 주입 + 편집 + PDF 생성)
 *
 * WO-O4O-PRODUCT-MARKETING-POP-BUILDER-EXTRACTION-V1
 *
 * KPA-Society canonical ProductPopBuilderPage 이식.
 *
 * 흐름:
 *   ProductMarketingPage → "POP 만들기" →
 *   본 페이지에서 AI pop_short/pop_long 자동 prefill →
 *   매장 경영자 편집 →
 *   "저장 + PDF 생성" → product_ai_contents upsert 후
 *   GET /api/v1/products/:productId/pop/:layout 호출 → PDF blob.
 *
 * Reference 구조 유지: productId reference만 사용, 원본 콘텐츠 복제 없음.
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, FileDown, Save, Sparkles, RefreshCw } from 'lucide-react';
import { GuideBlock } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { getAccessToken } from '@o4o/auth-client';
import { API_BASE_URL } from '@/lib/apiClient';
import {
  getProductAiContents,
  saveProductAiContent,
} from '@/api/productAiContent';

type Layout = 'A4' | 'A5' | 'A6';
type ShortSource = 'pop_short' | 'product_description' | 'asset' | 'fallback';
type LongSource = 'pop_long' | 'product_description' | 'asset' | 'fallback';

interface BuilderProductionItem {
  id: string;
  title: string;
  description?: string | null;
  origin: 'snapshot' | 'direct' | 'library';
}
interface BuilderLocationState {
  production?: {
    source?: { items?: BuilderProductionItem[] };
    target?: string;
  };
  productContext?: {
    productId?: string;
    productName?: string;
  };
}

// Inline color tokens (KPA theme 기준)
const c = {
  primary: '#2563EB',
  neutral800: '#1E293B',
  neutral700: '#334155',
  neutral600: '#475569',
  neutral500: '#64748B',
  neutral400: '#94A3B8',
  neutral300: '#CBD5E1',
  neutral200: '#E2E8F0',
  white: '#FFFFFF',
};

export function ProductPopBuilderPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as BuilderLocationState | null) ?? {};

  const incomingProductName = incoming.productContext?.productName ?? '';
  const incomingFirstItem = incoming.production?.source?.items?.[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState<string>(incomingProductName);
  const [shortText, setShortText] = useState('');
  const [longText, setLongText] = useState('');
  const [layout, setLayout] = useState<Layout>('A4');
  const [shortSource, setShortSource] = useState<ShortSource | null>(null);
  const [longSource, setLongSource] = useState<LongSource | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getProductAiContents(productId);
        if (cancelled) return;
        const map = new Map<string, string>();
        if (res.success && Array.isArray(res.data)) {
          for (const item of res.data) map.set(item.contentType, item.content);
        }
        const popShort = map.get('pop_short')?.trim() || '';
        const popLong = map.get('pop_long')?.trim() || '';
        const productDesc = map.get('product_description')?.trim() || '';
        const assetDesc = (incomingFirstItem?.description ?? '').trim();
        const fallbackName = incomingProductName.trim();

        if (popShort) {
          setShortText(popShort);
          setShortSource('pop_short');
        } else if (productDesc) {
          setShortText(productDesc.slice(0, 80));
          setShortSource('product_description');
        } else if (assetDesc) {
          setShortText(assetDesc.slice(0, 80));
          setShortSource('asset');
        } else if (fallbackName) {
          setShortText(fallbackName);
          setShortSource('fallback');
        }

        if (popLong) {
          setLongText(popLong);
          setLongSource('pop_long');
        } else if (productDesc) {
          setLongText(productDesc);
          setLongSource('product_description');
        } else if (assetDesc) {
          setLongText(assetDesc);
          setLongSource('asset');
        } else if (fallbackName) {
          setLongText(fallbackName);
          setLongSource('fallback');
        }
      } catch {
        // graceful — empty form
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const persistEdits = async (): Promise<boolean> => {
    if (!productId) return false;
    try {
      const tasks: Promise<unknown>[] = [];
      const trimmedShort = shortText.trim();
      const trimmedLong = longText.trim();
      if (trimmedShort) tasks.push(saveProductAiContent(productId, 'pop_short', trimmedShort));
      if (trimmedLong) tasks.push(saveProductAiContent(productId, 'pop_long', trimmedLong));
      if (tasks.length === 0) return true;
      await Promise.all(tasks);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await persistEdits();
    setSaving(false);
    if (ok) toast.success('저장되었습니다');
    else toast.error('저장에 실패했습니다');
  };

  const handleGeneratePdf = async () => {
    if (!productId) return;
    setGenerating(true);
    try {
      const ok = await persistEdits();
      if (!ok) {
        toast.error('저장에 실패했습니다');
        return;
      }
      const token = getAccessToken();
      const url = `${API_BASE_URL}/api/v1/products/${productId}/pop/${layout}`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('POP 생성 실패');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      toast.success('PDF가 생성되었습니다');
    } catch {
      toast.error('PDF 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  const sourceLabel = (s: ShortSource | LongSource | null): string | null => {
    switch (s) {
      case 'pop_short':
      case 'pop_long':
        return 'AI 초안';
      case 'product_description':
        return 'AI 상세설명에서';
      case 'asset':
        return '자료실 설명에서';
      case 'fallback':
        return '상품명에서';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <RefreshCw size={24} style={{ color: c.neutral300 }} />
          <p style={{ color: c.neutral500, fontSize: '14px', marginTop: '12px' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '16px' }}>
        <GuideBlock
          variant="warning"
          title="AI 문구는 초안입니다"
          description="자동 채워진 문구는 AI 초안이며, 매장 경영자가 검토 및 수정 후 PDF를 생성하세요. '저장' 또는 'PDF 생성' 시 AI 문구가 갱신됩니다."
        />
      </div>

      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link
              to={productId ? `/store/commerce/products/${productId}/marketing` : '/store/commerce/products'}
              style={{ color: c.neutral400, fontSize: '13px', textDecoration: 'none' }}
            >
              마케팅 자산
            </Link>
            <span style={{ color: c.neutral300 }}>/</span>
            <span style={{ color: c.neutral600, fontSize: '13px' }}>POP 만들기</span>
          </div>
          <h1 style={styles.title}>POP 만들기</h1>
          <p style={styles.subtitle}>AI 초안을 검토 후 POP PDF를 생성합니다</p>
        </div>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={14} />
          돌아가기
        </button>
      </div>

      <div style={styles.form}>
        <div style={styles.formRow}>
          <label style={styles.formLabel}>제목 (상품명)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            placeholder="상품명"
          />
          <p style={styles.helperText}>POP PDF의 제목은 backend의 product master에서 자동으로 사용됩니다. 본 입력은 참고용입니다.</p>
        </div>

        <div style={styles.formRow}>
          <label style={styles.formLabel}>
            짧은 문구 (POP short)
            {shortSource && (
              <span style={styles.sourceBadge}>
                <Sparkles size={10} /> {sourceLabel(shortSource)}
              </span>
            )}
          </label>
          <textarea
            value={shortText}
            onChange={(e) => setShortText(e.target.value)}
            style={{ ...styles.textarea, minHeight: '60px' }}
            placeholder="POP 상단의 짧은 한 줄 문구 (예: 봄 환절기 면역 케어)"
          />
        </div>

        <div style={styles.formRow}>
          <label style={styles.formLabel}>
            긴 설명 (POP long)
            {longSource && (
              <span style={styles.sourceBadge}>
                <Sparkles size={10} /> {sourceLabel(longSource)}
              </span>
            )}
          </label>
          <textarea
            value={longText}
            onChange={(e) => setLongText(e.target.value)}
            style={{ ...styles.textarea, minHeight: '120px' }}
            placeholder="POP 하단의 상세 설명"
          />
        </div>

        <div style={styles.formRow}>
          <label style={styles.formLabel}>레이아웃</label>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as Layout)}
            style={styles.select}
          >
            <option value="A4">A4 (1매)</option>
            <option value="A5">A5 (2매)</option>
            <option value="A6">A6 (4매)</option>
          </select>
        </div>

        <div style={styles.actions}>
          <button
            onClick={handleSave}
            disabled={saving || generating}
            style={{ ...styles.saveBtn, opacity: saving || generating ? 0.7 : 1 }}
          >
            <Save size={14} />
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={saving || generating}
            style={{ ...styles.pdfBtn, opacity: saving || generating ? 0.7 : 1 }}
          >
            <FileDown size={14} />
            {generating ? 'PDF 생성 중...' : '저장 + PDF 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: c.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: c.neutral500,
    marginTop: '4px',
    marginBottom: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: c.white,
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: c.neutral700,
    cursor: 'pointer',
  },
  form: {
    background: c.white,
    border: `1px solid ${c.neutral200}`,
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: c.neutral700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  helperText: {
    fontSize: '12px',
    color: c.neutral500,
    margin: 0,
  },
  input: {
    padding: '8px 12px',
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: c.neutral800,
    outline: 'none',
  },
  textarea: {
    padding: '8px 12px',
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: c.neutral800,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: c.neutral800,
    outline: 'none',
    background: c.white,
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    background: '#eef2ff',
    color: '#4338ca',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: c.white,
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: c.neutral700,
    cursor: 'pointer',
    fontWeight: 500,
  },
  pdfBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: c.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: c.white,
    cursor: 'pointer',
    fontWeight: 500,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
  },
};
