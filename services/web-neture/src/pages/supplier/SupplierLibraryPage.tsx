/**
 * SupplierLibraryPage - 공급자 자료실 목록
 *
 * WO-O4O-NETURE-LIBRARY-UI-V1
 * - 자료 목록 조회 (SimpleTable)
 * - 등록/수정/삭제 액션
 * - PENDING supplier 등록 제한
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, AlertCircle } from 'lucide-react';
import { supplierApi, type SupplierLibraryItem } from '../../lib/api';
import { DataTable, type Column } from '@o4o/ui';

const columns: Column<Record<string, any>>[] = [
  { key: 'title', title: '제목', dataIndex: 'title', width: '30%' },
  { key: 'category', title: '카테고리', dataIndex: 'category', width: '15%' },
  { key: 'fileName', title: '파일명', dataIndex: 'fileName', width: '20%' },
  { key: 'isPublic', title: '공개', dataIndex: 'isPublic', width: '10%', align: 'center' },
  { key: 'createdAt', title: '생성일', dataIndex: 'createdAt', width: '15%' },
  { key: 'actions', title: '', dataIndex: 'actions', width: '10%' },
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

export default function SupplierLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SupplierLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await supplierApi.getLibraryItems();
    setItems(data);
    setLoading(false);
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

  const dataSource = items.map((item) => ({
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
          <div>{item.fileName}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{formatFileSize(item.fileSize)}</div>
        </div>
      ),
      isPublic: (
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
      ),
    createdAt: <span style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(item.createdAt)}</span>,
    actions: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => navigate(`/workspace/supplier/library/${item.id}/edit`)}
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
            자료실
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            파일 및 문서를 관리합니다
          </p>
        </div>
        <button
          onClick={() => navigate('/workspace/supplier/library/new')}
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
        파일 URL을 직접 입력하여 자료를 등록합니다. 파일 업로드 기능은 추후 제공됩니다.
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        emptyText="등록된 자료가 없습니다"
      />

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
