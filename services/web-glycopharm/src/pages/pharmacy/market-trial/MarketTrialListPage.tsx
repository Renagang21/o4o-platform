/**
 * MarketTrialListPage - Market Trial 목록 (Pharmacy)
 *
 * Trial 제품 열람 및 활용 연결
 * - Signage에 사용
 * - 판매 페이지 보기
 * - 관련 포럼 보기
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Filter,
  Monitor,
  ShoppingBag,
  MessageSquare,
  Calendar,
  Building2,
  Tag,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';
import type { TrialItem, TrialStatus } from '@/types';

const statusFilters: { value: TrialStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'ended', label: '종료' },
];

export default function MarketTrialListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [connectionModal, setConnectionModal] = useState<{ trial: TrialItem; type: 'signage' | 'store' | 'forum' } | null>(null);

  // API 상태
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trial 목록 로드
  useEffect(() => {
    const fetchTrials = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<TrialItem[]>('/api/v1/glycopharm/market-trials');
        if (response.data) {
          setTrials(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지
        setTrials([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrials();
  }, []);

  const filteredTrials = trials.filter((trial) => {
    const matchesSearch =
      trial.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trial.status === statusFilter;
    const isVisible = trial.isActive || trial.status === 'ended';
    return matchesSearch && matchesStatus && isVisible;
  });

  const getStatusBadge = (status: TrialStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            진행중
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" />
            예정
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <XCircle className="w-3 h-3" />
            종료
          </span>
        );
    }
  };

  const handleConnection = (trial: TrialItem, type: 'signage' | 'store' | 'forum') => {
    // 이미 연결된 경우 해당 페이지로 이동
    if (type === 'signage' && trial.signageContentId) {
      // Navigate to signage
      setConnectionModal({ trial, type });
    } else if (type === 'store' && trial.storeProductId) {
      // Navigate to store
      setConnectionModal({ trial, type });
    } else if (type === 'forum' && trial.forumPostId) {
      // Navigate to forum
      setConnectionModal({ trial, type });
    } else {
      // 연결 모달 표시
      setConnectionModal({ trial, type });
    }
  };

  if (isLoading) {
    return <LoadingState message="Market Trial을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market Trial</h1>
          <p className="text-slate-500">신제품 체험 및 테스트 프로그램</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제품명, 공급자 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trial Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredTrials.map((trial) => (
          <div
            key={trial.id}
            className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
              trial.status === 'ended' ? 'opacity-60' : ''
            }`}
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(trial.status)}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {trial.supplier}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {trial.productName}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {trial.description}
                  </p>
                </div>
                {/* Product Image Placeholder */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-8 h-8 text-slate-300" />
                </div>
              </div>
            </div>

            {/* Trial Purpose */}
            <div className="px-5 py-3 bg-primary-50">
              <p className="text-sm text-primary-700">
                <span className="font-medium">Trial 목적:</span> {trial.trialPurpose}
              </p>
            </div>

            {/* Period */}
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {trial.startDate} ~ {trial.endDate}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex flex-wrap gap-2">
              {/* Signage 연결 */}
              <button
                onClick={() => handleConnection(trial, 'signage')}
                disabled={trial.status === 'ended'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  trial.signageContentId
                    ? 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Monitor className="w-4 h-4" />
                {trial.signageContentId ? '사이니지 보기' : '사이니지에 사용'}
              </button>

              {/* Store 연결 */}
              <button
                onClick={() => handleConnection(trial, 'store')}
                disabled={trial.status === 'ended'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  trial.storeProductId
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingBag className="w-4 h-4" />
                {trial.storeProductId ? '판매 페이지' : '판매 연결'}
              </button>

              {/* Forum 연결 */}
              <button
                onClick={() => handleConnection(trial, 'forum')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  trial.forumPostId
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                {trial.forumPostId ? '포럼 보기' : '포럼 연결'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTrials.length === 0 && (
        <div className="bg-white rounded-2xl">
          <EmptyState
            icon={Tag}
            title="Market Trial이 없습니다"
            description={searchQuery ? "검색 조건에 맞는 Trial이 없습니다." : "아직 등록된 Market Trial이 없습니다."}
          />
        </div>
      )}

      {/* Connection Modal */}
      {connectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {connectionModal.type === 'signage' && '사이니지 연결'}
              {connectionModal.type === 'store' && '판매 연결'}
              {connectionModal.type === 'forum' && '포럼 연결'}
            </h3>

            <p className="text-slate-600 mb-6">
              <span className="font-medium">{connectionModal.trial.productName}</span>을(를){' '}
              {connectionModal.type === 'signage' && '사이니지 콘텐츠로 등록하시겠습니까?'}
              {connectionModal.type === 'store' && '판매 상품으로 등록하시겠습니까?'}
              {connectionModal.type === 'forum' && '포럼에 소개하시겠습니까?'}
            </p>

            {/* 연결된 경우 바로 이동 옵션 */}
            {connectionModal.type === 'signage' && connectionModal.trial.signageContentId && (
              <NavLink
                to="/pharmacy/signage/library"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent-600 text-white rounded-xl font-medium hover:bg-accent-700 transition-colors mb-3"
              >
                <ExternalLink className="w-4 h-4" />
                콘텐츠 라이브러리로 이동
              </NavLink>
            )}

            {connectionModal.type === 'forum' && connectionModal.trial.forumPostId && (
              <NavLink
                to="/forum"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors mb-3"
              >
                <ExternalLink className="w-4 h-4" />
                포럼으로 이동
              </NavLink>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConnectionModal(null)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
              {!((connectionModal.type === 'signage' && connectionModal.trial.signageContentId) ||
                (connectionModal.type === 'store' && connectionModal.trial.storeProductId) ||
                (connectionModal.type === 'forum' && connectionModal.trial.forumPostId)) && (
                <button
                  onClick={() => {
                    // TODO: API 연동 시 실제 연결 로직
                    alert(`${connectionModal.trial.productName} - ${connectionModal.type} 연결 완료 (Mock)`);
                    setConnectionModal(null);
                  }}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  연결하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
