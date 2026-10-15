import { AuthoringDialog } from '../../pages/pharmacy/authoring/AuthoringDialog';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from '../../pages/pharmacy/hooks/useLatestStoreRequest';
/**
 * StoreQrCreateModal — 콘텐츠 목록에서 선택한 콘텐츠로 QR-code 바로 생성
 *
 * WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1
 *
 * /store/library/contents 에서 콘텐츠 1개를 선택하면 QR 메뉴로 이동하지 않고 이 모달에서 바로
 * QR-code 를 만든다. 기존 QR 생성 계약(createStoreQrCode)을 재사용하며, 결과는 store_qr_codes
 * 에만 생성된다(콘텐츠 원본/제작자료 신규 생성 없음).
 *
 * origin 별 payload (공개 landing resolution 기준):
 *   - direct(kpa_store_contents)        → landingType='page', landingTargetId=id (landing Step1 content_json 렌더)
 *   - execution-asset(store_execution_assets) → landingType='page', libraryItemId=id (landing Step2 html_content 렌더)
 *   - snapshot 은 공개 landing 이 렌더하지 못하므로 지원하지 않는다(호출 측에서 게이트).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { getActiveServicePublicOrigin } from '../../lib/serviceContext';
import { storeWorkspaceBase } from './StoreWorkflowNavigation';
import { withWorkspaceMode } from '../../config/storeWorkspace';
import { createStoreQrCode } from '../../api/storeQr';

export type InlineQrOrigin = 'direct' | 'execution-asset';

export interface InlineQrTarget {
  id: string;
  title: string;
  origin: InlineQrOrigin;
}

function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[가-힣]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || `qr-${Date.now()}`
  );
}

interface StoreQrCreateModalProps {
  open: boolean;
  target: InlineQrTarget | null;
  onClose: () => void;
  onCreated?: () => void;
}

export function StoreQrCreateModal(props: StoreQrCreateModalProps) {
  const scope = useStoreOperationScope();
  if (!props.open || !props.target) return null;
  return <InlineQrSession key={`${scope.key}:${props.target.origin}:${props.target.id}`} {...props} isCurrent={scope.isCurrent} />;
}
function InlineQrSession({ open, target, onClose, onCreated, isCurrent }: StoreQrCreateModalProps & { isCurrent: () => boolean }) {
  const requests = useLatestStoreRequest();
  const writing = useRef(false);
  const close = () => { if (!writing.current) onClose(); };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  // target 변경 시 폼 초기화
  useEffect(() => {
    if (open && target) {
      setTitle(target.title);
      setSlug(toSlug(target.title));
      setCtaEnabled(false);
      setCtaLabel('');
      setError(null);
      setCreatedSlug(null);
      setSaving(false);
    }
  }, [open, target]);

  const originLabel = useMemo(
    () => (target?.origin === 'execution-asset' ? '매장 제작 자료' : '매장 직접 작성'),
    [target],
  );

  if (!open || !target) return null;

  const handleSave = async () => {
    if (writing.current || !isCurrent()) return;
    if (!slug.trim()) {
      setError('슬러그를 입력해주세요');
      return;
    }
    const current = requests.begin();
    writing.current = true; setSaving(true);
    setError(null);
    try {
      const isExec = target.origin === 'execution-asset';
      const res = await createStoreQrCode({
        title: title.trim() || target.title,
        // `type` 은 landing_type 과 완전 중복인 DEAD residue 라 더 이상 보내지 않는다.
        landingType: 'page',
        // execution-asset → 매장 제작 자료 사본 참조(libraryItemId), direct → page 참조(landingTargetId)
        libraryItemId: isExec ? target.id : undefined,
        landingTargetId: isExec ? undefined : target.id,
        slug: slug.trim(),
        ...(ctaEnabled ? { consultationCtaEnabled: true, consultationCtaLabel: ctaLabel.trim() || undefined } : {}),
      });
      if (!current() || !isCurrent()) return;
      if (res.success && res.data) {
        setCreatedSlug(res.data.slug);
        onCreated?.();
      } else {
        setError('저장에 실패했습니다');
      }
    } catch {
      if (current() && isCurrent()) setError('슬러그가 이미 사용중이거나 저장에 실패했습니다');
    } finally {
      writing.current = false;
      if (current() && isCurrent()) setSaving(false);
    }
  };

  return (
    <AuthoringDialog labelId="inline-qr-heading" onClose={close} className="max-w-lg">
      <div style={styles.modal}>
        <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <header style={styles.header}>
          <div style={styles.headerTitle}>
            <QrCode size={18} style={{ color: '#1D4ED8' }} />
            <span id="inline-qr-heading">QR-code 만들기</span>
          </div>
          <button type="button" onClick={close} style={styles.iconBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        {createdSlug ? (
          // ── 완료 화면 ──
          <div style={styles.body}>
            <p style={styles.successMsg}>QR-code가 생성되었습니다.</p>
            <div style={styles.urlRow}>
              <a href={`${getActiveServicePublicOrigin()}/qr/${encodeURIComponent(createdSlug)}`} target="_blank" rel="noreferrer" style={styles.urlLink}>
                /qr/{createdSlug} <ExternalLink size={12} />
              </a>
            </div>
            <div style={styles.footer}>
              <button type="button" onClick={close} style={styles.secondaryBtn}>닫기</button>
              <button type="button" onClick={() => navigate(withWorkspaceMode(`${storeWorkspaceBase(pathname)}/marketing/qr`, 'use'))} style={styles.primaryBtn}>
                QR 배치·출력으로 이어가기
              </button>
            </div>
          </div>
        ) : (
          // ── 입력 화면 ──
          <div style={styles.body}>
            <div style={styles.targetCard}>
              <span style={styles.targetBadge}>{originLabel}</span>
              <span style={styles.targetTitle}>{target.title}</span>
            </div>

            <label htmlFor="inline-qr-title" style={styles.label}>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              id="inline-qr-title" placeholder="QR 제목"
              style={styles.input}
              maxLength={200}
            />

            <label htmlFor="inline-qr-slug" style={styles.label}>공개 URL (slug)</label>
            <div style={styles.slugRow}>
              <span style={styles.slugPrefix}>/qr/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                id="inline-qr-slug" placeholder="slug"
                style={{ ...styles.input, flex: 1 }}
              />
            </div>

            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={ctaEnabled} onChange={(e) => setCtaEnabled(e.target.checked)} />
              <span>공개 페이지 하단에 상담 요청 버튼 표시</span>
            </label>
            {ctaEnabled && (
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="버튼 문구 (예: 상담 요청하기)"
                style={styles.input}
                maxLength={100}
              />
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            <div style={styles.footer}>
              <button type="button" onClick={close} style={styles.secondaryBtn} disabled={saving}>취소</button>
              <button type="button" onClick={handleSave} style={styles.primaryBtn} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                QR-code 생성
              </button>
            </div>
          </div>
        )}
        </fieldset>
      </div>
    </AuthoringDialog>
  );
}

const styles: Record<string, CSSProperties> = {
  modal: { maxHeight: '90dvh', overflowY: 'auto', width: '100%', maxWidth: 480, background: '#fff', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflowX: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #F1F5F9' },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#0F172A' },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'inline-flex' },
  body: { padding: 18, display: 'flex', flexDirection: 'column', gap: 8 },
  targetCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 6 },
  targetBadge: { fontSize: 11, fontWeight: 600, color: '#7C3AED', background: '#EDE9FE', borderRadius: 999, padding: '2px 8px', flexShrink: 0 },
  targetTitle: { overflowWrap: 'anywhere', minWidth: 0, fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  label: { fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 4 },
  input: { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none' },
  slugRow: { display: 'flex', alignItems: 'center', gap: 4 },
  slugPrefix: { fontSize: 13, color: '#64748B' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', marginTop: 6, cursor: 'pointer' },
  error: { fontSize: 12, color: '#DC2626', margin: '4px 0 0' },
  successMsg: { fontSize: 14, fontWeight: 600, color: '#16A34A', margin: 0 },
  urlRow: { padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 },
  urlLink: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#1D4ED8', textDecoration: 'none' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  primaryBtn: { minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { minHeight: 44, padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
