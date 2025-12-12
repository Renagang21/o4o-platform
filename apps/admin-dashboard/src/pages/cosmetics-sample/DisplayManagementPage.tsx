/**
 * Display Management Page
 *
 * 진열 관리
 * - 진열 레이아웃 설정
 * - 사진 업로드
 * - 페이싱 관리
 *
 * Phase 6-H: Cosmetics Sample & Display Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<ShelfPosition | 'all'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
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

  const getStatusBadge = (status: DisplayStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            활성
          </span>
        );
      case 'needs_refill':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            보충필요
          </span>
        );
      case 'pending_setup':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            설정중
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            비활성
          </span>
        );
    }
  };

  const filteredDisplays = displays.filter((item) => {
    if (positionFilter !== 'all' && item.shelfPosition !== positionFilter) return false;
    if (searchTerm && !item.productName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const summary = {
    total: displays.length,
    verified: displays.filter((d) => d.isVerified).length,
    needsPhoto: displays.filter((d) => !d.photoUrl).length,
    needsRefill: displays.filter((d) => d.status === 'needs_refill').length,
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Display Management</h1>
          <p className="text-gray-500 text-sm mt-1">진열 레이아웃 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDisplays}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            진열 추가
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Layout className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-sm text-gray-500">전체 진열</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">{summary.verified}</p>
              <p className="text-sm text-gray-500">인증됨</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{summary.needsPhoto}</p>
              <p className="text-sm text-gray-500">사진 필요</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Layout className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{summary.needsRefill}</p>
              <p className="text-sm text-gray-500">보충 필요</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="제품명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value as ShelfPosition | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="all">전체 위치</option>
          {Object.entries(shelfPositionLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Display Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDisplays.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
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
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 인증됨
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-sm text-gray-500 mb-3">{item.categoryName}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {shelfPositionLabels[item.shelfPosition]}
                  </span>
                  <span className="font-medium">
                    Facing: {item.facingCount}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setSelectedDisplay(item);
                      setShowEditModal(true);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    편집
                  </button>
                  <button className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-1">
                    <Upload className="w-4 h-4" />
                    사진
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDisplays.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
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
                    {getStatusBadge(item.status)}
                    {item.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> 인증됨
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{item.categoryName}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>위치: {shelfPositionLabels[item.shelfPosition]}</span>
                    <span>Facing: {item.facingCount}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDisplay(item);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal Placeholder */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">진열 편집</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDisplay(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              {selectedDisplay?.productName}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDisplay(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayManagementPage;
