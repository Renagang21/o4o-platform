/**
 * GalleryPage - 갤러리 페이지
 *
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1: MetaBar 추가
 *
 * UX 원칙:
 * - 리스트: 가져오기(Copy) 버튼 제거 → 상세/모달에서만 가능
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { ContentMetaBar } from '@o4o/ui';
import { newsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { GalleryItem } from '../../types';

export function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await newsApi.getGalleryItems({
        page: currentPage,
        limit: 12,
      });

      setItems(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  if (loading) {
    return <LoadingSpinner message="갤러리를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="갤러리"
        description="약사회 활동 사진을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '콘텐츠', href: '/content' },
          { label: '갤러리' },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="등록된 사진이 없습니다"
          description="곧 활동 사진이 등록될 예정입니다."
        />
      ) : (
        <>
          <div style={styles.grid}>
            {items.map(item => (
              <div
                key={item.id}
                style={styles.item}
                onClick={() => setSelectedItem(item)}
              >
                <Card hover padding="none">
                  <div style={styles.thumbnailWrapper}>
                    <div style={styles.thumbnail}>
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        style={styles.thumbnailImage}
                      />
                    </div>
                  </div>
                  <div style={styles.itemContent}>
                    <h3 style={styles.itemTitle}>{item.title}</h3>
                    {/* MetaBar - T1: viewCount 표시 */}
                    <ContentMetaBar
                      viewCount={item.viewCount}
                      date={item.eventDate || item.createdAt}
                      size="sm"
                    />
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* 이미지 모달 */}
      {selectedItem && (
        <div style={styles.modal} onClick={() => setSelectedItem(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setSelectedItem(null)}>
              ✕
            </button>
            <img
              src={selectedItem.imageUrl}
              alt={selectedItem.title}
              style={styles.modalImage}
            />
            <div style={styles.modalInfo}>
              <h2 style={styles.modalTitle}>{selectedItem.title}</h2>
              {selectedItem.description && (
                <p style={styles.modalDescription}>{selectedItem.description}</p>
              )}
              <span style={styles.modalDate}>
                {selectedItem.eventDate
                  ? new Date(selectedItem.eventDate).toLocaleDateString()
                  : new Date(selectedItem.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  item: {
    cursor: 'pointer',
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    aspectRatio: '4/3',
    overflow: 'hidden',
  },
  cardActions: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 1,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s',
  },
  itemContent: {
    padding: '16px',
  },
  itemTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDate: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
    display: 'block',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '40px',
  },
  modalContent: {
    position: 'relative',
    maxWidth: '900px',
    maxHeight: '90vh',
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: colors.white,
    border: 'none',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 1,
  },
  modalImage: {
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
  },
  modalInfo: {
    padding: '20px',
  },
  modalTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  modalDescription: {
    ...typography.bodyM,
    color: colors.neutral600,
    marginTop: '8px',
  },
  modalDate: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '8px',
    display: 'block',
  },
};
