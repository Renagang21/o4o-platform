/**
 * Cosmetics Routine Templates Management Page
 *
 * Admin page for managing cosmetics routine templates
 * Permission required: cosmetics:edit
 *
 * Phase 7-H: Cosmetics Products/Brands/Routines UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import { RoutineTemplateEditor } from '../components/RoutineTemplateEditor';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
  AGTable,
  AGTablePagination,
  AGModal,
  AGConfirmModal,
} from '@o4o/ui';
import type { AGTableColumn } from '@o4o/ui';
import {
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  Heart,
  Clock,
  Sun,
  Moon,
  Layers,
  Filter,
} from 'lucide-react';

interface RoutineTemplate {
  id: string;
  title: string;
  description: string | null;
  steps: any[];
  metadata: {
    skinType: string[];
    concerns: string[];
    timeOfUse: string;
    tags: string[];
  };
  isPublished: boolean;
  viewCount: number;
  recommendCount: number;
  createdAt: string;
  updatedAt: string;
}

const SKIN_TYPE_OPTIONS = [
  { value: 'all', label: '전체 피부타입' },
  { value: '지성', label: '지성' },
  { value: '건성', label: '건성' },
  { value: '복합성', label: '복합성' },
  { value: '민감성', label: '민감성' },
  { value: '중성', label: '중성' },
];

const TIME_OPTIONS = [
  { value: 'all', label: '전체 시간대' },
  { value: 'morning', label: '모닝' },
  { value: 'evening', label: '이브닝' },
  { value: 'both', label: '모닝/이브닝' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'published', label: '게시됨' },
  { value: 'draft', label: '초안' },
];

export default function CosmeticsRoutinesPage() {
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<RoutineTemplate | null>(null);

  const loadRoutines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/api/v1/partner/routines');

      if (response.data.success) {
        setRoutines(response.data.data || []);
      } else {
        setError('Failed to load routines');
      }
    } catch (err: any) {
      console.error('Error loading routines:', err);
      setError(err.message || 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await authClient.api.delete(`/api/v1/partner/routines/${deleteTarget.id}`);
      await loadRoutines();
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      setError(err.message || 'Failed to delete routine');
    }
  };

  const handleEdit = (routine: RoutineTemplate) => {
    setSelectedRoutine(routine);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setSelectedRoutine(null);
    setShowEditor(true);
  };

  const handleSave = async (routineData: any) => {
    try {
      setSaving(true);
      setError(null);

      if (selectedRoutine) {
        // Update existing routine
        const response = await authClient.api.put(
          `/api/v1/partner/routines/${selectedRoutine.id}`,
          {
            title: routineData.title,
            description: routineData.description,
            steps: routineData.steps,
            metadata: {
              skinType: routineData.skinType,
              concerns: routineData.concerns,
              timeOfUse: routineData.timeOfUse,
              tags: routineData.tags,
            },
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to update routine');
        }
      } else {
        // Create new routine
        const response = await authClient.api.post('/api/v1/partner/routines', {
          title: routineData.title,
          description: routineData.description,
          steps: routineData.steps,
          metadata: {
            skinType: routineData.skinType,
            concerns: routineData.concerns,
            timeOfUse: routineData.timeOfUse,
            tags: routineData.tags,
          },
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create routine');
        }
      }

      setShowEditor(false);
      await loadRoutines();
    } catch (err: any) {
      console.error('Error saving routine:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  // Filtering
  const filteredRoutines = routines.filter((routine) => {
    if (searchTerm && !routine.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (skinTypeFilter !== 'all' && !routine.metadata.skinType?.includes(skinTypeFilter)) {
      return false;
    }
    if (timeFilter !== 'all' && routine.metadata.timeOfUse !== timeFilter) {
      return false;
    }
    if (statusFilter === 'published' && !routine.isPublished) return false;
    if (statusFilter === 'draft' && routine.isPublished) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRoutines.length / pageSize);
  const paginatedRoutines = filteredRoutines.slice((page - 1) * pageSize, page * pageSize);

  // Table columns
  const columns: AGTableColumn<RoutineTemplate>[] = [
    {
      key: 'title',
      header: '루틴명',
      render: (routine) => (
        <div>
          <div className="font-medium text-gray-900">{routine.title}</div>
          {routine.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">{routine.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'skinType',
      header: '피부타입',
      render: (routine) => (
        <div className="flex flex-wrap gap-1">
          {routine.metadata.skinType?.map((type) => (
            <AGTag key={type} color="blue" size="sm">
              {type}
            </AGTag>
          ))}
        </div>
      ),
    },
    {
      key: 'concerns',
      header: '피부고민',
      render: (routine) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {routine.metadata.concerns?.slice(0, 2).map((concern) => (
            <AGTag key={concern} color="green" size="sm">
              {concern}
            </AGTag>
          ))}
          {routine.metadata.concerns?.length > 2 && (
            <span className="text-xs text-gray-500">+{routine.metadata.concerns.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'timeOfUse',
      header: '시간대',
      render: (routine) => (
        <div className="flex items-center gap-1">
          {routine.metadata.timeOfUse === 'morning' && (
            <>
              <Sun className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">모닝</span>
            </>
          )}
          {routine.metadata.timeOfUse === 'evening' && (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-sm">이브닝</span>
            </>
          )}
          {routine.metadata.timeOfUse === 'both' && (
            <>
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm">모닝/이브닝</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'steps',
      header: '단계',
      render: (routine) => (
        <div className="flex items-center gap-1">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{routine.steps?.length || 0}단계</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (routine) => (
        <AGTag color={routine.isPublished ? 'green' : 'gray'} size="sm">
          {routine.isPublished ? '게시됨' : '초안'}
        </AGTag>
      ),
    },
    {
      key: 'stats',
      header: '통계',
      render: (routine) => (
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{routine.viewCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-pink-500" />
            <span>{routine.recommendCount.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (routine) => (
        <div className="flex items-center justify-end gap-2">
          <AGButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(routine)}
            iconLeft={<Edit className="w-4 h-4" />}
          >
            수정
          </AGButton>
          <AGButton
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(routine)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            iconLeft={<Trash2 className="w-4 h-4" />}
          >
            삭제
          </AGButton>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Routine Templates"
        description="스킨케어 루틴 템플릿 관리"
        icon={<Sparkles className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={loadRoutines}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
            <AGButton
              variant="primary"
              size="sm"
              onClick={handleCreate}
              iconLeft={<Plus className="w-4 h-4" />}
            >
              새 템플릿
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <AGCard className="bg-red-50 border-red-200">
            <div className="text-red-700">{error}</div>
          </AGCard>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="루틴명 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <AGSelect
              value={skinTypeFilter}
              onChange={(e) => {
                setSkinTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-36"
            >
              {SKIN_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AGSelect>
            <AGSelect
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
              className="w-36"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AGSelect>
            <AGSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-32"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AGSelect>
          </div>
        </AGSection>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{filteredRoutines.length}</span>개 루틴
          </p>
          {(searchTerm || skinTypeFilter !== 'all' || timeFilter !== 'all' || statusFilter !== 'all') && (
            <AGButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSkinTypeFilter('all');
                setTimeFilter('all');
                setStatusFilter('all');
                setPage(1);
              }}
              iconLeft={<Filter className="w-4 h-4" />}
            >
              필터 초기화
            </AGButton>
          )}
        </div>

        {/* Routine Table */}
        <AGSection>
          {paginatedRoutines.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">루틴 템플릿이 없습니다</p>
              <p className="text-sm">새 템플릿을 만들어 시작하세요</p>
              <AGButton
                variant="primary"
                size="sm"
                onClick={handleCreate}
                iconLeft={<Plus className="w-4 h-4" />}
                className="mt-4"
              >
                새 템플릿 만들기
              </AGButton>
            </div>
          ) : (
            <>
              <AGTable columns={columns} data={paginatedRoutines} />
              {totalPages > 1 && (
                <div className="mt-4">
                  <AGTablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={filteredRoutines.length}
                    pageSize={pageSize}
                  />
                </div>
              )}
            </>
          )}
        </AGSection>
      </div>

      {/* Editor Modal */}
      <AGModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={selectedRoutine ? '루틴 템플릿 수정' : '새 루틴 템플릿'}
        size="lg"
      >
        <RoutineTemplateEditor
          routine={selectedRoutine || undefined}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
          saving={saving}
        />
      </AGModal>

      {/* Delete Confirmation */}
      <AGConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="루틴 템플릿 삭제"
        message={`"${deleteTarget?.title}" 루틴 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
