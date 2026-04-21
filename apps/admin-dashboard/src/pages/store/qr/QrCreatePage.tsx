/**
 * QR 생성 페이지
 *
 * WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
 *
 * 경로: /store/qr/create
 *
 * Step 1. 랜딩 타입 선택 (상품 / 링크 / 페이지 / 프로모션)
 * Step 2. 자료 선택 (공급자 상품 직접 선택 탭 — 신규)
 * Step 3. QR 설정 (제목, slug) → 생성 → 이미지 다운로드
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, QrCode, Package, Download, Check } from 'lucide-react';
import { qrApi, type QrSourceProduct, type QrCode as QrCodeType } from '@/api/qr.api';

// ============================================
// Types
// ============================================

type LandingType = 'product' | 'link' | 'page' | 'promotion';

interface CreateState {
  landingType: LandingType;
  selectedProduct: QrSourceProduct | null;
  customUrl: string;
  title: string;
  description: string;
  slug: string;
}

const INITIAL_STATE: CreateState = {
  landingType: 'product',
  selectedProduct: null,
  customUrl: '',
  title: '',
  description: '',
  slug: '',
};

const STEPS = [
  { id: 1, label: '타입 선택' },
  { id: 2, label: '자료 선택' },
  { id: 3, label: 'QR 설정' },
];

const LANDING_TYPES: { type: LandingType; label: string; description: string; icon: string }[] = [
  { type: 'product', label: '상품', description: '공급자 상품 정보를 QR 랜딩에 직접 연결합니다', icon: '📦' },
  { type: 'link', label: '링크', description: '외부 URL로 연결하는 QR을 생성합니다', icon: '🔗' },
  { type: 'page', label: '페이지', description: '내부 페이지로 연결하는 QR을 생성합니다', icon: '📄' },
  { type: 'promotion', label: '프로모션', description: '프로모션 URL로 연결하는 QR을 생성합니다', icon: '🎁' },
];

// ============================================
// Step 1 — Landing Type
// ============================================

function StepLandingType({
  selected,
  onSelect,
}: {
  selected: LandingType;
  onSelect: (t: LandingType) => void;
}) {
  return (
    <div>
      <h2 style={s.stepTitle}>어떤 유형의 QR을 만드시겠어요?</h2>
      <div style={s.typeGrid}>
        {LANDING_TYPES.map((lt) => (
          <button
            key={lt.type}
            onClick={() => onSelect(lt.type)}
            style={{
              ...s.typeCard,
              ...(selected === lt.type ? s.typeCardSelected : {}),
            }}
          >
            <span style={s.typeIcon}>{lt.icon}</span>
            <p style={s.typeLabel}>{lt.label}</p>
            <p style={s.typeDesc}>{lt.description}</p>
            {selected === lt.type && (
              <div style={s.typeCheck}>
                <Check size={14} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Step 2 — Source Selection
// ============================================

function StepSourceSelect({
  landingType,
  selectedProduct,
  customUrl,
  onSelectProduct,
  onCustomUrlChange,
}: {
  landingType: LandingType;
  selectedProduct: QrSourceProduct | null;
  customUrl: string;
  onSelectProduct: (p: QrSourceProduct | null) => void;
  onCustomUrlChange: (v: string) => void;
}) {
  const [products, setProducts] = useState<QrSourceProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await qrApi.listSourceProducts({ limit: 30, search: q || undefined });
      setProducts(res.items);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (landingType === 'product') {
      loadProducts('');
    }
  }, [landingType, loadProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(search);
  };

  if (landingType !== 'product') {
    return (
      <div>
        <h2 style={s.stepTitle}>
          {landingType === 'link' ? '연결할 URL을 입력하세요' : '랜딩 경로를 입력하세요'}
        </h2>
        <input
          type="text"
          value={customUrl}
          onChange={(e) => onCustomUrlChange(e.target.value)}
          placeholder={landingType === 'link' ? 'https://example.com' : '/page/path'}
          style={s.textInput}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 style={s.stepTitle}>상품을 선택하세요</h2>
      <p style={s.stepSubtitle}>공급자가 공개한 승인된 상품을 QR 랜딩에 직접 연결합니다</p>

      <form onSubmit={handleSearch} style={s.searchRow}>
        <div style={s.searchWrap}>
          <Search size={16} style={s.searchIcon} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 또는 브랜드 검색"
            style={s.searchInput}
          />
        </div>
        <button type="submit" style={s.searchBtn}>검색</button>
      </form>

      {loading ? (
        <p style={s.loadingText}>불러오는 중...</p>
      ) : products.length === 0 ? (
        <p style={s.emptyText}>등록된 공급자 상품이 없습니다.</p>
      ) : (
        <div style={s.productList}>
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProduct(selectedProduct?.id === p.id ? null : p)}
              style={{
                ...s.productCard,
                ...(selectedProduct?.id === p.id ? s.productCardSelected : {}),
              }}
            >
              <div style={s.productIcon}>
                <Package size={20} style={{ color: '#64748b' }} />
              </div>
              <div style={s.productInfo}>
                <p style={s.productName}>{p.name}</p>
                {p.brandName && <p style={s.productBrand}>{p.brandName}</p>}
                {p.price > 0 && (
                  <p style={s.productPrice}>{p.price.toLocaleString()}원</p>
                )}
              </div>
              {selectedProduct?.id === p.id && (
                <div style={s.productCheck}>
                  <Check size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 3 — QR Config + Generate
// ============================================

function StepQrConfig({
  state,
  onTitleChange,
  onDescriptionChange,
  onSlugChange,
  onGenerate,
  generating,
  generated,
}: {
  state: CreateState;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  generated: QrCodeType | null;
}) {
  const handleDownloadImage = async () => {
    if (!generated) return;
    try {
      const blob = await qrApi.downloadImage(generated.id, 'png', 512);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${generated.slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  return (
    <div>
      <h2 style={s.stepTitle}>QR 정보를 입력하세요</h2>

      {state.landingType === 'product' && state.selectedProduct && (
        <div style={s.selectedProductBanner}>
          <Package size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>{state.selectedProduct.name}</strong>
            {state.selectedProduct.brandName && ` · ${state.selectedProduct.brandName}`}
          </span>
        </div>
      )}

      <div style={s.formGroup}>
        <label style={s.label}>제목 *</label>
        <input
          type="text"
          value={state.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="QR 코드 제목"
          style={s.textInput}
        />
      </div>

      <div style={s.formGroup}>
        <label style={s.label}>설명</label>
        <input
          type="text"
          value={state.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="(선택) QR 코드 설명"
          style={s.textInput}
        />
      </div>

      <div style={s.formGroup}>
        <label style={s.label}>슬러그 (URL 식별자) *</label>
        <input
          type="text"
          value={state.slug}
          onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="my-product-qr"
          style={s.textInput}
        />
        <p style={s.hint}>영문 소문자, 숫자, 하이픈만 사용 가능합니다</p>
      </div>

      {!generated ? (
        <button
          onClick={onGenerate}
          disabled={generating || !state.title || !state.slug}
          style={{
            ...s.primaryBtn,
            ...(generating || !state.title || !state.slug ? s.primaryBtnDisabled : {}),
          }}
        >
          <QrCode size={16} />
          {generating ? 'QR 생성 중...' : 'QR 코드 생성'}
        </button>
      ) : (
        <div style={s.successBox}>
          <div style={s.successHeader}>
            <Check size={20} style={{ color: '#059669' }} />
            <strong>QR 코드가 생성되었습니다</strong>
          </div>
          <p style={s.successSlug}>/{generated.slug}</p>
          <div style={s.downloadRow}>
            <button onClick={handleDownloadImage} style={s.downloadBtn}>
              <Download size={14} />
              PNG 이미지 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function QrCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<CreateState>(INITIAL_STATE);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<QrCodeType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) {
      if (state.landingType === 'product') return !!state.selectedProduct;
      return !!state.customUrl.trim();
    }
    return true;
  };

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const payload = {
        title: state.title.trim(),
        description: state.description.trim() || undefined,
        landingType: state.landingType,
        slug: state.slug.trim(),
        ...(state.landingType === 'product' && state.selectedProduct
          ? { productId: state.selectedProduct.id }
          : { landingTargetId: state.customUrl.trim() || undefined }),
      };
      const result = await qrApi.create(payload);
      setGenerated(result);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'QR 생성에 실패했습니다.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button onClick={() => navigate('/store/qr')} style={s.backBtn}>
          <ArrowLeft size={16} />
          QR 목록
        </button>
        <h1 style={s.title}>QR 코드 생성</h1>
      </div>

      {/* Step Indicator */}
      <div style={s.stepBar}>
        {STEPS.map((s2, idx) => (
          <div key={s2.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              ...s.stepDot,
              ...(step >= s2.id ? s.stepDotActive : {}),
            }}>
              {step > s2.id ? <Check size={12} /> : s2.id}
            </div>
            <span style={{
              fontSize: 13,
              color: step >= s2.id ? '#1e293b' : '#94a3b8',
              fontWeight: step === s2.id ? 600 : 400,
            }}>
              {s2.label}
            </span>
            {idx < STEPS.length - 1 && <div style={s.stepLine} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={s.card}>
        {step === 1 && (
          <StepLandingType
            selected={state.landingType}
            onSelect={(t) => setState((prev) => ({ ...prev, landingType: t, selectedProduct: null, customUrl: '' }))}
          />
        )}
        {step === 2 && (
          <StepSourceSelect
            landingType={state.landingType}
            selectedProduct={state.selectedProduct}
            customUrl={state.customUrl}
            onSelectProduct={(p) => setState((prev) => ({ ...prev, selectedProduct: p }))}
            onCustomUrlChange={(v) => setState((prev) => ({ ...prev, customUrl: v }))}
          />
        )}
        {step === 3 && (
          <StepQrConfig
            state={state}
            onTitleChange={(v) => setState((prev) => ({ ...prev, title: v }))}
            onDescriptionChange={(v) => setState((prev) => ({ ...prev, description: v }))}
            onSlugChange={(v) => setState((prev) => ({ ...prev, slug: v }))}
            onGenerate={handleGenerate}
            generating={generating}
            generated={generated}
          />
        )}

        {error && <p style={s.errorText}>{error}</p>}

        {/* Navigation */}
        <div style={s.navRow}>
          {step > 1 && !generated && (
            <button onClick={() => setStep((p) => p - 1)} style={s.secondaryBtn}>
              <ArrowLeft size={14} />
              이전
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep((p) => p + 1)}
              disabled={!canProceed()}
              style={{
                ...s.primaryBtn,
                ...(!canProceed() ? s.primaryBtnDisabled : {}),
                marginLeft: 'auto',
              }}
            >
              다음
              <ArrowRight size={14} />
            </button>
          )}
          {generated && (
            <button onClick={() => navigate('/store/qr')} style={{ ...s.primaryBtn, marginLeft: 'auto' }}>
              QR 목록으로
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 13,
    cursor: 'pointer',
    padding: '4px 0',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
    color: '#fff',
  },
  stepLine: {
    width: 32,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#64748b',
    margin: '0 0 16px',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginTop: 16,
  },
  typeCard: {
    position: 'relative',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  typeCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  typeIcon: {
    fontSize: 24,
    display: 'block',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  typeDesc: {
    fontSize: 12,
    color: '#64748b',
    margin: 0,
    lineHeight: 1.4,
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: '#2563EB',
  },
  searchRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 34px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    padding: '24px 0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    padding: '24px 0',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 360,
    overflowY: 'auto',
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  productCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  productIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  productBrand: {
    fontSize: 11,
    color: '#64748b',
    margin: 0,
  },
  productPrice: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 500,
    margin: '2px 0 0',
  },
  productCheck: {
    color: '#2563EB',
    flexShrink: 0,
  },
  selectedProductBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    fontSize: 13,
    color: '#1e40af',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '16px',
    marginTop: 8,
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#065f46',
  },
  successSlug: {
    fontSize: 12,
    color: '#059669',
    margin: '0 0 12px',
    fontFamily: 'monospace',
  },
  downloadRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    color: '#065f46',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    backgroundColor: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryBtnDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    margin: '12px 0 0',
  },
};
