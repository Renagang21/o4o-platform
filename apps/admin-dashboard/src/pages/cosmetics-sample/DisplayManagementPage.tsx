/**
 * Display Management Page
 *
 * 진열 관리
 * - 진열 레이아웃 설정
 * - 사진 업로드
 * - 페이싱 관리
 *
 * Phase 7-G: Cosmetics Sample & Display UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGKPIBlock,
  AGKPIGrid,
  AGCard,
  AGButton,
  AGModal,
  AGInput,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  Layout,
  Plus,
  RefreshCw,
  Search,
  Camera,
  CheckCircle,
  Eye,
  Edit,
  Grid,
  List,
  Upload,
  X,
} from 'lucide-react';

type ShelfPosition = 'eye_level' | 'top_shelf' | 'middle_shelf' | 'bottom_shelf' | 'end_cap' | 'counter';
type DisplayStatus = 'active' | 'inactive' | 'pending_setup' | 'needs_refill';
type ViewMode = 'grid' | 'list';
type FilterTab = 'all' | 'verified' | 'unverified';

interface DisplayItem {
  id: string;
  productId: string;
  productName: string;
  categoryName?: string;
  shelfPosition: ShelfPosition;
  facingCount: number;
  status: DisplayStatus;
  photoUrl?: string;
  isVerified: boolean;
  verifiedAt?: string;
  updatedAt: string;
}

const shelfPositionLabels: Record<ShelfPosition, string> = {
  eye_level: '눈높이',
  top_shelf: '상단',
  middle_shelf: '중단',
  bottom_shelf: '하단',
  end_cap: '엔드캡',
  counter: '카운터',
};

const DisplayManagementPage: React.FC = () => {
  const api = authClient.api;
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<ShelfPosition | 'all'>('all');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayItem | null>(null);

  const fetchDisplays = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setDisplays([
        {
          id: '1',
          productId: 'prod-1',
          productName: '하이드로 부스팅 세럼',
          categoryName: '세럼',
          shelfPosition: 'eye_level',
          facingCount: 3,
          status: 'active',
          photoUrl: 'https://via.placeholder.com/300x200/f3f4f6/6b7280?text=Display+Photo',
          isVerified: true,
          verifiedAt: '2024-12-10T00:00:00Z',
          updatedAt: '2024-12-12T10:00:00Z',
        },
        {
          id: '2',
          productId: 'prod-2',
          productName: '비타민C 앰플',
          categoryName: '앰플',
          shelfPosition: 'eye_level',
          facingCount: 2,
          status: 'active',
          photoUrl: 'https://via.placeholder.com/300x200/f3f4f6/6b7280?text=Display+Photo',
          isVerified: true,
          verifiedAt: '2024-12-09T00:00:00Z',
          updatedAt: '2024-12-11T14:00:00Z',
        },
        {
          id: '3',
          productId: 'prod-3',
          productName: '수분크림',
          categoryName: '크림',
          shelfPosition: 'middle_shelf',
          facingCount: 2,
          status: 'needs_refill',
          isVerified: false,
          updatedAt: '2024-12-08T09:00:00Z',
        },
        {
          id: '4',
          productId: 'prod-4',
          productName: '선스크린 SPF50+',
          categoryName: '선케어',
          shelfPosition: 'end_cap',
          facingCount: 4,
          status: 'active',
          photoUrl: 'https://via.placeholder.com/300x200/f3f4f6/6b7280?text=Display+Photo',
          isVerified: false,
          updatedAt: '2024-12-12T08:00:00Z',
        },
        {
          id: '5',
          productId: 'prod-5',
          productName: '클렌징 폼',
          categoryName: '클렌저',
          shelfPosition: 'counter',
          facingCount: 2,
          status: 'active',
          isVerified: true,
          verifiedAt: '2024-12-07T00:00:00Z',
          updatedAt: '2024-12-10T16:00:00Z',
        },
        {
          id: '6',
          productId: 'prod-6',
          productName: '토너',
          categoryName: '토너',
          shelfPosition: 'top_shelf',
          facingCount: 3,
          status: 'pending_setup',
          isVerified: false,
          updatedAt: '2024-12-12T15:00:00Z',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch displays:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDisplays();
  }, [fetchDisplays]);

  const getStatusTag = (status: DisplayStatus) => {
    switch (status) {
      case 'active':
        return <AGTag color="green" size="sm">활성</AGTag>;
      case 'needs_refill':
        return <AGTag color="yellow" size="sm">보충필요</AGTag>;
      case 'pending_setup':
        return <AGTag color="blue" size="sm">설정중</AGTag>;
      case 'inactive':
        return <AGTag color="gray" size="sm">비활성</AGTag>;
    }
  };

  const filteredDisplays = displays.filter((item) => {
    if (positionFilter !== 'all' && item.shelfPosition !== positionFilter) return false;
    if (searchTerm && !item.productName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (activeTab === 'verified' && !item.isVerified) return false;
    if (activeTab === 'unverified' && item.isVerified) return false;
    return true;
  });

  const summary = {
    total: displays.length,
    verified: displays.filter((d) => d.isVerified).length,
    needsPhoto: displays.filter((d) => !d.photoUrl).length,
    needsRefill: displays.filter((d) => d.status === 'needs_refill').length,
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: displays.length },
    { key: 'verified', label: '인증완료', count: summary.verified },
    { key: 'unverified', label: '미인증', count: displays.length - summary.verified },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <AGKPIGrid columns={4}>
          {[1, 2, 3, 4].map((i) => (
            <AGKPIBlock key={i} title="로딩 중..." value="-" loading />
          ))}
        </AGKPIGrid>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Display Management"
        description="진열 레이아웃 관리"
        icon={<Layout className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchDisplays}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <AGButton
              variant="primary"
              size="sm"
              iconLeft={<Plus className="w-4 h-4" />}
            >
              진열 추가
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <AGSection>
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="전체 진열"
              value={summary.total}
              colorMode="neutral"
              icon={<Layout className="w-5 h-5 text-orange-500" />}
            />
            <AGKPIBlock
              title="인증됨"
              value={summary.verified}
              colorMode="positive"
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            />
            <AGKPIBlock
              title="사진 필요"
              value={summary.needsPhoto}
              colorMode="info"
              icon={<Camera className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="보충 필요"
              value={summary.needsRefill}
              colorMode="neutral"
              icon={<Layout className="w-5 h-5 text-yellow-500" />}
            />
          </AGKPIGrid>
        </AGSection>

        {/* Filter Tabs */}
        <AGSection>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <AGInput
                  type="text"
                  placeholder="제품명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <AGSelect
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value as ShelfPosition | 'all')}
                className="w-32"
              >
                <option value="all">전체 위치</option>
                {Object.entries(shelfPositionLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Display Grid/List */}
        <AGSection>
          {filteredDisplays.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>해당하는 진열이 없습니다</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDisplays.map((item) => (
                <AGCard key={item.id} padding="none" className="overflow-hidden">
                  {/* Photo */}
                  <div className="relative h-40 bg-gray-100">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Camera className="w-12 h-12 mb-2" />
                        <span className="text-sm">사진 없음</span>
                      </div>
                    )}
                    {item.isVerified && (
                      <div className="absolute top-2 right-2">
                        <AGTag color="green" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" /> 인증됨
                        </AGTag>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                      {getStatusTag(item.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{item.categoryName}</p>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-500">
                        {shelfPositionLabels[item.shelfPosition]}
                      </span>
                      <span className="font-medium">
                        Facing: {item.facingCount}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <AGButton
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedDisplay(item);
                          setShowEditModal(true);
                        }}
                        iconLeft={<Edit className="w-4 h-4" />}
                      >
                        편집
                      </AGButton>
                      <AGButton
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedDisplay(item);
                          setShowPhotoModal(true);
                        }}
                        iconLeft={<Upload className="w-4 h-4" />}
                      >
                        사진
                      </AGButton>
                    </div>
                  </div>
                </AGCard>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDisplays.map((item) => (
                <AGCard key={item.id} padding="md">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                        {getStatusTag(item.status)}
                        {item.isVerified && (
                          <AGTag color="green" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" /> 인증됨
                          </AGTag>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{item.categoryName}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>위치: {shelfPositionLabels[item.shelfPosition]}</span>
                        <span>Facing: {item.facingCount}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <AGButton
                        variant="ghost"
                        size="sm"
                        iconLeft={<Eye className="w-4 h-4" />}
                      >
                        보기
                      </AGButton>
                      <AGButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDisplay(item);
                          setShowEditModal(true);
                        }}
                        iconLeft={<Edit className="w-4 h-4" />}
                      >
                        편집
                      </AGButton>
                    </div>
                  </div>
                </AGCard>
              ))}
            </div>
          )}
        </AGSection>
      </div>

      {/* Edit Modal */}
      <AGModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDisplay(null);
        }}
        title="진열 편집"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <AGButton
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedDisplay(null);
              }}
            >
              취소
            </AGButton>
            <AGButton variant="primary">
              저장
            </AGButton>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedDisplay && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedDisplay.productName}</p>
                <p className="text-sm text-gray-500">{selectedDisplay.categoryName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">진열 위치</label>
                <AGSelect defaultValue={selectedDisplay.shelfPosition} className="w-full">
                  {Object.entries(shelfPositionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </AGSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">페이싱 수</label>
                <AGInput
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={selectedDisplay.facingCount}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <AGSelect defaultValue={selectedDisplay.status} className="w-full">
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                  <option value="pending_setup">설정중</option>
                  <option value="needs_refill">보충필요</option>
                </AGSelect>
              </div>
            </>
          )}
        </div>
      </AGModal>

      {/* Photo Upload Modal */}
      <AGModal
        open={showPhotoModal}
        onClose={() => {
          setShowPhotoModal(false);
          setSelectedDisplay(null);
        }}
        title="진열 사진 업데이트"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <AGButton
              variant="outline"
              onClick={() => {
                setShowPhotoModal(false);
                setSelectedDisplay(null);
              }}
            >
              취소
            </AGButton>
            <AGButton variant="primary" iconLeft={<Upload className="w-4 h-4" />}>
              업로드
            </AGButton>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedDisplay && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedDisplay.productName}</p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">사진을 드래그하여 업로드하거나</p>
                <AGButton variant="outline" size="sm">
                  파일 선택
                </AGButton>
                <p className="text-xs text-gray-400 mt-2">
                  PNG, JPG, WEBP (최대 5MB)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <AGInput
                  type="text"
                  placeholder="진열 상태나 특이사항을 기록하세요"
                />
              </div>
            </>
          )}
        </div>
      </AGModal>
    </div>
  );
};

export default DisplayManagementPage;
