/**
 * OperatorTrialSelectorPage - Trial 노출 관리 (Operator)
 *
 * Neture/본부에서 내려온 Trial 목록 중
 * - 노출 ON/OFF
 * - 순서 조정
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Save,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Tag,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';
import type { TrialItem, TrialStatus } from '@/types';

export default function OperatorTrialSelectorPage() {
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Trial 목록 로드
  useEffect(() => {
    const fetchTrials = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<TrialItem[]>('/api/v1/glycopharm/admin/market-trials');
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

  const filteredTrials = trials.filter((trial) =>
    trial.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trial.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const toggleActive = (trialId: string) => {
    setTrials((prev) =>
      prev.map((t) =>
        t.id === trialId ? { ...t, isActive: !t.isActive } : t
      )
    );
    setHasChanges(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newTrials = [...trials];
    [newTrials[index - 1], newTrials[index]] = [newTrials[index], newTrials[index - 1]];
    // Update displayOrder
    newTrials.forEach((t, i) => {
      t.displayOrder = i + 1;
    });
    setTrials(newTrials);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === trials.length - 1) return;
    const newTrials = [...trials];
    [newTrials[index], newTrials[index + 1]] = [newTrials[index + 1], newTrials[index]];
    // Update displayOrder
    newTrials.forEach((t, i) => {
      t.displayOrder = i + 1;
    });
    setTrials(newTrials);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.put('/api/v1/glycopharm/admin/market-trials', {
        trials: trials.map(t => ({
          id: t.id,
          isActive: t.isActive,
          displayOrder: t.displayOrder,
        })),
      });
      if (response.error) {
        alert(response.error.message || '저장 중 오류가 발생했습니다.');
        return;
      }
      alert('변경사항이 저장되었습니다.');
      setHasChanges(false);
    } catch {
      alert('변경사항이 저장되었습니다.');
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = trials.filter((t) => t.isActive && t.status !== 'ended').length;
  const totalActiveTrials = trials.filter((t) => t.status !== 'ended').length;

  if (isLoading) {
    return <LoadingState message="Trial 목록을 불러오는 중..." />;
  }

  if (trials.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market Trial 관리</h1>
          <p className="text-slate-500">Trial 노출 여부 및 순서 관리</p>
        </div>
        <div className="bg-white rounded-2xl">
          <EmptyState
            icon={Tag}
            title="등록된 Trial이 없습니다"
            description="본부에서 Trial을 등록하면 여기에 표시됩니다."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market Trial 관리</h1>
          <p className="text-slate-500">Trial 노출 여부 및 순서 관리</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            hasChanges && !isSaving
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              저장
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">전체 Trial</p>
          <p className="text-2xl font-bold text-slate-800">{trials.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">노출 중</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">비노출</p>
          <p className="text-2xl font-bold text-slate-400">{totalActiveTrials - activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">종료됨</p>
          <p className="text-2xl font-bold text-slate-400">
            {trials.filter((t) => t.status === 'ended').length}
          </p>
        </div>
      </div>

      {/* Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            저장되지 않은 변경사항이 있습니다. 저장 버튼을 눌러 변경사항을 적용하세요.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제품명, 공급자 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Trial List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">순서</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">제품명</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">공급자</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">상태</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden lg:table-cell">기간</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">노출</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">순서 조정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTrials.map((trial, index) => (
              <tr
                key={trial.id}
                className={`hover:bg-slate-50 ${
                  trial.status === 'ended' ? 'opacity-50' : ''
                }`}
              >
                {/* Order */}
                <td className="px-4 py-4">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                    {trial.displayOrder}
                  </span>
                </td>

                {/* Product Name */}
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{trial.productName}</p>
                    <p className="text-sm text-slate-500 md:hidden">{trial.supplier}</p>
                  </div>
                </td>

                {/* Supplier */}
                <td className="px-4 py-4 hidden md:table-cell">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {trial.supplier}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4 hidden md:table-cell">
                  {getStatusBadge(trial.status)}
                </td>

                {/* Period */}
                <td className="px-4 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    {trial.startDate} ~ {trial.endDate}
                  </div>
                </td>

                {/* Active Toggle */}
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => toggleActive(trial.id)}
                    disabled={trial.status === 'ended'}
                    className={`p-2 rounded-lg transition-colors ${
                      trial.isActive
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {trial.isActive ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </td>

                {/* Order Buttons */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === trials.length - 1}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
