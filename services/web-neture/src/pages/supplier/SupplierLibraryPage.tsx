/**
 * SupplierLibraryPage - 공급자 콘텐츠 라이브러리 목록
 *
 * WO-O4O-NETURE-LIBRARY-UI-V1
 * - 자료 목록 조회 (SimpleTable)
 * - 등록/수정/삭제 액션
 * - PENDING supplier 등록 제한
 *
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16)
 * - 종전 KEEP_HIDDEN(개인 보관함) 판정 폐기. 이 화면이 공급자 콘텐츠의 canonical 원천
 *   (`neture_supplier_library_items`) 이며 사이드바 '콘텐츠' 축의 첫 진입점이다.
 * - 공식 경로 두 가지 (ROLE-WORKSPACE-ARCHITECTURE §2-1):
 *   ① Supplier → Store Hub: `공개` 자료는 매장 HUB 의 공급자 콘텐츠 소스로 노출된다 (매장이 선택).
 *   ② Supplier → Service Operator: '서비스에 제공' 액션으로 서비스 운영자에게 넘긴다 (운영자가 검토·발행).
 * - 특정 매장 직접 제공 없음. 제공 후 상태 추적은 이 화면의 책임이 아니다 (공급자 책임 종료).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, AlertCircle, Send } from 'lucide-react';
import { supplierApi, type SupplierLibraryItem, type SupplierLibraryHandoffTarget } from '../../lib/api';
import { DataTable, type Column } from '@o4o/ui';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '../../api/guideContent';

const GUIDE_PAGE_KEY = 'supplier.library.list';
const GUIDEBLOCK_SECTION_KEY = 'guideblock-page-help';
const SERVICE_KEY = 'neture';

const columns: Column<Record<string, any>>[] = [
  { key: 'title', title: '제목', dataIndex: 'title', width: '24%' },
  { key: 'category', title: '카테고리', dataIndex: 'category', width: '15%' },
  { key: 'fileName', title: '파일명', dataIndex: 'fileName', width: '20%' },
  { key: 'isPublic', title: '공개', dataIndex: 'isPublic', width: '10%', align: 'center' },
  { key: 'createdAt', title: '생성일', dataIndex: 'createdAt', width: '15%' },
  { key: 'actions', title: '', dataIndex: 'actions', width: '16%' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Visibility filter values (WO-CONTENT-META-UI-VALIDATION-V1)
// isPublic=true → visibility='service', isPublic=false → visibility='personal'
type VisibilityFilter = 'all' | 'service' | 'personal';

export default function SupplierLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SupplierLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

  // WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1: Supplier → Service Operator 제공
  const [handoffTargets, setHandoffTargets] = useState<SupplierLibraryHandoffTarget[]>([]);
  const [handoffItem, setHandoffItem] = useState<SupplierLibraryItem | null>(null);
  const [handoffServiceKey, setHandoffServiceKey] = useState('');
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supplierApi.getLibraryHandoffTargets().then((targets) => {
      if (!cancelled) setHandoffTargets(targets);
    });
    return () => { cancelled = true; };
  }, []);

  const openHandoff = (item: SupplierLibraryItem) => {
    setHandoffItem(item);
    setHandoffServiceKey(handoffTargets[0]?.key ?? '');
    setHandoffError(null);
  };

  const handleHandoff = async () => {
    if (!handoffItem || !handoffServiceKey) return;
    setHandoffSubmitting(true);
    setHandoffError(null);
    const result = await supplierApi.handoffLibraryItem(handoffItem.id, handoffServiceKey);
    setHandoffSubmitting(false);
    if (result.success) {
      const target = handoffTargets.find((t) => t.key === handoffServiceKey);
      setHandoffNotice(`"${handoffItem.title}" 을(를) ${target?.nameKo ?? handoffServiceKey} 운영자에게 제공했습니다. 이후 검토·게시는 해당 서비스 운영자가 진행합니다.`);
      setHandoffItem(null);
    } else {
      setHandoffError(result.error || '제공에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections[GUIDEBLOCK_SECTION_KEY];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, []);

  // WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1:
  //   조회 실패는 throw 된다. "등록된 자료가 없습니다"(정상 0건)와 구분한다.
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { items: rows } = await supplierApi.getLibraryItems();
      setItems(rows);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    const result = await supplierApi.deleteLibraryItem(id);
    if (result.success) {
      setDeleteConfirm(null);
      fetchItems();
    }
  };

  // Client-side visibility filter (maps isPublic → ContentMeta visibility)
  const filteredItems = items.filter((item) => {
    if (visibilityFilter === 'service') return item.isPublic === true;
    if (visibilityFilter === 'personal') return item.isPublic === false;
    return true;
  });

  const dataSource = filteredItems.map((item) => ({
    id: item.id,
    title: (
        <div>
          <span style={{ fontWeight: 500 }}>{item.title}</span>
          {item.description && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
            </div>
          )}
        </div>
      ),
      category: item.category ? (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          fontSize: '12px',
          borderRadius: '4px',
          backgroundColor: '#f1f5f9',
          color: '#475569',
        }}>
          {item.category}
        </span>
      ) : (
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
      ),
      fileName: (
        <div style={{ fontSize: '13px' }}>
          {item.contentType === 'document' ? (
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 500,
            }}>
              문서 (Document)
            </span>
          ) : (
            <>
              <div>{item.fileName || '-'}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.fileSize > 0 ? formatFileSize(item.fileSize) : ''}</div>
            </>
          )}
        </div>
      ),
      isPublic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: item.isPublic ? '#dcfce7' : '#f1f5f9',
            color: item.isPublic ? '#15803d' : '#64748b',
            fontWeight: 500,
          }}>
            {item.isPublic ? '공개' : '비공개'}
          </span>
          {item.visibility && (
            <span style={{
              display: 'inline-block',
              padding: '1px 6px',
              fontSize: '11px',
              borderRadius: '4px',
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
            }}>
              {{ service: '서비스', personal: '개인', platform: '전체', store: '매장' }[item.visibility] ?? item.visibility}
            </span>
          )}
        </div>
      ),
    createdAt: <span style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(item.createdAt)}</span>,
    actions: (
      <div style={{ display: 'flex', gap: '8px' }}>
        {handoffTargets.length > 0 && (
          <button
            onClick={() => openHandoff(item)}
            title="서비스 운영자에게 제공"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f766e', fontSize: '13px', fontWeight: 500 }}
          >
            서비스에 제공
          </button>
        )}
        <button
          onClick={() => navigate(`/supplier/library/${item.id}/edit`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '13px', fontWeight: 500 }}
        >
          수정
        </button>
        <button
          onClick={() => setDeleteConfirm(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '13px', fontWeight: 500 }}
        >
          삭제
        </button>
      </div>
    ),
  }));

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={24} />
            콘텐츠 라이브러리
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            공급자 콘텐츠의 원천입니다. 공개 자료는 매장 HUB 에, 제공한 자료는 서비스 운영자에게 전달됩니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/supplier/library/new')}
          disabled={false}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          자료 등록
        </button>
      </div>

      {/* WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1:
          종전 KEEP_HIDDEN(개인 보관함) 안내 폐기. canonical 원천 + 공식 경로 2가지 안내. */}
      {handoffNotice && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          border: '1px solid #99f6e4',
          backgroundColor: '#f0fdfa',
          fontSize: '13px',
          color: '#115e59',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span>{handoffNotice}</span>
          <button onClick={() => setHandoffNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#115e59' }}>닫기</button>
        </div>
      )}
      <GuideBlock
        variant="info"
        title={guideTitle ?? '콘텐츠 라이브러리 이용 안내'}
        description={guideDesc ?? '공급자가 만든 콘텐츠를 등록·관리하는 원천입니다. 여기서 매장 HUB 와 서비스 운영자 두 경로로 콘텐츠가 흘러갑니다.'}
        steps={guideSteps ?? [
          '자료 등록 버튼으로 파일 또는 문서를 추가합니다.',
          '"공개" 로 등록한 자료는 매장 HUB 의 공급자 콘텐츠 소스에 노출되며, 매장이 직접 선택해 가져갑니다.',
          '"서비스에 제공" 으로 서비스를 고르면 해당 서비스 운영자에게 전달됩니다. 이후 검토·수정·게시는 운영자 업무입니다.',
          '특정 매장에 직접 보내는 기능은 없습니다. 매장용 상품 설명서·태블릿·사이니지는 콘텐츠 메뉴의 각 화면에서 등록합니다.',
        ]}
        compact
      />

      {/* Visibility Filter Bar (WO-CONTENT-META-UI-VALIDATION-V1) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>공개 범위:</span>
        {(['all', 'service', 'personal'] as VisibilityFilter[]).map((v) => (
          <button
            key={v}
            onClick={() => setVisibilityFilter(v)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              borderRadius: '20px',
              border: '1px solid',
              cursor: 'pointer',
              fontWeight: visibilityFilter === v ? 600 : 400,
              backgroundColor: visibilityFilter === v
                ? v === 'service' ? '#dcfce7' : v === 'personal' ? '#f1f5f9' : '#e0e7ff'
                : '#fff',
              color: visibilityFilter === v
                ? v === 'service' ? '#15803d' : v === 'personal' ? '#475569' : '#4338ca'
                : '#94a3b8',
              borderColor: visibilityFilter === v
                ? v === 'service' ? '#86efac' : v === 'personal' ? '#cbd5e1' : '#a5b4fc'
                : '#e2e8f0',
            }}
          >
            {{ all: '전체', service: '공개(매장 HUB 노출)', personal: '비공개' }[v]}
          </button>
        ))}
        {visibilityFilter !== 'all' && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {filteredItems.length}건
          </span>
        )}
      </div>

      {/* Info notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '13px',
        color: '#1e40af',
      }}>
        <AlertCircle size={16} />
        자료는 이미 게시된 파일의 URL 을 입력해 등록합니다. 이 화면에서 파일을 직접 업로드하지는 않습니다.
      </div>

      {/* WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1:
          조회 실패 시 목록 대신 지속 오류 UI. 정상 빈 상태 문구는 노출하지 않는다. */}
      {loadError && !loading ? (
        <div style={{
          backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <AlertCircle size={40} style={{ color: '#dc2626', marginBottom: '12px' }} />
          <p style={{ fontSize: '15px', color: '#475569', marginBottom: '4px' }}>
            콘텐츠 라이브러리 목록을 불러오지 못했습니다.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>잠시 후 다시 시도해 주세요.</p>
          <button
            onClick={fetchItems}
            style={{
              marginTop: '16px', padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', backgroundColor: '#fff',
              color: '#475569', fontSize: '14px', cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : (
      /* Table */
      <DataTable
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        emptyText="등록된 자료가 없습니다"
      />
      )}

      {/* Handoff Modal — Supplier → Service Operator (WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1) */}
      {handoffItem && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => !handoffSubmitting && setHandoffItem(null)}
        >
          <div
            style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={16} /> 서비스에 제공
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>
              <b>{handoffItem.title}</b> 을(를) 선택한 서비스의 운영자에게 제공합니다.
              제공 후 검토·수정·게시는 해당 서비스 운영자가 진행하며, 공급자 작업은 여기서 끝납니다.
            </p>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
              제공할 서비스
            </label>
            <select
              value={handoffServiceKey}
              onChange={(e) => setHandoffServiceKey(e.target.value)}
              disabled={handoffSubmitting}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', marginBottom: '12px' }}
            >
              {handoffTargets.map((t) => (
                <option key={t.key} value={t.key}>{t.nameKo}</option>
              ))}
            </select>
            {handoffError && (
              <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{handoffError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setHandoffItem(null)}
                disabled={handoffSubmitting}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleHandoff}
                disabled={handoffSubmitting || !handoffServiceKey}
                style={{ padding: '8px 16px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: handoffSubmitting ? 0.7 : 1 }}
              >
                {handoffSubmitting ? '제공 중…' : '제공'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
              자료 삭제
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              정말 이 자료를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
