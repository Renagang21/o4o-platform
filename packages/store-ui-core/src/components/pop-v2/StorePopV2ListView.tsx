/**
 * POP 관리 — 목록 화면 (공통 Core)
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * KPA / PH 는 이 컴포넌트를 그대로 렌더한다. 서비스별 사본을 만들지 않는다.
 */

import type { CSSProperties } from 'react';
import type { PopV2AccentTheme, PopV2Document } from './types';
import { POP_V2_CONTENT_TYPE_LABELS, POP_V2_STATUS_LABELS } from './types';
import { usePopV2List } from './usePopV2List';
import type { UsePopV2ListOptions } from './usePopV2List';
import { popPageStyle, popSectionStyle } from '../pop/popStyles';

export interface StorePopV2ListViewProps extends UsePopV2ListOptions {
  accent: PopV2AccentTheme;
  headerTitle?: string;
  headerDescription?: string;
  onCreate: () => void;
  onEdit: (doc: PopV2Document) => void;
  headerExtra?: React.ReactNode;
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 4px',
  borderBottom: '1px solid #f1f5f9',
};

const mutedStyle: CSSProperties = { fontSize: 12, color: '#94a3b8' };

const smallBtnStyle: CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

function statusBadgeStyle(status: PopV2Document['status'], accent: PopV2AccentTheme): CSSProperties {
  const map: Record<PopV2Document['status'], CSSProperties> = {
    draft: { color: '#64748b', backgroundColor: '#f1f5f9' },
    ready: { color: accent.color, backgroundColor: accent.softBg },
    archived: { color: '#94a3b8', backgroundColor: '#f8fafc' },
  };
  return {
    ...map[status],
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

export function StorePopV2ListView(props: StorePopV2ListViewProps) {
  const { accent, onCreate, onEdit, headerExtra } = props;
  const state = usePopV2List({ api: props.api, notify: props.notify });

  return (
    <div style={popPageStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {props.headerTitle ?? 'POP 관리'}
          </h1>
          <p style={{ ...mutedStyle, marginTop: 6 }}>
            {props.headerDescription ??
              '만든 POP 을 저장해 두고 언제든 다시 열어 수정·복제·출력할 수 있습니다.'}
          </p>
        </div>
        {headerExtra}
        <button
          type="button"
          onClick={onCreate}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRadius: 8,
            backgroundColor: accent.color,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          새 POP 만들기
        </button>
      </div>

      <div style={popSectionStyle}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => state.setShowArchived(false)}
            style={{
              ...smallBtnStyle,
              ...(state.showArchived ? {} : { borderColor: accent.color, color: accent.color }),
            }}
          >
            사용 중
          </button>
          <button
            type="button"
            onClick={() => state.setShowArchived(true)}
            style={{
              ...smallBtnStyle,
              ...(state.showArchived ? { borderColor: accent.color, color: accent.color } : {}),
            }}
          >
            보관함
          </button>
          <button type="button" onClick={() => void state.reload()} style={smallBtnStyle}>
            새로고침
          </button>
        </div>

        {state.loading && <div style={mutedStyle}>불러오는 중…</div>}

        {!state.loading && state.error && (
          <div style={{ color: '#dc2626', fontSize: 13 }}>
            {state.error}
            <button
              type="button"
              onClick={() => void state.reload()}
              style={{ ...smallBtnStyle, marginLeft: 8 }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!state.loading && !state.error && state.documents.length === 0 && (
          <div style={{ ...mutedStyle, padding: '24px 0', textAlign: 'center' }}>
            {state.showArchived
              ? '보관한 POP 이 없습니다.'
              : '아직 만든 POP 이 없습니다. [새 POP 만들기] 로 시작해 보세요.'}
          </div>
        )}

        {!state.loading &&
          !state.error &&
          state.documents.map((doc) => (
            <div key={doc.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{doc.title}</span>
                  <span style={statusBadgeStyle(doc.status, accent)}>
                    {POP_V2_STATUS_LABELS[doc.status]}
                  </span>
                </div>
                <div style={{ ...mutedStyle, marginTop: 4 }}>
                  {doc.popKind === 'product'
                    ? '상품 POP'
                    : `콘텐츠 POP · ${doc.contentType ? POP_V2_CONTENT_TYPE_LABELS[doc.contentType] : '일반'}`}
                  {' · '}
                  {doc.layout}
                  {' · '}
                  {new Date(doc.updatedAt).toLocaleDateString('ko-KR')} 수정
                </div>
              </div>
              <button type="button" onClick={() => onEdit(doc)} style={smallBtnStyle}>
                열기
              </button>
              <button
                type="button"
                onClick={() => void state.duplicate(doc.id)}
                style={smallBtnStyle}
              >
                복제
              </button>
              <button
                type="button"
                onClick={() => void state.setArchived(doc.id, doc.status !== 'archived')}
                style={smallBtnStyle}
              >
                {doc.status === 'archived' ? '복원' : '보관'}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
