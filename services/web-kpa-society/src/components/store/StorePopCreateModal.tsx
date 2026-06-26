/**
 * StorePopCreateModal — 콘텐츠 목록에서 선택한 콘텐츠로 POP 바로 생성
 *
 * WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1
 *
 * /store/library/contents 에서 콘텐츠 1개를 선택하면 POP 메뉴로 이동하지 않고 이 모달에서 바로
 * POP PDF 를 생성한다. 기존 POP 생성 계약(`POST /pharmacy/pop/generate`, save=true)을 재사용하며,
 * 결과는 매장 제작 자료(store_execution_assets, file/pop/generated)에 저장된다.
 *   - 콘텐츠 원본(kpa_store_contents)·snapshot(o4o_asset_snapshots) 신규 생성 없음.
 *   - POP 결과(asset_type='file')는 콘텐츠 목록(asset_type='content' 필터)에 노출되지 않는다.
 *
 * 3 origin 모두 지원: direct / execution-asset / snapshot (백엔드가 id 로 organization 격리 조회).
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { generateStorePop } from '../../api/storePop';

export type InlinePopOrigin = 'direct' | 'execution-asset' | 'snapshot';

export interface InlinePopTarget {
  id: string;
  title: string;
  origin: InlinePopOrigin;
}

interface StorePopCreateModalProps {
  open: boolean;
  target: InlinePopTarget | null;
  onClose: () => void;
  onCreated?: () => void;
}

export function StorePopCreateModal({ open, target, onClose, onCreated }: StorePopCreateModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<'A4' | 'A5'>('A4');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setTitle(`${target.title} POP`);
      setLayout('A4');
      setError(null);
      setFileUrl(null);
      setGenerating(false);
    }
  }, [open, target]);

  const originLabel = useMemo(() => {
    if (target?.origin === 'execution-asset') return '매장 제작 자료';
    if (target?.origin === 'snapshot') return '가져온 콘텐츠';
    return '매장 직접 작성';
  }, [target]);

  if (!open || !target) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const ids =
        target.origin === 'execution-asset'
          ? { libraryItemIds: [target.id] }
          : target.origin === 'snapshot'
            ? { snapshotItemIds: [target.id] }
            : { directContentItemIds: [target.id] };
      const res = await generateStorePop({
        ...ids,
        layout,
        save: true,
        title: title.trim() || `${target.title} POP`,
      });
      if (res.success && res.data?.fileUrl) {
        setFileUrl(res.data.fileUrl);
        onCreated?.();
      } else {
        setError('POP 생성에 실패했습니다');
      }
    } catch {
      setError('POP PDF 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header style={styles.header}>
          <div style={styles.headerTitle}>
            <ImageIcon size={18} style={{ color: '#EA580C' }} />
            <span>POP 만들기</span>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        {fileUrl ? (
          // ── 완료 화면 ──
          <div style={styles.body}>
            <p style={styles.successMsg}>POP이 생성되어 매장 제작 자료에 저장되었습니다.</p>
            <div style={styles.urlRow}>
              <a href={fileUrl} target="_blank" rel="noreferrer" style={styles.urlLink}>
                POP PDF 열기 <ExternalLink size={12} />
              </a>
            </div>
            <div style={styles.footer}>
              <button type="button" onClick={onClose} style={styles.secondaryBtn}>닫기</button>
              <button type="button" onClick={() => navigate('/store/library/production-materials')} style={styles.primaryBtn}>
                매장 제작 자료 보기
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

            <label style={styles.label}>POP 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="POP 제목"
              style={styles.input}
              maxLength={200}
            />

            <label style={styles.label}>용지 크기</label>
            <div style={styles.layoutRow}>
              {(['A4', 'A5'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  style={{ ...styles.layoutBtn, ...(layout === l ? styles.layoutBtnActive : styles.layoutBtnInactive) }}
                >
                  {l}
                </button>
              ))}
            </div>

            <p style={styles.note}>선택한 콘텐츠 본문으로 POP PDF를 만들어 매장 제작 자료에 저장합니다. (콘텐츠 원본은 변경되지 않습니다.)</p>

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.footer}>
              <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={generating}>취소</button>
              <button type="button" onClick={handleGenerate} style={styles.primaryBtn} disabled={generating}>
                {generating ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                POP 생성
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #F1F5F9' },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#0F172A' },
  iconBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'inline-flex' },
  body: { padding: 18, display: 'flex', flexDirection: 'column', gap: 8 },
  targetCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 6 },
  targetBadge: { fontSize: 11, fontWeight: 600, color: '#EA580C', background: '#FFEDD5', borderRadius: 999, padding: '2px 8px', flexShrink: 0 },
  targetTitle: { fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  label: { fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 4 },
  input: { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none' },
  layoutRow: { display: 'flex', gap: 8 },
  layoutBtn: { padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer' },
  layoutBtnActive: { background: '#EA580C', color: '#fff', border: '1px solid #EA580C' },
  layoutBtnInactive: { background: '#fff', color: '#475569', border: '1px solid #D1D5DB' },
  note: { fontSize: 11, color: '#64748B', margin: '6px 0 0', lineHeight: 1.5 },
  error: { fontSize: 12, color: '#DC2626', margin: '4px 0 0' },
  successMsg: { fontSize: 14, fontWeight: 600, color: '#16A34A', margin: 0 },
  urlRow: { padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 },
  urlLink: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#EA580C', textDecoration: 'none' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#EA580C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
