/**
 * QrLandingPage — QR 코드 스캔 랜딩 페이지
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 *
 * Route: /qr/:slug (public, no auth)
 * 모바일 중심 카드 UI.
 * QR 스캔 → 이 페이지 → 버튼 클릭 → 대상 페이지 이동.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';
import { colors } from '../../styles/theme';
import { getQrLandingData } from '../../api/storeQr';
import type { QrLandingData } from '../../api/storeQr';
// WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 동영상 전용 공개 뷰어
import PublicVideoViewer from './PublicVideoViewer';
// WO-O4O-KPA-QR-PAGE-LANDING-RENDER-V1: page 콘텐츠 inline 렌더 (body 우선 / legacy blocks 폴백)
import { ContentRenderer } from '@o4o/content-editor';
import { BlockRenderer } from '@o4o/block-renderer';
import { kpaBlocksToRendererBlocks, type KpaBlock } from '../../utils/kpa-block-adapter';

const LANDING_TYPE_CONFIG: Record<string, { label: string; icon: 'arrow' | 'external' }> = {
  product: { label: '제품 보기', icon: 'arrow' },
  promotion: { label: '행사 보기', icon: 'arrow' },
  page: { label: '콘텐츠 보기', icon: 'arrow' },
  link: { label: '바로가기', icon: 'external' },
  tablet: { label: '상담 요청하기', icon: 'arrow' },
};

export default function QrLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QrLandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('QR 정보를 찾을 수 없습니다');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getQrLandingData(slug)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          document.title = `${res.data.title} | QR`;
        } else {
          setError('QR 정보를 찾을 수 없습니다');
        }
      })
      .catch(() => {
        setError('QR 정보를 찾을 수 없습니다');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAction = () => {
    if (!data) return;

    const { landingType, landingTargetId, storeSlug } = data;

    // WO-O4O-STORE-QR-TO-INTEREST-FLOW-V1: QR → tablet 상담 요청 흐름
    // WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: ?from=qr 경로 힌트
    if (landingType === 'tablet' && storeSlug) {
      navigate(`/tablet/${storeSlug}?from=qr`);
      return;
    }

    if (landingType === 'link' && landingTargetId) {
      window.open(landingTargetId, '_blank', 'noopener,noreferrer');
      return;
    }

    if (landingType === 'product' && storeSlug && landingTargetId) {
      navigate(`/store/${storeSlug}/products/${landingTargetId}`);
      return;
    }

    if (landingType === 'promotion' && storeSlug && landingTargetId) {
      navigate(`/store/${storeSlug}/events/${landingTargetId}`);
      return;
    }

    if (landingType === 'page' && landingTargetId) {
      navigate(`/content/${landingTargetId}`);
      return;
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loadingIcon}>
            <QrCode size={48} style={{ color: colors.neutral300 }} />
          </div>
          <p style={styles.loadingText}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>
            <AlertCircle size={48} style={{ color: colors.neutral400 }} />
          </div>
          <h1 style={styles.errorTitle}>QR 정보를 찾을 수 없습니다</h1>
          <p style={styles.errorDesc}>
            QR 코드가 만료되었거나 유효하지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 동영상 QR 이면 일반 카드 UI 대신 전용 뷰어로 분기.
  //   헤더/사이드바/푸터 없는 전체 화면 동영상만 표시.
  if (data.landingType === 'video') {
    return <PublicVideoViewer videoUrl={data.videoUrl} title={data.title} />;
  }

  // WO-O4O-KPA-QR-PAGE-LANDING-RENDER-V1: page 콘텐츠는 공개 landing 에서 본문을 바로 렌더한다
  //   (앱 내부 /content/:id 인증 화면으로 보내지 않음). content_hub 콘텐츠만 inline 데이터 보유 —
  //   그 외(blog/cms/pop ref) pageContent=null 이면 아래 카드+버튼 redirect 폴백.
  if (data.landingType === 'page' && data.pageContent) {
    const pc = data.pageContent;
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, maxWidth: '640px' }}>
          <div style={styles.content}>
            {pc.available ? (
              <>
                <h1 style={styles.title}>{pc.title}</h1>
                {pc.summary && <p style={styles.description}>{pc.summary}</p>}
                <div style={styles.pageBody}>
                  {pc.body && pc.body.trim() ? (
                    <ContentRenderer html={pc.body} variant="guide" />
                  ) : pc.blocks && pc.blocks.length > 0 ? (
                    <BlockRenderer blocks={kpaBlocksToRendererBlocks(pc.blocks as KpaBlock[])} />
                  ) : (
                    <p style={styles.description}>본문이 없습니다.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 style={styles.title}>{data.title}</h1>
                <p style={styles.description}>
                  아직 공개되지 않은 콘텐츠입니다.
                </p>
              </>
            )}
          </div>
          <div style={styles.footer}>
            <QrCode size={14} style={{ color: colors.neutral400 }} />
            <span style={styles.footerText}>O4O Platform</span>
          </div>
        </div>
      </div>
    );
  }

  const config = LANDING_TYPE_CONFIG[data.landingType] || LANDING_TYPE_CONFIG.link;
  const hasAction = !!data.landingTargetId || (data.landingType === 'tablet' && !!data.storeSlug);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Image */}
        {data.imageUrl && (
          <div style={styles.imageContainer}>
            <img
              src={data.imageUrl}
              alt={data.title}
              style={styles.image}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          <h1 style={styles.title}>{data.title}</h1>

          {data.description && (
            <p style={styles.description}>{data.description}</p>
          )}

          {/* Action Button */}
          {hasAction && (
            <button onClick={handleAction} style={styles.actionBtn}>
              {config.label}
              {config.icon === 'external' ? (
                <ExternalLink size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <QrCode size={14} style={{ color: colors.neutral400 }} />
          <span style={styles.footerText}>O4O Platform</span>
        </div>
      </div>
    </div>
  );
}

// ── 스타일 (모바일 중심) ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: colors.neutral100,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '16/10',
    backgroundColor: colors.neutral100,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  content: {
    padding: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
    lineHeight: 1.3,
  },
  description: {
    fontSize: '15px',
    color: colors.neutral600,
    lineHeight: 1.6,
    marginTop: '12px',
    marginBottom: 0,
  },
  // WO-O4O-KPA-QR-PAGE-LANDING-RENDER-V1: page 본문 영역
  pageBody: {
    marginTop: '20px',
    fontSize: '15px',
    color: colors.neutral700,
    lineHeight: 1.7,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    marginTop: '24px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  footerText: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  loadingIcon: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0 16px',
  },
  loadingText: {
    textAlign: 'center',
    color: colors.neutral500,
    fontSize: '14px',
    padding: '0 0 40px',
  },
  errorIcon: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0 16px',
  },
  errorTitle: {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 24px',
  },
  errorDesc: {
    textAlign: 'center',
    fontSize: '14px',
    color: colors.neutral500,
    margin: '8px 24px 40px',
  },
};
