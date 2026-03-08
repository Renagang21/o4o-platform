/**
 * ReferralLinkModal - Referral 링크 생성 후 즉시 공유 모달
 *
 * Work Order: WO-O4O-PARTNER-LINK-CREATION-UX-V1
 *
 * Actions: Copy URL / Open Page / Go to My Links / Close
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ExternalLink, Link2, X } from 'lucide-react';

interface ReferralLinkModalProps {
  productName: string;
  supplierName: string;
  referralUrl: string;
  onClose: () => void;
}

export function ReferralLinkModal({ productName, supplierName, referralUrl, onClose }: ReferralLinkModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${referralUrl}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [fullUrl]);

  const handleOpen = useCallback(() => {
    window.open(referralUrl, '_blank', 'noopener,noreferrer');
  }, [referralUrl]);

  const handleGoToLinks = useCallback(() => {
    onClose();
    navigate('/partner/links');
  }, [onClose, navigate]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link2 size={20} style={{ color: '#2563eb' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              Referral Link Created
            </h3>
          </div>
          <button onClick={onClose} style={closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Product Info */}
        <div style={infoSection}>
          <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
            {productName}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {supplierName}
          </p>
        </div>

        {/* URL */}
        <div style={urlSection}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px', display: 'block' }}>
            Referral URL
          </label>
          <div style={urlInputWrap}>
            <input
              type="text"
              readOnly
              value={fullUrl}
              style={urlInput}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        {/* Primary Actions */}
        <div style={primaryActions}>
          <button onClick={handleCopy} style={copied ? copyBtnDone : copyBtnStyle}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button onClick={handleOpen} style={openBtnStyle}>
            <ExternalLink size={16} />
            Open Page
          </button>
        </div>

        {/* Secondary Actions */}
        <div style={secondaryActions}>
          <button onClick={handleGoToLinks} style={linkBtnStyle}>
            My Links
          </button>
          <button onClick={onClose} style={closeBtnText}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '20px',
};

const modal: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px 0',
};

const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px',
};

const infoSection: React.CSSProperties = {
  padding: '16px 24px 0',
};

const urlSection: React.CSSProperties = {
  padding: '16px 24px 0',
};

const urlInputWrap: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  overflow: 'hidden',
};

const urlInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  outline: 'none',
  fontSize: '13px',
  color: '#475569',
  backgroundColor: '#f8fafc',
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};

const primaryActions: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '20px 24px 0',
};

const copyBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '12px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const copyBtnDone: React.CSSProperties = {
  ...copyBtnStyle,
  backgroundColor: '#16a34a',
};

const openBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  color: '#475569',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryActions: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
  padding: '16px 24px 20px',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const closeBtnText: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};
