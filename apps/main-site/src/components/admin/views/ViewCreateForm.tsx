/**
 * ViewCreateForm Component
 * Form for creating new views with query builder
 */

import { FC } from 'react';
import { Plus, X, Save } from 'lucide-react';
import type { ViewFormData, QueryFilter, QuerySort, AvailableCPT } from '../../../types/views';

interface ViewCreateFormProps {
  formData: ViewFormData;
  availableCPTs: AvailableCPT[];
  operators: Array<{ value: string; label: string }>;
  onFormChange: (formData: ViewFormData) => void;
  onAddFilter: () => void;
  onUpdateFilter: (filterId: string, updates: Partial<QueryFilter>) => void;
  onRemoveFilter: (filterId: string) => void;
  onAddSort: () => void;
  onUpdateSort: (index: number, updates: Partial<QuerySort>) => void;
  onRemoveSort: (index: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ViewCreateForm: FC<ViewCreateFormProps> = ({
  formData,
  availableCPTs,
  operators,
  onFormChange,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onAddSort,
  onUpdateSort,
  onRemoveSort,
  onSubmit,
  onCancel
}) => {
  const selectedCPT = availableCPTs.find(cpt => cpt.slug === formData.query.postType);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">새 View 생성</h3>
        <p className="text-gray-600 mt-1">동적 쿼리와 템플릿을 정의하세요</p>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                placeholder="예: featured_products, recent_posts"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">숏코드에 사용됩니다 (영문, 숫자, _ 만 사용)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                표시 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
                placeholder="예: 추천 상품 목록"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
                placeholder="이 View의 용도를 설명해주세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 쿼리 설정 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">쿼리 설정</h4>

          {/* Post Type 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type *
            </label>
            <select
              value={formData.query.postType}
              onChange={(e) => onFormChange({
                ...formData,
                query: { ...formData.query, postType: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Post Type 선택</option>
              {availableCPTs.map((cpt) => (
                <option key={cpt.slug} value={cpt.slug}>{cpt.name}</option>
              ))}
            </select>
          </div>

          {/* 필터 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-gray-900">필터 조건</h5>
              <button
                onClick={onAddFilter}
                disabled={!formData.query.postType}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                필터 추가
              </button>
            </div>

            {formData.query.filters.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                <p className="text-gray-500 text-sm">필터를 추가해서 쿼리 조건을 설정하세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.query.filters.map((filter, index) => (
                  <div key={filter.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <select
                      value={filter.field}
                      onChange={(e) => onUpdateFilter(filter.id, { field: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">필드 선택</option>
                      {selectedCPT?.fields.map((field) => (
                        <option key={field.name} value={field.name}>{field.label}</option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => onUpdateFilter(filter.id, { operator: e.target.value as any })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={filter.value as string}
                      onChange={(e) => onUpdateFilter(filter.id, { value: e.target.value })}
                      placeholder="값"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />

                    {index > 0 && (
                      <select
                        value={filter.relation}
                        onChange={(e) => onUpdateFilter(filter.id, { relation: e.target.value as 'AND' | 'OR' })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    <button
                      onClick={() => onRemoveFilter(filter.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 정렬 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-gray-900">정렬</h5>
              <button
                onClick={onAddSort}
                disabled={!formData.query.postType}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                정렬 추가
              </button>
            </div>

            {formData.query.sorting.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                <p className="text-gray-500 text-sm">정렬 조건을 추가하세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.query.sorting.map((sort, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <select
                      value={sort.field}
                      onChange={(e) => onUpdateSort(index, { field: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">필드 선택</option>
                      {selectedCPT?.fields.map((field) => (
                        <option key={field.name} value={field.name}>{field.label}</option>
                      ))}
                    </select>

                    <select
                      value={sort.direction}
                      onChange={(e) => onUpdateSort(index, { direction: e.target.value as 'ASC' | 'DESC' })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="ASC">오름차순</option>
                      <option value="DESC">내림차순</option>
                    </select>

                    <button
                      onClick={() => onRemoveSort(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">페이지네이션</h5>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.query.pagination.enabled}
                  onChange={(e) => onFormChange({
                    ...formData,
                    query: {
                      ...formData.query,
                      pagination: { ...formData.query.pagination, enabled: e.target.checked }
                    }
                  })}
                />
                <span className="text-sm">페이지네이션 사용</span>
              </label>

              {formData.query.pagination.enabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">페이지당 항목:</span>
                  <input
                    type="number"
                    value={formData.query.pagination.itemsPerPage}
                    onChange={(e) => onFormChange({
                      ...formData,
                      query: {
                        ...formData.query,
                        pagination: { ...formData.query.pagination, itemsPerPage: parseInt(e.target.value) || 10 }
                      }
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 템플릿 설정 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">템플릿 설정</h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              템플릿 타입
            </label>
            <select
              value={formData.template.type}
              onChange={(e) => onFormChange({
                ...formData,
                template: { ...formData.template, type: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="list">목록</option>
              <option value="grid">그리드</option>
              <option value="table">테이블</option>
              <option value="custom">커스텀</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              표시할 필드
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCPT?.fields.map((field) => (
                <label key={field.name} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.template.fields.includes(field.name)}
                    onChange={(e) => {
                      const newFields = e.target.checked
                        ? [...formData.template.fields, field.name]
                        : formData.template.fields.filter(f => f !== field.name);
                      onFormChange({
                        ...formData,
                        template: { ...formData.template, fields: newFields }
                      });
                    }}
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 설정 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">고급 설정</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.cache}
                onChange={(e) => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, cache: e.target.checked }
                })}
              />
              <span className="text-sm">캐시 사용</span>
            </label>

            {formData.settings.cache && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-sm text-gray-600">캐시 시간:</span>
                <input
                  type="number"
                  value={formData.settings.cacheTime}
                  onChange={(e) => onFormChange({
                    ...formData,
                    settings: { ...formData.settings, cacheTime: parseInt(e.target.value) || 60 }
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="1"
                />
                <span className="text-sm text-gray-600">분</span>
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.ajaxPagination}
                onChange={(e) => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, ajaxPagination: e.target.checked }
                })}
              />
              <span className="text-sm">AJAX 페이지네이션</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.showFilters}
                onChange={(e) => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, showFilters: e.target.checked }
                })}
              />
              <span className="text-sm">프론트엔드 필터 표시</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.showSearch}
                onChange={(e) => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, showSearch: e.target.checked }
                })}
              />
              <span className="text-sm">검색창 표시</span>
            </label>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!formData.name || !formData.title || !formData.query.postType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            View 생성
          </button>
        </div>
      </div>
    </div>
  );
};
